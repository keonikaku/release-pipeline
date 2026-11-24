# Requirements

**Directed by:** Keoni Kakugawa. Written by an AI agent team under his
direction.
**Status:** phase 1 merged; phase 2 merged, first release `v0.1.0` cut on
2026-11-21 (see "Phase 2: the release"); phase 3 slices 1 to 4 live and slice 5, the rollback
drill, done and observed on 2026-11-23 (UTC); slice 6, live bytes match the
stored build, observed: machine check in two deploys, the page's button live
on `v0.3.0`; latest release `v0.3.0` (2026-11-24 UTC), live; phases 4 and 5
planned
**Purpose:** state the release management rules this repository is built to
enforce, before any automation exists to enforce them.

The application in this repository is deliberately trivial. It exists so that
there is something real to lint, type check, test, build and deploy. The subject
of the work is the path a change takes to production, not the application.

---

## The model this repository uses

Two small models are needed before any rule can be written down. Both are
authored here, are deliberately generic, and apply only here.

### Environments

| Environment | What it is | Who it is for |
|---|---|---|
| Local | A developer machine. | The person making the change. |
| Preview | The build artifact served from a pull request's own run. | Reviewers, and the automated browser checks. |
| Production | The deployed site at its public address. | Everyone. |

There is deliberately no multi-stage promotion path. A system with several test
environments needs one, and `release-gate-api` models one in its domain. This
repository has a one-page application and a single deploy target, so declaring
further stages would describe environments that do not exist. Three is what it
can evidence, so three is what it declares.

### Release types

| Type | Trigger | Version effect | Path to production |
|---|---|---|---|
| Standard | A feature or fix merged in the normal course of work. | Minor or patch, from the commit history. | Full gate set, then the release automation. |
| Hotfix | Production is wrong and the fix cannot wait for the queue. | Patch. | Full gate set. The gates are never skipped; what changes is the queue position and who is told. |
| Rollback | Production is wrong and the previous version was right. | None. No new version is cut. | Redeploy of an already released tag. No new code. |

The distinction that matters: a hotfix is a new change and carries new risk, so
it goes through the same gates. A rollback introduces no new code, so it is a
deploy of something that already passed them. Treating those two as one thing is
how a bad night gets worse.

---

## REQ-1: Nothing reaches `main` unreviewed

| ID | Rule |
|---|---|
| REQ-1.1 | Every change to `main` arrives by pull request. Direct pushes are refused. |
| REQ-1.2 | A pull request requires one approving review before it can merge. |
| REQ-1.3 | Changes to pipeline and governance files require review by a code owner. |
| REQ-1.4 | `main` keeps a linear history. Merge commits are refused. |
| REQ-1.5 | A pull request title must be a conventional commit subject, because the version and the changelog are derived from it. |

**Enforcement, stated honestly.** REQ-1.5 is enforced by a workflow and runs
today. REQ-1.1 through REQ-1.4 are enforced by a repository ruleset, committed at
`.github/rulesets/main.json` as configuration rather than as a screenshot of a
settings page. On 2026-11-11 the repository was made public and that ruleset was
applied through the API; it is live as ruleset `27090299`, `enforcement: active`.

REQ-1.4 has a second half that is a repository setting rather than a rule, and
it is now set. Observed:

```
$ gh api repos/keonikaku/release-pipeline \
    --jq '{allow_squash_merge,allow_merge_commit,allow_rebase_merge}'
{"allow_merge_commit":false,"allow_rebase_merge":false,"allow_squash_merge":true}
```

**REQ-1.1 is enforced for everyone except a repository admin, and that is a real
hole, not a rounding error.** The ruleset lists one bypass actor: the repository
admin role. A direct push to `main` was attempted on 2026-11-11 to find out what
actually happens. It was not refused. It succeeded, and the server said why:

```
remote: Bypassed rule violations for refs/heads/main:
remote: - Changes must be made through a pull request.
remote: - 7 of 7 required status checks are expected.
   a4fb3a5..ee163c6  main -> main
```

Commit `ee163c6` is on `main` and did not come through a pull request. It is
left there on purpose, because deleting the evidence of the one weakness in this
control would be the exact dishonesty this repository is built to argue against.

So REQ-1.1 reads precisely as: for an admin, a direct push to `main` is
permitted and logged as a bypass (observed). For any actor without the admin
role it is refused: inferred from the ruleset configuration; not observed,
because no non-admin account exists.
A single-maintainer repository cannot do better than that without a second
account to hold the admin role, which is noted as a known gap rather than
claimed as solved. See
`docs/decisions/0003-private-first-and-what-that-turns-off.md`.

