# 0003: private first, and an exact list of what that turns off

**Date:** 2026-11-11
**Status:** accepted

## The fork

Start this repository public, so that everything GitHub gives away on public
repositories works from the first commit, or start it private and flip it later.

## The decision

Private, under a personal account on the free plan, flipped to public when the
work is ready to be read. Phase 3 is the point at which the flip has to happen,
because deploying and enforcing need it.

The tradeoff was understood before the choice was made, not discovered
afterwards. What this record adds is the exact list, so that nothing in this
repository claims a control the platform is not currently providing.

## What still works while private

Everything phase 1 consists of. Workflows run. Each gate reports as its own named
check. The pull request title gate works. Artifacts upload and download between
jobs. Code owners, the pull request template and Dependabot all work.

## What does not work while private on a free plan

Checked against GitHub's own documentation on 2026-11-11.

| Feature | Status while private on the free plan | Needed for |
|---|---|---|
| Repository ruleset enforcement on `main` | Not enforced. Rulesets on private repositories are a paid plan feature. | REQ-1.1 to REQ-1.4 |
| Environment protection rules: required reviewers, wait timers | Not available on the free plan for private repositories, and configured rules are ignored if a public repository is made private. | a deploy approval gate, phase 3 |
| GitHub Pages publishing | Requires a paid plan for a private repository. | the deploy target, phase 3 |
| Code scanning | Free for public repositories. For private repositories it needs GitHub Advanced Security. | phase 4 |
| Dependency review on pull requests | Same: public, or Advanced Security. | phase 4 |
| Artifact attestations | Free for public repositories. | phase 4 |

## What follows, and this is the part that matters

**The ruleset is committed as configuration, not applied as theatre.**
`.github/rulesets/main.json` is an importable ruleset definition in the
repository. It can be read, reviewed and version controlled now, and it can be
imported in one action after the flip. What it is not is a claim that direct
pushes to `main` are currently being refused, because they are not.

**No control is built that would silently do nothing.** The specific trap is a
deploy environment with required reviewers configured on a private free
repository: the configuration exists, the approval prompt never appears, and the
pipeline looks gated while nothing is gating it. That is worse than an
ungated deploy, because an ungated deploy is at least visibly ungated. So the
approval gate is not built until phase 3, on a repository where it works.

**Every document marks pending controls as pending.** `docs/quality-gates.md`
has a column for it. `docs/requirements.md` says it under REQ-1.
`docs/RELEASE.md` marks each step live, phase 2 or phase 3. The project's status
is legible at any moment, including the parts that are not done.

## The post-flip checklist

Done in phase 3, in this order, and each step produces evidence worth keeping.

1. Make the repository public.
2. Import `.github/rulesets/main.json` into the repository's rulesets.
3. Confirm the required status check names in the ruleset match the check names
   of a real run, character for character. A renamed job and a stale ruleset
   blocks every pull request on a check that will never report.
4. Attempt a direct push to `main` and capture the refusal. That output is the
   evidence for REQ-1.1 and it cannot be produced before this point.
5. Set the repository to allow squash merging only, and disable the other two.
6. Then, and only then, build the deploy and its approval gate.

## Cost accepted

Until the flip, the strongest claims this repository makes about `main` are
conventions held by the people working in it. That is stated in the documents
rather than papered over, and the reason it is acceptable is that the flip is a
scheduled step with a checklist, not an intention.
