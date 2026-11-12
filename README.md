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
account, which is that admin, so the review requirement has never been
satisfied and pull request 1 can only be merged by admin bypass
(`gh pr merge 1 --squash --admin`); and five of the seven gates have never been
observed failing. All of this is written down rather than left for a reader to
find. See
[`docs/decisions/0003-private-first-and-what-that-turns-off.md`](docs/decisions/0003-private-first-and-what-that-turns-off.md).

## Status

| Phase | What it is | State |
|---|---|---|
| 1 | The gate: pull request checks, one per gate; build once and test that artifact; title validation; code owners, template, dependency updates, the ruleset as configuration and applied. The repository went public during this phase | pull request 1; can only be merged by admin bypass |
| 2 | The release: versioning, changelog, tagging, published release | not started |
| 3 | The deploy: deploy from a tag, smoke the deployed address, manual rollback to any earlier tag | not started |
| 4 | The evidence: dependency review, code scanning, build provenance | not started |

Phase 1 arrives on `main` on a branch, by pull request, with all seven gates run
against it and green. It does not arrive with an approval: its author is the
repository's only account and cannot approve their own pull request, so it can
only be merged by admin bypass. The bypass is expected to show in the ruleset's insights; that gets confirmed after the merge. Before it, `main` holds two commits:
the one that created the repository, and `ee163c6`, a direct push made on
purpose to test whether the ruleset stops an admin. It does not.

**There is no build badge in this README yet.** A badge reads the default
branch's workflow runs, and the workflow is not on the default branch until the
phase 1 pull request merges. A badge added now would report nothing, or report
red, and a red badge on a release engineering repository is worse than no badge.
It goes in when it has something true to say.

## The documents

| Document | What it answers |
|---|---|
| [`docs/meeting-brief.md`](docs/meeting-brief.md) | The one-page version: what was built, what to click in order, what phase 1 proves and deliberately does not, and a one-line list of where this diverged from `release-gate-api` |
| [`docs/divergence-from-release-gate-api.md`](docs/divergence-from-release-gate-api.md) | Each divergence from `release-gate-api` in full, with the reasoning and the cost accepted |
| [`docs/requirements.md`](docs/requirements.md) | What rules this repository enforces, what its environments and release types are, and what each phase satisfies |
| [`docs/quality-gates.md`](docs/quality-gates.md) | Every gate: the file, who enforces it, whether it blocks a merge, and what it is for |
| [`docs/RELEASE.md`](docs/RELEASE.md) | How a normal release, a rollback and a hotfix are run, and which steps are not automated yet |
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
  workflows/ci.yml          every gate, one job each
  rulesets/main.json        the branch ruleset, as configuration
  CODEOWNERS                pipeline files need an owner's review
  dependabot.yml            npm and actions, weekly
  pull_request_template.md  release impact and rollback plan
docs/                       brief, requirements, gates, runbook, decisions
src/                        the application, such as it is
tests/                      one unit test
e2e/                        one browser spec, tagged @smoke
```

## Licence

MIT. See [`LICENSE`](LICENSE).