**REQ-1.2 has been satisfied twice, on release pull requests 11 and 19, and bypassed on every change pull request. REQ-1.3 holds only in the narrow sense below.** The ruleset
requires them and the open pull requests report `REVIEW_REQUIRED`. But the only
account is the author of every change pull request, the only admin and the sole code
owner, and GitHub does not let an author approve their own pull request. The one
pull request approval given in this repository was on an App-authored pull request, 11 (below). Pull request 1 was merged by
admin bypass, `gh pr merge 1 --squash --admin`, on 2026-11-12 (UTC), with
`reviewDecision: REVIEW_REQUIRED` at the moment of merge. That bypass is recorded: the ruleset's rule-suites API (`gh api repos/keonikaku/release-pipeline/rulesets/rule-suites`), queried on 2026-11-12 (UTC), lists `20b6f10` (pull request 1's merge) and `ee163c6` (the direct-push test), each with result `bypass` and actor `keonikaku`. The release pull request introduced in phase
2 was expected to be the first one that can be approved rather than bypassed,
because its author is a GitHub App and not Keoni (decision record 0004).
The first one, pull request 6, authored by `app/release-pipeline-releaser`,
was merged by admin bypass with no review given (rule-suites: `68ac3f9`,
`bypass`). The second, pull request 11, was approved by `keonikaku` and merged
as `c1e5fe3` on 2026-11-23 (UTC), and the rule-suites API lists `c1e5fe3` with
result `pass`, actor `keonikaku`: the first merge here without a bypass. So
REQ-1.2 was satisfied, observed, on an App-authored pull request, and a second time since: release pull request 19 was approved by `keonikaku` and merged as `7e868e9` on 2026-11-24 (UTC), rule-suites result `pass`, actor `keonikaku`.
REQ-1.3 holds only for release pull requests (11, and again 19): pull request 11 changed `.release-please-manifest.json`, which `.github/CODEOWNERS` assigns to `@keonikaku`, and the owner approved it. The rule-suite reports `pull_request: pass` without itemizing code-owner review, so attributing the pass to code-owner review is inferred. No workflow or ruleset change has been through code-owner review. Every change pull request is still merged by bypass (pull
request 16, `6074278`, `bypass`).

## REQ-2: Every gate reports separately

| ID | Rule |
|---|---|
| REQ-2.1 | Each quality gate is its own job, so the pull request names which gate failed without anyone opening a log. |
| REQ-2.2 | One gate failing does not cancel the others. A change is told everything that is wrong with it in one run. |
| REQ-2.3 | A gate that is red blocks the merge. There is no override that does not leave a record. |

**Enforcement, stated honestly.** REQ-2.1 and REQ-2.2 are properties of the
workflow and have been true since the workflow existed. REQ-2.3 was *not* true
while the ruleset was unapplied: pull request 2 carries a red `lint` and a red
`pr-title` and GitHub still reported it as mergeable. After the ruleset was
applied on 2026-11-11, the same pull request reports:

```
$ gh pr view 2 --json mergeable,mergeStateStatus
{"mergeStateStatus":"BLOCKED","mergeable":"MERGEABLE"}
```

Both fields matter and they are easy to confuse. `mergeable: MERGEABLE` means
only that the branch has no merge conflicts; it is not a statement about policy
and it never was. `mergeStateStatus: BLOCKED` is the one that answers REQ-2.3.
Pull request 2 is blocked. Pull request 1, with all seven gates green, was
blocked on its missing review rather than on a gate until it was merged by
admin bypass, which is the distinction the two pull requests exist to show.

The honest limit: `BLOCKED` is a composite state, so the red checks and the
missing review cannot be separated from that field alone. The isolating
observation is the pair — same ruleset, same missing review, seven green on one
and two red on the other — plus the fact that both red checks are named in the
ruleset's required list. And the override is the admin bypass described under
REQ-1, which satisfies the second sentence of REQ-2.3 only in the narrow sense
that the bypass is logged.

## REQ-3: The thing tested is the thing shipped

| ID | Rule |
|---|---|
| REQ-3.1 | The application is built once per run. |
| REQ-3.2 | The browser checks run against that same build artifact, downloaded from the run that produced it, not against a rebuild. |
| REQ-3.3 | A subset of the browser checks is tagged `@smoke` and is runnable on its own against a deployed address. |

