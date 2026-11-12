# Requirements

**Directed by:** Keoni Kakugawa. Written by an AI agent team under his
direction.
**Status:** phase 1 agreed, phases 2 to 4 planned
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

**REQ-1.2 and REQ-1.3 have never been satisfied, only bypassed.** The ruleset
requires them and the open pull requests report `REVIEW_REQUIRED`. But the only
account is the author of every pull request, the only admin and the sole code
owner, and GitHub does not let an author approve their own pull request. No
approval has ever been given in this repository. Phase 1 itself reaches `main`
by logged admin bypass, `gh pr merge 1 --squash --admin`.

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
Pull request 2 is blocked. Pull request 1, with all seven gates green, is
blocked on its missing review rather than on a gate, which is the distinction
the two pull requests exist to show.

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

Phase 1 does not implement REQ-4. It is stated here because the release runbook
in `docs/RELEASE.md` is written against it, and because a rule written after the
automation exists is a description of the automation rather than a requirement
on it.

---

## Phases

Each phase ends green and merged before the next one starts.

### Phase 1: the gate (this phase)

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
and REQ-1.2 and REQ-1.3 are bypassed rather than satisfied, phase 1 included. The repository went public and the
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
describe; a per-gate red demonstration is scheduled work, not a claim.

### Phase 2: the release

Automated versioning, changelog and tagging from conventional commits. A release
pull request that stays open and accumulates changes until someone decides to
cut. A published release with the build attached.

Satisfies REQ-4.1 and REQ-4.2. Carries one known problem to solve in the open:
a release pull request opened with the default workflow token does not start the
gates, so the gates never run on the one pull request whose contents become a
release. The fix and the reasoning get a decision record when phase 2 lands.

### Phase 3: the deploy

Deploy to production from a tag, with a smoke check against the deployed address
afterwards. A manually triggered deploy of any earlier tag, which is the rollback
path. The public flip and the ruleset were originally scheduled here; both moved
forward into phase 1, so what remains in this phase is the deploy itself and its
approval gate.

Satisfies REQ-4.3.

### Phase 4: the evidence

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
