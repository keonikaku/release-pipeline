# Bugs

This project has no Jira or other issue tracker for bugs. Bugs are recorded
with the two files in this folder, and each release note attaches or links
the bug forms that matter to that release.

## Files

| File | What it is |
|---|---|
| `bug-template.pdf` | The bug report form. One form per bug. Page 1 is the form (title, status, severity, release-blocking, steps to reproduce, expected and actual behavior, version, environment, evidence, fix PR, fixed-in version). Pages 2 and 3 are the rules for severity, release-blocking, status, the fields, and bug IDs. |
| `bug-log.xlsx` | The bug log. One row per bug: ID, title, status, severity, owner, and a link to that bug's form. Status and severity are drop-down lists (from the `Lists` sheet). |

## Bug IDs

IDs are `RP-` plus a number that only goes up. The log has `RP-001` to
`RP-200` already typed in, one per row. A pre-typed ID with an empty row is
not a bug; it is the next number waiting to be used. A new bug takes the next
unused row's ID. IDs are never reused and rows are never deleted; a bug that
is done is closed, not removed.

## How a bug reaches a release note

1. Take the next unused ID from `bug-log.xlsx` and fill in that row.
2. Fill in a copy of `bug-template.pdf` with the same ID.
3. Link the form from the log row (the "Bug form (PDF link)" column).
4. The release note for the affected release attaches or links the form.

The rules in the template are marked as proposed in the form itself. Treat
the PDF as the source for them until they are written into the repo's other
docs.