REQ-3.2 is the rule most often broken in real pipelines. If the end to end suite
rebuilds the application, then the artifact that reaches production was never the
artifact that was tested, and the suite is evidence about a build that no longer
exists.

## REQ-4: A released version is identifiable and reversible

| ID | Rule |
|---|---|
| REQ-4.1 | Every release carries a version, a tag and a changelog entry derived from the commits in it. |
| REQ-4.2 | What is deployed can be traced back to the commit it was built from. |
| REQ-4.3 | Any previously released tag can be put back into production without writing code. |
| REQ-4.4 | What the live address serves can be checked against the deployed release's stored build, every file, by a machine, and by a person on the site itself, so a deploy still hidden behind a cache is seen rather than assumed away. |

Phase 1 did not implement REQ-4; it was stated first so the runbook in
`docs/RELEASE.md` could be written against it, and because a rule written after
the automation exists is a description of the automation rather than a
requirement on it.

**Enforcement, stated honestly.** Phase 2 builds REQ-4.1 and REQ-4.2. Both
have run for real three times, on `v0.1.0` (2026-11-21 UTC), `v0.2.0` (2026-11-23 UTC)
and `v0.3.0` (2026-11-24 UTC). REQ-4.1 is satisfied, observed three times.
REQ-4.2 is satisfied for the released build, observed three times, and for
what is deployed (phase 3, slice 1): the live site serves `0.3.0`, the
`build-info.json` of the release it came from (read 2026-11-24 UTC). What exists and has been observed:

- REQ-4.1: `release.yml` and `release-please-config.json`. A release-please
  dry run on 2026-11-12, with the phase 2 branch standing in for `main`, said it
  would open a release pull request for 0.1.0 with a Features changelog section
  built from the `feat` commits. The dry run is quoted in `docs/RELEASE.md`.
  Then for real: release pull request 6 carried version 0.1.0 and a
  `CHANGELOG.md` entry built from the commits in it (Features: pull requests 1
  and 4; Pipeline: pull request 7), and merging it created tag `v0.1.0` and a
  release with that entry.
- REQ-4.2: every build now writes `build-info.json` with the version, the
  commit, whether the tree was dirty, and the CI run. The `e2e` gate checks it
  is served and well formed. Observed in the `dist` artifact of pull request
  4's first CI run (`43182997356`): `"dirty": false`, and `commit` is the pull
  request's test merge commit, which is what a `pull_request` run checks out
  and builds, so the file names what was built rather than the branch head.
  `release.yml`'s `publish` job is written to refuse
  a build whose file does not match the tag's version and commit, or was built
  dirty. On `v0.1.0` it passed (run `44881812501`): the attached
  `release-pipeline-v0.1.0.tar.gz` holds a `build-info.json` naming version
  `0.1.0`, commit `68ac3f9`, `dirty: false`, and matches its SHA-256 file. The
  refusal has not been exercised.

REQ-4.3 is phase 3, and is satisfied by one observed rollback, the drill
(phase 3, slice 5, below). REQ-4.4 is phase 3, slice 6, and is satisfied: the machine check observed in
two deploys (runs `45290589637` and `45298078098`), and the button observed on
the live `v0.3.0` site, answering "match". Its limits: every answer so far is
a match, so neither half has yet been seen to catch a stale or wrong build in
a real run, and the button press was an AI agent's, not Keoni's.

---

## Phases

Each phase ends green and merged before the next one starts. This section is
the single list of phases; every other document in this repository refers to
these five, by these numbers and names:

1. The gate
2. The release
3. The deploy
4. Release-management policy as code
5. The evidence

A per-gate red demonstration is not a phase. It is a known gap, recorded under
phase 1.

### Phase 1: the gate (merged)

Pull request gates, each reporting separately. A build job and a browser job
split so the artifact is built once and tested as built. Pull request title
validation. Code owners, a pull request template, dependency updates, and the
branch ruleset committed as configuration.

Satisfies REQ-1.5 and REQ-3 in full.

Satisfies REQ-2.1 and REQ-2.2 in full. Satisfies REQ-2.3 subject to the admin
bypass, which is an acknowledged weaker control and not a full satisfaction of
"there is no override that does not leave a record" as most readers would take
that sentence.

