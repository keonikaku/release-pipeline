# Release runbook

**Status:** first written in phase 1, before any release or deploy automation
existed. The normal release section was rewritten in phase 2 to describe the
automation that now exists, step by step, rather than the automation that was
intended.

A runbook written first is a requirement on the automation; a runbook written
after is a description of whatever the automation happened to do. This one is
both, in that order, and each step says which it is:

- **live** means it runs today and has been watched doing it.
- **built, not yet run** means the workflow for it is merged or in the phase 2
  pull request, and it has never run for real. It runs for the first time after
  the phase 2 pull request is merged and the release App exists (decision
  record 0004). What it is expected to do is stated; what it actually did gets
  written here after it does it.
- **phase 3** means deploying to production and the rollback path.

Nothing below is marked live unless it is.

---

## 1. Normal release

The release of a standard change, from branch to a published release, and then
to production.

| # | Step | Who or what | Status |
|---|---|---|---|
| 1 | Branch from `main`. Branch name has no mechanical meaning; the commits do. | the author | live |
| 2 | Commit using conventional commit subjects. | the author | live |
| 3 | Open a pull request. The title must parse as a conventional commit, because it becomes the squash commit subject and so the changelog entry. Its type decides the version: `feat` moves the minor, `fix` and `perf` the patch, `!` after the type is breaking. Below 1.0.0 a breaking change moves the minor, not the major (`bump-minor-pre-major` in `release-please-config.json`). | the author, checked by job `pr-title` | live |
| 4 | Fill in the template: what changed, release impact, how it was verified, and how to undo it. | the author | live, by convention |
| 5 | Gates run: `lint`, `typecheck`, `test`, `audit`, `build`, then `e2e` against the artifact `build` produced. | `ci.yml` | live |
| 6 | Review and approval. Pipeline and governance files need a code owner. | the reviewer | required by ruleset `27090299`, active. Never yet satisfied on a change: the only account is the author of every change pull request and the only admin, so every change merges by admin bypass. A non-admin being held to it is inferred from the ruleset; not observed, because no non-admin account exists |
| 7 | Squash merge. The pull request title becomes the one commit subject on `main`. | the person merging | live for a pull request with more than one commit. Observed: pull request 1 had six commits and landed as `feat: add the pull request gate set and the repository rules (#1)`. **Pending for a single-commit pull request:** the repository's `squash_merge_commit_title` is `COMMIT_OR_PR_TITLE` (observed), GitHub's default, which uses the commit subject instead of the title when there is only one commit. See section 4 |
| 8 | `release.yml`, job `release-please`, opens one release pull request, or updates the open one, carrying the next version, the `CHANGELOG.md` entry and the version in `package.json` and `package-lock.json`. It stays open and accumulates every change merged after it, until someone merges it. | `release.yml`, `release-please` | built, not yet run. Dry run on 2026-11-12 (below): it would open `chore(<branch>): release 0.1.0` with a Features section |
| 9 | The gates run on the release pull request, as on any other. | `ci.yml`, started by the App's token | built, not yet run. This is the step that needed a decision: decision record 0004 |
| 10 | Decide to cut. Merging the release pull request is the decision, and it is a human one. | the release owner | built, not yet run. Expected to be the first pull request here that its code owner can approve rather than bypass, because its author is the App and not Keoni: inferred, confirmed on the first one |
| 11 | release-please tags the merge commit and creates the GitHub Release as a **draft**, with the changelog entry as its notes. | `release.yml`, `release-please` | built, not yet run |
| 12 | The full gate set runs again on the tagged commit: `ci.yml` called as a reusable workflow, so it is the same jobs, not a copy. | `release.yml`, `verify` | built, not yet run |
| 13 | The build that `verify` tested is checked against the tag (`build-info.json`: version, commit, clean tree), packaged as `release-pipeline-v<version>.tar.gz` with a SHA-256 file, attached, and the release is published. | `release.yml`, `publish` | built, not yet run |
| 14 | The tag is deployed to production. | deploy workflow | phase 3 |
| 15 | Smoke checks run against the deployed address, not against a local build. | deploy workflow, `@smoke` tagged specs | phase 3 |

**What a failure in steps 11 to 13 leaves behind.** A tag, and a draft release
that only people with write access can see. Nothing public is incomplete. The
fix goes through the normal gates as a `fix:`, which puts it in the next release
pull request with the next patch version. The draft is then deleted by hand,
`gh release delete v<version>`, leaving the tag, because a tag that once existed
should not quietly start pointing somewhere else.

**The dry run behind step 8.** On 2026-11-12, release-please 17.6.0, the same
version `release-please-action@v5` bundles, was run in `--dry-run` mode with the
phase 2 branch standing in for `main` (scratch run `43182248218`, branch since
deleted). Output, trimmed to the parts that matter:

```
Would open 1 pull requests
title: chore(feat/phase-2-release): release 0.1.0
## 0.1.0 (2026-11-12)
### Features
* add release-please with a draft-then-publish release (96df069)
* add the pull request gate set and the repository rules (#1) (20b6f10)
* write build-info.json so a build names the commit it came from (541dfb3)
✔ updating from 0.0.0 to 0.1.0
```

What that shows: the config and manifest load, the starting version is 0.1.0,
`test:` and `chore:` commits are left out of the changelog, and the squash
commit from pull request 1 is grouped under its type with its pull request
linked (links shortened above). What it does not show: on `main` the scope is
`main` and the phase 2 branch's commits will be one squash commit; and a dry run
writes nothing, so no step after step 8 is exercised by it.

