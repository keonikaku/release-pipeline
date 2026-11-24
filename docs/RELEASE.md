# Release runbook

**Status:** first written in phase 1, before any release or deploy automation
existed. The normal release section was rewritten in phase 2 to describe the
automation that now exists, step by step, rather than the automation that was
intended.

A runbook written first is a requirement on the automation; a runbook written
after is a description of whatever the automation happened to do. This one is
both, in that order, and each step says which it is:

- **live** means it runs today and has been watched doing it.
- **built, not yet run** means the workflow for it is merged and it has never
  run for real. What it is expected to do is stated; what it actually did gets
  written here after it does it. The release steps carried this marking until
  the first release, 0.1.0, ran them on 2026-11-21 (UTC); each now says what was
  observed, and how many times.
- **phase 3** means deploying to production and the rollback path, where the
  part is not built yet. Phase 3 is built in slices; a step built by a merged
  or in-review slice is marked "built, not yet run" like any other.

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
| 6 | Review and approval. Pipeline and governance files need a code owner. | the reviewer | required by ruleset `27090299`, active. Satisfied three times, and only on release pull requests (11; 19 for `v0.3.0`; 24 for `v0.4.0`; each approved by `keonikaku`, rule-suites `pass`): the only account is the author of every change pull request and the only admin, so every change pull request merges by admin bypass (pull request 16, `6074278`: result `bypass`). Release pull requests 11, 19 and 24 are the exception, because their author is the App (step 10). Release pull request 11 changed `.release-please-manifest.json`, which `.github/CODEOWNERS` assigns to `@keonikaku`, and the owner approved it. The rule-suite reports `pull_request: pass` without itemizing code-owner review, so attributing the pass to code-owner review is inferred. No workflow or ruleset change has been through code-owner review. A non-admin being held to the rule is inferred from the ruleset; not observed, because no non-admin account exists |
| 7 | Squash merge. The pull request title becomes the one commit subject on `main`. | the person merging | live for a pull request with more than one commit. Observed: pull request 1 had six commits and landed as `feat: add the pull request gate set and the repository rules (#1)`. **Pending for a single-commit pull request:** the repository's `squash_merge_commit_title` is `COMMIT_OR_PR_TITLE` (observed), GitHub's default, which uses the commit subject instead of the title when there is only one commit. See section 4 |
| 8 | `release.yml`, job `release-please`, opens one release pull request, or updates the open one, carrying the next version, the `CHANGELOG.md` entry and the version in `package.json` and `package-lock.json`. It stays open and accumulates every change merged after it, until someone merges it. | `release.yml`, `release-please` | live, observed four times. Pull request 6, `chore(main): release 0.1.0`, opened by `app/release-pipeline-releaser` on 2026-11-21, then updated by the run for pull request 7's merge (`44881640213`) to add that change under Pipeline. The first attempt to open it failed: see "The first release, as observed" below. The second, pull request 11, `chore(main): release 0.2.0`, was opened by the same App and merged on 2026-11-23. The third, pull request 19, `chore(main): release 0.3.0`, opened by `app/release-pipeline-releaser` on 2026-11-23 and merged on 2026-11-24 (merge commit `7e868e9`). The fourth, pull request 24, `chore(main): release 0.4.0`, opened by `app/release-pipeline-releaser` at 2026-11-24T02:44:49Z and merged at 19:57:17Z the same day (merge commit `fb75400`) |
| 9 | The gates run on the release pull request, as on any other. | `ci.yml`, started by the App's token | live, observed four times. Both CI runs on pull request 6 (`44880786395`, `44881659622`) were triggered by `release-pipeline-releaser[bot]` and started the moment they were created, with no approval hold. The first failed `lint` on the manifest release-please writes, fixed by pull request 7 (`docs/quality-gates.md`); the second passed all seven gates. This is the step that needed a decision: decision record 0004. Pull request 11 reported all seven checks passing (`audit`, `build`, `e2e`, `lint`, `pr-title`, `test`, `typecheck`) when it was merged. Pull request 19's last CI run, `45297320158`, was triggered by `release-pipeline-releaser[bot]` and succeeded, and the pull request reported all seven checks passing when it was merged. Pull request 24's last CI run, `45475279630`, was triggered by `release-pipeline-releaser[bot]` and succeeded, and the pull request reported all seven checks passing when it was merged |
| 10 | Decide to cut. Merging the release pull request is the decision, and it is a human one. | the release owner | live, observed four times. Pull request 6 (2026-11-21, merge commit `68ac3f9`) was merged by admin bypass with no review given (rule-suites: `68ac3f9`, result `bypass`). Pull request 11 (2026-11-23, merge commit `c1e5fe3`) was approved by `keonikaku` first, then merged, and the rule-suites API lists `c1e5fe3` with result `pass`, actor `keonikaku`: the first merge here without a bypass. So a person can approve a pull request the App authored, and that approval is the recorded release decision. In the web interface, the review path on such a pull request is **Add your review**, **Approve**, **Submit review**, then **Squash and merge** and its confirmation. Which buttons were clicked is Keoni's report; the approval and the merge result are observed. Pull request 19 (2026-11-24, merge commit `7e868e9`, 00:33:07Z) was approved by `keonikaku` and merged; the rule-suites API lists `7e868e9` with result `pass`, actor `keonikaku`. Pull request 24 (2026-11-24, merge commit `fb75400`, 19:57:17Z) was approved by `keonikaku` at 19:56:47Z and merged; the rule-suites API lists `fb75400` with result `pass`, actor `keonikaku` |
| 11 | release-please tags the merge commit and creates the GitHub Release as a **draft**, with the changelog entry as its notes. | `release.yml`, `release-please` | live, observed four times. Release run `44881812501` tagged `v0.1.0` at `68ac3f9`, the merge commit, and its check confirmed that is the commit it builds. That the release existed as a draft before `publish` is set by `draft: true` in `release-please-config.json`; the draft state itself was not captured while it lasted. Run `45272659038` tagged `v0.2.0` at `c1e5fe3`, the merge commit of pull request 11. `v0.2.0` was seen as a draft in `gh release list` while that run was in progress: a CLI observation made during the run, which cannot be read afterward, because the release is now published. Run `45298078098` tagged `v0.3.0` at `7e868e9`, the merge commit of pull request 19, and its check logged "v0.3.0 tagged at 7e868e9..., which is the commit this run builds". That `v0.3.0` was a draft before `publish` is inferred from `draft: true` and the publish order, not observed: its draft state was not captured while it lasted. Run `45475640451` tagged `v0.4.0` at `fb75400`, the merge commit of pull request 24; its draft state was likewise not captured, so it is inferred the same way |
| 12 | The full gate set runs again on the tagged commit: `ci.yml` called as a reusable workflow, so it is the same jobs, not a copy. | `release.yml`, `verify` | live, observed four times. Run `44881812501`: `build`, `audit`, `test`, `lint`, `typecheck` and `e2e` passed on `68ac3f9`; `pr-title` skipped, as designed on a push. Run `45272659038` on `c1e5fe3` passed the same six and skipped `pr-title` the same way. Run `45298078098` on `7e868e9` passed the same six and skipped `pr-title`. Run `45475640451` on `fb75400` passed the same six and skipped `pr-title` |
| 13 | The build that `verify` tested is checked against the tag (`build-info.json`: version, commit, clean tree), packaged as `release-pipeline-v<version>.tar.gz` with a SHA-256 file, attached, and the release is published. | `release.yml`, `publish` | live, observed four times. Run `44881812501`: `build-info.json` named version `0.1.0`, commit `68ac3f9`, `dirty: false`; `release-pipeline-v0.1.0.tar.gz` and `release-pipeline-v0.1.0.tar.gz.sha256` attached; `v0.1.0` published at 2026-11-21T07:48:19Z, not a draft. The downloaded asset matches its checksum. Run `45272659038`: `v0.2.0` published at 2026-11-23T21:45:17Z with `release-pipeline-v0.2.0.tar.gz` and its `.sha256`; the live `build-info.json` later named `0.2.0` at `c1e5fe3`, `dirty: false`. Run `45298078098`: `v0.3.0` published at 2026-11-24T00:34:23Z, not a draft, with `release-pipeline-v0.3.0.tar.gz` and its `.sha256`; the live `build-info.json` later named `0.3.0` at `7e868e9`, `dirty: false`. Run `45475640451`: `v0.4.0` published at 2026-11-24T19:58:37Z, not a draft, Latest, with `release-pipeline-v0.4.0.tar.gz` and its `.sha256`; the live `build-info.json` later named `0.4.0` at `fb75400`, `dirty: false`. **From `v0.4.0` on, observed once:** before the publishing edit, `publish` adds a "How to roll back" block to the notes, naming the previous published release, and that same edit publishes. On `v0.4.0` the block names `v0.3.0` (`7e868e9906b098ded995f88d927de45f27bfda08`). If there is no previous published release the job fails and the release stays a draft (built, not observed in a real release). See "The rollback block in every release" |
| 14 | The tag is deployed to production: the build stored on the release, checked against its SHA-256 and its `build-info.json`, published to GitHub Pages. Nothing is rebuilt. | `release.yml`, job `deploy`, calling `deploy.yml`; or `deploy.yml` started by hand (below) | by hand: live, observed six times (runs `44885617089`, `44898452699`, `44975134415`, the rollback drill's `45278248966` and `45281128227`, and `45290589637`, `v0.2.0` over itself, the first run of the live bytes check), first in run `44885617089` (dispatched from `main` on 2026-11-21, deployed `v0.1.0`; `https://keonikaku.github.io/release-pipeline/build-info.json` then served version `0.1.0`, commit `68ac3f9`). Started by the release: live, observed three times: run `45475640451` (2026-11-24) deployed `v0.4.0` at `fb75400` over `v0.3.0` after waiting at the gate (deployment `waiting` 19:58:51Z to `queued` 20:00:06Z), and the live `build-info.json` then served `0.4.0`, commit `fb754008aeeec07d42d3eb943a5ca84c1e6248a7`, `dirty: false`; run `45298078098` (2026-11-24) deployed `v0.3.0` at `7e868e9` over `v0.2.0` after waiting at the gate, and the first, run `45272659038` (2026-11-23), deployed `v0.2.0` at `c1e5fe3` after waiting at the approval gate (the deployment left `waiting` at 21:48:06Z and the `deploy / deploy` job started at 21:48:07Z; the API gives no approval timestamp); the live `build-info.json` then served `0.2.0`, commit `c1e5fe312d6e0230f8c12c1e2ea6ec706c9aa1da`, `dirty: false`. It waits at the approval gate either way. See "Deploy on release" |
| 15 | Smoke checks run against the deployed address, not against a local build. | `deploy.yml`, job `smoke`, the `@smoke` tagged specs | live, observed eight times (the sixth, run `45290589637`, `v0.2.0` over itself: 3 passed, 1 skipped, after the live bytes check; the seventh, run `45298078098`, `v0.3.0` over `v0.2.0`: 4 passed, nothing skipped; the eighth, run `45475640451`, `v0.4.0` over `v0.3.0`: 7 passed, 0 skipped, the landing specs included), first (phase 3, slice 2) in run `44898452699`, dispatched from `main` on 2026-11-21 with `v0.1.0`, smoke `3 passed`, all four jobs green, 65 seconds from the run's creation to its end. That deploy put `v0.1.0` over `v0.1.0`, so the wait for the CDN to serve a new build was not exercised there. Smoke succeeded again in run `44975134415` (also `v0.1.0` over itself) and in run `45272659038`, the first version change (`v0.2.0` over `v0.1.0`): `3 passed`, the job running 21:48:18Z to 21:48:43Z, and the first poll matched: the three tests took 903 ms and the first retry interval is 2 seconds (inferred from those two numbers), and that read came about 22 seconds or more after the deployment succeeded (21:48:17Z to the smoke step at 21:48:39Z). Nothing distinguishes a cache purge from a cache miss. At that run, a version change had been smoked once; the first poll matched; the wait path has still not been shown to be exercised. It does not show that deploys purge the cache, and the 660 second wait stays. The rollback drill smoked two more version changes, 3 of 3 each (runs `45278248966`, `v0.1.0` over `v0.2.0`, and `45281128227`, back). Test-only times from their smoke logs: "3 passed (2.6s)" and "3 passed (1.3s)"; the first retry is at 2 seconds (`e2e/gates.spec.ts`, intervals `[2_000, 5_000, 10_000]`). Inferred: the roll forward's first poll matched (1.3s is under 2s). Undetermined for the rollback: 2.6s does not rule out one 2 second retry. Poll attempts are not logged, so the wait path is still not shown to be exercised. The same specs as the `e2e` gate, pointed at the address the deploy reported, plus an exact check that the live `build-info.json` names the version and commit the deploy verified. A failure fails the run |

**The first release, as observed.** Pull request 4 (phase 2) merged on
2026-11-21. Its `Release` run, `44880301485`, failed on the first attempt at
the step that mints the App token: the workflow asked for `contents`,
`pull-requests` and `issues` write, and GitHub answered "The permissions
requested are not granted to this installation" (HTTP 422). The workflow did
not fall back to the default token; it stopped, as decision record 0004
intends. Keoni corrected the App's permissions and accepted them on the
installation. What was wrong was observed on the App's settings page in a
browser before the fix: Actions read and write, Contents no access. GitHub's
updated-permissions screen then listed Contents read and write as a new
request, and Actions as no longer required. None of this is readable through
the API with a user token. The 422 came from the missing Contents permission,
not from the extra Actions one. The second attempt of the same run passed and
opened pull request 6. Pull request 6's `lint` gate then failed. The cause was
a configuration mismatch, not a code defect: release-please writes the manifest
in compact form, and Biome's formatter wanted it spaced. Pull request 7 fixed
it before the release was cut (`docs/quality-gates.md`). Every `Release` run on
`main` since has passed.

**What a failure in steps 11 to 13 leaves behind.** Not yet observed: steps 11
to 13 have run four times (`v0.1.0`, `v0.2.0`, `v0.3.0`, `v0.4.0`) and none failed. A tag, and a draft release
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

### release-please failing with no message

Observed once: the `Release` run for pull request 12's merge (`44885601257`,
2026-11-21) failed its first attempt in **Open or update the release pull
request, or tag a merged one**, straight after `Fetching package.json from
branch main`, with `release-please failed:` and nothing after it. Cause
unknown. **Re-run failed jobs** on the same run passed (attempt 2), and
updated the release pull request as normal. Nothing was tagged or released by
the failed attempt. If it happens again, re-run; if a re-run fails too, read
the step's full log before anything else.

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