Applies REQ-1.1 to REQ-1.4 as enforced rules rather than declared ones, with
the caveats under REQ-1: the non-admin refusal is inferred rather than observed,
and REQ-1.2 and REQ-1.3 are bypassed rather than satisfied on every change pull request, phase 1 included; the one exception is release pull request 11 (see REQ-1.2 above). The repository went public and the
ruleset was applied during phase 1 rather than phase 3, because the two
blocking review findings against this document were both claims that could only
be made true by flipping, and an untrue claim is a worse state to sit in than an
out-of-order milestone.

**Known gap, recorded rather than hidden.** Of the seven gates, only two have
ever been observed red: `lint` and `pr-title`, both on pull request 2. The other
five — `typecheck`, `test`, `audit`, `build`, `e2e` — are asserted to fail on a
real defect and have not been demonstrated doing it. That is an untested
assertion about five of seven gates. It is deliberately not being fixed right
now, so that this document does not quietly acquire evidence it then has to
describe. A per-gate red demonstration is a known gap, not a phase and not a
claim.

### Phase 2: the release (merged)

Automated versioning, changelog and tagging from conventional commits. A release
pull request that stays open and accumulates changes until someone decides to
cut. A published release with the build attached.

Satisfies REQ-4.1, and REQ-4.2 for the released build, each observed three
times, on `v0.1.0`, `v0.2.0` and `v0.3.0`; REQ-4.2 for what is deployed is satisfied by phase 3, slice 1. Details under REQ-4.

What it is: `release.yml` runs release-please (`release-type: node`, starting
version 0.1.0, tags `v<version>`) on every push to `main`. It keeps one release
pull request open, accumulating changes. Merging that pull request is the
decision to cut: the merge commit is tagged and a draft release created, the
whole `ci.yml` gate set runs again on that commit, the build it tested is
checked against the tag and attached, and only then is the release published.

The known problem, now decided rather than carried: a release pull request
opened with the default workflow token does not start the gates on its own
(GitHub's documentation now says the runs are created but held for a manual
approval). The release pull request is therefore opened with a GitHub App
installation token. The App is a credential and the agent team does not create
credentials, so Keoni created it; without it, the workflow fails loudly on its
first step rather than falling back. Options, tradeoffs and reasoning:
`docs/decisions/0004-a-github-app-token-for-the-release-pull-request.md`.

### Phase 3: the deploy

Deploy to production from a tag, with a smoke check against the deployed address
afterwards. A manually triggered deploy of any earlier tag, which is the rollback
path. The public flip and the ruleset were originally scheduled here; both moved
forward into phase 1, so what remains in this phase is the deploy itself and its
approval gate.

Built in slices, each one pull request:

1. **Manual deploy of a release.** Merged, pull request 12; **observed** (first in run `44885617089`, three manual deploys in all).
   `deploy.yml`, started by hand from `main` with a tag, deploys the build
   stored on that release after checking it against its SHA-256 file and its
   `build-info.json` (`scripts/verify-release-build.sh`). Nothing is rebuilt.
   Each run writes a backout record to its summary. Acceptance observed: run
   `44885617089` deployed `v0.1.0`, and
   `https://keonikaku.github.io/release-pipeline/build-info.json` serves
   version `0.1.0`, commit `68ac3f9`.
2. **Smoke checks against the deployed address.** Merged, pull request 13;
   **observed** (three runs). Job `smoke` runs the `@smoke` specs against the address the deploy
   reported, and requires the live `build-info.json` to name exactly the
   version and commit the deploy verified, waiting up to 660 seconds for the
   CDN: its observed `max-age=600` plus a minute. A failure fails the run,
   and the backout record carries the result. Acceptance observed: run
   `44898452699` deployed `v0.1.0` and the smoke passed against the live
   address, 3 tests. Red observed from a laptop only: told to expect commit
   `0000000`, it failed, with the live site unchanged. Not observed: the CDN
   wait, because that deploy put `v0.1.0` over itself.
3. **The approval gate on the `github-pages` environment.** Merged, pull
   request 14; **observed** (six gated deploys). The gate is an environment setting, a
   required reviewer, which only an admin can set; the workflow needed no
   change for it. Set: reviewer `keonikaku`, prevent-self-review off, admin
   bypass disallowed (observed). The backout record names the approver from
   the run's review history. Acceptance observed: run `44975134415` waited at
   job `deploy` until Keoni approved it, and its record read "approver:
   keonikaku". Its time to restore, 83m 32s, missed the 15 minute target,
   almost entirely through the approval wait, which the measure counts on
   purpose. Known gap: the only account approves its own deploys, because
   prevent-self-review has to stay off.
