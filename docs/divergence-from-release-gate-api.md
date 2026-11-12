# Where this diverged from `release-gate-api`

**Directed by:** Keoni Kakugawa. Built by an AI agent team working under his
direction.

The full reasoning behind the one-line divergence list in
[`meeting-brief.md`](meeting-brief.md), moved here unchanged so the brief fits
on one page.

---

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
  two languages match the two stacks in Keoni's record: Python at one employer,
  and TypeScript at another, where he was in a senior manager role and less
  hands-on. This is not a claim that he wrote production TypeScript; the code
  here was written by the agent team, as stated at the top. A single-language
  pair would under-represent the range of stacks he has run releases for. There is
  also a pipeline reason the choice is not arbitrary: a compiled-ish toolchain
  puts `typecheck` on the board as its own gate, which is the clearest example
  in either repository of *why* gates are split. `tsc --noEmit` has to be a
  separate job because the build tool strips types without checking them, so
  folding it into the build ships type errors. That argument has no Python
  equivalent in the same shape.

- **No gh-pages evidence site, and that is a tradeoff, not a correction.**
  `release-gate-api` publishes its evidence to a `gh-pages` site that CI
  regenerates on every push to `main`. Its README states that nothing on the
  site is written by hand and that a page with a missing input says so rather
  than falling back to the previous run. That design answers the obvious
  objection to a published record: it cannot quietly go stale, because no
  person maintains it. What it buys is a reader who never has to open a run log.
  What it costs is a site generator that is itself code to build, test and keep
  correct. This repository chose the opposite: no derived site, and the primary
  records GitHub already keeps — run history, pull requests, the ruleset read
  back from the API — with hand-written documents that point at them. **The
  cost of that choice has already shown up here.** Hand-written documents drift,
  and these did: `docs/RELEASE.md` and the description of pull request 1 both
  kept saying the ruleset was unapplied after it was applied, until a review
  caught them. A generated page could not have drifted that way. The
  hand-written route was kept because at one page of application there is not
  yet enough evidence to be worth a generator, but on drift specifically the
  frame's design is the stronger one.

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

- **A minimal environment model, because there is one deploy target.** The
  frame's requirements, authored by Keoni, model a realistic enterprise promotion
  path as part of the domain its service evaluates: REQ-1.5a requires a change to
  be evidenced through REG/SIT, then INT, then non-live/BAT, then production, in
  order. That is the right model for a gate service whose job is to judge
  changes moving through such a path. This repository has a different job and a
  one-page application with a single deploy target, so it uses a minimal generic
  model: three environments (Local, Preview, Production) and three release types
  (Standard, Hotfix, Rollback), defined in `docs/requirements.md`. Declaring four
  promotion stages here would describe environments that do not exist.

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

- **Admins: the frame enforces the rules on them; this repository exempts
  them.** Measured on 2026-11-11 from the branch protection API:
  `release-gate-api`'s `main` has `enforce_admins: true`, with two required
  status checks (`Gate (Python 3.12)`, `Gate (Python 3.13)`, strict). Its
  protection response contains no required pull request review section, so no
  review count is configured there. This repository's ruleset does the opposite
  on admins: it grants the admin role an always-on bypass. Both are deliberate,
  and each buys something the other gives up.
  - *Enforcing on admins (the frame)* buys a gate with no exception: the owner's
    own changes face the same required checks as anyone's. It costs the owner's escape hatch; a
    broken required check or a rules mistake has to be fixed by changing the
    protection settings, which is itself an admin action, rather than by
    pushing past it.
  - *Bypassing for admins (here)* buys a solo maintainer the ability to merge at
    all, because this ruleset also requires an approving review and a code
    owner review, and an author cannot give either to their own pull request.
    It costs the strongest claim in the requirements: an admin can push to
    `main` directly, and did (commit `ee163c6`, logged by GitHub as a bypass),
    and every merge here, phase 1 included, is a bypass until a second account
    exists.

  The difference follows from the configurations: the frame does not require a
  review, so enforcing on its admin still leaves the admin able to merge their
  own pull request once the checks pass (inferred from the configuration); this
  repository does require one, so enforcing on its only admin would mean nothing
  could ever merge. An organisation would take a third option: admin on a
  different account from the one doing the work, review required, and admins
  enforced. **This is the weakest control in this repository and the largest
  real divergence from the frame.**

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
