# 0003: private first, and an exact list of what that turns off

**Date:** 2026-11-11
**Status:** accepted, then superseded by events on the same day. The repository
is now public and the ruleset is applied. The list below is kept because it is
the reasoning that produced the checklist, and because the checklist is the part
that ran. Sections marked **Outcome** record what was actually observed.

## The fork

Start this repository public, so that everything GitHub gives away on public
repositories works from the first commit, or start it private and flip it later.

## The decision

Private, under a personal account on the free plan, flipped to public when the
work is ready to be read. Phase 3 is the point at which the flip has to happen,
because deploying and enforcing need it. (As written on the day; the flip in
fact happened during phase 1. See the status line.)

The tradeoff was understood before the choice was made, not discovered
afterwards. What this record adds is the exact list, so that nothing in this
repository claims a control the platform is not currently providing.

## What still works while private

Everything phase 1 consists of. Workflows run. Each gate reports as its own named
check. The pull request title gate works. Artifacts upload and download between
jobs. Code owners, the pull request template and Dependabot all work.

## What did not work while private on a free plan, and what it does now

The middle column was checked against GitHub's own documentation on 2026-11-11.
The right-hand column is what was observed after the flip the same day. Every
row in this table moved, which is the whole reason the flip was worth bringing
forward.

| Feature | While private on the free plan | After the flip, observed |
|---|---|---|
| Repository ruleset enforcement on `main` | Not enforced. Rulesets on private repositories are a paid plan feature. The API returned `403 Upgrade to GitHub Pro or make this repository public to enable this feature.` on a plain `GET` of the rulesets list. | **Active.** `POST` of `.github/rulesets/main.json` created ruleset `27090299`, `enforcement: active`, five rule types, seven required checks. |
| Direct push to `main` | Permitted, with nothing in the way. | **Permitted for the admin**, logged as a bypass: observed, see the Outcome below. Refused for a non-admin: inferred from the ruleset configuration; not observed, because no non-admin account exists. This one did not become a clean "no". |
| Red required check blocks a merge | Did not block. Pull request 2 read `MERGEABLE` with two red checks. | Pull request 2 reads `mergeStateStatus: BLOCKED`. That state is composite and the pull request is also `REVIEW_REQUIRED`, so the red checks are isolated only by comparison with pull request 1 (same missing review, seven green). |
| Environment protection rules: required reviewers, wait timers | Not available on the free plan for private repositories, and configured rules are ignored if a public repository is made private. | Available. Not yet configured; that is phase 3 work and is not claimed. |
| GitHub Pages publishing | Requires a paid plan for a private repository. | Available. Not yet configured; phase 3. |
| Code scanning | Free for public repositories. For private repositories it needs GitHub Advanced Security. | Available. Not yet configured; phase 4. |
| Dependency review on pull requests | Same: public, or Advanced Security. | Available. Not yet configured; phase 4. |
| Artifact attestations | Free for public repositories. | Available. Not yet configured; phase 4. |

The distinction in the last four rows is the one worth holding onto: the
platform capability became available, and nothing was built on it. "Available"
is not "in place", and this table says which is which rather than letting the
flip imply the work.

## What follows, and this is the part that matters

**The ruleset is committed as configuration, not applied as theatre.**
`.github/rulesets/main.json` is an importable ruleset definition in the
repository. It was read, reviewed and version controlled before it was applied,
and it was applied by posting that file to the API rather than by clicking
through a settings page, so the live rule and the committed file have the same
origin. It is still the file that would be re-imported if the ruleset were ever
deleted or drifted.

What the committed file is *not* is proof that the rule is active. A file in a
repository and a rule on a branch are two different things, and the first does
not imply the second — it did not for the several days this file sat here
unapplied. The proof is the applied ruleset id and the observed pull request
states, recorded above.

**No control is built that would silently do nothing.** The specific trap is a
deploy environment with required reviewers configured on a private free
repository: the configuration exists, the approval prompt never appears, and the
pipeline looks gated while nothing is gating it. That is worse than an
ungated deploy, because an ungated deploy is at least visibly ungated. So the
approval gate is not built until phase 3, on a repository where it works.

**Every document marks pending controls as pending.** `docs/quality-gates.md`
has a column for it. `docs/requirements.md` says it under REQ-1.
`docs/RELEASE.md` marks each step live, phase 2 or phase 3. The project's status
is legible at any moment, including the parts that are not done.

## The post-flip checklist

Ran on 2026-11-11. The order below is the order it ran in, and it was reordered
once during the run: step 1 moved to the front because making the merge-method
setting true was the cheapest of the fixes and needed no flip.

