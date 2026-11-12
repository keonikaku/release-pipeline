# Meeting brief

**Directed by:** Keoni Kakugawa. Built by an AI agent team working under his
direction.
**Date:** 2026-11-11

## What was built

- A pipeline, and a one-page application for it to act on.
- Every change goes branch, pull request, then seven named checks: lint,
  typecheck, unit tests with a coverage floor, audit, build, browser tests, and
  the pull request title.
- The branch rules are a JSON file in the repository,
  `.github/rulesets/main.json`, applied through the GitHub API, not clicked in.

## The admin bypass

The repository has one account, and it is the only admin. GitHub does not let
an author approve their own pull request, so PR #1 can only be merged by admin
bypass (`gh pr merge 1 --squash --admin`). This is the documented weakness
happening on the first real change. The bypass is expected to show in the
ruleset's insights; that gets confirmed after the merge.

## What to click, in order

1. **PR #2**, broken on purpose: two checks red (`lint`, `pr-title`), five
   green, merge blocked.
2. **PR #1**: all seven green, still `BLOCKED` on review. Green is necessary,
   not sufficient.
3. **`.github/workflows/ci.yml`**: `build` uploads the artifact once, and `e2e`
   tests those exact bytes instead of rebuilding.

**Proves:** the ruleset is live, each gate reports on its own, red gates hold a
merge (inferred from PR #1 against PR #2), and the tested artifact is the built
one.

**Does not prove:** a review ever passing, any control on the admin, five of the
seven gates ever catching anything, or a deploy.

## Where it differs from `release-gate-api`

- **Admins.** The frame enforces its rules on admins; this repository exempts
  them. The biggest real divergence, and the weakest control here.
- **Merge method.** Squash only here, merge commits there. Its history proves
  red-then-green order; this history feeds versioning. Cost: that defect
  evidence is not in this commit history.
- **Language.** TypeScript here, Python there, matching the two stacks in
  Keoni's record.
- **Evidence.** Here, run history and pull requests are the record; the frame
  publishes a CI-generated evidence site. On drift, the frame is stronger: the
  hand-written documents here did drift.
- **Tests.** Deliberately thin, because the QA evidence lives in
  `release-gate-api`.
- **Environments.** A minimal model (Local, Preview, Production), because there
  is one deploy target.

Full reasoning:
[`divergence-from-release-gate-api.md`](divergence-from-release-gate-api.md).

## Pending

Phase 2 the release, phase 3 the deploy, phase 4 release-management policy as
code, phase 5 the evidence. Known gap, not a phase: a red demonstration for the
five gates never yet seen red.
