# 0001: a separate repository, and a deliberately trivial application

**Date:** 2026-11-11
**Status:** accepted

## The fork

Two questions, decided together because the answers depend on each other.

1. Build this inside an existing repository, or stand up a new one?
2. Build a real application and put a pipeline around it, or build the pipeline
   and give it the smallest application that can keep it honest?

## The decision

A new repository. One page, one source file, one unit test, one browser spec.

## Why a separate repository

**The pipeline is the subject.** Adding these workflows to a repository that
already has a purpose makes them a feature of that repository. Here, the history,
the pull requests, the run records and the documents are all about the path a
change takes to production. Someone can read the whole thing and never have to
separate the pipeline from the project it happens to serve.

**Phases need room to break things.** This repository will be made to go red on
purpose, more than once, to show that a gate catches what it claims to catch.
That is not a thing to do inside a repository whose own history has to stay
clean.

**A deployment target is coming.** Phase 3 deploys this somewhere. Doing that in
a repository that already deploys something means contending with its deploy.

**The cost, accepted:** two repositories to maintain, and a link from the
portfolio rather than a section inside it. Whether this is eventually surfaced as
its own public repository or merged into the portfolio site is not decided, so
nothing here is coupled to the portfolio. No path, no base URL, no workflow and
no document assumes it.

## Why the application stays trivial

**Every hour on the application is an hour not on the pipeline.** A reviewer
assessing release engineering reads the workflows, the ruleset, the pull requests
and the runbook. A richer application does not improve any of those.

**The gates need something real, not something large.** To be meaningful, the
gate set needs code that can fail a type check, logic worth a unit test, a build
that produces an artifact, and a page a browser can assert against. That is a
low bar and it is cleared by a page that renders a list from typed data.

**Trivial is harder to hide behind.** If the application were substantial, a
reader could not tell whether the pipeline was doing the work or the application
was carrying it. With nothing to look at but the path to production, the path to
production is what is being judged. That is the intent.

## The counter, and the answer

A reviewer may say: anyone can get a one page site through a pipeline, the
difficulty is in a real system. True, and it is not what this repository claims.
It claims that the path a change takes is designed, documented, enforced by the
platform where the platform can enforce it, and honest about where it cannot.
Those properties are independent of the size of the application, and in a large
system they are the properties that are usually missing.

## Consequence

The requirements document caps the application's scope and the cap is deliberate.
Feature requests against the application are out of scope by default. The thing
that grows is the pipeline.
