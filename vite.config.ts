/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
	/* Relative, so the built output runs from a domain root or from a subpath
	   without being rebuilt. Phase 3 picks a deploy target; nothing here assumes
	   which, and in particular nothing assumes the portfolio site. See
	   docs/decisions/0001-a-separate-repository-and-a-trivial-application.md */
	base: "./",

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
