# release-pipeline

A deliberately small web application, and the path a change to it has to take to
reach production.

The application is one page. That is on purpose. What this repository is about is
the gate set in front of `main`, the release procedure written down before the
automation that performs it, and the branch rules kept as configuration in the
repository rather than as settings somebody once clicked.

**The pipeline is the artifact. The application is the fixture.**

Directed by Keoni Kakugawa, who set the requirements, the phase order and the
review bar. Built by an AI agent team under his direction, with a separate QA
agent reviewing each change before it reached him.

## Why this exists

Release and change management is usually evidenced by describing it. This
repository is an attempt to evidence it by operating it: every change arrives by
pull request, every quality gate reports as its own named check, the thing the
browser tests is the exact artifact the build produced, and the runbook was
written before there was any automation for it to flatter.

It is also honest about the places where it does less than it looks like it
does: a repository admin can bypass every branch rule; the repository has one
account, which is that admin, so the review requirement was satisfied twice,
on release pull requests 11 and 19, which the App authored, and every change pull request
is merged by admin bypass, the first being pull request 1
(`gh pr merge 1 --squash --admin`); and five of the seven gates have never been
observed failing. All of this is written down rather than left for a reader to
find. See
[`docs/decisions/0003-private-first-and-what-that-turns-off.md`](docs/decisions/0003-private-first-and-what-that-turns-off.md).

## Status

| Phase | What it is | State |
|---|---|---|
| 1 | The gate: pull request checks, one per gate; build once and test that artifact; title validation; code owners, template, dependency updates, the ruleset as configuration and applied. The repository went public during this phase | merged, pull request 1, by admin bypass |
| 2 | The release: versioning, changelog, tagging from conventional commits; a release pull request that accumulates changes until it is cut; a published release with the tested build attached | merged, pull request 4, by admin bypass. First run 2026-11-21: release pull request 6 cut `v0.1.0`, published with its tested build attached |
| 3 | The deploy: deploy from a tag, smoke the deployed address, manual rollback to any earlier tag | in progress. Slice 1, a manual deploy of a release's stored build to GitHub Pages, is live: `v0.1.0` was first deployed this way (run `44885617089`), and https://keonikaku.github.io/release-pipeline/ now serves `0.3.0`, the latest release (read 2026-11-24 UTC). Slice 2, smoke checks against the live site after each deploy, is live: run `44898452699`, smoke 3 of 3. Slice 3, an approval before each deploy, is live: run `44975134415` waited until Keoni approved it, and admins cannot bypass the gate. The same account starts and approves each deploy, a known gap. Slice 4, publishing a release starts its deploy (still behind the approval), is live: release pull request 11 was approved and merged, and run `45272659038` published `v0.2.0`, waited until Keoni approved the deploy, and passed the smoke; release pull request 19 did the same for `v0.3.0` in run `45298078098`. Slice 5, the rollback drill, was observed once on 2026-11-23 (UTC): run `45278248966` put `v0.1.0` back over `v0.2.0` behind the approval, smoke 3 of 3, 11m 31s against the 15 minute target, and run `45281128227` rolled forward to `v0.2.0`; see `docs/RELEASE.md`, "The rollback drill, observed". Slice 6, a check that the live site serves every file of the deployed build (by SHA-256, and a button on the page), is merged and observed: the machine check in runs `45290589637` (`v0.2.0` over itself) and `45298078098` (`v0.3.0` over `v0.2.0`), 4 of 4 files on the first poll each time; the button on the live `v0.3.0` page answered "match" (pressed by an AI agent, and by the smoke in CI). No mismatch has yet been seen in a real run |
| 4 | Release-management policy as code: freeze windows, risk scoring, approval routing, conflict detection across in-flight pull requests. Rules pending Keoni's input | not started |
| 5 | The evidence: dependency review, code scanning, build provenance | not started |

Phase 1 arrived on `main` on a branch, by pull request, with all seven gates run
against it and green. It did not arrive with an approval: its author is the
repository's only account and cannot approve their own pull request, so it was
merged by admin bypass. That bypass is recorded: the ruleset's rule-suites API (`gh api repos/keonikaku/release-pipeline/rulesets/rule-suites`), queried on 2026-11-12 (UTC), lists `20b6f10` (pull request 1's merge) and `ee163c6` (the direct-push test), each with result `bypass` and actor `keonikaku`. Before it, `main` held two commits:
the one that created the repository, and `ee163c6`, a direct push made on
purpose to test whether the ruleset stops an admin. It does not.

Phase 2 has released three times (`v0.1.0`, `v0.2.0` and `v0.3.0`); the first release is described here. On 2026-11-21 (UTC) the release App opened release
pull request 6, the gates ran on it with no approval hold, and merging it cut
`v0.1.0`: tagged at `68ac3f9`, the gate set run again on that commit, the build
checked against the tag, and the release published with
`release-pipeline-v0.1.0.tar.gz` and its SHA-256 file. Pull request 6 was merged
by admin bypass with no review given. Release pull request 11 (`v0.2.0`, 2026-11-23) was
approved by Keoni and merged without a bypass, the first merge here that was not one, and its
release went on to the deploy approval gate and the live site (see phase 3 above). The run-by-run
record, including the first attempt that failed on the App's permissions, is in
`docs/RELEASE.md`.

