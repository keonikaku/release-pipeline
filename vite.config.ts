/// <reference types="vitest/config" />
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";

/*
 * REQ-4.2: what is deployed can be traced back to the commit it was built from.
 *
 * Every build writes `build-info.json` next to `index.html`, naming the version,
 * the commit and, in CI, the run that produced it. The release workflow refuses
 * to attach a build whose file disagrees with the tag it is being attached to,
 * and the @smoke spec reads the same file, so phase 3 can ask a deployed site
 * what it is rather than assuming.
 *
 * It fails the build rather than writing "unknown" when git is unavailable. A
 * build that cannot say what it was built from is the exact thing this exists
 * to prevent, and an artifact with a placeholder in it looks traceable and is
 * not.
 */
function git(...args: string[]): string {
	return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function buildInfo(): Plugin {
	return {
		name: "build-info",
		apply: "build",
		generateBundle() {
			const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
				version: string;
			};
			const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } =
				process.env;
			const info = {
				version: pkg.version,
				commit: git("rev-parse", "HEAD"),
				/* Uncommitted changes mean the commit above is not the whole story.
				   Recorded rather than refused, so a local build still works; the
				   release workflow refuses to ship one where this is true. */
				dirty: git("status", "--porcelain").length > 0,
				run:
					GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
						? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
						: null,
			};
			this.emitFile({
				type: "asset",
				fileName: "build-info.json",
				source: `${JSON.stringify(info, null, 2)}\n`,
			});
		},
	};
}

export default defineConfig({
	/* Relative, so the built output runs from a domain root or from a subpath
	   without being rebuilt. Phase 3 picks a deploy target; nothing here assumes
	   which, and in particular nothing assumes the portfolio site. See
	   docs/decisions/0001-a-separate-repository-and-a-trivial-application.md */
	base: "./",

	plugins: [buildInfo()],

	build: {
		outDir: "dist",
		/* The e2e gate downloads this directory from the build job's artifact.
		   Source maps are in it so a browser failure in CI points at a line of
		   source rather than at a column of bundled output. */
		sourcemap: true,
	},

	/* Host and port are pinned here rather than passed on the command line, so
	   the browser gate and the preview script cannot disagree about the address.
	   The host is explicit because "localhost" resolves to IPv6 on some machines
	   and IPv4 on others, and a suite that cannot reach its own server is the
	   least interesting way for a pipeline to go red. `strictPort` makes a busy
	   port a failure rather than a silent move to a different one. */
	preview: {
		host: "127.0.0.1",
		port: 4173,
		strictPort: true,
	},

	test: {
		/* jsdom rather than node: the unit gate renders the component and asserts
		   on the result, which is worth more than testing the counting function
		   alone and keeps the coverage number honest. */
		environment: "jsdom",
		include: ["tests/**/*.test.ts"],

		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			include: ["src/**/*.ts"],

			/* The threshold lives here and not on the command line, so the local
			   run and the CI run cannot disagree about what counts as enough.
			   Below it, the `test` gate fails. A coverage number that is reported
			   and not enforced is decoration. */
			thresholds: {
				statements: 90,
				branches: 90,
				functions: 90,
				lines: 90,
			},
		},
	},
});
