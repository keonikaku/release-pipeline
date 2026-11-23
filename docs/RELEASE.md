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
| 6 | Review and approval. Pipeline and governance files need a code owner. | the reviewer | required by ruleset `27090299`, active. Satisfied once, and only on a release pull request: the only account is the author of every change pull request and the only admin, so every change pull request merges by admin bypass (pull request 16, `6074278`: result `bypass`). Release pull request 11 is the exception, because its author is the App (step 10). Release pull request 11 changed `.release-please-manifest.json`, which `.github/CODEOWNERS` assigns to `@keonikaku`, and the owner approved it. The rule-suite reports `pull_request: pass` without itemizing code-owner review, so attributing the pass to code-owner review is inferred. No workflow or ruleset change has been through code-owner review. A non-admin being held to the rule is inferred from the ruleset; not observed, because no non-admin account exists |
| 7 | Squash merge. The pull request title becomes the one commit subject on `main`. | the person merging | live for a pull request with more than one commit. Observed: pull request 1 had six commits and landed as `feat: add the pull request gate set and the repository rules (#1)`. **Pending for a single-commit pull request:** the repository's `squash_merge_commit_title` is `COMMIT_OR_PR_TITLE` (observed), GitHub's default, which uses the commit subject instead of the title when there is only one commit. See section 4 |
| 8 | `release.yml`, job `release-please`, opens one release pull request, or updates the open one, carrying the next version, the `CHANGELOG.md` entry and the version in `package.json` and `package-lock.json`. It stays open and accumulates every change merged after it, until someone merges it. | `release.yml`, `release-please` | live, observed twice. Pull request 6, `chore(main): release 0.1.0`, opened by `app/release-pipeline-releaser` on 2026-11-21, then updated by the run for pull request 7's merge (`44881640213`) to add that change under Pipeline. The first attempt to open it failed: see "The first release, as observed" below. The second, pull request 11, `chore(main): release 0.2.0`, was opened by the same App and merged on 2026-11-23 |
| 9 | The gates run on the release pull request, as on any other. | `ci.yml`, started by the App's token | live, observed twice. Both CI runs on pull request 6 (`44880786395`, `44881659622`) were triggered by `release-pipeline-releaser[bot]` and started the moment they were created, with no approval hold. The first failed `lint` on the manifest release-please writes, fixed by pull request 7 (`docs/quality-gates.md`); the second passed all seven gates. This is the step that needed a decision: decision record 0004. Pull request 11 reported all seven checks passing (`audit`, `build`, `e2e`, `lint`, `pr-title`, `test`, `typecheck`) when it was merged |
| 10 | Decide to cut. Merging the release pull request is the decision, and it is a human one. | the release owner | live, observed twice. Pull request 6 (2026-11-21, merge commit `68ac3f9`) was merged by admin bypass with no review given (rule-suites: `68ac3f9`, result `bypass`). Pull request 11 (2026-11-23, merge commit `c1e5fe3`) was approved by `keonikaku` first, then merged, and the rule-suites API lists `c1e5fe3` with result `pass`, actor `keonikaku`: the first merge here without a bypass. So a person can approve a pull request the App authored, and that approval is the recorded release decision. In the web interface, the review path on such a pull request is **Add your review**, **Approve**, **Submit review**, then **Squash and merge** and its confirmation. Which buttons were clicked is Keoni's report; the approval and the merge result are observed |
| 11 | release-please tags the merge commit and creates the GitHub Release as a **draft**, with the changelog entry as its notes. | `release.yml`, `release-please` | live, observed twice. Release run `44881812501` tagged `v0.1.0` at `68ac3f9`, the merge commit, and its check confirmed that is the commit it builds. That the release existed as a draft before `publish` is set by `draft: true` in `release-please-config.json`; the draft state itself was not captured while it lasted. Run `45272659038` tagged `v0.2.0` at `c1e5fe3`, the merge commit of pull request 11. `v0.2.0` was seen as a draft in `gh release list` while that run was in progress: a CLI observation made during the run, which cannot be read afterward, because the release is now published |
| 12 | The full gate set runs again on the tagged commit: `ci.yml` called as a reusable workflow, so it is the same jobs, not a copy. | `release.yml`, `verify` | live, observed twice. Run `44881812501`: `build`, `audit`, `test`, `lint`, `typecheck` and `e2e` passed on `68ac3f9`; `pr-title` skipped, as designed on a push. Run `45272659038` on `c1e5fe3` passed the same six and skipped `pr-title` the same way |
| 13 | The build that `verify` tested is checked against the tag (`build-info.json`: version, commit, clean tree), packaged as `release-pipeline-v<version>.tar.gz` with a SHA-256 file, attached, and the release is published. | `release.yml`, `publish` | live, observed twice. Run `44881812501`: `build-info.json` named version `0.1.0`, commit `68ac3f9`, `dirty: false`; `release-pipeline-v0.1.0.tar.gz` and `release-pipeline-v0.1.0.tar.gz.sha256` attached; `v0.1.0` published at 2026-11-21T07:48:19Z, not a draft. The downloaded asset matches its checksum. Run `45272659038`: `v0.2.0` published at 2026-11-23T21:45:17Z with `release-pipeline-v0.2.0.tar.gz` and its `.sha256`; the live `build-info.json` later named `0.2.0` at `c1e5fe3`, `dirty: false` |
| 14 | The tag is deployed to production: the build stored on the release, checked against its SHA-256 and its `build-info.json`, published to GitHub Pages. Nothing is rebuilt. | `release.yml`, job `deploy`, calling `deploy.yml`; or `deploy.yml` started by hand (below) | by hand: live, observed five times (runs `44885617089`, `44898452699`, `44975134415`, and the rollback drill's `45278248966` and `45281128227`), first in run `44885617089` (dispatched from `main` on 2026-11-21, deployed `v0.1.0`; `https://keonikaku.github.io/release-pipeline/build-info.json` then served version `0.1.0`, commit `68ac3f9`). Started by the release: live, observed once, run `45272659038` (2026-11-23), which deployed `v0.2.0` at `c1e5fe3` after waiting at the approval gate (the deployment left `waiting` at 21:48:06Z and the `deploy / deploy` job started at 21:48:07Z; the API gives no approval timestamp); the live `build-info.json` then served `0.2.0`, commit `c1e5fe312d6e0230f8c12c1e2ea6ec706c9aa1da`, `dirty: false`. It waits at the approval gate either way. See "Deploy on release" |
| 15 | Smoke checks run against the deployed address, not against a local build. | `deploy.yml`, job `smoke`, the `@smoke` tagged specs | live, observed five times, first (phase 3, slice 2) in run `44898452699`, dispatched from `main` on 2026-11-21 with `v0.1.0`, smoke `3 passed`, all four jobs green, 65 seconds from the run's creation to its end. That deploy put `v0.1.0` over `v0.1.0`, so the wait for the CDN to serve a new build was not exercised there. Smoke succeeded again in run `44975134415` (also `v0.1.0` over itself) and in run `45272659038`, the first version change (`v0.2.0` over `v0.1.0`): `3 passed`, the job running 21:48:18Z to 21:48:43Z, and the first poll matched: the three tests took 903 ms and the first retry interval is 2 seconds (inferred from those two numbers), and that read came about 22 seconds or more after the deployment succeeded (21:48:17Z to the smoke step at 21:48:39Z). Nothing distinguishes a cache purge from a cache miss. A version change was smoked once; the first poll matched; the wait path has still not been exercised. It does not show that deploys purge the cache, and the 660 second wait stays. The rollback drill smoked two more version changes, 3 of 3 each (runs `45278248966`, `v0.1.0` over `v0.2.0`, and `45281128227`, back). Test-only times from their smoke logs: "3 passed (2.6s)" and "3 passed (1.3s)"; the first retry is at 2 seconds (`e2e/gates.spec.ts`, intervals `[2_000, 5_000, 10_000]`). Inferred: the roll forward's first poll matched (1.3s is under 2s). Undetermined for the rollback: 2.6s does not rule out one 2 second retry. Poll attempts are not logged, so the wait path is still not shown to be exercised. The same specs as the `e2e` gate, pointed at the address the deploy reported, plus an exact check that the live `build-info.json` names the version and commit the deploy verified. A failure fails the run |

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
to 13 have run twice (`v0.1.0`, `v0.2.0`) and none failed. A tag, and a draft release
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
| 2 | Identify the last known good tag from the release list, `gh release list`. Each release names its commit and carries the build that was tested. | the release owner | live for the list: `gh release list` shows `v0.2.0` (Latest) and `v0.1.0`, and `gh release view v0.1.0` shows its build attached. Used for a rollback once, in the drill (phase 3, slice 5, 2026-11-23 UTC): `v0.1.0` was the tag put back under `v0.2.0`. A drill, so `v0.2.0` was not actually bad |
| 3 | Run the deploy workflow manually against that tag, from the web interface (click path under "Deploying a release, or rolling back to one"), and approve it when it waits. It deploys that release's stored, tested build, not a rebuild of its source. | `deploy.yml`, manual trigger | live, observed six times: `v0.1.0` by hand in runs `44885617089`, `44898452699` and `44975134415`; `v0.2.0` started by the release in run `45272659038`; then the drill, by hand from `main`: run `45278248966` put `v0.1.0` over `v0.2.0` (the rollback) and run `45281128227` put `v0.2.0` back (the roll forward). Used for a rollback once, in a drill |
| 4 | Smoke checks run against the deployed address. A rollback that is not verified is a hope. | `deploy.yml`, job `smoke` | live, observed five times on a deploy (runs `44898452699` and `44975134415`, `v0.1.0` over itself; `45272659038`, `v0.2.0` over `v0.1.0`; and the drill's two runs). After a rollback once: run `45278248966`, 3 of 3, run with `main`'s specs (see the known gaps) |
| 5 | Record what was rolled back, from which version to which, and why. | the release owner, starting from the backout record in the deploy run's summary | procedure. The run summary's backout record fills in the three fields: what is reverted (what was deployed over what), who tested it (the smoke suite's result and test count, and the approver, read from the run's review history; both observed on two gated deploys, runs `44975134415` and `45272659038`, the latter reading "3 of 3" and "approver: keonikaku"), and how long it took against the 15 minute target, from the run's creation to smoke green. Who started the run is recorded alongside. The why is still written by the release owner. Observed once on a rollback, the drill below: run `45278248966`'s record named `v0.1.0` over `v0.2.0`, 3 of 3, approver `keonikaku`, 11m 31s. The run has no field for the why and its approval comment was empty; the reason, a rehearsal, was given by Keoni outside the run, not observed in GitHub |
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
  because the approver was there. Across the gated deploys, it was met three
  times (4m 35s, 11m 31s, 1m 47s) and missed once (83m 32s, run
  `44975134415`), each time decided by how long the approval waited: the
  target holds only if the approver is present.
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
the command line):

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
     build. Whether a deploy purges the cache is not established. Three real
     version changes have been smoked: run `45272659038`, `v0.1.0` to
     `v0.2.0`, then the drill's `v0.2.0` to `v0.1.0` (run `45278248966`)
     and back (run `45281128227`). Their smoke logs give the time of the
     three tests alone: "3 passed (903ms)", "3 passed (2.6s)" and "3 passed
     (1.3s)". The first retry is at 2 seconds (`e2e/gates.spec.ts`,
     intervals `[2_000, 5_000, 10_000]`). Inferred from those numbers: the
     first poll matched on `45272659038` and on `45281128227`. Undetermined
     on `45278248966`: 2.6s does not rule out one 2 second retry. Poll
     attempts are not logged. On the first of them, the read came
     about 22 seconds or more after the deployment succeeded (21:48:17Z to the
     smoke step at 21:48:39Z). Nothing distinguishes a purge from a cache miss.
     The wait path has still not been shown to be exercised; three
     observations are no reason to shorten the 660 seconds.
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

   Alongside them: who started the run, the deploy result and the address. If
   the smoke did not pass, the record opens by saying the live site is not
   verified, with a link to this runbook's Rollback section.

