# Meeting brief: what this repository is

**Author:** Keoni Kakugawa
**Date:** 2026-11-11
**Audience:** someone technical who has fifteen minutes and no reason to be
generous.

---

## What was built

A pipeline, and the smallest possible application for it to act on.

A change to this repository cannot reach `main` by hand. It goes onto a branch,
it opens a pull request, and seven separate automated checks run on it: lint and
formatting, type checking, unit tests with a coverage floor, a dependency audit,
a build, browser tests, and a check that the pull request title parses as a
conventional commit. Each one reports as its own named check, so the pull
request says which thing is wrong without anyone opening a log. All seven must
be green and one human must approve before the merge button works.

The rules that require all of that are not settings somebody clicked. They are a
JSON file in the repository, `.github/rulesets/main.json`, which was applied by
posting that file to the GitHub API. The live rule and the reviewed file have the
same origin, and if the rule is ever changed by hand the file is what restores
it.

## Why it was built this way

Release and change management is normally evidenced by describing it — a process
document, a slide, a story about a release calendar. The description is not the
control. This repository is an attempt to evidence the discipline by operating
it, where every claim has a run record, a pull request, or an API response
behind it.

Two consequences of taking that seriously:

**The application is deliberately trivial.** One page, one source file, one unit
test, one browser spec. If the application were substantial, a reader could not
tell whether the pipeline was doing the work or the application was. With nothing
to look at but the path to production, the path to production is what gets
judged. That is the intent.

**The documents are corrected when they turn out to be wrong, in public.** Two
claims in this repository were false when first written: a decision record said
squash was the only merge method when all three were in fact enabled, and the
requirements document claimed red gates blocked merges when they did not,
because the ruleset had never been applied. A review caught both. Rather than
soften the sentences, the configuration was changed to make them true, and the
records now say they were wrong and what fixed them. That exchange is in the
pull request history and it is a better artifact than a document that was never
checked.

## What a visitor should click, in order

1. **Pull request 2** — "Break the lint gate on purpose and give this a bad
   title." Two checks are red, five green. The merge is blocked. This is the
   whole thesis in one screen, and it is left open permanently as the exhibit.
2. **Pull request 1** — the phase 1 change itself. All seven checks green. Note
   that it is still not mergeable: it needs a review. Green is necessary, not
   sufficient.
3. **The checks on either pull request** — seven named checks, not one check
   called "CI". Open the matrix run and note `fail-fast: false`: a change with a
   lint error and a failing test is told both in one run.
4. **`.github/workflows/ci.yml`, the `build` and `e2e` jobs** — `build` uploads
   `dist` as an artifact and `e2e` downloads that exact artifact instead of
   rebuilding. The thing tested is the bytes that would ship.
5. **`.github/rulesets/main.json`** — the branch rules as a reviewable file.
6. **`docs/requirements.md`** — the rules were written down before any
   automation existed to enforce them, so they are requirements on the pipeline
   rather than a description of it. Read the enforcement notes under REQ-1 and
   REQ-2; they are where the honest limits are.
7. **`docs/decisions/`** — three decision records, each with a "cost accepted"
   section.
8. **The commit `ee163c6` on `main`** — a commit that did not come through a
   pull request. Explained below, and it is not an accident.

## What phase 1 proves

- A change cannot reach `main` without a pull request, an approval, a code owner
  review on pipeline files, and seven green checks — for any actor that is not a
  repository admin. Applied ruleset `27090299`, `enforcement: active`.
- A red gate blocks a merge. Observed: pull request 2 reports
  `mergeStateStatus: BLOCKED` with `lint` and `pr-title` red.
- Gates report individually and do not cancel each other.
- The artifact that the browser suite tests is the artifact the build produced,
  not a second build of the same source.
- `main` is squash-only with linear history. Observed:
  `allow_merge_commit: false`, `allow_rebase_merge: false`,
  `allow_squash_merge: true`.
- The rules are version controlled, not remembered.

## What phase 1 deliberately does not prove

- **It does not stop a repository admin.** The ruleset grants the admin role an
  always-on bypass. This was tested rather than assumed: a direct push to `main`
  by the admin succeeded, and GitHub printed
  `Bypassed rule violations for refs/heads/main`. That push is commit `ee163c6`,
  and it is still on `main` on purpose. Removing it would have deleted the
  evidence of the one weakness in the control. A single-maintainer repository
  cannot enforce "no direct pushes" against its own owner; an organisation fixes
  this by putting admin on a different account than the one doing the work, and
  that is the honest answer rather than a claim that the rule is airtight.
