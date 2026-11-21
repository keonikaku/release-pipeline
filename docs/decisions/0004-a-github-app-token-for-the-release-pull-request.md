# 0004: a GitHub App token for the release pull request

**Date:** 2026-11-12
**Status:** accepted; **pending** until the App exists. The workflow is written
against it and references it by name. The App, its installation and the
repository secret are created by Keoni, not by the agent team, because no agent
on this project creates, enters or stores a credential. Until they exist, the
`Release` workflow fails on its first step and says why.

## The problem

release-please keeps one release pull request open on `main`. That pull
request's contents are what a release is cut from, so it is the one pull
request where the gates matter most. With the default `GITHUB_TOKEN`, the gates
do not simply run on it.

GitHub's documentation, "Triggering a workflow from a workflow" (read
2026-11-12, `docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow`):

> When you use the repository's `GITHUB_TOKEN` to perform tasks, events
> triggered by the `GITHUB_TOKEN` will not create a new workflow run, with the
> following exceptions: ... `pull_request` events with the `opened`,
> `synchronize`, or `reopened` activity types: when a workflow using
> `GITHUB_TOKEN` creates or updates a pull request, the resulting
> `pull_request` event creates workflow runs in an **approval-required** state.

and:

> If you do want to trigger a workflow from within a workflow run, you can use
> a GitHub App installation access token or a personal access token instead of
> `GITHUB_TOKEN` ... Using one of these alternatives also lets `pull_request`
> workflows run automatically (without the approval prompt described above).

release-please-action's own README ("Other Actions on Release Please PRs")
says the same in its older form and recommends a personal access token "if you
want GitHub Actions CI checks to run on Release Please PRs".

The two sources differ on one detail. The release-please README says runs are
not created at all; GitHub's current page says they are created and held for
approval. Neither has been observed in this repository, because no release pull
request has been opened here yet. Either way the gates do not run on their own,
which is the problem.

## The constraint that decides it

Every merge to `main` in this repository is an admin bypass
(`gh pr merge <n> --squash --admin`), because the only account is the author of
every pull request and cannot approve its own. An admin bypass merges past
required checks that are pending as well as past a missing review. So on this
repository, "the required checks would block it" is not a safeguard for the
release pull request. Any option in which the gates run only if someone
remembers to do something is an option in which a forgotten step ships a
release whose pull request was never gated.

## The options

| Option | Credential | Gates on the release pull request | Cost or reason against |
|---|---|---|---|
| 1. Default `GITHUB_TOKEN`, approve the held runs by hand | none | only after a person clicks **Approve workflows to run** on every update | Needs the repository setting "Allow GitHub Actions to create and approve pull requests", currently off (observed: `can_approve_pull_request_reviews: false`). That one setting also lets any workflow's `GITHUB_TOKEN` approve pull requests. And the click is exactly the forgettable step the constraint above rules out. Documented, never observed here. |
| 2. Fine-grained personal access token | a long-lived token tied to Keoni's account | run automatically | GitHub's own page on personal access tokens: "for long-lived integrations, you should use a GitHub App". The token acts as Keoni, so the release pull request is authored by Keoni, and he still cannot approve it: every release stays an admin bypass. Expiry has to be remembered and rotated, or set to none, which GitHub recommends against. |
| 3. GitHub App installation token, minted per run by `actions/create-github-app-token` | an App private key, stored as a repository secret | run automatically | The most setup: an App, an installation, a variable and a secret. The private key does not expire and has to be guarded like any key. |
| 4. Release workflow dispatches CI on the release branch (`workflow_dispatch` is exempt from the rule) | none | run, but as a dispatch, not as a pull request | `pr-title` is guarded by `if: github.event_name == 'pull_request'`, so under a dispatch it is skipped, and GitHub reports a job skipped by a conditional as **Success** to required checks ("Troubleshooting required status checks", "Handling skipped but required checks"). That is a required gate reporting green without running: the silent skip this repository exists to argue against. It would also need a dispatch after every release-please update and a new trigger on `ci.yml`. |
| 5. A person closes and reopens the release pull request before cutting | none | run, because a human's `reopened` event is not a `GITHUB_TOKEN` event | Same objection as option 1, and any release-please update after the reopen is ungated again. |

## The decision

**Option 3, a GitHub App.** Three reasons, in the order they matter.

1. **The gates run without anyone remembering to run them.** That is the only
   property that survives the admin-bypass constraint.
2. **The token is small.** It is minted at the start of the job, scoped to this
   one repository and cut down in the workflow to `contents`, `pull-requests`
   and `issues`, and it expires after one hour (create-github-app-token README:
   "An installation access token expires after 1 hour"). A leaked run token is
   worth an hour against one repository. A leaked personal access token is worth
   its whole lifetime against everything Keoni can reach that it was scoped to.