### The deploy approval gate

Phase 3, slice 3; observed twice: first run `44975134415` (below), then `45272659038`, the deploy a release started. The gate is not in the workflow.
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

**Observed once, run `44975134415`.** Dispatched by `keonikaku` from `main`
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
  present: met on three gated deploys, missed on one. With one approver there
  is no one else to approve when he is not there.

### Deploy on release

Built in phase 3, slice 4; **observed once** (run `45272659038`, 2026-11-23,
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
   up to 11 minutes while the CDN still serves the old build. Of the three
   version changes smoked so far, the first poll matched on two (inferred:
   the tests took 903 ms and 1.3s against a 2 second first retry interval);
   on the rollback drill's run `45278248966` it is undetermined (2.6s does
   not rule out one retry). The wait path is not shown to have run. Then `deploy / record` writes the backout
   record into the run's summary, with **Triggered by** naming the release
   publish.

**Observed once: run `45272659038`.** Created 2026-11-23T21:44:06Z, by the
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
  environments). Observed once: the called job waited for approval as a
  dispatched one does (run `45272659038`, approved by `keonikaku`; the job
  started 21:48:07Z).
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

Why the stored build and not a rebuild: the stored archive is the one
`release.yml` attached after the full gate set passed on the tagged commit. A
rebuild of old source is a new artifact that no gate has seen, made with
whatever tool versions resolve today. A rollback should put back what was
tested.

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
| 6 | Squash merge, then merge the release pull request to cut, then deploy. A hotfix does not get its own release path: it rides the same release pull request, which is cut as soon as the fix is in it. | as in a normal release | cut: the normal release path, observed once (0.1.0, not a hotfix); never yet used for a hotfix. Deploy: phase 3 |
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
| The CDN wait path has not been exercised. | Runs `44898452699` and `44975134415` deployed `v0.1.0` over itself. Run `45272659038` deployed `v0.2.0` over `v0.1.0`, the first version change, and the first poll matched: the three tests took 903 ms and the first retry interval is 2 seconds (inferred from those two numbers), and that read came about 22 seconds or more after the deployment succeeded (21:48:17Z to the smoke step at 21:48:39Z). Nothing distinguishes a cache purge from a cache miss. A version change was smoked once; the first poll matched; the wait path has still not been exercised. It does not show that deploys purge the cache, and the 660 second wait stays. The rollback drill smoked two more version changes, one down (run `45278248966`) and one up (run `45281128227`). Test-only times from their smoke logs: "3 passed (2.6s)" and "3 passed (1.3s)"; the first retry is at 2 seconds (`e2e/gates.spec.ts`, intervals `[2_000, 5_000, 10_000]`). Inferred: the roll forward's first poll matched. Undetermined for the rollback: 2.6s does not rule out one 2 second retry. Poll attempts are not logged. The wait path is still not shown to be exercised, there is still no evidence either way on purge against cache miss, and the 660 second wait stays. | more version changes; not scheduled |
| One account, and it is the only admin. | The ruleset is applied and active (ruleset `27090299`), but a change pull request cannot be approved by anyone other than its author, so every change pull request merges by admin bypass. A release pull request is the exception. Pull request 1 was merged this way on 2026-11-12 (UTC), with `reviewDecision: REVIEW_REQUIRED` at merge. That bypass is recorded: the ruleset's rule-suites API (`gh api repos/keonikaku/release-pipeline/rulesets/rule-suites`), queried on 2026-11-12 (UTC), lists `20b6f10` (pull request 1's merge) and `ee163c6` (the direct-push test), each with result `bypass` and actor `keonikaku`. An admin can also push to `main` directly; that was tried and it succeeded (commit `ee163c6`). The release pull request is the exception, because the App and not Keoni is its author (decision record 0004). Pull request 6 was merged by admin bypass with no review given (rule-suites: `68ac3f9`, `bypass`). Pull request 11 was approved by `keonikaku` and merged as `c1e5fe3` with rule-suites result `pass`, actor `keonikaku`, the first merge without a bypass, so a person can approve an App-authored pull request (observed once). The deploy in the same run was approved at its own gate. | a second account, so the author of a change is not its only possible reviewer; not scheduled |
| The deploy approver is the person who started the deploy. | The gate is set and observed (run `44975134415`): every deploy waits for `keonikaku`, and admins cannot bypass it. But the only account starts the run and approves it, and prevent-self-review has to stay off, so the gate records a deliberate decision, not a second pair of eyes. There is also no one else to approve when he is unavailable, and the wait counts toward time to restore (observed: 83m 32s, target missed; the rollback drill's 11m 31s met it, about ten minutes of it the approval wait, inferred from job durations). | a second account for a second approver, not scheduled |

This table is the honest version of the project's status. It shrinks as phases
land, and it is not allowed to shrink faster than they do.
