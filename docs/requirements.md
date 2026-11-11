# Requirements

**Author:** Keoni Kakugawa
**Status:** phase 1 agreed, phases 2 to 4 planned
**Purpose:** state the release management rules this repository is built to
enforce, before any automation exists to enforce them.

The application in this repository is deliberately trivial. It exists so that
there is something real to lint, type check, test, build and deploy. The subject
of the work is the path a change takes to production, not the application.

---

## The model this repository uses

Two small models are needed before any rule can be written down. Both are
authored here and apply only here. Neither is taken from any employer.

### Environments

| Environment | What it is | Who it is for |
|---|---|---|
| Local | A developer machine. | The person making the change. |
| Preview | The build artifact served from a pull request's own run. | Reviewers, and the automated browser checks. |
| Production | The deployed site at its public address. | Everyone. |

There is deliberately no long promotion ladder. A ladder with stages nothing is
ever done in is a drawing of a process, not a process. Three environments is
what this repository can honestly evidence, so three is what it declares.

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
today. REQ-1.1 through REQ-1.4 are enforced by a repository ruleset, and the
ruleset is committed at `.github/rulesets/main.json` as configuration rather
than as a screenshot of a settings page. While this repository is private on a
free plan, GitHub does not enforce that ruleset. Applying it and capturing the
refused push is a step that happens when the repository is made public. See
`docs/decisions/0003-private-first-and-what-that-turns-off.md`.

## REQ-2: Every gate reports separately

| ID | Rule |
|---|---|
| REQ-2.1 | Each quality gate is its own job, so the pull request names which gate failed without anyone opening a log. |
| REQ-2.2 | One gate failing does not cancel the others. A change is told everything that is wrong with it in one run. |
| REQ-2.3 | A gate that is red blocks the merge. There is no override that does not leave a record. |

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

Satisfies REQ-1.5, REQ-2 in full, REQ-3 in full. Declares REQ-1.1 to REQ-1.4 as
configuration pending the flip to public.

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
path. This phase is also the point at which the repository goes public and the
ruleset is applied, because publishing and approval gates need it.

Satisfies REQ-4.3 and REQ-1.1 to REQ-1.4 as enforced rather than declared.

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