[![CI](https://github.com/keonikaku/release-pipeline/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/keonikaku/release-pipeline/actions/workflows/ci.yml?query=branch%3Amain)

**One badge, and only one.** It reads the runs of `ci.yml` on `main`, which have
been green since phase 1 merged (observed: run on `20b6f10`, six gates green,
`pr-title` skipped as designed). There is no badge for `release.yml` yet. Its
first run on `main` failed on its first attempt, on the App's permissions, and
passed when re-run. Every run since has passed (observed through `44881812501`,
the 0.1.0 cut). A badge goes in when it has something true to say, because a red
badge on a release engineering repository is worse than no badge.

## The documents

| Document | What it answers |
|---|---|
| [`docs/meeting-brief.md`](docs/meeting-brief.md) | The one-page version: what was built, what to click in order, what phase 1 proves and deliberately does not, and a one-line list of where this diverged from `release-gate-api` |
| [`docs/divergence-from-release-gate-api.md`](docs/divergence-from-release-gate-api.md) | Each divergence from `release-gate-api` in full, with the reasoning and the cost accepted |
| [`docs/requirements.md`](docs/requirements.md) | What rules this repository enforces, what its environments and release types are, and what each phase satisfies |
| [`docs/quality-gates.md`](docs/quality-gates.md) | Every gate: the file, who enforces it, whether it blocks a merge, and what it is for |
| [`docs/RELEASE.md`](docs/RELEASE.md) | How a normal release, a rollback and a hotfix are run, which steps are live, and which are built but have not yet run |
| [`docs/decisions/`](docs/decisions/) | The decisions, with the alternative that was rejected and the cost that was accepted |

Read `docs/meeting-brief.md` first if you only read one, then
`docs/quality-gates.md` for the gate-by-gate detail.

## The gate set

Seven checks on every pull request. Each one is a separate job so that the pull
request names what is wrong without anyone opening a log.

| Check | Tool | Question |
|---|---|---|
| `lint` | Biome | Is this the house style, lint and formatting in one pass? |
| `typecheck` | TypeScript, `--noEmit`, strict | Does it hold together? |
| `test` | Vitest, with a coverage threshold | Does the logic do what it claims? |
| `audit` | `npm audit`, high and above | Is anything we depend on known to be broken? |
| `build` | Vite | Does it produce an artifact? |
| `e2e` | Playwright, against the `build` artifact | Does that artifact behave in a browser? |
| `pr-title` | Conventional commit check, pull requests only | Can a version be derived from this change? |

Two properties of that table are the point of it:

**The four quality gates run as a matrix with `fail-fast: false`.** A change with
a lint error and a failing test is told about both in one run, rather than being
told one, fixed, pushed, and then told the other.

**`e2e` does not build.** It carries `needs: build` and downloads the `dist`
directory that `build` uploaded. If the browser suite built its own copy, the
artifact that could ship would never have been the artifact that was tested, and
the suite would be evidence about a build that no longer exists.

## The release path

Built in phase 2; first run on 2026-11-21, which cut `v0.1.0`; second release `v0.2.0` on 2026-11-23 (see Status). On
every push to `main`,
`.github/workflows/release.yml` runs release-please, which keeps one release
pull request open and updates it as changes land. Merging that pull request is
the decision to cut a release. When that happens:

1. release-please tags the merge commit `v<version>` and creates the release as
   a draft, with the changelog entry as its notes.
2. `verify` runs the whole of `ci.yml` again on that commit. Same file, called
   as a reusable workflow, so there is no second copy of the gates to drift.
3. `publish` takes the `dist` that `verify` built and browser-tested, checks its
   `build-info.json` names that version and commit, attaches it with a SHA-256
   file, and only then publishes the release.

The release pull request is opened with a short-lived GitHub App token rather
than the default workflow token, because pull requests opened by the default
token do not start the gates on their own. Why, and what else was considered:
[`docs/decisions/0004-a-github-app-token-for-the-release-pull-request.md`](docs/decisions/0004-a-github-app-token-for-the-release-pull-request.md).

## Running it locally

Every gate above is a script in `package.json`, so the gate that fails in CI
fails the same way on a laptop. This is deliberate: a pipeline whose checks
cannot be reproduced locally trains people to debug by pushing.

```bash
npm ci
npx playwright install --with-deps chromium

npm run lint        # Biome, check mode
npm run typecheck   # tsc --noEmit
npm run test        # Vitest with coverage
npm audit --audit-level=high
npm run build       # Vite, into dist/
npm run e2e         # Playwright against the built output
npm run e2e:smoke   # just the @smoke tagged specs
```

`npm run dev` serves the application if you want to look at it. It will not take
long.

## Repository layout

```
.github/
  workflows/ci.yml          every gate, one job each; also called by release.yml
  workflows/release.yml     release pull request, tag, draft, verify, publish, then deploy (behind the approval)
  workflows/deploy.yml      deploy a release's stored build to Pages, smoke the live site; also the rollback
  rulesets/main.json        the branch ruleset, as configuration
  CODEOWNERS                pipeline files need an owner's review
  dependabot.yml            npm and actions, weekly
  pull_request_template.md  release impact and rollback plan
docs/                       brief, requirements, gates, runbook, decisions
release-please-config.json  version, tag and changelog rules for release-please
.release-please-manifest.json  last released version, written by release-please
src/                        the application, such as it is
tests/                      one unit test
scripts/verify-release-build.sh  check a release's stored build before it deploys
e2e/                        one browser spec, tagged @smoke
```

## Licence

MIT. See [`LICENSE`](LICENSE).