**Why step 10 is a human.** Everything before it is mechanical and should be.
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
   changes that went into it. With the default workflow token they would not
   have run at all without a manual approval; that is why the release pull
   request is opened with a GitHub App token (decision record 0004). If the
   checks on a release pull request are missing or waiting rather than green,
   do not merge it: something is wrong with the App, and an admin bypass would
   merge straight past it.

### A stranded draft release

`release.yml` never cancels a running release, but GitHub keeps at most one
pending run per concurrency group: if a push to `main` arrives while one run is
going and another is already waiting, the waiting run is cancelled. Suppose the
cancelled run was the one for the release pull request's merge commit. The next
run, on a later commit, still sees the merged release pull request, so
release-please tags the merge commit and creates the draft, and then the
tagged-vs-built check fails, because that run checked out a different commit.
Nothing wrong is published. The draft and its tag are stranded, and the release
pull request is already labelled `autorelease: tagged`, so no later run will
pick it up again.

Cleanup, a procedure not yet run (no release has been cut here):

1. Note the tag from the failed check's error line, and confirm the draft with
   `gh release view <tag> --json isDraft`.
2. Delete the draft and its tag: `gh release delete <tag> --cleanup-tag`.
3. On the merged release pull request, swap the label back:
   `gh pr edit <n> --remove-label "autorelease: tagged" --add-label "autorelease: pending"`.
4. In **Actions**, **Release**, open the cancelled run for the release pull
   request's merge commit and **Re-run all jobs**. That run checks out the merge
   commit, so release-please recreates the draft there, the check passes, and
   `verify` and `publish` run as normal.
5. Record which tag was removed and re-cut, and why.

Do not publish the stranded draft by hand. Its build was never checked against
its tag, which is the one thing the draft-then-publish order guarantees.

---

## 2. Rollback

Production is wrong. The previous version was right. No new code is written.

| # | Step | Who or what | Status |
|---|---|---|---|
| 1 | Decide to roll back rather than fix forward. Criterion below. | the release owner | procedure |
| 2 | Identify the last known good tag from the release list, `gh release list`. Each release names its commit and carries the build that was tested. | the release owner | built, not yet run: there are no releases yet |
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
| 6 | Squash merge, then merge the release pull request to cut, then deploy. A hotfix does not get its own release path: it rides the same release pull request, which is cut as soon as the fix is in it. | as in a normal release | cut: built, not yet run. Deploy: phase 3 |
| 7 | Write down what the gates would have had to check to have caught this, and whether that check is worth adding. | the author | procedure |

**The gates are not skipped for a hotfix.** This is the single most important
sentence in this document. A hotfix is new code written quickly by someone under
pressure, which makes it the change most likely to be wrong and therefore the
change that least deserves an exemption. What a hotfix legitimately changes is
its queue position and who gets told, not what it has to pass.

**Step 7 is what separates a hotfix from a habit.** If the same class of problem
reaches production twice, the gate set is the thing that is wrong.

---

## 4. Known gaps, as of phase 2

| Gap | Consequence today | Closed by |
|---|---|---|
| The release App does not exist yet. | `release.yml` is built and its first step fails until the variable `RELEASE_APP_CLIENT_ID` and the secret `RELEASE_APP_PRIVATE_KEY` exist (observed on a scratch branch). No release pull request, tag or release has ever been created. | Keoni creates the App, per decision record 0004, before the phase 2 pull request is merged |
| A single-commit pull request lands with its commit subject, not its title. | The `pr-title` gate checks the title. With `squash_merge_commit_title: COMMIT_OR_PR_TITLE` (observed, GitHub's default), a one-commit pull request's squash subject is its commit subject, which no gate checks, and that subject is what release-please versions from. | Keoni sets **Settings, General, Pull Requests, Allow squash merging, Default commit message** to **Pull request title** (API: `squash_merge_commit_title=PR_TITLE`, `squash_merge_commit_message=BLANK`). Pull request title, not Pull request title and commit details: with commit details, a `BREAKING CHANGE:` footer in a branch commit's body is copied into the squash commit, where release-please reads it and no gate checks it; with the title only, the gated pull request title is the whole commit. An agent attempt to change it was declined by tooling policy, so it is left to him |
| No deploy. | Production, in the sense used above, does not exist yet. | phase 3 |
| One account, and it is the only admin. | The ruleset is applied and active (ruleset `27090299`), but no pull request can be approved by anyone other than its author, so every merge is an admin bypass. Pull request 1 was merged this way on 2026-11-12 (UTC), with `reviewDecision: REVIEW_REQUIRED` at merge. That bypass is recorded: the ruleset's rule-suites API (`gh api repos/keonikaku/release-pipeline/rulesets/rule-suites`), queried on 2026-11-12 (UTC), lists `20b6f10` (pull request 1's merge) and `ee163c6` (the direct-push test), each with result `bypass` and actor `keonikaku`. An admin can also push to `main` directly; that was tried and it succeeded (commit `ee163c6`). The release pull request is expected to be the exception, because the App and not Keoni is its author (decision record 0004); inferred, not observed. | a second account, so the author of a change is not its only possible reviewer; not scheduled |
| No approval gate on the deploy. | There is no deploy. An approval gate built before there is a deploy would be configuration with nothing to gate. | phase 3 |

This table is the honest version of the project's status. It shrinks as phases
land, and it is not allowed to shrink faster than they do.
