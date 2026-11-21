import { defineConfig, devices } from "@playwright/test";

/*
 * One config for two situations, chosen by BASE_URL.
 *
 *   BASE_URL unset  the suite serves `dist` locally and tests it. This is the
 *                   `e2e` gate, and in CI the `dist` it serves was downloaded
 *                   from the build job rather than rebuilt here.
 *   BASE_URL set    the suite tests whatever is at that address and starts no
 *                   server. deploy.yml points it at the deployed site and
 *                   runs only the @smoke tagged specs, with EXPECTED_VERSION
 *                   and EXPECTED_COMMIT naming the build it just deployed
 *                   (see e2e/gates.spec.ts).
 *
 * BASE_URL is given a trailing slash. The deployed site is a project site,
 * served under /release-pipeline/, and a base URL without the slash would
 * resolve "build-info.json" against the domain root instead. The specs navigate
 * to "./" rather than "/" for the same reason: "/" is the root of the domain,
 * which on a project site is a different site.
 *
 * Same specs in both cases. A separate smoke suite would drift from the real
 * one; a tag cannot.
 */
const rawDeployedUrl = process.env.BASE_URL;
const deployedUrl = rawDeployedUrl
	? rawDeployedUrl.endsWith("/")
		? rawDeployedUrl
		: `${rawDeployedUrl}/`
	: undefined;
const localUrl = "http://127.0.0.1:4173/";
const isCI = !!process.env.CI;

/* The live smoke waits, for a bounded time, for the CDN in front of Pages to
   serve the build just deployed (see the build-info spec), so its tests get
   more time than the default 30 seconds. Every other run keeps the default. */
const expectsBuild = !!process.env.EXPECTED_COMMIT;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,

	/* No `.only` reaches CI, and no retries mask a flake into a pass. A test
	   that needs a retry to pass is a test with something to say. */
	forbidOnly: isCI,
	retries: 0,
	timeout: expectsBuild ? 150_000 : 30_000,

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
