<!--
Title: this pull request's title must be a conventional commit subject, for
example `fix: stop the summary line double counting`. It is checked by the
`pr-title` gate, and because merges here are squash merges it becomes the one
commit subject on main and the changelog entry for this change.

A breaking change is marked with `!` in the title. A `BREAKING CHANGE:` line in
this description does not reach main, and once the squash default is set to
"Pull request title" (docs/RELEASE.md, section 4) neither does one in a commit
body: the squash commit is the title alone.
-->

## What changed

<!-- One or two sentences. What is different afterwards, not a list of files. -->

## Why

<!-- The problem this solves. If it is a defect, what it looked like. -->

## Release impact

- [ ] No user visible change (`chore`, `docs`, `test`, `ci`, `refactor`)
- [ ] Backwards compatible change or fix (`fix`, `perf`, `feat`)
- [ ] Breaking change (the title carries `!`, for example `feat!: ...`)

<!-- If breaking: what breaks, and what someone has to do about it. -->

## How this was verified

- [ ] The gates are green on this pull request
- [ ] Checked locally beyond the gates, described below

<!-- What you actually did. "CI passed" is the gates' claim, not yours. -->

## Rollback plan

<!-- How this is undone if it is wrong in production. For most changes:
     "revert this commit". If it is anything else, say so here rather than
     working it out during the incident. See docs/RELEASE.md. -->

## Checklist

- [ ] The title is a conventional commit subject, and its type is the one that
      moves the version the way this change should
- [ ] Documents that state what is enforced are still true after this change
      (`docs/quality-gates.md`, `docs/requirements.md`)
- [ ] If a gate was added, renamed or removed: the required status checks in
      `.github/rulesets/main.json` were updated to match the job names exactly
