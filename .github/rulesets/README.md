# The branch ruleset, as configuration

`main.json` is the rule set that protects the default branch, kept in the
repository rather than in somebody's memory of a settings page. It can be
reviewed in a pull request, it can be diffed, and it can be restored exactly if
it is ever changed by hand.

**Applied on 2026-11-11.** This file was posted to the rulesets API and is live
as ruleset `27090299`, `enforcement: active`. Earlier versions of this file said
it was not applied and would not be until phase 3; the repository was made
public and the ruleset applied during phase 1 instead, because two documents
were making enforcement claims the platform was not backing.

So, plainly: this file used to be a reviewed statement of intent. It is now a
control, with one named weakness — the admin bypass below. The reasoning and the
observed results are in
`docs/decisions/0003-private-first-and-what-that-turns-off.md`.

## What it says

| Rule | Effect |
|---|---|
| `pull_request`, 1 approving review | Nothing reaches `main` unreviewed, except by admin bypass. REQ-1.1, REQ-1.2. Never yet satisfied: there is one account, and phase 1 merges by admin bypass |
| `require_code_owner_review` | A change to a gate or to the rules needs the owner of those files. REQ-1.3 |
| `dismiss_stale_reviews_on_push` | An approval applies to what was approved, not to whatever is pushed afterwards |
| `required_review_thread_resolution` | A review comment is answered rather than merged past |
| `allowed_merge_methods: ["squash"]` | One landed change is one commit on `main`, so a version can be derived from it. Decision 0002 |
| `required_linear_history` | No merge commits on `main` |
| `non_fast_forward`, `deletion` | History cannot be rewritten or the branch removed, except by a bypass actor |
| `required_status_checks`, 7 contexts | Every gate green before merge. REQ-2.3. Observed blocking pull request 2 |
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
else (inferred from the configuration; there is no one else to observe it on),
the maintainer's use of it is recorded by GitHub, and the moment there is a
second reviewer the bypass can be removed. An approval requirement that can be
bypassed by one person is a weaker control than one that cannot. It is named
here as weaker rather than presented as equivalent. Phase 1 itself was merged
this way, `gh pr merge 1 --squash --admin`, because its author is the only
account and cannot approve their own pull request.

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
git push origin main
```

**Do not write down the expected result of that push before running it.** An
earlier version of this file said `# expected: refused`. It was not refused. The
account running it holds the admin role, `bypass_actors` grants that role an
always-on bypass, and the push went through with GitHub printing
`Bypassed rule violations for refs/heads/main`. The result for an admin is a
logged bypass (observed). The result for a non-admin is a refusal: inferred from
the ruleset configuration; not observed, because no non-admin account exists. The
admin is also the person most likely to be the one running the command.

Also confirm that `actor_id: 5` is the role you meant. A wrong id fails
silently: the ruleset applies, the API echoes the number back, and nothing warns
you that the number names `write` instead of `admin`. There is no endpoint on a
user-owned repository that maps a base role id to a name, so confirm it by
behaviour — push as an account holding only that role and see whether the bypass
applies. Full reasoning in decision record 0003, checklist step 5.
