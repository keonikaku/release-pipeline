import { expect, test } from "@playwright/test";

/*
 * In the `e2e` gate these run against `dist` as built by the build job and
 * downloaded here. In phase 3 the same file runs against the deployed address,
 * filtered to @smoke. Nothing in it knows which, which is the point: a spec
 * that behaves differently against production is not evidence about production.
 *
 * Pages are opened with "./", not "/". Against the deployed project site, "/"
 * is the root of the domain, which is a different site; "./" is this one.
 */

/* Set by deploy.yml for the live smoke: the version and commit prepare
   verified on the release it just deployed. Unset in the e2e gate. */
const expectedVersion = process.env.EXPECTED_VERSION;
const expectedCommit = process.env.EXPECTED_COMMIT;

/* How long to wait for the live site to serve the build just deployed. Pages
   answers through a CDN. Observed: `cache-control: max-age=600` and
   `x-cache: HIT`, and a query string does not get past it (same age and etag
   as the plain address). Inferred from that header, not observed: a cached
   copy can be served for up to ten minutes, so the first answer after a
   deploy can be the old build. Whether a deploy purges the cache is not
   observed. So the wait covers the whole max-age, 600 seconds, plus a minute.
   Visitors get the same cached copy, so this wait is part of the real time
   to restore, not test overhead. Bounded, so that a deploy which never shows
   up fails instead of hanging. Not a retry of the test: the test runs once
   and polls one value. */
const propagationMs =
	Number(process.env.SMOKE_PROPAGATION_SECONDS ?? "660") * 1000;

test.describe("the gate set page", () => {
	test("renders the gate set @smoke", async ({ page }) => {
		const response = await page.goto("./");

		/* The page is served, not just rendered. A 404 that renders a nice
		   looking shell is the failure this catches. */
		expect(response?.status()).toBe(200);

		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"The gate set",
		);

		/* The list is built by the script. If the bundle failed to load or threw,
		   the heading would be missing too, so this asserts the script ran. */
		await expect(page.getByTestId("gates").locator("li")).toHaveCount(7);
		await expect(page.getByTestId("summary")).toContainText(
			"7 checks on every pull request",
		);
	});

	test("names every gate the pipeline runs", async ({ page }) => {
		await page.goto("./");

		const ids = [
			"lint",
			"typecheck",
			"test",
			"audit",
			"build",
			"e2e",
			"pr-title",
		];

		for (const id of ids) {
			await expect(page.locator(`li[data-gate="${id}"]`)).toBeVisible();
		}
	});

	test("marks the pull request only gate", async ({ page }) => {
		await page.goto("./");

		await expect(page.locator('li[data-gate="pr-title"] .note')).toHaveText(
			"pull requests only",
		);
		await expect(page.locator('li[data-gate="lint"] .note')).toHaveCount(0);
	});

	/* REQ-4.2. The artifact names the commit it was built from. Tagged @smoke
	   because the question it answers, "what is actually running here", is the
	   first question to ask of a deployed site.

	   In the e2e gate the values are checked for shape only: which commit is
	   right depends on the build being tested. After a deploy, EXPECTED_VERSION
	   and EXPECTED_COMMIT name the release just deployed, and the live site
	   must serve exactly that build. It is polled until it does or the wait
	   above runs out. */
	test("names the version and commit it was built from @smoke", async ({
		request,
	}) => {
		const read = async () => {
			const response = await request.get("build-info.json");
			return response.ok() ? await response.json() : null;
		};

		if (expectedVersion && expectedCommit) {
			await expect
				.poll(
					async () => {
						const info = await read();
						return info && `${info.version} ${info.commit} ${info.dirty}`;
					},
					{
						message: `the live site to serve ${expectedVersion} at ${expectedCommit}, clean`,
						timeout: propagationMs,
						intervals: [2_000, 5_000, 10_000],
					},
				)
				.toBe(`${expectedVersion} ${expectedCommit} false`);
			return;
		}

		const info = await read();
		expect(info).not.toBeNull();
		expect(info.version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
		expect(info.commit).toMatch(/^[0-9a-f]{40}$/);
		expect(typeof info.dirty).toBe("boolean");
	});

	test("logs nothing to the console @smoke", async ({ page }) => {
		const problems: string[] = [];
		page.on("console", (message) => {
			if (message.type() === "error" || message.type() === "warning") {
				problems.push(`${message.type()}: ${message.text()}`);
			}
		});
		page.on("pageerror", (error) =>
			problems.push(`pageerror: ${error.message}`),
		);

		await page.goto("./");
		await expect(page.getByTestId("gates").locator("li").first()).toBeVisible();

		expect(problems).toEqual([]);
	});
});