**Step 0, which was not on the original list and should have been.** Going
public is one-way: every commit on every branch becomes world-readable at the
moment of the flip, including anything deleted in a later commit. Sweep the full
object history, not the working tree, before flipping. What was swept: hard-coded
credentials and token patterns, `-----BEGIN` key blocks, `.env` files, anything
named in `.gitignore` that was committed anyway, absolute home-directory paths,
personal email, street address and phone number, and any employer-identifying
material. Method: `git grep` over `git rev-list --all`, plus a per-branch
`git ls-tree` diffed against `.gitignore`, plus a blob-size scan for committed
binaries. Result: clean. The only personal datum in the repository is the commit
author email, which is the same address already public on six other repositories
under the same account, so the flip disclosed nothing new.

1. Set the repository to allow squash merging only and disable the other two.
   **Outcome:** done, verified by API. Before, all three were `true`, which
   meant decision record 0002's claim that there was "no route to a merge commit
   on `main`" was false at the time it was written. The setting was changed to
   match the record rather than the sentence softened to match the setting.
2. Make the repository public. **Outcome:** `visibility: public`,
   `private: false`.
3. Import `.github/rulesets/main.json` into the repository's rulesets.
   **Outcome:** ruleset `27090299`, `enforcement: active`.
4. Confirm the required status check names in the ruleset match the check names
   of a real run, character for character. A renamed job and a stale ruleset
   blocks every pull request on a check that will never report. **Outcome:**
   all seven match. The run on pull request 1 reports `lint`, `typecheck`,
   `test`, `audit`, `build`, `e2e`, `pr-title`; the ruleset requires exactly
   those seven, and pull request 1 shows all seven green rather than any of them
   stuck pending, which is what a name mismatch would look like.
5. **Confirm the bypass actor is the actor that was intended.** This step was
   added after review and it is the step most likely to be skipped, because a
   wrong `actor_id` fails silently: the ruleset applies cleanly, the API echoes
   the number back, and nothing tells you the number names a different role than
   you meant. `.github/rulesets/main.json` carries
   `{"actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always"}`,
   intending the repository admin role. There is no endpoint on a user-owned
   repository that resolves a base repository role id to its name, so the id
   cannot be confirmed by lookup; it has to be confirmed by behaviour.
   **Outcome:** confirmed empirically by step 6. The account that pushed holds
   the admin role and no other, the push was accepted, and GitHub attributed it
   to a bypass. Had `5` named `write` or `maintain`, an admin-only account would
   have had no bypass and the push would have been refused. `5` is the admin
   role.
6. Attempt a direct push to `main` and record what happens — not "capture the
   refusal", which is what the original wording said and which presumed the
   answer. **Outcome: the push succeeded.** Server output:

   ```
   remote: Bypassed rule violations for refs/heads/main:
   remote: - Changes must be made through a pull request.
   remote: - 7 of 7 required status checks are expected.
      a4fb3a5..ee163c6  main -> main
   ```

   This is the correct behaviour for the configuration and the wrong behaviour
   for the requirement. It is recorded as-is in `docs/requirements.md` under
   REQ-1.1. An attempt to rewrite `main` back to `a4fb3a5` afterwards was
   declined by local tooling policy, so commit `ee163c6` stays on `main` as a
   permanent artifact of the test. On reflection that is the better outcome:
   `main` now carries one commit that provably did not pass a gate, and anyone
   reading the history can see it.
7. Re-check that a red gate now blocks. **Outcome:** pull request 2,
   `mergeStateStatus: BLOCKED`, with `lint` and `pr-title` red.
8. Then, and only then, build the deploy and its approval gate. **Not done.**
   Phase 3.

## How phase 1 itself reached `main`

By logged admin bypass. Pull request 1 is authored by `keonikaku`, which is the
repository's only account and its only admin. GitHub does not let an author
approve their own pull request, so the ruleset's approval and code owner
requirements cannot be satisfied by any account that exists, and the pull request stays
`BLOCKED` on `REVIEW_REQUIRED` with all seven checks green. It is merged with
`gh pr merge 1 --squash --admin`, which GitHub records as a bypass. This is the
weakness accepted below, happening on the first change it applies to, and it is
recorded here rather than left for a reader to discover in the merge record.

## Cost accepted

Before the flip, the strongest claims this repository could make about `main`
were conventions held by the people working in it, and two documents stated
those conventions in language that read as enforcement. That is the failure the
flip was brought forward to end.

What is accepted after the flip is narrower and lasts until there is a second
account: the admin bypass. This ruleset requires an approving review, and a
single maintainer cannot approve their own pull request, so with the bypass
removed nothing could merge at all. The alternatives were to remove the review
requirement and enforce the remaining rules on admins, which is the shape of
`release-gate-api`'s configuration (its branch protection has `enforce_admins: true` and
no required review) and which buys a gate with no exception at the cost of no
required review; or to split admin onto a second account, which is what an
organisation would do. Neither was chosen here, because the review requirement
is part of what this repository is meant to show. The bypass stays, it is named
in `docs/requirements.md`, `docs/quality-gates.md` and in the meeting brief, and
it is described as a weaker control rather than as a control.
