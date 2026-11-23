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

	/* Phase 3, slice 6: the manual live check, the button a person can press
	   on the site itself. In the e2e gate the page and build-info.json come
	   from the same dist, so they must match. After a deploy the page must
	   also name exactly the build just deployed.

	   A build made before this check existed has no button. deploy.yml looks
	   in the stored build it is about to smoke and sets EXPECT_LIVE_CHECK=0
	   when the button is not there, so a rollback to such a release skips
	   this test, with the reason, instead of failing it. The decision comes
	   from the stored build, never from the live page: a live page that is
	   missing the button because it is stale must fail, not skip. */
	test("says which build it is and checks it against the server @smoke", async ({
		page,
	}) => {
		test.skip(
			process.env.EXPECT_LIVE_CHECK === "0",
			"the deployed build predates the live check (EXPECT_LIVE_CHECK=0, read from the stored build)",
		);

		await page.goto("./");

		const built = page.getByTestId("page-build");
		if (expectedVersion && expectedCommit) {
			await expect(built).toHaveText(
				`This page was built from ${expectedVersion} at ${expectedCommit}.`,
			);
		} else {
			await expect(built).toHaveText(
				/^This page was built from \d+\.\d+\.\d+\S* at [0-9a-f]{40}\.$/,
			);
		}

		await page
			.getByRole("button", { name: "Check what the server is serving now" })
			.click();

		const result = page.getByRole("status");
		await expect(result).toHaveAttribute("data-result", "match");
		await expect(result).toHaveText(/: match\.$/);
	});

	/* The other answer, in a real browser: the server names a different
	   build than the one the page was built from. Not @smoke, because it
	   intercepts the request rather than asking the live server. */
	test("says MISMATCH when the server names another build", async ({
		page,
	}) => {
		await page.route("**/build-info.json", (route) =>
			route.fulfill({
				json: { version: "0.0.0", commit: "0".repeat(40), dirty: false },
			}),
		);
		await page.goto("./");
		await page
			.getByRole("button", { name: "Check what the server is serving now" })
			.click();

		const result = page.getByRole("status");
		await expect(result).toHaveAttribute("data-result", "mismatch");
		await expect(result).toContainText(
			`the server now says 0.0.0 at ${"0".repeat(40)}: MISMATCH.`,
		);
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
