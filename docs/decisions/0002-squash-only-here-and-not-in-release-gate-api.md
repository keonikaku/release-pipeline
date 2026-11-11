# 0002: squash merging only here, and deliberately not in release-gate-api

**Date:** 2026-11-11
**Status:** accepted

## Why this record exists

In `release-gate-api`, squash merging is turned off, and a document there says
plainly that squashing would destroy evidence. In this repository squash merging
is the only merge method allowed. Read side by side with no explanation, the two
repositories look like someone changed their mind, or like one of the two
positions was never reasoned about. Both are the same position applied to two
different questions, and this record is here so a reader does not have to take
that on trust.

## The decision

| Repository | Merge method | Because the history there has to prove |
|---|---|---|
| `release-gate-api` | merge commits only, squash and rebase disabled | that a failing test was written before the fix, in that order, timestamped |
| this repository | squash only, linear history required | that one merged pull request is exactly one releasable change with one derivable version |

## The reasoning

**The question is what the commit history is evidence of.**

In `release-gate-api`, the history is the evidence. The defect cycle there is:
name the test that should have caught it, write the regression test first so CI
goes red, then fix so CI goes green. The value of that is the order, recorded by
GitHub with timestamps, where nobody can retrofit it later. Squashing a branch
collapses red-then-green into one commit and the ordering is gone. So squashing
is refused there, and the cost accepted is a noisier history.

Here, the history is an input to automation. Versioning and the changelog are
derived from commit subjects on `main`. That derivation wants exactly one commit
per landed change, with a subject that was reviewed. Squash merging gives that:
the pull request title, which the `pr-title` gate validated and a reviewer saw,
becomes the one commit on `main`. Merge commits would instead put every work in
progress subject on `main`, and `wip`, `fix review comments` and `oops` would all
be fed to the version calculator.

**So the shared principle is: history is shaped to serve what it has to prove.**
In one repository that is the order of events in a defect cycle. In the other it
is a clean, machine readable record of what was released. The repositories differ
because the claims differ, not because the standard moved.

## What follows from it here

1. Squash is the only merge method enabled, and linear history is required by the
   ruleset, so there is no route to a merge commit on `main`.
2. The pull request title carries real weight, which is why a gate validates it
   rather than a convention asking nicely.
3. Branch commits are working notes. Nobody should read them and nothing should
   depend on them, which is why branch commit subjects are not gated.

## Cost accepted

The red-then-green defect evidence that `release-gate-api` can produce is not
available here. If a defect cycle needs to be shown in this repository, it will
have to be shown through pull request and run records, which GitHub keeps outside
the commit history, rather than through two commits on `main`. That is a weaker
form of the same evidence, and it is the price of a history that automation can
read.
