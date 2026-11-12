import { expect, test } from "@playwright/test";

/*
 * In the `e2e` gate these run against `dist` as built by the build job and
 * downloaded here. In phase 3 the same file runs against the deployed address,
 * filtered to @smoke. Nothing in it knows which, which is the point: a spec
 * that behaves differently against production is not evidence about production.
 */

test.describe("the gate set page", () => {
	test("renders the gate set @smoke", async ({ page }) => {
		const response = await page.goto("/");

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
		await page.goto("/");

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
		await page.goto("/");

		await expect(page.locator('li[data-gate="pr-title"] .note')).toHaveText(
			"pull requests only",
		);
		await expect(page.locator('li[data-gate="lint"] .note')).toHaveCount(0);
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

		await page.goto("/");
		await expect(page.getByTestId("gates").locator("li").first()).toBeVisible();

		expect(problems).toEqual([]);
	});
});
