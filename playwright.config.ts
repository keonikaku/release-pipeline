import { defineConfig, devices } from "@playwright/test";

/*
 * One config for two situations, chosen by BASE_URL.
 *
 *   BASE_URL unset  the suite serves `dist` locally and tests it. This is the
 *                   `e2e` gate, and in CI the `dist` it serves was downloaded
 *                   from the build job rather than rebuilt here.
 *   BASE_URL set    the suite tests whatever is at that address and starts no
 *                   server. Phase 3 points it at the deployed site and runs
 *                   only the @smoke tagged specs.
 *
 * Same specs in both cases. A separate smoke suite would drift from the real
 * one; a tag cannot.
 */
const deployedUrl = process.env.BASE_URL;
const localUrl = "http://127.0.0.1:4173";
const isCI = !!process.env.CI;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,

	/* No `.only` reaches CI, and no retries mask a flake into a pass. A test
	   that needs a retry to pass is a test with something to say. */
	forbidOnly: isCI,
	retries: 0,

	reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],

	use: {
		baseURL: deployedUrl ?? localUrl,
		trace: "retain-on-failure",
	},

	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

	/* Serves the built output, not the dev server. The dev server transforms on
	   request and is not what ships. */
	...(deployedUrl
		? {}
		: {
				webServer: {
					command: "npm run preview",
					url: localUrl,
					reuseExistingServer: !isCI,
					timeout: 60_000,
				},
			}),
});