- **It does not prove five of the seven gates actually catch anything.** `lint`
  and `pr-title` have been demonstrated red. `typecheck`, `test`, `audit`,
  `build` and `e2e` are required checks that have only ever passed. A gate whose
  failure path has never run is an assumption. Scheduled, not claimed.
- **It does not deploy anything.** There is no production yet, so there is
  nothing to roll back and no deploy approval to show.
- **It does not say anything about scale.** Anyone can get a one-page site
  through a pipeline. The claim is about the design and the honesty of the path,
  not the difficulty of the payload.

## What is pending

- **Phase 2 — the release.** Versioning, changelog and tagging derived from the
  commit subjects on `main`, with a release pull request that accumulates
  changes until someone cuts. Carries one known problem to solve in the open: a
  release pull request opened with the default workflow token does not trigger
  the gates, so the one pull request whose contents become a release is the one
  the gates never run on.
- **Phase 3 — the deploy.** Deploy from a tag, smoke check the deployed address
  afterwards, and a manually triggered deploy of any earlier tag as the rollback
  path.
- **Phase 4 — the evidence.** Dependency review, code scanning, and an
  attestation tying a published artifact to the run and commit that built it.
- **Phase 5 — the failure demonstrations.** A deliberately broken branch per
  remaining gate, so all seven have been seen catching something.

---

# Where this diverged from `release-gate-api`

`release-gate-api` is the frame. This repository was modelled on it and then
disagreed with it in specific places. Each disagreement below is a position, not
an oversight, and where the difference is a tradeoff rather than an improvement
it says so.

- **Merge method: no squash there, squash only here.** `release-gate-api`
  disables squash and allows merge commits, because the history there *is* the
  evidence. Its defect cycle is: name the test that should have caught this,
  write the regression test first so CI goes red, then fix so CI goes green.
  The value of that is the *order*, timestamped by GitHub, where it cannot be
  retrofitted. Squashing collapses red-then-green into one commit and the
  ordering is gone, so squashing is correctly refused there. Here, the history
  is not evidence — it is an *input to automation*. Versioning and the changelog
  are derived from commit subjects on `main`, which wants exactly one commit per
  landed change carrying a subject a reviewer actually saw. Merge commits would
  feed `wip`, `fix review comments` and `oops` to the version calculator. The
  shared principle is identical in both repositories: history is shaped to serve
  what it has to prove. One proves event ordering; the other proves what was
  released. **The cost here is real and is not waved off:** the red-then-green
  defect evidence `release-gate-api` can produce in its commit history is not
  available in this repository's. If a defect cycle has to be shown here, it has
  to be shown through pull request and run records, which GitHub keeps outside
  the commit history. That is a weaker form of the same evidence. It is the
  price of a history a version calculator can read.

- **Language: Python there, TypeScript here.** Not variety for its own sake. The
  two repositories together are the claim, because the two languages match where
  the experience actually came from — Python at one employer, TypeScript at
  another — and a single-language portfolio would under-represent that. There is
  also a pipeline reason the choice is not arbitrary: a compiled-ish toolchain
  puts `typecheck` on the board as its own gate, which is the clearest example
  in either repository of *why* gates are split. `tsc --noEmit` has to be a
  separate job because the build tool strips types without checking them, so
  folding it into the build ships type errors. That argument has no Python
  equivalent in the same shape.

- **No gh-pages evidence ledger.** `release-gate-api` publishes evidence
  surfaces to a `gh-pages` site. Reproducing that here would mean building a
  second record of things GitHub already records natively: tags, Releases with
  attached builds, and run history are the ledger, and they are the primary
  source rather than a rendering of one. A published site is a *derived* record
  that can drift from the runs it describes, and a drifted evidence page is
  worse than no evidence page. Where it earns its place in the other project is
  as curation — a walkthrough for a reader who will not click into run logs — so
  this is a genuine tradeoff, not a correction: the frame project buys
  readability and pays in a surface that must be kept true. Here the equivalent
  readability is bought with `docs/meeting-brief.md`, which makes claims and
  points at the primary source, instead of restating it.

