# Quality gates

What has to be green before a change lands, which file implements it, who
actually enforces it, and whether it blocks a merge. Every row names a file so
the document and the pipeline can be checked against each other.

**On enforcement, plainly.** Some of the rules below are enforced by a workflow
that runs today. Some are enforced by a repository ruleset that is committed here
as configuration but is not applied yet, because this repository is private on a
free plan. Each row says which. A document that claims an enforcement mechanism
it does not have is worse than one that admits the mechanism is a human.

---

## The gates

| Gate | File | Enforced by | Required green to merge |
|---|---|---|---|
| Lint and format | `.github/workflows/ci.yml`, job `lint` | the workflow, on every pull request and every push to `main` | yes, once the ruleset is applied |
| Type check | `.github/workflows/ci.yml`, job `typecheck` | the workflow | yes, once the ruleset is applied |
| Unit tests and coverage | `.github/workflows/ci.yml`, job `test` | the workflow; the 90 percent threshold is in `vite.config.ts` | yes, once the ruleset is applied |
| Dependency audit | `.github/workflows/ci.yml`, job `audit` | the workflow, `npm audit --audit-level=high` | yes, once the ruleset is applied |
| Build | `.github/workflows/ci.yml`, job `build` | the workflow; uploads `dist` as the run's artifact | yes, once the ruleset is applied |
| Browser tests against the built artifact | `.github/workflows/ci.yml`, job `e2e` | the workflow; `needs: build`, and the artifact is downloaded rather than rebuilt | yes, once the ruleset is applied |
| Pull request title is a conventional commit | `.github/workflows/ci.yml`, job `pr-title` | the workflow, on pull requests only | yes, once the ruleset is applied |
| Pull request required, no direct push to `main` | `.github/rulesets/main.json` | GitHub, once the ruleset is applied. Not enforced while private on a free plan. | pending |
| One approving review | `.github/rulesets/main.json` | GitHub, once applied | pending |
| Code owner review on pipeline files | `.github/CODEOWNERS` with the ruleset | GitHub, once applied | pending |
| Linear history, squash merge only | `.github/rulesets/main.json` and repository settings | GitHub, once applied | pending |
| Release impact and rollback plan stated | `.github/pull_request_template.md` | the person opening the pull request | no, by convention |
| Dependencies stay current | `.github/dependabot.yml` | Dependabot, weekly, npm and actions | not applicable |

---

## What each gate is for

### `lint`: is this the house style

Biome, in one pass, checking both lint rules and formatting. One tool rather than
two means there is no argument between the linter and the formatter and no third
config file to keep them agreeing. It runs in check mode in CI, so a formatting
difference fails rather than being silently rewritten by the pipeline. A pipeline
that edits the code it is judging cannot be trusted to judge it.

### `typecheck`: does this hold together

`tsc --noEmit`, in strict mode. This is a separate job from `lint` and from
`test` on purpose. The build tool strips types without checking them, so if this
gate is folded into the build the project ships type errors. Keeping it separate
also means the pull request says "typecheck" and not "build", which is the
difference between a reviewer knowing what is wrong and a reviewer opening a log.

### `test`: does the logic do what it claims

Vitest, with coverage reported and a threshold set in `vite.config.ts` rather
than passed on the command line, so the local run and the CI run cannot disagree
about what counts as enough. The threshold failing is a test failure. A coverage
number that is reported and not enforced is decoration.

### `audit`: is anything we depend on known to be broken

`npm audit` at high severity and above. Moderate and low findings are reported in
the log but do not fail the gate, because a gate that fails on noise is a gate
people learn to ignore, and a gate people ignore is worse than no gate.

### `build`: does it produce an artifact

Vite builds, and the `dist` directory is uploaded as the run's artifact. This job
is the only place in the pipeline where a build happens.

### `e2e`: does the artifact behave

Playwright, against the artifact `build` produced. The job carries `needs: build`
and downloads that exact `dist` directory rather than running the build again.

This is the one gate worth being insistent about. If the browser suite builds its
own copy, then two builds exist: the one that was tested and the one that could
be shipped, and no evidence connects them. Downloading the artifact makes the
thing tested and the thing shipped the same bytes. The cost is one more job and
an artifact round trip. It is worth it.

A subset of the suite is tagged `@smoke`. The same specs, filtered by tag, are
what phase 3 will run against the deployed site after a deploy. A separate smoke
suite would drift from the real one; a tag cannot.

### `pr-title`: can a version be derived from this

The pull request title has to parse as a conventional commit, because merges are
squash merges and the pull request title becomes the commit subject on `main`.
That subject is what phase 2 reads to decide whether the next version is a patch,
a minor or a major. So this gate is not a style preference. It is the input to
versioning, validated at the only moment it can still be corrected cheaply.

This job runs on pull requests only. On a push to `main` there is no title to
check, and a job that cannot apply should be absent rather than green.

---

## How a failure is meant to read

The quality jobs run as a matrix with `fail-fast: false`. A change with a lint
error and a failing test is told both in one run instead of being told one, fixed,
pushed, and then told the other.

Each gate is its own job, so each appears as its own named check. The required
checks listed in `.github/rulesets/main.json` are these job names exactly. If a
job is renamed and the ruleset is not updated, GitHub waits forever for a check
that will never report, and the pull request is blocked by a name mismatch rather
than by a quality problem. That is the usual way this setup breaks, so the names
in the ruleset are copied from an actual run rather than typed from memory.

---

## The documented response when `main` goes red

**Revert first, fix forward.** The squash commit is reverted so `main` returns to
a shippable state, then the fix goes through on its own branch with its own gates.
This is a release management instinct rather than an engineering one, and it is
written down here so the response under pressure is a procedure rather than a
judgement call.

What is deliberately not on the list: pushing the fix straight to `main` because
the pipeline is in the way. The gates exist for the moment they are inconvenient.