4. **Deploy started by `release.yml` after `publish`.** Merged, pull request
   16; **observed twice** (the second, run `45298078098`, `v0.3.0` on
   2026-11-24 UTC, is under slice 6). `release.yml`'s `deploy` job calls `deploy.yml` with the new tag,
   so a published release goes to the approval gate without anyone starting
   it; manual **Run workflow** remains for other deploys and rollbacks. A
   call rather than a `release` event, because the release is published with
   `GITHUB_TOKEN`, whose events start no workflows, and because a called
   workflow keeps `github.ref` at `refs/heads/main`. Acceptance observed: merging
   release pull request 11 (approved by `keonikaku`, merge commit `c1e5fe3`)
   published `v0.2.0`; in run `45272659038` the deploy waited at the gate
   until `keonikaku` approved it (the deployment left `waiting` at 21:48:06Z and the job started at 21:48:07Z; the API gives no approval timestamp), the smoke passed (3 tests), and
   the live `build-info.json` shows `0.2.0` at
   `c1e5fe312d6e0230f8c12c1e2ea6ec706c9aa1da`, `dirty: false`. The backout
   record read: `v0.2.0` over `v0.1.0`, approver `keonikaku`, 4m 35s against
   the 15 minute target. That was also the first deploy that changed the
   version, and the first poll matched: the three tests took 903 ms and the first retry interval is 2 seconds (inferred from those two numbers), and that read came about 22 seconds or more after the deployment succeeded (21:48:17Z to the smoke step at 21:48:39Z). Nothing distinguishes a cache purge from a cache miss. At slice 4 a version change had been smoked once; the first poll matched; the wait path had not been shown to be exercised (slice 5 added two more, below). It does not show that deploys purge the cache, and the 660 second wait stays. Not observed: whether the called
   workflow's own concurrency group applies.
5. **A rollback drill to an earlier tag.** Done, **observed once**, on
   2026-11-23 (UTC), by Keoni in the web interface. Nothing new was built:
   the drill used `deploy.yml` as slices 1 to 4 left it, and nothing was
   broken; the reason, a rehearsal, was given by Keoni outside the run (GitHub
   has no field for it and the approval comments were empty, so it is not
   observed in GitHub). Run `45278248966` (by hand
   from `main`, tag `v0.1.0`) waited at the gate until `keonikaku` approved
   it, the smoke passed 3 of 3, and the backout record read `v0.1.0`
   (`68ac3f9`) deployed over `v0.2.0` (`c1e5fe3`), approver `keonikaku`,
   11m 31s against the 15 minute target, met; the live `build-info.json`
   then read `0.1.0` at `68ac3f9fa99eb0956b9930e3a0bfe0379c7deb22`,
   `dirty: false`. Run `45281128227` rolled forward to `v0.2.0` (3 of 3,
   1m 47s), and the live file read `0.2.0` at
   `c1e5fe312d6e0230f8c12c1e2ea6ec706c9aa1da`, `dirty: false`. Inferred, not
   observed: about ten of the 11m 31s were the approval wait (the jobs add
   up to about a minute; the API gives no approval timestamp), so the target
   holds only with the approver present; the 83m 32s deploy in slice 3
   missed it. Not exercised: step 6 of the rollback runbook (no offending
   change, nothing reverted on `main`). Not shown to be exercised: the CDN
   wait path (test-only times "3 passed (2.6s)" and "3 passed (1.3s)" against
   a 2 second first retry: the roll forward's first poll matched, inferred;
   the rollback's is undetermined, since 2.6s does not rule out one retry).
   The gap that a rollback is smoked with `main`'s specs stays open,
   because the page did not change between the two releases (inferred from
   `git diff v0.1.0 v0.2.0`). Details in `docs/RELEASE.md`, "The rollback
   drill, observed".
6. **Live bytes match the stored build.** Merged, pull request 21.
   **Observed: the machine check in two deploys, the button live on
   `v0.3.0`.** Satisfies REQ-4.4, with the limits stated under REQ-4.
   Machine: `scripts/verify-live-bytes.sh` fetches every file of the
   release's stored build from the live address, compares SHA-256s, polls up
   to 660 seconds, prints JSON and exits non-zero on a mismatch; job `smoke`
   runs it before the specs, and the backout record gains the row "Live
   bytes match the stored build". Person: the page shows the version and
   commit it was built from and a button that asks the server for
   `build-info.json` with `cache: "no-store"` and says match or MISMATCH.
   Releases before it (`v0.1.0`, `v0.2.0`) lack the button, so its `@smoke`
   spec is skipped on a rollback to one, decided from the stored build.
   Observed so far, from a laptop only: against the live `v0.2.0`, 4 of 4
   files matched on the first poll; requests with `Cache-Control: no-cache`
   still came back `x-cache: HIT`, so the check polls rather than relying on
   them. Then in a deploy, observed by Keoni on the run page: run
   `45290589637` (by hand from `main` at `49c01fc`, `v0.2.0` over itself,
   approved by `keonikaku`) printed `attempts` 1, `matched` 4 of `total` 4,
   `all_match` true, and the backout record read "smoke suite passed, 3
   passed, 1 skipped; approver: keonikaku", "Live bytes ... yes (4 of 4
   files; 1 poll(s), 0s)", 7m 43s against the 15 minute target. The skip is
   the button spec, `EXPECT_LIVE_CHECK=0` (the notice and the setting are in
   the run log; which test was skipped is inferred from the design). Not yet
   observed in that run: the button (`v0.2.0` has none). Then `v0.3.0`
   went live, 2026-11-24 (UTC): release pull request 19 merged as
   `7e868e9`, and Release run `45298078098` called the deploy, which waited
   at the gate until `keonikaku` approved it. Observed in its log and
   record: the bytes check, 4 of 4 files on the first poll, every file new
   since `v0.2.0`; `EXPECT_LIVE_CHECK: 1` and "4 passed", nothing skipped,
   so the button spec ran; "smoke suite passed, 4 of 4 tests; approver:
   keonikaku", "yes (4 of 4 files; 1 poll(s), 0s)", 7m 10s against the 15
   minute target (most of it the approval wait, inferred from job
   timestamps). On the live page the button read "the server now says 0.3.0
   at 7e868e9...: match." (pressed by an AI agent in a browser pane, not by
   Keoni). Still not observed: a mismatch in a real run, the CDN wait with
   more than one poll. Not claimed: whether a deploy purges the CDN. Details
   in `docs/RELEASE.md`, "Is the live site serving the deployed build?".