Cleanup, a procedure not yet run (no draft has been stranded here):

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
| 2 | Identify the last known good tag from the release list, `gh release list`. Each release names its commit and carries the build that was tested. From `v0.4.0` on, the notes of each release also name the tag before it, under "How to roll back". | the release owner | the block in the notes: observed once, on `v0.4.0`, whose notes end with "How to roll back" naming `v0.3.0` (`7e868e9906b098ded995f88d927de45f27bfda08`), written by the `publish` step of run `45475640451` (see "The rollback block in every release"); not yet used for a rollback. Live for the list: `gh release list` shows `v0.4.0` (Latest), `v0.3.0`, `v0.2.0` and `v0.1.0` (queried 2026-11-24 UTC), and `gh release view v0.1.0` shows its build attached. Used for a rollback once, in the drill (phase 3, slice 5, 2026-11-23 UTC): `v0.1.0` was the tag put back under `v0.2.0`. A drill, so `v0.2.0` was not actually bad |
| 3 | Run the deploy workflow manually against that tag, from the web interface (click path under "Deploying a release, or rolling back to one"), and approve it when it waits. It deploys that release's stored, tested build, not a rebuild of its source. | `deploy.yml`, manual trigger | live, observed nine times: `v0.1.0` by hand in runs `44885617089`, `44898452699` and `44975134415`; `v0.2.0` started by the release in run `45272659038`; then the drill, by hand from `main`: run `45278248966` put `v0.1.0` over `v0.2.0` (the rollback) and run `45281128227` put `v0.2.0` back (the roll forward); and run `45290589637`, `v0.2.0` over itself, by hand; `v0.3.0` started by the release in run `45298078098`; and `v0.4.0` started by the release in run `45475640451`. Used for a rollback once, in a drill |
| 4 | Smoke checks run against the deployed address. A rollback that is not verified is a hope. | `deploy.yml`, job `smoke` | live, observed eight times on a deploy (runs `44898452699` and `44975134415`, `v0.1.0` over itself; `45272659038`, `v0.2.0` over `v0.1.0`; the drill's two runs; `45290589637`, `v0.2.0` over itself, with the live bytes check; `45298078098`, `v0.3.0` over `v0.2.0`; and `45475640451`, `v0.4.0` over `v0.3.0`). After a rollback once: run `45278248966`, 3 of 3, run with `main`'s specs (see the known gaps) |
| 5 | Record what was rolled back, from which version to which, and why. | the release owner, starting from the backout record in the deploy run's summary | procedure. The run summary's backout record fills in the three fields: what is reverted (what was deployed over what), who tested it (the smoke suite's result and test count, and the approver, read from the run's review history; both observed on all seven gated deploys, runs `44975134415`, `45272659038`, `45278248966` (the drill's rollback), `45281128227`, `45290589637`, `45298078098` and `45475640451`, each naming `keonikaku` as approver with a test count, from "3 of 3" to "3 passed, 1 skipped", "4 of 4" and "7 of 7"), and how long it took against the 15 minute target, from the run's creation to smoke green. Who started the run is recorded alongside. The why is still written by the release owner. Observed once on a rollback, the drill below: run `45278248966`'s record named `v0.1.0` over `v0.2.0`, 3 of 3, approver `keonikaku`, 11m 31s. The run has no field for the why and its approval comment was empty; the reason, a rehearsal, was given by Keoni outside the run, not observed in GitHub |
| 6 | Revert the offending change on `main` by pull request, through the normal gates. | the author | live as the normal pull request path; not exercised by the drill, which had no offending change, so nothing was reverted on `main` |

**Roll back, or fix forward?** Roll back when the previous version is known good
and the cause is not yet understood. Fix forward when the cause is understood,
the fix is small, and it can go through the gates in the time the problem can be
tolerated. The failure mode to avoid is debugging in production while users are
affected because rolling back felt like an admission.

### The rollback drill, observed

Phase 3, slice 5, run on 2026-11-23 (UTC). Nothing was broken: `v0.2.0` was
live and fine, and the drill put `v0.1.0` back over it and then rolled
forward. Every fact below was observed by Keoni in the GitHub web interface
(run pages, review history, the run summary, the smoke logs, and the live
`build-info.json`) unless it says inferred or says otherwise. Nothing new was built for it: the drill used
`deploy.yml` as slices 1 to 4 left it.

- **The rollback, run `45278248966` (Deploy #4).** Started by hand,
  **Run workflow** from `main`, tag `v0.1.0`; created 22:17:29Z. Approved by
  `keonikaku` at the `github-pages` gate. Jobs: `prepare` 8s, `deploy` 12s,
  `smoke` 36s (3 of 3 passed), `record` 4s. The backout record read: what is
  reverted, `v0.1.0` (`68ac3f9fa99eb0956b9930e3a0bfe0379c7deb22`) deployed
  over `v0.2.0` (`c1e5fe312d6e0230f8c12c1e2ea6ec706c9aa1da`); who tested it,
  smoke suite passed, 3 of 3 tests, approver `keonikaku`; how long, 11m 31s
  against the 15 minute target, met. The live `build-info.json` then read
  version `0.1.0`, commit `68ac3f9fa99eb0956b9930e3a0bfe0379c7deb22`,
  `dirty: false`.
- **The roll forward, run `45281128227` (Deploy #5).** Tag `v0.2.0`, created
  22:35:29Z, approved by `keonikaku`. `prepare` 9s, `deploy` 11s, `smoke` 33s
  (3 of 3), record: `v0.2.0` (`c1e5fe3`) deployed over `v0.1.0` (`68ac3f9`),
  approver `keonikaku`, 1m 47s. The live `build-info.json` then read `0.2.0`
  at `c1e5fe312d6e0230f8c12c1e2ea6ec706c9aa1da`, `dirty: false`.
- **Where the 11m 31s went.** The four jobs add up to about one minute, so
  about ten minutes were the wait for approval (inferred from the job
  durations; the API gives no approval timestamp). The target was met
  because the approver was there. Across the gated deploys up to the drill,
  it was met three times (4m 35s, 11m 31s, 1m 47s) and missed once (83m 32s,
  run `44975134415`), each time decided by how long the approval waited: the
  target holds only if the approver is present. Since then it was met twice
  more (7m 43s, run `45290589637`; 7m 10s, run `45298078098`), and once
  more on `v0.4.0` (3m 35s, run `45475640451`), so six met and one missed
  across the seven gated deploys.
- **Step 6 did not apply.** It was a drill with no offending change, so
  nothing was reverted on `main`. The reason, a rehearsal, was given by
  Keoni outside the run: GitHub has no field for it and the approval comments
  were empty, so it is not observed in GitHub.
- **What the drill does not show.** The smoke passed against `v0.1.0` with
  `main`'s specs, but between `v0.1.0` and `v0.2.0` nothing in `src/` or
  `index.html` changed (inferred from `git diff v0.1.0 v0.2.0`: the changes
  are `e2e/gates.spec.ts`, `playwright.config.ts`, the version bump, and
  workflow, script and docs files), so that gap was not stressed; see the
  known gaps. Nor is the CDN wait path shown to have run (see "Deploying a
  release, or rolling back to one", step 4).

### Deploying a release, or rolling back to one

The deploy is phase 3, slice 1, first observed in run `44885617089`. The smoke
checks after it are slice 2, first observed in run `44898452699`. The approval
gate before it is slice 3, first observed in run `44975134415`. Slice 4 starts
the same deploy from a release, observed in run `45272659038`. Slice 5, the
rollback drill above, deployed an older tag over a newer one in run
`45278248966`. One workflow does both jobs
below: deploying the newest tag is a release going live, and deploying an
older one is a rollback.

Once, before the first deploy (repository admin only):

1. **Settings**, **Pages**, **Build and deployment**, **Source**: choose
   **GitHub Actions**. Until this is set, the deploy fails at its first Pages
   step, `Read the Pages site`.
2. **Settings**, **Environments**, `github-pages`. GitHub's Pages
   documentation says the environment is created automatically if it does not
   exist, so it may first appear after the first deploy run; check it then.
   Under **Deployment branches and tags**, choose **Selected branches and
   tags** and add the branch rule `main`, if it is not already that. No
   required reviewers in this step. Done: queried after the first deploy,
   the environment's only rule is a custom branch policy, `main`.
3. The approval gate, same page: see "The deploy approval gate" below for
   each setting. Done: queried on 2026-11-22, the environment requires
   reviewer `keonikaku`, with `prevent_self_review: false` and
   `can_admins_bypass: false`.

Each deploy, in the web interface (the way Keoni runs it; nothing here needs
the command line). Steps 1 and 3 are copied, shortened, into every release's
rollback block, `.github/release-notes/rollback.md`; a change to either step
changes that file in the same pull request (see "The rollback block in every
release").

1. Start it. On the repository's page on github.com: the **Actions** tab, then
   **Deploy** in the left-hand list of workflows, then the **Run workflow**
   button on the right. In the box that opens: **Use workflow from**,
   **Branch: main**; **tag**, the release to deploy, for example `v0.1.0`;
   then the green **Run workflow** button. The run appears at the top of the
   list a few seconds later; click it to follow it.
2. The run refuses, and names the reason, if the run is not from `main`, the
   tag is not a published release, an asset is missing, the archive does not
   match its SHA-256, or its `build-info.json` does not name the tag's version
   and commit with a clean tree.
3. Approve it. Job `deploy` waits, with the run showing **Waiting** and
   "github-pages waiting for review", until a required reviewer approves it.
   On the run's page: the **Review deployments** button in the banner, tick
   `github-pages`, optionally add a comment, then **Approve and deploy**, or
   **Reject**, which fails the run. `prepare` has already verified the build
   by then, so the approver is approving a build that passed its checks. A
   run can wait up to 30 days for approval (GitHub Actions limits, "Gate
   approval time"). Every minute it waits counts toward the backout record's
   time to restore.
4. After the deploy, job `smoke` runs the `@smoke` specs against the live
   address. One of them waits, for up to 660 seconds, for the live
   `build-info.json` to name exactly the version and commit just deployed,
   and stops at the first match. If the smoke fails, the run fails. Why that
   long:
   - Observed: Pages answers through a CDN with `cache-control: max-age=600`
     and `x-cache: HIT`. A query string does not get past it: requests with a
     never-used query string came back with the same age and etag.
   - Inferred from that one header, not observed: a cached copy can be served
     for up to ten minutes, so the first answer after a deploy can be the old
     build. Whether a deploy purges the cache is not established. Five real
     version changes have been smoked. The first three came before the live
     bytes check: run `45272659038`, `v0.1.0` to
     `v0.2.0`, then the drill's `v0.2.0` to `v0.1.0` (run `45278248966`)
     and back (run `45281128227`). Their smoke logs give the time of the
     three tests alone: "3 passed (903ms)", "3 passed (2.6s)" and "3 passed
     (1.3s)". The first retry is at 2 seconds (`e2e/gates.spec.ts`,
     intervals `[2_000, 5_000, 10_000]`). Inferred from those numbers: the
     first poll matched on `45272659038` and on `45281128227`. Undetermined
     on `45278248966`: 2.6s does not rule out one 2 second retry. Poll
     attempts were not logged for those three. On the first of them, the read came
     about 22 seconds or more after the deployment succeeded (21:48:17Z to the
     smoke step at 21:48:39Z). Nothing distinguishes a purge from a cache miss.
     A fourth, `v0.2.0` to `v0.3.0` (run `45298078098`), was checked by the
     live bytes check, which logs its polls: "attempt 1: 4 of 4 files
     match" (observed). A fifth, `v0.3.0` to `v0.4.0` (run `45475640451`),
     logged the same, `elapsed_seconds` 1. The wait path has still not been
     shown to be exercised; five observations are no reason to shorten the
     660 seconds.
   - So the wait covers the whole max-age plus a minute. Visitors get the same
     cached copy, so this wait is part of the real time to restore, and the
     backout record's clock includes it.
5. Read the backout record in the run summary, written by job `record`. Its
   three fields:
   - **What is reverted:** what was deployed over what. The "over" side is read
     from the live `build-info.json`, or is `unknown` if it cannot be read.
   - **Who tested it:** the smoke suite's result and how many of its tests
     passed or failed, and the approver: the login that approved
     `github-pages` in the run's review history, or who rejected it, or
     "none recorded (no reviewer was required, or possibly an admin bypass)".
     That a bypass leaves no entry in the history is inferred, not observed:
     no bypass has happened here, GitHub's docs do not say, and a bypass in
     the web interface takes a comment, so it may be recorded. If the history
     cannot be read or is not the documented list, the record says "could not
     be read" and is still written.
   - **How long:** elapsed time against the 15 minute rollback target,
     measured from the run's creation to smoke green, so it includes time
     spent queued, waiting for a runner, waiting for approval, and waiting
     for the CDN to serve the new build. On a re-run it still counts from
     the first attempt. If the run's creation time cannot be read, it counts
     from the start of `prepare` instead, and the record says that it excludes
     queue time. With no smoke green, the clock runs to the end of the run and
     the record says the site is not restored.

   Alongside them: who started the run, the deploy result, the address, and
   (slice 6, observed three times: runs `45290589637` and `45298078098`, each
   "yes (4 of 4 files; 1 poll(s), 0s)", and `45475640451`, "yes (4 of 4
   files; 1 poll(s), 1s)") whether the live bytes match the stored
   build; see "Is the live site serving the deployed build?". If
   the smoke did not pass, the record opens by saying the live site is not
   verified, with a link to this runbook's Rollback section.

### The rollback block in every release

**Observed once, on `v0.4.0`.** Built by the pull request `ci: add how to
roll back to every release` (pull request 27, `a6daac2`). `v0.4.0` is the
first release published with it, and its notes are the first real
observation of the block (below, "Observed on `v0.4.0`"). The fail-closed
paths further down are still what the workflow is written to do and what a
local dry run of its shell did, not what a real release did.

Every published release from `v0.4.0` on ends its notes with a "How to roll
back" block: the previous good tag, its commit and its release page, the
click path to deploy it, and where the runbook and the drill evidence are.
The person who needs it is reading the release that just went wrong, so the
way back is on that page rather than in a document they have to find first.

Where it comes from:

- **The template**, `.github/release-notes/rollback.md`, with three
  placeholders: `{PREV_TAG}`, `{PREV_COMMIT}`, `{PREV_URL}`. Its click path
  is steps 1 and 3 of "Each deploy" above, shortened. The two must change
  together: a click path in the notes that no longer matches the runbook
  is a wrong instruction given at the worst moment.
- **The step**, `release.yml`, job `publish`, "Write the rollback block
  into the release notes", after the build is checked and packaged and
  before "Attach the build and publish the release". At that point this
  release is still a draft, so the latest published release is the one
  before it: `gh release list --exclude-drafts --exclude-pre-releases
  --limit 1`. Its commit is read from the tag (`gh api
  repos/<repo>/commits/<tag>`), its page from `gh release view`. The step
  checks each value has the expected shape (a `v<major>.<minor>.<patch>`
  tag that is not this release, a 40 character commit, this repository's
  release address), fills the template, and appends it to the body
  release-please wrote. No release is edited in that step.
- **What "latest" means.** Confirmed in the `gh` source (`cli/cli`,
  `pkg/cmd/release/list`, read 2026-11-24): the list asks GitHub for
  releases ordered by `CREATED_AT`, descending by default, filters drafts
  and prereleases out on the client, and keeps paging until it has
  `--limit` releases. A release's `createdAt` here equals its tagged
  commit's committer date, not the moment the release was made (observed:
  `v0.1.0`, `v0.2.0`, `v0.3.0` and `v0.4.0` each match their commit to the
  second; for `v0.4.0`, `created_at` 2026-11-24T19:57:16Z and `fb75400`'s
  committer date 19:57:16Z).
  So the list is in order of tagged commit date, and the block names the
  published release on the newest commit. On a linear `main` that is the
  previous release. Inferred, not observed: it would differ only if a
  hotfix were tagged on an older commit and published after a newer
  release; the block would then name the newer release, not the hotfix.
- **The publish**, the next step: one `gh release edit --notes-file
  notes.md --draft=false` sets the notes and publishes together. A
  published release never exists without its block.

Generated, never typed: the tag, commit and address are read at publish
time; nobody writes them into a release by hand.

**Fail closed.** If there is no previous published release, or a value does
not have the expected shape, the step fails with a `::error::` line and the
release stays a draft, the same rule as every other step in `publish`
(cleanup as in "What a failure in steps 11 to 13 leaves behind"). If the
release is already published, for example on a re-run after a successful
publish, the step fails instead of adding a second block. That turns
`publish` red, so the Release run's `deploy` job is skipped although the
release is public and complete. Recovery, also printed in the error line:
start the deploy by hand, **Actions** > **Deploy** > **Run workflow**,
**Branch: main**, **tag** the release, then approve it as usual ("Each
deploy" above). Avoid it by using **Re-run failed jobs**, not **Re-run all
jobs**, on a Release run whose `publish` already succeeded. None of these
failures has happened in a real run.

**"Good" means one thing.** The previous good tag is the latest release that
was published, and a release here is only published after the full gate set
passed on its tagged commit and its build was checked against the tag. It is
not a fresh health check of that release, and it does not mean anyone has
looked at it since. Whether it is the right place to go back to is still the
release owner's call (section 2, step 1).

**Why a workflow change, not release-please configuration.** Checked against
release-please's own documentation and config schema (repository
`googleapis/release-please`, `schemas/config.json` and
`docs/customizing.md`, read 2026-11-24): the release notes are built by the
changelog type (`default` or `github`) from the parsed commits, the same text
as the changelog entry; `pull-request-header` and `pull-request-footer`
customise the release pull request only; `release-please-action` v5's inputs
have nothing for release notes either. There is no option for a static
footer on a release, and the block is not static anyway: the previous tag
changes every release. So the block is added by the `publish` job, with that
job's existing `GITHUB_TOKEN` and `contents: write`. No new permission, no
new secret or setting, and the release App token is not used for it.

Checked locally, not in a run: the step's own shell, cut from `release.yml`,
run on a copy with `gh` stubbed, a sample `v0.4.0` changelog as the draft's
body and `v0.3.0` at `7e868e9906b098ded995f88d927de45f27bfda08` as the
previous release. It produced the block below and passed the notes to the
publishing edit. With the real `gh` answering the read-only calls, it also
picked `v0.3.0` at `7e868e9906b098ded995f88d927de45f27bfda08`. With no
published release, an already published release, a malformed tag, or a
placeholder left in the template, it failed and nothing was published.

```
## How to roll back

Previous good tag: v0.3.0 (7e868e9906b098ded995f88d927de45f27bfda08), https://github.com/keonikaku/release-pipeline/releases/tag/v0.3.0

Not performed on this deploy. Roll back only when directed or needed.

1. Actions tab > Deploy (left list) > Run workflow.
2. Use workflow from: Branch: main. tag: v0.3.0. Green Run workflow button.
3. Open the run > Review deployments > tick github-pages > Approve and deploy.
4. Wait for smoke to pass. The run summary holds the backout record.

Runbook: docs/RELEASE.md, section 2. Rollback evidence: docs/RELEASE.md, "The rollback drill, observed".
```

**Observed on `v0.4.0`: Release run `45475640451`.** The `publish` job's
step "Write the rollback block into the release notes" ran at 19:58:32Z and
its log printed "Previous good tag: v0.3.0
(7e868e9906b098ded995f88d927de45f27bfda08),
https://github.com/keonikaku/release-pipeline/releases/tag/v0.3.0" and the
filled block. The next step published the release: `v0.4.0`,
`published_at` 2026-11-24T19:58:37Z, not a draft, Latest in
`gh release list`. Its notes on GitHub (`gh release view v0.4.0`) end with
the block above, line for line, naming `v0.3.0` at
`7e868e9906b098ded995f88d927de45f27bfda08`: what the local dry run
predicted. `v0.3.0` and earlier carry no block, as designed (they were
published before it existed). Still not observed in a real release: any of
the fail-closed paths, and a release whose previous published release is
not the one on the newest tagged commit.

### The deploy approval gate

Phase 3, slice 3; observed on seven gated deploys, each approved by `keonikaku` per the run's review history: first run `44975134415` (below), then `45272659038` (a release's deploy), `45278248966` and `45281128227` (the rollback drill), `45290589637`, `45298078098` (a release's deploy, `v0.3.0`), and `45475640451` (a release's deploy, `v0.4.0`). Counted from `gh run list` for `deploy.yml` and `release.yml` and each run's approvals list, 2026-11-24. The two deploys before the gate was set, `44885617089` and `44898452699`, have no approval. The gate is not in the workflow.
It is a required reviewer on the `github-pages` environment, and GitHub holds
any job that names the environment, here job `deploy`, until a reviewer
approves it: required reviewers "approve workflow jobs that reference the
environment" (Deployments and environments, "Required reviewers"). The
workflow needed no change for the gate itself. What slice 3 changed in
`deploy.yml` is the backout record: job `record` reads who approved from the
run's own review history, `GET /repos/{owner}/{repo}/actions/runs/{run_id}/approvals`
("Get the review history for a workflow run", REST API, Actions, workflow
runs), with `actions: read` and nothing else. On a run with no gate it returns
an empty list (observed, run `44898452699`).

**First observed: run `44975134415`.** Dispatched by `keonikaku` from `main`
with `v0.1.0` (`workflow_dispatch`; through the web interface, as he
reported), created 2026-11-22T02:14:13Z. `prepare` finished at 02:14:26.

- **The wait, observed.** The run page in a browser showed job `deploy` as
  "github-pages waiting for review", a banner reading "keonikaku requested
  your review to deploy to github-pages", and the **Review deployments**
  button. The API agrees: the deployment's status was `waiting` from
  02:14:28 until it was `queued` at 03:37:01, and job `deploy` started at
  03:37:02.
- **The approval, observed.** The run's review history shows one entry:
  state `approved`, user `keonikaku`, environment `github-pages`. That he
  approved it with **Review deployments**, **Approve and deploy** is his
  report, like the dispatch through the web interface.
- **The result, observed.** `deploy`, `smoke` and `record` all succeeded;
  the smoke passed 3 of 3 at 03:37:45. The backout record read "smoke suite
  passed, 3 of 3 tests; approver: keonikaku", and **How long** read 83m 32s
  against the 15 minute target: observed on the run page in a browser, since
  the step summary is not in the log or the API. The 83m 32s matches the
  run's own timestamps exactly (02:14:13 to smoke green at 03:37:45), and
  the approver matches its review history.

**The 15 minute target was missed, and that is the measure working.** About
82 and a half of those 83 minutes are the approval wait (02:14:26 to
03:37:02); the machine work took about a minute. The clock counts from the
run's creation on purpose, because a rollback that is waiting for its
approver has not restored anything. This run was a rehearsal of `v0.1.0`
over itself, so nothing was broken while it waited, but in an incident the
same 82 minutes would be 82 minutes down. What it shows: with one approver,
time to restore on this run was dominated by the approval wait. The other
large term, the CDN wait of up to 660 seconds, was not exercised, because the
version did not change. How quickly the approver responds is a staffing and
on-call question the record makes visible, not something the workflow can
fix.

Settings, **Settings**, **Environments**, `github-pages` (repository admin
only):

| Setting | Value | Why |
|---|---|---|
| **Required reviewers** | on, `keonikaku` | The only account that can review. |
| **Prevent self-review** | off | With it on, "users who initiate a deployment cannot approve the deployment job". With one account, every deploy would wait until it fails. |
| **Wait timer** | off | A delay with no second person behind it is only a delay. |
| **Allow administrators to bypass configured protection rules** | off | With it on, an admin can "force all pending jobs referencing the environment to proceed" without approving them. With it off, "You cannot bypass deployment protection rules if the environment has been configured to prevent admins from bypassing". (Reviewing deployments; Deployments and environments.) |
| **Deployment branches and tags** | unchanged: Selected, `main` | Set in step 2 above. |

Known gaps, stated rather than hidden:

- **One person approves their own deploy.** The approver and the person who
  started the run are the same account, so the gate records a deliberate,
  timestamped decision, not a second pair of eyes. The backout record shows
  both names, so the overlap is visible on every run. Closed only by a second
  account.
- **Admin bypass: now disallowed (observed, `can_admins_bypass: false`,
  queried 2026-11-22; it was `true` until Keoni unticked it).** The gate
  therefore binds the admin too: an admin cannot force the waiting job past
  it (per GitHub's docs; not tried here). If bypass were allowed again, the gate would be advisory for an admin,
  and what a bypass leaves in the run is not observed: inferred, not
  observed, that it adds no approval to the run's review history, in which
  case the record says "none recorded (... or possibly an admin bypass)". A
  bypass takes a comment in the web interface, so it may be recorded
  somewhere; no bypass has happened here to check.
- **The approval wait is inside the 15 minute clock.** Time to restore is
  counted from the run's creation, so time spent waiting for the approver
  counts against the target. That is deliberate: a rollback waiting on a
  person is not restored. Observed on the first gated run: 83m 32s, almost
  all of it the approval wait (see above). The rollback drill met the
  target in 11m 31s, about ten minutes of it the approval wait (inferred from
  its job durations). So the target is met only when the approver is
  present: met on six gated deploys, missed on one. With one approver there
  is no one else to approve when he is not there.

### Deploy on release

Built in phase 3, slice 4; **observed three times** (run `45475640451`, 2026-11-24, `v0.4.0`, described under "Is the live site serving the deployed build?"; run `45298078098`, 2026-11-24, `v0.3.0`, described there too; first run `45272659038`, 2026-11-23,
`v0.2.0`). Publishing a release starts its
deploy: `release.yml`'s `deploy` job runs after `publish` and calls
`deploy.yml` with the new tag. The deploy still waits at the approval gate, so
merging the release pull request is the decision to cut, and **Approve and
deploy** is the separate decision to ship. A manual **Run workflow** stays for
any other deploy, and for rollbacks.

In the web interface, from a release pull request to the live site:

1. Review and merge the release pull request. Its author is the App, so the
   only account can approve it: on its page, **Add your review**, **Approve**,
   **Submit review**, then **Squash and merge** and confirm. No bypass is
   needed. This is the path release pull request 11 took (approved by
   `keonikaku`, merged as `c1e5fe3`, rule-suites result `pass`). A change pull
   request, authored by the same account, still needs the bypass path; see the
   known gaps below.
2. Open the run. The **Actions** tab, **Release** in the left-hand list, then
   the run for that merge, at the top. It runs `release-please` (tag and
   draft), `verify` (the whole gate set again), `publish` (attach the build,
   make the release public), and then `deploy / prepare`.
3. Approve it. When `deploy / deploy` shows **Waiting**: the **Review
   deployments** button in the banner, tick `github-pages`, then **Approve and
   deploy**.
4. Watch `deploy / smoke`. For a new version the CDN wait applies: it may take
   up to 11 minutes while the CDN still serves the old build. Of the five
   version changes smoked so far, the first poll matched on four: two
   inferred (the tests took 903 ms and 1.3s against a 2 second first retry
   interval) and two observed in the live bytes check's log ("attempt 1",
   runs `45298078098` and `45475640451`); on the rollback drill's run
   `45278248966` it is undetermined (2.6s does not rule out one retry). The
   wait path is not shown to have run. Then `deploy / record` writes the backout
   record into the run's summary, with **Triggered by** naming the release
   publish.

**First observed: run `45272659038`.** Created 2026-11-23T21:44:06Z, by the
merge of release pull request 11. `release-please`, `verify` (`pr-title`
skipped, as on any push), `publish`, `deploy / prepare`, `deploy / deploy`,
`deploy / smoke` and `deploy / record` all succeeded. `v0.2.0` was a draft
while the run was in progress (seen in `gh release list`) and is now published
and Latest, with `release-pipeline-v0.2.0.tar.gz` and its `.sha256`.
`deploy / deploy` waited at the gate (the deployment left `waiting` at 21:48:06Z and the job started at 21:48:07Z; the API gives no approval timestamp), and the
run's approvals list shows `approved`, `keonikaku`, `github-pages`. Smoke:
"3 passed". The live `build-info.json` serves version `0.2.0`, commit
`c1e5fe312d6e0230f8c12c1e2ea6ec706c9aa1da`, `dirty: false`. The backout
record, read from the run's page in a browser (job summaries are not in the
logs or the API):

- What is reverted: `v0.2.0` (`c1e5fe3`) deployed over `v0.1.0` (`68ac3f9`).
- Who tested it: smoke suite passed, 3 of 3 tests; approver: `keonikaku`.
- How long: 4m 35s against the 15 minute rollback target.
- Triggered by: a release publish: `release.yml` called this deploy after
  publishing `v0.2.0`.
- Deploy result: deployed.

This was a forward release, not a rollback; no rollback had been run yet.
The 4m 35s is a forward release's time with a prompt approver, not a
rollback's. The first rollback, the drill, came later the same day (run
`45278248966`, 11m 31s; see "The rollback drill, observed"). The run before it, `45271534718` (pull request 16 merged as
`6074278` by admin bypass), had no release to cut: `release-please` succeeded
and `verify`, `publish` and `deploy` were skipped.

Why it is built this way, with GitHub's documentation for each choice:

- **Called, not triggered by the release event.** `publish` makes the release
  public with `GITHUB_TOKEN`, and "events triggered by the `GITHUB_TOKEN` will
  not create a new workflow run", the exceptions being `workflow_dispatch` and
  `repository_dispatch` (Triggering a workflow from a workflow; Events that
  trigger workflows). A `release` event would also run with `GITHUB_REF` set
  to the tag, which the `github-pages` branch rule (`main` only) and
  `prepare`'s guard would both refuse. A called workflow keeps its caller's
  context: "the `github` context is always associated with the caller
  workflow" (Reusing workflow configurations), so `github.ref` is
  `refs/heads/main` and both checks pass as they do for a manual deploy.
- **Permissions, granted once and narrowed.** The calling job grants
  `contents: read`, `actions: read`, `pages: write` and `id-token: write`,
  which is what `deploy.yml`'s jobs ask for between them, and each of those
  jobs asks for its own subset. "The `GITHUB_TOKEN` permissions passed from
  the caller workflow can be only downgraded (not elevated) by the called
  workflow" (Reusing workflow configurations).
- **The gate still applies.** The gate is on the environment, and the
  environment is named by `deploy.yml`'s `deploy` job, which is where a
  reusable workflow has to name it: "set `environment` on the job in the
  reusable workflow. The job that calls the reusable workflow can't use the
  `environment` keyword" (Reuse workflows). Required reviewers "approve
  workflow jobs that reference the environment" (Deployments and
  environments). Observed three times: the called job waited for approval
  as a dispatched one does (run `45272659038`, approved by `keonikaku`; the
  job started 21:48:07Z; run `45298078098`, approved by `keonikaku`, the job
  started 00:39:30Z; and run `45475640451`, approved by `keonikaku`, the job
  started 20:00:07Z).
- **Concurrency.** `release.yml` runs in group `release-refs/heads/main`;
  `deploy.yml` declares group `pages`. The names differ on purpose. GitHub's
  reference warns about this for job-level groups: "If you use `jobs.<job_id>.concurrency.cancel-in-progress: true`, don't use
  the same value for `jobs.<job_id>.concurrency.group` in the called and
  caller workflows as this will cause the workflow that's already running to
  be cancelled" (Reusing workflow configurations). That warning is
  about `jobs.<job_id>.concurrency` with `cancel-in-progress: true`. Both
  groups here are workflow-level and neither cancels in progress, so what
  sharing a name would do here is inferred, not documented: most likely the
  called workflow would sit pending behind its own caller. Distinct names
  avoid the question. Whether a called workflow's own top-level group is
  applied at all is not stated in the docs, and run `45272659038` did not
  test it: nothing else was deploying. Still not observed. If it is, a release deploy
  queues behind a manual deploy already running; if it is not, the two could
  overlap, and the approval gate is what keeps that from happening unnoticed,
  because each needs its own approval.

What follows from it, stated rather than hidden:

- **The Release run stays open while the deploy waits for approval.** It
  holds the `release-refs/heads/main` group the whole time. A push to `main`
  in the meantime gets a Release run that waits as `pending`; GitHub keeps
  only one pending run per group, so a second push cancels the first pending
  one (the newer one reads `main` as it is when it starts, so ordinary changes
  lose nothing). The risky case is a release pull request merged while an
  earlier release's deploy is still waiting, followed by another push: the
  release's own run can be the one cancelled, which leaves a stranded draft
  (see "A stranded draft release"). Approve or reject a waiting deploy
  before merging the next release pull request.
- **Rejecting the deploy fails the Release run, not the release.** The
  release is already public when `deploy` starts. A rejected or failed deploy
  turns the Release run red while `v<version>` stays published and the live
  site stays on the previous version; deploy it later by hand with **Run
  workflow**, or not at all.
- **The clock starts earlier.** Time to restore is counted from the run's
  creation, and here the run is the Release run, so it includes
  `release-please`, `verify` and `publish` (about a minute and a half on the
  first release: run `44881812501`, 95 seconds from its creation to the end
  of `publish`) before the approval wait and the CDN wait.

**One deploy at a time.** Deploy runs queue behind each other and a running
deploy is never cancelled. GitHub keeps only one waiting run, though: a third
dispatch while one deploy runs and another waits cancels the waiting one. After
dispatching more than once, check which runs actually deployed, and re-run the
one that was cancelled if it was the one that was wanted.

The smoke runs against the live site from a laptop too, without deploying
anything: `BASE_URL=https://keonikaku.github.io/release-pipeline/
EXPECTED_VERSION=0.1.0 EXPECTED_COMMIT=<commit> npm run e2e:smoke`. Leave out
the two `EXPECTED_` values to check the shape of `build-info.json` only.

The release checks run on a laptop, without deploying:
`scripts/verify-release-build.sh v0.1.0 /tmp/site`, with the `gh` CLI signed in.
So does the live bytes check, slice 6, below:
`scripts/verify-live-bytes.sh /tmp/site <live address> v0.1.0`.

Why the stored build and not a rebuild: the stored archive is the one
`release.yml` attached after the full gate set passed on the tagged commit. A
rebuild of old source is a new artifact that no gate has seen, made with
whatever tool versions resolve today. A rollback should put back what was
tested.

### Is the live site serving the deployed build?

Phase 3, slice 6. **Both checks are observed on the live site.** The machine
check ran in three deploys: run `45290589637`, `v0.2.0` over itself, run
`45298078098`, `v0.3.0` over `v0.2.0`, the first version change it checked,
and run `45475640451`, `v0.4.0` over `v0.3.0`. The manual check, the button,
was first live on `v0.3.0`, the first release built after slice 6, and was
pressed on the live page that day; it was pressed again on `v0.4.0`, by the
deploy's smoke and by two AI agents (their own reports), each with a match (below).

The question: after a deploy, is every visitor now getting the build that was
deployed, or is the CDN in front of Pages still handing out the old one? The
build-info spec answers it for one small file, `build-info.json`. A CDN caches
each address on its own, so a fresh `build-info.json` does not by itself show
that `index.html` and the script are fresh (inferred from how a per-address
cache works; not observed here either way). Two checks answer it for every
file.

**The machine check, `scripts/verify-live-bytes.sh`.** It takes a release's
stored build, unpacked and verified by `scripts/verify-release-build.sh`, and
the live address. For each file in the stored build it fetches the same path
from the live site, takes the SHA-256 of the bytes, and compares. It polls
until every file matches or 660 seconds pass (the same wait as the build-info
spec, and why), then prints one JSON object: the tag, the address, how many
polls it took and how long, `matched` of `total`, `all_match`, and per file the
expected and live SHA-256 and whether they match. It exits non-zero on a
mismatch. The file list comes from the stored archive, not from anything the
build publishes, so it works for every release, including `v0.1.0` and
`v0.2.0`, which were built before it.

On a laptop, with the `gh` CLI signed in, nothing deployed:

```
scripts/verify-release-build.sh v0.2.0 /tmp/site
scripts/verify-live-bytes.sh /tmp/site https://keonikaku.github.io/release-pipeline/ v0.2.0
```

Observed on 2026-11-23 (UTC), run that way by the agent building it, with
`v0.2.0` live: 4 of 4 files matched on the first poll (`index.html`, the
script, its source map, `build-info.json`). Against the stored `v0.1.0`, with
the wait set to 3 seconds, 3 of 4 matched and it exited 1: only
`build-info.json` differs between the two releases, because no page source
changed between them (consistent with `git diff v0.1.0 v0.2.0`). These were
laptop runs against a site that had been live for a while, not a check after
a deploy.

In a deploy, job `smoke` runs it before the `@smoke` specs: it downloads the
release's stored build again (`verify-release-build.sh`, the same SHA-256 and
`build-info.json` checks as `prepare`), runs the check, prints the JSON in the
log and in the run summary under **Live bytes**, and fails the job on a
mismatch. The specs still run after a mismatch, so the record has both
answers. The backout record gets a row, **Live bytes match the stored build**:
`yes` or `no`, then matched of total files, polls and seconds, or `not
checked: the check did not complete` if it gave no answer (bad usage,
unreadable output, its step timeout, or an earlier step failing). In that case
**Who tested it** says the smoke failed because the live bytes check did not
complete, not that tests failed. Smoke green, where the 15 minute clock
stops, now means the specs passed **and** the bytes matched. Because the bytes
check runs first, it is the step that waits for the CDN, and its poll count is
the first record of how long that wait was; until now poll attempts were not
logged.

The requests carry `Cache-Control: no-cache` and `Pragma: no-cache`. They are
not relied on. Observed on 2026-11-23 (UTC), from a laptop: requests for
`build-info.json` with and without those headers came back alike, `x-cache:
HIT`, the same `age` and `etag`. So from that edge, at that time, the headers
did not get past the CDN. A query string was observed not to either (see step
4 under "Deploying a release, or rolling back to one"). The check polls
instead. Nothing here shows whether a deploy purges the CDN or not.

**First observed in a deploy: run `45290589637` (Deploy #6).** Read by Keoni
from the run page on 2026-11-23 (UTC); step times and log lines read by the
agent through the API and the run log. A rehearsal: started by hand from
`main` at `49c01fc` (the merge of slice 6), tag `v0.2.0`, deployed over
`v0.2.0` itself, so nothing on the site changed.

- Created 23:38:37Z. Approved by `keonikaku` at the `github-pages` gate;
  `deploy` started at 23:42:52Z, so about four minutes waiting (inferred from
  the job timestamps; the API gives no approval time). Jobs: `prepare` 9s,
  `deploy` 10s, `smoke` 3m 20s, `record` 5s.
- The bytes check, from the run summary's **Live bytes** JSON: tag `v0.2.0`,
  `attempts` 1, `elapsed_seconds` 0, `matched` 4, `total` 4, `all_match`
  true. Files: `assets/index-D3aMeJYB.js` (`750d8305...`), its `.map`
  (`782e527a...`), `build-info.json` (`78899e56...`), `index.html`
  (`66858331...`), expected equal to live for each. The log line reads
  "attempt 1: 4 of 4 files match".
- The skip, observed in the log: the step that reads the stored build printed
  the notice "This build predates the manual live check; its smoke spec is
  skipped", the smoke step ran with `EXPECT_LIVE_CHECK: 0`, and Playwright
  reported "1 skipped" and "3 passed (3.0s)". That the skipped test is the
  button spec follows from the design (it is the only spec that skips),
  inferred, since the log does not name it.
- The backout record: **Who tested it** "smoke suite passed, 3 passed, 1
  skipped; approver: keonikaku"; **Live bytes match the stored build** "yes
  (4 of 4 files; 1 poll(s), 0s)"; **How long** 7m 43s against the 15 minute
  target, met (the run's creation to smoke green at 23:46:20Z).
- **Why `smoke` took 3m 20s, against 33s to 36s on the drill.** Observed, from
  the step times: **Install the browser** took 2m 56s (23:43:18Z to
  23:46:14Z), against 19s on both drill runs. Its log shows the time went to
  the operating system packages Playwright installs with `--with-deps`
  (package downloads from the Ubuntu mirror, including one gap of about 104
  seconds between two font packages); the browser download itself took about
  ten seconds. The new steps were small: fetching the stored build again 2s,
  reading it for the button 0s, the bytes check under a second, the specs 4s.
  Why the mirror was slow on this run is not known.

What this run does not show. The CDN wait with more than one poll: the
version did not change, so the first poll could only match. A bytes mismatch
in a real run. The manual check on the live site: `v0.2.0` has no button.

**Observed on a version change: run `45298078098`, `v0.3.0` going live.**
2026-11-24 (UTC). Release pull request 19 was approved by `keonikaku` and
merged as `7e868e9906b098ded995f88d927de45f27bfda08` (00:33:07Z), which
published `v0.3.0`; `release.yml` called `deploy.yml`. The backout record was
read from the run page by Keoni's session; the rest below was read by the
agent through the API and the run log unless it says otherwise.

- The run was created 00:33:10Z. `prepare` finished at 00:34:45Z and
  `deploy / deploy` started at 00:39:30Z, so about four and three-quarter
  minutes waiting at the gate (inferred from the job timestamps; the API
  gives no approval time). The run's review history shows one entry:
  `approved`, `keonikaku`, `github-pages`, with no comment. `prepare`,
  `deploy`, `smoke` (42s) and `record` all succeeded; the run ended at
  00:40:31Z, 7m 21s after its creation.
- Before the deploy the live site was `v0.2.0` (`c1e5fe3`), per the deploy
  job's log. The Pages deploy step finished at 00:39:39Z.
- The bytes check, from the log: "attempt 1: 4 of 4 files match" at
  00:40:18Z, about 39 seconds after the Pages deploy step finished; JSON
  `attempts` 1, `elapsed_seconds` 0, `matched` 4, `total` 4, `all_match`
  true. Every file differs from `v0.2.0`'s: `assets/index-a7PS5xDZ.js`
  (`93d15a4e...`), its `.map` (`3299c66a...`), `build-info.json`
  (`14bdd811...`), `index.html` (`43ce1bc3...`). So on a real version
  change, with every file new, the first poll already got the new bytes.
  That is one observation; it does not show whether the deploy purged the
  CDN or the cached copies had expired, and the 660 second wait stays.
- The button spec ran, for the first time in a deploy: the smoke step ran
  with `EXPECT_LIVE_CHECK: 1`, no "predates the manual live check" notice
  was printed, and Playwright reported "4 passed (1.6s)" with nothing
  skipped. Its specs include pressing the button and requiring "match"
  (`e2e/gates.spec.ts`), so the button was pressed on the live site by the
  smoke, in CI's browser.
- The backout record: "`v0.3.0` (`7e868e9...`) deployed over `v0.2.0`
  (`c1e5fe3...`)"; **Who tested it** "smoke suite passed, 4 of 4 tests;
  approver: keonikaku"; **Live bytes match the stored build** "yes (4 of 4
  files; 1 poll(s), 0s)"; **How long** 7m 10s against the 15 minute target,
  met, with most of it the approval wait (inferred, above).
- Live `build-info.json` afterwards: version `0.3.0`, commit
  `7e868e9906b098ded995f88d927de45f27bfda08`, `dirty: false`.
- The button, pressed in a browser: on the live page, "Is this the live
  build?" showed "This page was built from 0.3.0 at 7e868e99...", and after
  **Check what the server is serving now** was pressed it read "the server
  now says 0.3.0 at 7e868e9...: match." That press was made by an AI agent
  in a browser pane, not by Keoni. The agent writing this also ran the
  button spec from a laptop against the live site at 00:44Z, with the
  expected version and commit set: 1 passed.

What this does not show. A MISMATCH in a real run: every answer so far has
been a match. The CDN wait with more than one poll: `attempts` was 1 again.
Whether a deploy purges the CDN or the first read was a cache miss. Keoni
himself pressing the button.

**Observed on a version change again: run `45475640451`, `v0.4.0` going
live.** 2026-11-24 (UTC). Release pull request 24, authored by
`app/release-pipeline-releaser`, was approved by `keonikaku` at 19:56:47Z and
merged as `fb754008aeeec07d42d3eb943a5ca84c1e6248a7` at 19:57:17Z, which
published `v0.4.0`; `release.yml` called `deploy.yml`. Everything below was
read by the agent through the API and the run log, unless it says otherwise.

- The run was created 19:57:20Z; conclusion `success`. `publish` ran
  19:58:29Z to 19:58:39Z and wrote the rollback block (see "The rollback
  block in every release"). `deploy / prepare` finished at 19:58:49Z; the
  deployment was `waiting` from 19:58:51Z until `queued` at 20:00:06Z, and
  `deploy / deploy` started at 20:00:07Z, so about one and a quarter
  minutes at the gate (from the deployment statuses; the API gives no
  approval time). The run's review history shows one entry: `approved`,
  `keonikaku`, `github-pages`, with no comment.
- Before the deploy the live site was `v0.3.0` (`7e868e9...`), per the
  deploy job's log ("Live before this deploy"). The Pages deploy step
  reported success at 20:00:17Z.
- The bytes check, from the log: "attempt 1: 4 of 4 files match" at
  20:00:52Z, about 35 seconds after the Pages deploy step reported success;
  JSON `attempts` 1, `elapsed_seconds` 1, `matched` 4, `total` 4,
  `all_match` true. Every file differs from `v0.3.0`'s:
  `assets/index-Ba6YBnDd.js` (`a9846cb2...`), its `.map` (`612c4155...`),
  `build-info.json` (`08a3bb0f...`), `index.html` (`a2cae29b...`). One more
  first-poll match on a full version change; it still does not show whether
  the deploy purged the CDN, and the 660 second wait stays.
- The smoke step ran with `EXPECT_LIVE_CHECK: 1` and `EXPECT_LANDING: 1`;
  neither "predates" notice was printed; Playwright reported "Running 7
  tests" and "7 passed (2.1s)", and the record's inputs were 7 passed, 0
  failed, 0 skipped. So the button spec ran in CI's browser and required
  "match", and the three landing specs ran against the live page.
- The backout record, from its inputs in the `record` job's log (the
  rendered summary is on the run page, not in the log or the API): **What
  is reverted** `v0.4.0` (`fb75400...`) deployed over `v0.3.0`
  (`7e868e9...`); **Who tested it** "smoke suite passed, 7 of 7 tests;
  approver: keonikaku" (`SKIPPED` 0, so the "of" form, per `deploy.yml`); **Live bytes match the stored build** "yes (4 of 4
  files; 1 poll(s), 1s)", printed in the log as given; **How long** 3m 35s
  against the 15 minute target, met: `GREEN_AT` minus `STARTED_AT` is 215
  seconds, the run's creation (19:57:20Z) to smoke green (20:00:55Z), clock
  "from the run's creation, including queue time". The approval wait was
  about a minute and a quarter of it (from the deployment statuses, above).
- **A known wording gap in the record, not changed.** On a forward release
  the record still labels its first row **What is reverted** and measures
  **How long** against "the 15 minute rollback target", because one record
  serves both directions. Here nothing was reverted: `v0.4.0` replaced
  `v0.3.0` going forward. The values are right; the labels read oddly.
  Recorded in section 4; the workflow is deliberately left as it is in a
  docs-only change.
- Live `build-info.json` afterwards: version `0.4.0`, commit
  `fb754008aeeec07d42d3eb943a5ca84c1e6248a7`, `dirty: false`, run
  `45475640451`.
- The button, pressed outside the pipeline, twice, both by AI agents and
  neither by Keoni. Both are the agents' own reports and cannot be checked
  in GitHub, unlike the CI smoke above. First, the agent writing this ran
  the seven `@smoke` specs from a laptop against the live site at 20:07Z,
  with `EXPECTED_VERSION=0.4.0` and the commit set; 7 passed, including
  "says which build it is and checks it against the server", which presses
  the button and requires "match". Second, independently, the QA agent ran
  a Playwright script (not a spec, and not a browser pane) in headless
  Chromium at 1280px wide, clicked **Check what the server is serving
  now**, and read "...the server now says 0.4.0 at fb754008...: match.".

What this does not show, again: a MISMATCH in a real run, the CDN wait with
more than one poll, whether a deploy purges the CDN, Keoni himself pressing
the button, and the `EXPECT_LANDING=0` skip (below).

**The manual check, on the site itself.** The page now ends with "Is this the
live build?": the version and commit the page was built from, fixed into it at
build time, and a button, **Check what the server is serving now**. Pressing it
fetches `build-info.json` with `cache: "no-store"` and says "This page was
built from X; the server now says Y: match", or "MISMATCH" (the page in front
of the reader is not the build the server now serves: a cached copy, or a newer
deploy since it loaded), or that the server could not be read. To use it after
a deploy: open the site, press the button, and check that both sides name the
version and commit in the run's backout record.

What it does and does not show. `no-store` keeps the browser's own cache out
of it. It does not get past the CDN, and is not meant to: what the CDN serves
is what visitors get. A match means the page and the server's
`build-info.json` agree with each other; compare both with the backout record
to know they are the build that was deployed. It compares version and commit,
not bytes; the machine check compares bytes.

Releases built before slice 6, `v0.1.0` and `v0.2.0`, do not have the button;
`v0.3.0` is the first that does (observed live, above). The `@smoke` spec
for it ("says which build it is and checks it against the server") would fail
on a rollback to such a release, because the specs are `main`'s. So `smoke`
looks in the stored build for the button's marker and, when it is not there,
sets `EXPECT_LIVE_CHECK=0` and the spec is skipped with that reason. The
decision is read from the stored build, never from the live page, so a stale
live page that lacks the button still fails. A skipped test is counted in the
record as skipped, so such a rollback reads "smoke suite passed, 3 passed, 1 skipped". A second spec,
not `@smoke`, checks the MISMATCH answer in a real browser by intercepting
`build-info.json`. Checked locally: against the live `v0.2.0` with
`EXPECT_LIVE_CHECK=0`, 3 passed and 1 skipped; without it, that spec failed,
as it should against a page without the button.

**The same skip for the landing page, `EXPECT_LANDING`. The `=1` path is
observed in a deploy run; the skip itself, `=0`, is built, not observed.**
Added by pull request 26 (merged as `73ea5ee`),
for `v0.4.0`'s landing page. Releases before it, `v0.1.0` to `v0.3.0`, have
"The gate set" as their only `h1` (observed in each tag's `src/main.ts`) and
no lead, byline, sections or evidence links, so `main`'s three landing
`@smoke` specs would fail on a rollback to one of them. Next to the
button's check, the same step in `smoke` ("Read whether the stored build has
the manual live check") looks in the stored build's `index.html` for the
page's marker, `<meta name="release-pipeline:page" content="landing" />`.
Found: `EXPECT_LANDING=1`. Not found: `EXPECT_LANDING=0`, a `::notice::`
("This build predates the landing page; its smoke specs are skipped and the
old heading is checked instead"), the three landing specs skip with the
reason "the deployed build predates the landing page (EXPECT_LANDING=0, read
from the stored build)", and the heading spec expects "The gate set"
instead of the new title. As with the button, the decision is read from the
stored build, never the live page, and unset (the pull request `e2e` gate)
means expect the landing page. The marker is a contract with the page:
renaming it makes every build look older than it is, and the notice on a
deploy of `v0.4.0` or later is the sign that happened.

What is observed, and where. Locally only, by the agent that built it,
recorded in pull request 26's description: the step's shell on copies of
both builds gave `expect_landing=0` and the notice for `v0.3.0`, and
`expect_landing=1` for the landing build; `main`'s specs against a `v0.3.0`
build with `EXPECT_LANDING=0`, `@smoke` only, gave 4 passed and 3 skipped,
and the heading spec passed on "The gate set"; the control, the full suite
with it unset against the same build, gave 4 failed (the heading spec and
the three landing specs) and 7 passed. In a real deploy run, only
`EXPECT_LANDING=1` is observed: run `45475640451`, `v0.4.0`, smoked with
`EXPECT_LANDING: 1`, no notice, 7 passed and 0 skipped, so the marker was
found in the stored build and the landing specs ran. **Still built, not
observed:** `EXPECT_LANDING=0`, the notice, the three skips and the old
heading check in a deploy run. It is seen only on a deploy of `v0.3.0` or
earlier, which today means a rollback or a drill, and none has run since
pull request 26 merged.

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
| 6 | Squash merge, then merge the release pull request to cut, then deploy. A hotfix does not get its own release path: it rides the same release pull request, which is cut as soon as the fix is in it. | as in a normal release | cut: the normal release path, observed four times (0.1.0, 0.2.0, 0.3.0, 0.4.0, none a hotfix); never yet used for a hotfix. Deploy: phase 3 |
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
| A single-commit pull request lands with its commit subject, not its title. | The `pr-title` gate checks the title. With `squash_merge_commit_title: COMMIT_OR_PR_TITLE` (observed, GitHub's default), a one-commit pull request's squash subject is its commit subject, which no gate checks, and that subject is what release-please versions from. | Keoni sets **Settings, General, Pull Requests, Allow squash merging, Default commit message** to **Pull request title** (API: `squash_merge_commit_title=PR_TITLE`, `squash_merge_commit_message=BLANK`). Pull request title, not Pull request title and commit details: with commit details, a `BREAKING CHANGE:` footer in a branch commit's body is copied into the squash commit, where release-please reads it and no gate checks it; with the title only, the gated pull request title is the whole commit. An agent attempt to change it was declined by tooling policy, so it is left to him |
| A rollback is smoked with `main`'s specs, not the release's. | Job `smoke` checks out `main`. If `main`'s `@smoke` specs ever assert something only a newer release has, a rollback to an older release fails its smoke even though the older release is fine. Observed once: the drill's rollback (run `45278248966`) passed 3 of 3 against `v0.1.0` with `main`'s specs. That does not close it: the page did not differ between the two releases in a way that stressed it (inferred from `git diff v0.1.0 v0.2.0`: no `src/` or `index.html` change; only `e2e/gates.spec.ts`, `playwright.config.ts`, the version bump, and workflow, script and docs files). | open; not yet decided. The drill is the one observation |
| The heading and gate count spec checks `main`'s `GATES` against older builds. | `@smoke` spec "renders the gate set" takes its expected `li` count (`GATES.length`) and its summary line (`summaryLine(summarise(GATES))`) from `main`'s `src/main.ts`, not from the build being smoked; `EXPECT_LANDING` switches only the `h1`. So if a gate is added to or removed from `GATES` on `main`, a rollback to any build from before that change fails its smoke although that build is fine (inferred from the spec; has not happened). Today it holds: `GATES`, `summarise` and `summaryLine` are identical at `v0.1.0`, `v0.2.0`, `v0.3.0` and `main` at `73ea5ee`, 7 gates each (observed by comparing the source at each tag, 2026-11-24), and at `v0.4.0` (`git diff 73ea5ee v0.4.0 -- src/` is empty). The spec also passed against a `v0.3.0` build locally (pull request 26's description); no deploy has run it against an older build yet. A case of the gap in the row above. | open; not yet decided. Options: read the expected gates from the stored build, or a marker like `EXPECT_LANDING` when the set changes |
| The CDN wait path is not shown to be exercised. | Runs `44898452699` and `44975134415` deployed `v0.1.0` over itself. Run `45272659038` deployed `v0.2.0` over `v0.1.0`, the first version change, and the first poll matched: the three tests took 903 ms and the first retry interval is 2 seconds (inferred from those two numbers), and that read came about 22 seconds or more after the deployment succeeded (21:48:17Z to the smoke step at 21:48:39Z). Nothing distinguishes a cache purge from a cache miss. At that run, a version change had been smoked once; the first poll matched; the wait path has still not been shown to be exercised. It does not show that deploys purge the cache, and the 660 second wait stays. The rollback drill smoked two more version changes, one down (run `45278248966`) and one up (run `45281128227`). Test-only times from their smoke logs: "3 passed (2.6s)" and "3 passed (1.3s)"; the first retry is at 2 seconds (`e2e/gates.spec.ts`, intervals `[2_000, 5_000, 10_000]`). Inferred: the roll forward's first poll matched. Undetermined for the rollback: 2.6s does not rule out one 2 second retry. Poll attempts are not logged. Then run `45298078098`, `v0.3.0` over `v0.2.0` with every file new, logged "attempt 1: 4 of 4 files match" (observed: the bytes check now logs its polls), about 39 seconds after the Pages deploy step finished, and run `45475640451`, `v0.4.0` over `v0.3.0`, again every file new, logged the same, about 35 seconds after. The wait path is still not shown to be exercised, there is still no evidence either way on purge against cache miss, and the 660 second wait stays. | more version changes; not scheduled |
| One account, and it is the only admin. | The ruleset is applied and active (ruleset `27090299`), but a change pull request cannot be approved by anyone other than its author, so every change pull request merges by admin bypass. A release pull request is the exception. Pull request 1 was merged this way on 2026-11-12 (UTC), with `reviewDecision: REVIEW_REQUIRED` at merge. That bypass is recorded: the ruleset's rule-suites API (`gh api repos/keonikaku/release-pipeline/rulesets/rule-suites`), queried on 2026-11-12 (UTC), lists `20b6f10` (pull request 1's merge) and `ee163c6` (the direct-push test), each with result `bypass` and actor `keonikaku`. An admin can also push to `main` directly; that was tried and it succeeded (commit `ee163c6`). The release pull request is the exception, because the App and not Keoni is its author (decision record 0004). Pull request 6 was merged by admin bypass with no review given (rule-suites: `68ac3f9`, `bypass`). Pull request 11 was approved by `keonikaku` and merged as `c1e5fe3` with rule-suites result `pass`, actor `keonikaku`, the first merge without a bypass, so a person can approve an App-authored pull request (observed three times: pull request 19 was approved by `keonikaku` and merged as `7e868e9`, and pull request 24 as `fb75400`, each with rule-suites result `pass`, actor `keonikaku`). The deploy in the same run was approved at its own gate. | a second account, so the author of a change is not its only possible reviewer; not scheduled |
| The live bytes check has only ever matched, on the first poll. | Observed in three deploys: run `45290589637`, `v0.2.0` over itself, run `45298078098`, `v0.3.0` over `v0.2.0`, and run `45475640451`, `v0.4.0` over `v0.3.0`, the last two version changes with every file new; all 4 of 4 files on the first poll. The button was observed live on `v0.3.0`: the smoke's spec passed in CI, and a press on the live page read "match" (by an AI agent in a browser pane, not by Keoni); and on `v0.4.0`: the smoke's spec passed in CI, and, by the agents' own reports (not checkable in GitHub), the same spec passed from a laptop against the live site and a separate headless script's press read "match" (both AI agents, not Keoni). Not observed: a mismatch in a real run, the CDN wait with more than one poll, and whether a deploy purges the CDN. | a deploy where the CDN is slow to update, if one happens; not scheduled |
| The backout record's labels assume a rollback. | Every deploy writes the same record, so a forward release is labelled as if it were a rollback: the first row is **What is reverted** and **How long** is measured against "the 15 minute rollback target". Observed on `v0.4.0` (run `45475640451`): "What is reverted" names `v0.4.0` deployed over `v0.3.0`, a release going forward, not a revert. The values are right and the clock is the same clock; only the wording misleads a reader who does not know the record serves both directions. | open; a wording change in `deploy.yml`'s `record` job, not scheduled. Left unchanged on purpose in the docs pull request that recorded `v0.4.0` |
| The deploy approver is the person who started the deploy. | The gate is set and observed (run `44975134415`): every deploy waits for `keonikaku`, and admins cannot bypass it. But the only account starts the run and approves it, and prevent-self-review has to stay off, so the gate records a deliberate decision, not a second pair of eyes. There is also no one else to approve when he is unavailable, and the wait counts toward time to restore (observed: 83m 32s, target missed; the rollback drill's 11m 31s met it, about ten minutes of it the approval wait, inferred from job durations). | a second account for a second approver, not scheduled |

This table is the honest version of the project's status. It shrinks as phases
land, and it is not allowed to shrink faster than they do.
