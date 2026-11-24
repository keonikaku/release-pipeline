## How to roll back

Previous good tag: {PREV_TAG} ({PREV_COMMIT}), {PREV_URL}

Not performed on this deploy. Roll back only when directed or needed.

1. Actions tab > Deploy (left list) > Run workflow.
2. Use workflow from: Branch: main. tag: {PREV_TAG}. Green Run workflow button.
3. Open the run > Review deployments > tick github-pages > Approve and deploy.
4. Wait for smoke to pass. The run summary holds the backout record.

Runbook: docs/RELEASE.md, section 2. Rollback evidence: docs/RELEASE.md, "The rollback drill, observed".