REQ-4.3 is satisfied, by one observed rollback: run `45278248966` put the
earlier released tag `v0.1.0` back into production without writing code, and
the live site served its `build-info.json`. Observed once, as a drill. REQ-4.2
for what is deployed is satisfied by slice 1, observed: the deployed site
serves the `build-info.json` of the release it came from (run `44885617089`
for `v0.1.0`, run `45272659038` for `v0.2.0`, run `45278248966` for `v0.1.0`
again, run `45281128227` for `v0.2.0`, and run `45298078098` for `v0.3.0`,
which the live site serves now, read 2026-11-24 UTC). REQ-3.3, a `@smoke`
subset runnable on its own against a deployed address, is satisfied, observed
seven times in the pipeline (runs `44898452699`, `44975134415`,
`45272659038`, `45278248966`, `45281128227`, `45290589637`, `45298078098`)
and from a laptop.

### Phase 4: Release-management policy as code

The four release-manager controls that `release-gate-api` deliberately left
out, written as checks the pipeline enforces rather than rules a person
remembers. **The rules for all four are pending Keoni's input.** Nothing below
is a rule yet; each line states only what the control is for.

- **Freeze windows.** Stop changes from reaching production during periods when
  they must not ship. Rules pending Keoni's input.
- **Risk scoring.** Give each change a risk assessment that decides how much
  scrutiny it gets before release. Model pending: to be taken from Keoni's own
  release-manager practice, not invented.
- **Approval routing.** Send each change to the approval its risk and content
  call for, rather than one approval for everything. Rules pending Keoni's
  input.
- **Conflict detection across in-flight pull requests.** Flag open pull requests
  that touch the same release surface before they collide at release time.
  Rules pending Keoni's input.

No requirement IDs are assigned to this phase until the rules exist.

### Phase 5: the evidence

Supply chain and provenance: dependency review on pull requests, code scanning,
and an attestation tying a published artifact to the run and commit that built
it. The release runbook stops being prose about what should happen and starts
citing run records of what did.

---

## Out of scope, deliberately

No authentication. No database. No server side anything. No application feature
work beyond what is needed for a build to be non trivial and a browser check to
be meaningful.

Each was considered and cut for the same reason: every hour spent on the
application is an hour not spent on the thing this repository is evidence of.
