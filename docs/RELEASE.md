# Release runbook

**Status:** written in phase 1, before the release and deploy automation exists.

This is deliberate. A runbook written after the automation is a description of
whatever the automation happened to do. A runbook written first is a requirement
on it, and the gaps are visible rather than hidden. Every step below is marked
with where it stands:

- **live** means it runs today and you can watch it.
- **phase 2** means versioning, changelog, tagging and the published release.
- **phase 3** means deploying to production and the rollback path.

Nothing below is marked live unless it is. When a phase lands, its steps change
marking and the step is amended to name the workflow and job that does it.

---

## 1. Normal release

The release of a standard change, from branch to production.

| # | Step | Who or what | Status |
|---|---|---|---|
| 1 | Branch from `main`. Branch name has no mechanical meaning; the commits do. | the author | live |
| 2 | Commit using conventional commit subjects. `feat` and `fix` are the two that move a version. | the author | live |
| 3 | Open a pull request. The title must parse as a conventional commit, because it becomes the squash commit subject. | the author, checked by job `pr-title` | live |
| 4 | Fill in the template: what changed, release impact, how it was verified, and how to undo it. | the author | live, by convention |
| 5 | Gates run: `lint`, `typecheck`, `test`, `audit`, `build`, then `e2e` against the artifact `build` produced. | `ci.yml` | live |
| 6 | Review and approval. Pipeline and governance files need a code owner. | the reviewer | required by ruleset `27090299`, active. Observed: open pull requests report `REVIEW_REQUIRED`. Never yet satisfied: the only account is the author of every pull request and the only admin, so no approval has ever been given and every merge to `main` has to be an admin bypass, phase 1 included. That a non-admin is held to it is inferred from the ruleset configuration; not observed, because no non-admin account exists |
| 7 | Squash merge. The pull request title becomes the one commit on `main`. | the person merging | live. Observed: squash is the only merge method enabled, and the ruleset allows only `squash` |
| 8 | A release pull request is opened or updated, carrying the next version, the changelog entry, and everything merged since the last release. | release automation | phase 2 |
| 9 | Decide to cut. Merging the release pull request is the decision, and it is a human one. | the release owner | phase 2 |
| 10 | A tag and a published release appear, with the changelog and the build attached. | release automation | phase 2 |
| 11 | The tag is deployed to production. | deploy workflow | phase 3 |
| 12 | Smoke checks run against the deployed address, not against a local build. | deploy workflow, `@smoke` tagged specs | phase 3 |

**Why step 9 is a human.** Everything before it is mechanical and should be.
Deciding that now is the moment to ship is a judgement about readiness,
timing and who is available if it goes wrong. Automating that decision would
remove the only step in this list that needs a person, and it is the step
accountability attaches to.

### What to check before merging a release pull request

1. The changelog entry reads as a change a user would recognise, not as a commit
   log. If it does not, the conventional commit subjects were poor and the fix is
   upstream of here.
2. The version moved the way the changes justify. A `feat` present and the
   version only moved a patch means a subject was mislabelled.
3. The gates are green on the release pull request itself, not only on the
   changes that went into it. This is the step with a known trap in it: see
   `docs/requirements.md`, phase 2.

---

## 2. Rollback

Production is wrong. The previous version was right. No new code is written.

| # | Step | Who or what | Status |
|---|---|---|---|
| 1 | Decide to roll back rather than fix forward. Criterion below. | the release owner | procedure |
| 2 | Identify the last known good tag from the release list. | the release owner | phase 2 |
| 3 | Run the deploy workflow manually against that tag. | deploy workflow, manual trigger | phase 3 |
| 4 | Smoke checks run against the deployed address. A rollback that is not verified is a hope. | deploy workflow | phase 3 |
| 5 | Record what was rolled back, from which version to which, and why. | the release owner | procedure |
| 6 | Revert the offending change on `main` by pull request, through the normal gates. | the author | live |

**Roll back, or fix forward?** Roll back when the previous version is known good
and the cause is not yet understood. Fix forward when the cause is understood,
the fix is small, and it can go through the gates in the time the problem can be
tolerated. The failure mode to avoid is debugging in production while users are
affected because rolling back felt like an admission.

**Step 6 matters and gets skipped.** After a rollback, production is on an older
version and `main` still contains the bad change. If nothing reverts it, the next
release ships it again. A rollback is not finished until `main` and production
agree about what is good.

---

## 3. Hotfix

Production is wrong, the previous version is not an acceptable place to be, and
the fix cannot wait in the normal queue.

| # | Step | Who or what | Status |
|---|---|---|---|
| 1 | Branch from `main`. | the author | live |
| 2 | Smallest possible change. One concern. A hotfix that touches three things is three changes being smuggled past the queue, not one being hurried through it. | the author | procedure |
| 3 | Pull request titled `fix: ...`, so the version moves a patch. | the author | live |
| 4 | The full gate set runs. Nothing is skipped. | `ci.yml` | live |
| 5 | Review and approval. Faster, not absent. | the reviewer | required by the ruleset, as in step 6 of a normal release, with the same caveat: with one account, it is satisfied only by admin bypass |
| 6 | Squash merge, cut the release, deploy. | as in a normal release | phase 2 and 3 |
| 7 | Write down what the gates would have had to check to have caught this, and whether that check is worth adding. | the author | procedure |

**The gates are not skipped for a hotfix.** This is the single most important
sentence in this document. A hotfix is new code written quickly by someone under
pressure, which makes it the change most likely to be wrong and therefore the
change that least deserves an exemption. What a hotfix legitimately changes is
its queue position and who gets told, not what it has to pass.

**Step 7 is what separates a hotfix from a habit.** If the same class of problem
reaches production twice, the gate set is the thing that is wrong.

---

## 4. Known gaps, as of phase 1

| Gap | Consequence today | Closed by |
|---|---|---|
| No versioning, tagging or changelog. | A release cannot be named, so there is nothing to roll back to. | phase 2 |
| No deploy. | Production, in the sense used above, does not exist yet. | phase 3 |
| One account, and it is the only admin. | The ruleset is applied and active (ruleset `27090299`), but no pull request can be approved by anyone other than its author, so every merge is an admin bypass. Pull request 1 can only be merged this way, with `gh pr merge 1 --squash --admin`. The bypass is expected to show in the ruleset's insights; that gets confirmed after the merge. An admin can also push to `main` directly; that was tried and it succeeded (commit `ee163c6`). | a second account, so the author of a change is not its only possible reviewer; not scheduled |
| No approval gate on the deploy. | There is no deploy. An approval gate built before there is a deploy would be configuration with nothing to gate. | phase 3 |

This table is the honest version of the project's status. It shrinks as phases
land, and it is not allowed to shrink faster than they do.
