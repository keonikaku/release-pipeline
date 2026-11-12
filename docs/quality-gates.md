# Quality gates

What has to be green before a change lands, which file implements it, who
actually enforces it, and whether it blocks a merge. Every row names a file so
the document and the pipeline can be checked against each other.

**On enforcement, plainly.** Every row below is enforced as stated, as of
2026-11-11. That was not true of an earlier version of this document, which
carried a column of `pending` rows describing a ruleset that was committed as a
file but had never been applied. The repository was made public and the ruleset
applied — it is live as ruleset `27090299`, `enforcement: active` — so the
column now says what was measured instead of what was intended.

**The one exception, stated up front rather than in a footnote.** The ruleset
grants the repository admin role an always-on bypass. For an admin, none of the
merge-blocking rows below block anything; the push or merge goes through and
GitHub records it as a bypass. This was tested, not assumed: a direct push to
`main` by the admin on 2026-11-11 succeeded and left commit `ee163c6` on `main`
without a pull request. Phase 1 itself reaches `main` the same way: its pull
request cannot be approved, because its author is the only account, so it can
only be merged by admin bypass, `gh pr merge 1 --squash --admin`. The bypass is expected to show in the ruleset's insights; that gets confirmed after the merge. Everything below
should be read as "enforced against every actor except a repository admin", and
the "every other actor" half is inferred from the ruleset configuration rather
than observed, because no non-admin account exists.

---

## The gates

| Gate | File | Enforced by | Required green to merge |
|---|---|---|---|
| Lint and format | `.github/workflows/ci.yml`, job `lint` | the workflow, on every pull request and every push to `main` | yes. Observed: pull request 2 is `BLOCKED` with this check red |
| Type check | `.github/workflows/ci.yml`, job `typecheck` | the workflow | yes, by the ruleset. Never yet observed red |
| Unit tests and coverage | `.github/workflows/ci.yml`, job `test` | the workflow; the 90 percent threshold is in `vite.config.ts` | yes, by the ruleset. Never yet observed red |
| Dependency audit | `.github/workflows/ci.yml`, job `audit` | the workflow, `npm audit --audit-level=high` | yes, by the ruleset. Never yet observed red |
| Build | `.github/workflows/ci.yml`, job `build` | the workflow; uploads `dist` as the run's artifact | yes, by the ruleset. Never yet observed red |
| Browser tests against the built artifact | `.github/workflows/ci.yml`, job `e2e` | the workflow; `needs: build`, and the artifact is downloaded rather than rebuilt | yes, by the ruleset. Never yet observed red |
| Pull request title is a conventional commit | `.github/workflows/ci.yml`, job `pr-title` | the workflow, on pull requests only | yes. Observed: pull request 2 is `BLOCKED` with this check red |
| Pull request required, no direct push to `main` | `.github/rulesets/main.json` | GitHub, ruleset `27090299`, active | for a non-admin, yes: inferred from the ruleset configuration; not observed, because no non-admin account exists. **No** for an admin: observed bypassed, commit `ee163c6` |
| One approving review | `.github/rulesets/main.json` | GitHub, ruleset `27090299`, active | required, yes. Observed: both open pull requests report `reviewDecision: REVIEW_REQUIRED`. Never satisfied: no approval has ever been given, and pull request 1 can only be merged by admin bypass |
| Code owner review on pipeline files | `.github/CODEOWNERS` with the ruleset | GitHub, ruleset `27090299`, active | yes, by the ruleset's `require_code_owner_review`. Not independently observed, because the sole code owner is also the sole admin |
| Linear history, squash merge only | `.github/rulesets/main.json` and repository settings | GitHub, ruleset `27090299`, plus repository settings | yes. Observed: `allow_merge_commit` and `allow_rebase_merge` are both `false`, `allow_squash_merge` is `true` |
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

## Three small decisions that are easy to get wrong

**Dependabot's titles have to pass `pr-title` too.** `.github/dependabot.yml`
sets commit message prefixes of `chore(deps)`, `chore(deps-dev)` and `ci`, so
every pull request Dependabot opens has a conventional commit title. Without
that, a whole class of pull requests would open with a failing check, and a
check that is permanently red on a class of pull requests is a check people
learn to scroll past.

**One place decides the Node version.** `.nvmrc` holds it, and the workflow
reads it with `node-version-file`. A version in the workflow and a different one
on a laptop is the usual reason a gate behaves differently in the two places,
which is the one thing a gate must never do.

**The formatter does not touch prose.** Markdown is excluded from Biome in
`biome.json`. Reflowing a runbook produces a diff full of moved line breaks and
a reviewer who stops reading diffs in `docs/`. Code is formatted by a tool;
sentences are written by a person.

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

Verified after the ruleset was applied: the run on pull request 1 reports
`lint`, `typecheck`, `test`, `audit`, `build`, `e2e`, `pr-title`, and all seven
show green rather than pending. A stale name shows up as a check stuck waiting,
so "all seven green" is the evidence that none of the seven names are stale.

---

## Known gap: five of these seven gates have never been seen red

Two gates have been demonstrated catching something: `lint` and `pr-title`, both
on pull request 2, which exists for that purpose. The other five —
`typecheck`, `test`, `audit`, `build`, `e2e` — are required by the ruleset and
are believed to fail on a real defect, but that has not been shown.

This is recorded rather than quietly left out, for the same reason the admin
bypass is. A gate that has never failed is a gate whose failure path is
untested, and the failure path is the only part of a gate that does any work. A
plausible-looking required check that passes on a broken input is a common and
entirely invisible pipeline defect.

Not being fixed now, on purpose: a per-gate red demonstration is a known gap,
not a phase, with five more deliberately broken branches behind it, and claiming it here
before doing it would be the same error this document was just corrected for.

---

## The documented response when `main` goes red

**Revert first, fix forward.** The squash commit is reverted so `main` returns to
a shippable state, then the fix goes through on its own branch with its own gates.
This is a release management instinct rather than an engineering one, and it is
written down here so the response under pressure is a procedure rather than a
judgement call.

What is deliberately not on the list: pushing the fix straight to `main` because
the pipeline is in the way. The gates exist for the moment they are inconvenient.