- **Deliberately thin test layers.** One unit test, one browser spec. In
  `release-gate-api` the depth of the test suite is part of the point. Repeating
  that here would be the weaker move for two reasons. First, QA-management
  evidence is already claimed by that project; a second, shallower version of
  the same claim subtracts from it. Second, an application this trivial cannot
  honestly support a large suite — a hundred tests against one page that renders
  a typed list is theatre, and a reviewer who spots padding stops trusting the
  parts that are real. What this repository needs from its tests is exactly that
  the gates have something true to run. **Stated plainly as a limitation:** the
  test suite here is not evidence of testing skill and is not offered as any.

- **Self-authored environment and release-type vocabulary.** The environment
  model is three names — Local, Preview, Production — and the release types are
  Standard, Hotfix, Rollback. All generic, all defined inside
  `docs/requirements.md`, none carried over from any employer's internal naming.
  Partly that is a hard rule about not reusing former employers' material. But
  it is also the better design: a promotion ladder with stages nothing is ever
  done in is a drawing of a process, not a process. Three environments is what
  this repository can actually evidence, so three is what it declares. An
  inherited seven-stage ladder would have been borrowed vocabulary describing
  stages that do not exist here.

- **A trivial application on purpose.** `release-gate-api` has a real service
  behind it — FastAPI and SQLite, a gate service with genuine behaviour to test.
  Here the application is one page. That is the sharper choice *for this
  repository's specific claim*: with a real service present, a reader cannot
  separate the quality of the pipeline from the quality of the service, and the
  pipeline is the exhibit. The two repositories answer different questions and
  the application size follows from the question, not from effort available.

- **The ruleset committed as configuration-as-code.** Branch rules live in
  `.github/rulesets/main.json` and were applied by posting that file to the API,
  not by clicking a settings page. The reason is specific: a settings page has
  no diff, no review, no history and no restore. A rule that exists only in the
  UI cannot be reviewed in a pull request, and a rule nobody reviewed is a rule
  nobody agreed to. **And this project learned the limit of that pattern the
  hard way:** the file sat in the repository, reviewed, for days without being
  applied, while two documents described it as though it were enforcing
  something. A committed ruleset file is not proof that the rule is live. Both
  halves are needed — the file for reviewability, and an observed ruleset id and
  blocked pull request for enforcement — and this repository now states both.

- **The admin bypass, openly acknowledged as a weaker control.** The ruleset
  grants the repository admin role an always-on bypass, which means the strongest
  statement in the requirements document — nothing reaches `main` unreviewed —
  has an exception that happens to cover the only person working here. Three
  options existed: remove the bypass, which locks the owner out of recovering a
  broken `main` and trades a governance risk for a worse operational one; split
  admin onto a second account, which is what an organisation does and is the
  right answer at that scale; or keep the bypass and document it precisely. The
  third was chosen, and "document it precisely" meant attempting the push to find
  out what really happens rather than writing down the expected refusal. It was
  not refused. The checklist that predicted a refusal has been corrected to say
  so, and the bypassing commit was left on `main`. **This is the weakest control
  in the repository and it is named in four places rather than one.**

- **A per-gate red demonstration deferred, and said out loud.**
  `release-gate-api` has branches whose whole purpose is to prove a specific
  check catches a specific defect. Here, only two of seven gates have been shown
  red. The divergence is in the handling, not the ambition: rather than imply the
  other five work, `docs/quality-gates.md` carries "Never yet observed red" in
  the enforcement column of each of the five and a section explaining why a gate
  whose failure path has never run is an assumption.

- **Requirements written before the automation, and numbered.** The rules in
  `docs/requirements.md` were written first, with IDs, and the gates were built
  against them. A rule written after the automation is a description of the
  automation rather than a requirement on it — it can never be unmet, so it can
  never be evidence. The visible cost is that REQ-4 sits in the document
  unimplemented for three more phases, which looks like an unfinished document.
  That is the correct appearance for an unfinished pipeline.

- **Phase order broken on purpose, once.** The public flip and the ruleset were
  scheduled for phase 3. They were pulled into phase 1 because a review found
  two documents claiming enforcement the platform was not providing, and the only
  honest options were to weaken the claims or make them true. Sitting on an
  untrue claim is a worse state than an out-of-order milestone. Recorded in
  decision record 0003 as a decision that was superseded by events the same day
  it was accepted.
