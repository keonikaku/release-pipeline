# The branch ruleset, as configuration

`main.json` is the rule set that protects the default branch, kept in the
repository rather than in somebody's memory of a settings page. It can be
reviewed in a pull request, it can be diffed, and it can be restored exactly if
it is ever changed by hand.

**It is not applied yet, and this file does not pretend otherwise.** This
repository is private on a free plan, and GitHub does not enforce repository
rulesets under those conditions. Applying it, and capturing the refused direct
push that proves it is enforced, is a step in phase 3 when the repository is
made public. The reasoning and the full list of what else is off while private
is in `docs/decisions/0003-private-first-and-what-that-turns-off.md`.

So, plainly: today this file is a reviewed statement of intent. After the flip it
is a control.

## What it says

| Rule | Effect |
|---|---|
| `pull_request`, 1 approving review | Nothing reaches `main` unreviewed. REQ-1.1, REQ-1.2 |
| `require_code_owner_review` | A change to a gate or to the rules needs the owner of those files. REQ-1.3 |
| `dismiss_stale_reviews_on_push` | An approval applies to what was approved, not to whatever is pushed afterwards |
| `required_review_thread_resolution` | A review comment is answered rather than merged past |
| `allowed_merge_methods: ["squash"]` | One landed change is one commit on `main`, so a version can be derived from it. Decision 0002 |
| `required_linear_history` | No merge commits on `main` |
| `non_fast_forward`, `deletion` | History cannot be rewritten or the branch removed |
| `required_status_checks`, 7 contexts | Every gate green before merge. REQ-2.3 |
| `strict_required_status_checks_policy` | The branch must be up to date with `main`, so the checks ran against what will actually be on `main` |

## The two things that will break this

**The check names.** The seven contexts are the CI job names from
`.github/workflows/ci.yml`, character for character. If a job is renamed and
this file is not updated, GitHub waits forever for a check that will never
report, and every pull request is blocked by a name mismatch rather than by a
quality problem. The pull request template carries a line about it for exactly
that reason. The names in this file were copied from a real run rather than
typed from memory.

**The administrator bypass.** `bypass_actors` carries the repository
administrator role. This is deliberate and it is the honest compromise in the
file: the repository has one maintainer, and GitHub does not let an author
satisfy a code owner review on their own pull request. Without the bypass, the
maintainer could never merge his own work and the only available response would
be to turn the rule off, which is worse. With it, the rule applies to everyone
else, the maintainer's use of it is recorded by GitHub, and the moment there is a
second reviewer the bypass can be removed. An approval requirement that can be
bypassed by one person is a weaker control than one that cannot. It is named
here as weaker rather than presented as equivalent.

## Applying it

After the repository is public:

```bash
gh api --method POST \
  /repos/keonikaku/release-pipeline/rulesets \
  --input .github/rulesets/main.json
```

Then check it took effect, rather than assuming:

```bash
gh api /repos/keonikaku/release-pipeline/rulesets
git push origin main          # expected: refused
```

That refusal is the evidence for REQ-1.1 and it cannot be produced before this
point.