3. **The release pull request gets an author who is not Keoni.** It is opened by
   the App's bot account. GitHub forbids approving your own pull request, not a
   bot's, so Keoni can approve the release pull request as its code owner. If
   that holds, it is the first pull request in this repository where REQ-1.2 and
   REQ-1.3 are satisfied rather than bypassed, and it is the right one: the
   approval becomes the recorded release decision. **Inferred, not observed:**
   it depends on GitHub treating the bot as the author, and gets confirmed on
   the first release pull request.

There is deliberately no fallback to `GITHUB_TOKEN`. If the variable or the
secret is missing, the first step of the `release-please` job fails with the
missing name in the error. A fallback would bring back the original problem and
do it quietly. Observed on a scratch branch on 2026-11-12, run `43182248297`,
before either existed:

```
##[error]Repository variable RELEASE_APP_CLIENT_ID is not set. See docs/decisions/0004-a-github-app-token-for-the-release-pull-request.md.
##[error]Repository secret RELEASE_APP_PRIVATE_KEY is not set. See docs/decisions/0004-a-github-app-token-for-the-release-pull-request.md.
##[error]Process completed with exit code 1.
```

## A second line, whatever the first one does

Gating the release pull request is the cheap place to catch a problem: before
a tag or a version number exists. It is not the only place. When the release
pull request is merged, `release.yml` creates the release as a draft, calls
`ci.yml` again on the tagged commit, checks that the build it produced names
that tag, attaches that build, and only then publishes. So a published release
cannot exist without the gates having passed on its exact commit, even if the
release pull request were somehow merged ungated. That second line does not
make the App unnecessary. A red there leaves a tag and a draft for a version
that will never ship, and the fix needs the next version number. Catching it on
the pull request costs nothing.

## What Keoni has to create

Least privilege throughout. Nothing here grants access to any other repository.

1. Profile picture, then **Settings**, then **Developer settings**, then
   **GitHub Apps**, then **New GitHub App**.
2. **GitHub App name:** anything clear, for example `release-pipeline-releaser`.
   **Homepage URL:** `https://github.com/keonikaku/release-pipeline`.
3. **Webhook:** deselect **Active**. The App only mints tokens; it receives no
   events.
4. **Repository permissions**, and nothing else:
   - **Contents:** Read and write (the release branch, the tag, the release)
   - **Pull requests:** Read and write (open and update the release pull request)
   - **Issues:** Read and write (the `autorelease:` labels, which GitHub files
     under issues)
   - **Metadata:** Read-only, which GitHub selects automatically
   - Organisation and account permissions: none.
5. **Where can this GitHub App be installed?** **Only on this account.** Then
   **Create GitHub App**.
6. On the App's settings page, copy the **Client ID** (not the App ID).
7. Same page, **Private keys**, **Generate a private key**. A `.pem` file
   downloads.
8. Left sidebar, **Install App**, **Install** next to `keonikaku`, **Only select
   repositories**, choose `release-pipeline`, **Install**.
9. In the repository: **Settings**, **Secrets and variables**, **Actions**.
   - **Variables** tab, **New repository variable**: name
     `RELEASE_APP_CLIENT_ID`, value the Client ID from step 6. A variable, not a
     secret, because a Client ID is an identifier, not a credential.
   - **Secrets** tab, **New repository secret**: name `RELEASE_APP_PRIVATE_KEY`,
     value the entire contents of the `.pem` file, including the `BEGIN` and
     `END` lines.
10. Delete the downloaded `.pem` from the laptop. If it is ever needed again,
    generate a new one and revoke the old one on the App's settings page.

11. **Settings**, **General**, **Pull Requests**, under **Allow squash
    merging**, set **Default commit message** to **Pull request title** (API:
    `squash_merge_commit_title=PR_TITLE`, `squash_merge_commit_message=BLANK`).
    Pull request title, not Pull request title and commit details: with commit details, a `BREAKING CHANGE:` footer in a branch commit's body is copied into the squash commit, where release-please reads it and no gate checks it; with the title only, the gated pull request title is the whole commit.

Then, and only then, merge the phase 2 pull request. Merged first, the
`Release` run on `main` fails at the credential check, and `main` shows a red
run. That red is truthful, but avoidable.

## Cost accepted

One more moving part, and one long-lived secret: the App's private key. It is
narrower than the alternative long-lived secret, a personal access token,
because it can only mint short-lived tokens for the one repository the App is
installed on, with the three permissions the App was given. It is still a key.
It is named here so that its existence is a recorded decision and not a
surprise found later in the settings page.

## Follow-up hardening, not done

The repository is public, and the key is a repository secret, so any workflow
on any branch that a writer pushes can read it. The next step is to move
`RELEASE_APP_PRIVATE_KEY` into a deployment environment whose deployment
branch rule allows `main` only, and give the `release-please` job that
environment. Then only a run on `main` can mint a release token. Not built.
