import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVIDENCE, type Evidence } from "../src/evidence";
import {
	type BuildId,
	BYLINE,
	builtFromLine,
	checkLive,
	compareBuild,
	comparisonLine,
	GATES,
	type Gate,
	LEAD,
	type LiveCheck,
	type PageContent,
	parseChangelog,
	type Release,
	readServerBuild,
	releaseCountLine,
	render,
	SECTIONS,
	summarise,
	summaryLine,
	TITLE,
} from "../src/main";

const page: BuildId = {
	version: "1.2.3",
	commit: "a".repeat(40),
};

const RELEASES: readonly Release[] = [
	{ version: "1.2.3", date: "2026-01-02", summary: "Ship the thing" },
	{ version: "1.2.2", date: "2026-01-01", summary: "Fix the thing" },
];

const content = (overrides: Partial<PageContent> = {}): PageContent => ({
	gates: GATES,
	releases: RELEASES,
	evidence: EVIDENCE,
	live: { build: page, read: async () => page },
	...overrides,
});

const gate = (overrides: Partial<Gate> = {}): Gate => ({
	id: "lint",
	tool: "Biome",
	question: "Is this the house style?",
	trigger: "every-run",
	blocking: true,
	...overrides,
});

describe("summarise", () => {
	it("counts an empty gate set without pretending there is one", () => {
		expect(summarise([])).toEqual({
			total: 0,
			blocking: 0,
			advisory: 0,
			pullRequestOnly: 0,
		});
	});

	it("separates blocking gates from advisory ones", () => {
		const summary = summarise([
			gate({ id: "lint" }),
			gate({ id: "audit", blocking: false }),
		]);

		expect(summary.total).toBe(2);
		expect(summary.blocking).toBe(1);
		expect(summary.advisory).toBe(1);
	});

	it("counts the gates that only run on pull requests", () => {
		const summary = summarise([
			gate({ id: "lint" }),
			gate({ id: "pr-title", trigger: "pull-request" }),
		]);

		expect(summary.pullRequestOnly).toBe(1);
	});
});

describe("summaryLine", () => {
	it("reads correctly for one gate", () => {
		expect(summaryLine(summarise([gate()]))).toBe(
			"1 check on every pull request, 1 of them blocking.",
		);
	});

	it("reads correctly for several", () => {
		expect(summaryLine(summarise([gate({ id: "a" }), gate({ id: "b" })]))).toBe(
			"2 checks on every pull request, 2 of them blocking.",
		);
	});
});

describe("the declared gate set", () => {
	/* The ids are the CI job names and therefore the required status check
	   names. A duplicate or an empty one would mean the ruleset and the pipeline
	   cannot be matched up, which is the usual way this kind of setup breaks. */
	it("has unique, non-empty ids", () => {
		const ids = GATES.map((entry) => entry.id);

		expect(ids.every((id) => id.length > 0)).toBe(true);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("contains every gate the pipeline runs", () => {
		expect(GATES.map((entry) => entry.id)).toEqual([
			"lint",
			"typecheck",
			"test",
			"audit",
			"build",
			"e2e",
			"pr-title",
		]);
	});

	it("blocks a merge on all of them", () => {
		expect(summarise(GATES).advisory).toBe(0);
	});
});

describe("render", () => {
	let root: HTMLElement;

	beforeEach(() => {
		document.body.innerHTML = "";
		root = document.createElement("main");
		document.body.append(root);
	});

	it("renders one h1 and the section h2s, in order", () => {
		render(root, content());

		const h1s = [...root.querySelectorAll("h1")].map(
			(node) => node.textContent,
		);
		expect(h1s).toEqual(["An ongoing release-management project"]);
		expect(TITLE).toBe(h1s[0]);
		expect(
			[...root.querySelectorAll("h2")].map((node) => node.textContent),
		).toEqual([
			"Now live",
			"The flow",
			"The gate set",
			"Rollbacks",
			"Proof you can click",
			"Releases",
			"Honest limits",
		]);
		expect([...SECTIONS]).toEqual(
			[...root.querySelectorAll("h2")].map((node) => node.textContent),
		);
	});

	it("gives every section a labelled landmark", () => {
		render(root, content());

		for (const section of root.querySelectorAll("section")) {
			const label = section.getAttribute("aria-labelledby");
			expect(label).toBeTruthy();
			expect(section.querySelector("h2")?.id).toBe(label);
		}
	});

	it("carries the lead and the byline exactly", () => {
		render(root, content());

		expect(root.querySelector("[data-testid='lead']")?.textContent).toBe(
			"An ongoing release-management project: every weekly change to this site goes through quality gates, a human approval, a live check and a backout record, and every step below links to the real run.",
		);
		expect(root.querySelector("[data-testid='byline']")?.textContent).toBe(
			"Release manager and product owner: Keoni Kakugawa. Built by an AI agent team under his direction.",
		);
		expect(LEAD).toBe(root.querySelector("[data-testid='lead']")?.textContent);
		expect(BYLINE).toBe(
			root.querySelector("[data-testid='byline']")?.textContent,
		);
	});

	it("lists the six steps of the flow in order", () => {
		render(root, content());

		expect(
			[...root.querySelectorAll("[data-testid='flow'] > li strong")].map(
				(node) => node.textContent,
			),
		).toEqual([
			"Change",
			"Gates",
			"Release",
			"Human approval",
			"Deploy and live check",
			"Backout record",
		]);
	});

	it("renders one row per gate, in order", () => {
		render(root, content());

		const rows = [
			...root.querySelectorAll<HTMLElement>("[data-testid='gates'] > li"),
		].map((row) => row.dataset.gate);
		expect(rows).toEqual(GATES.map((entry) => entry.id));
	});

	it("derives the summary line rather than hard coding it", () => {
		render(root, content());

		expect(root.querySelector("[data-testid='summary']")?.textContent).toBe(
			summaryLine(summarise(GATES)),
		);
	});

	it("marks only the pull request gates as pull request only", () => {
		render(root, content());

		const noted = [
			...root.querySelectorAll<HTMLElement>("[data-testid='gates'] > li"),
		]
			.filter((row) => row.querySelector(".note"))
			.map((row) => row.dataset.gate);

		expect(noted).toEqual(
			GATES.filter((entry) => entry.trigger === "pull-request").map(
				(entry) => entry.id,
			),
		);
	});

	it("names the deploy gates and the planned freeze window", () => {
		render(root, content());

		expect(
			[...root.querySelectorAll("[data-testid='deploy-gates'] code")].map(
				(node) => node.textContent,
			),
		).toEqual(["approval", "smoke", "live bytes"]);
		expect(root.querySelector("[data-testid='freeze']")?.textContent).toBe(
			"Freeze window: planned - rules being written by the release manager.",
		);
	});

	it("renders one release item per parsed release, with a generated count", () => {
		render(root, content());

		const items = [
			...root.querySelectorAll<HTMLElement>("[data-testid='releases'] > li"),
		];
		expect(items.map((item) => item.dataset.version)).toEqual(
			RELEASES.map((release) => release.version),
		);
		expect(items[0]?.textContent).toContain("Ship the thing");
		expect(items[0]?.querySelector("a")?.getAttribute("href")).toBe(
			"https://github.com/keonikaku/release-pipeline/releases/tag/v1.2.3",
		);
		expect(
			root.querySelector("[data-testid='release-count']")?.textContent,
		).toBe(releaseCountLine(RELEASES.length));
	});

	it("puts each evidence entry in its own section, with its tag visible", () => {
		const entries: Evidence[] = [
			{
				date: "2026-01-01",
				section: "limit",
				text: "A limit.",
				tag: "inferred",
				links: [{ text: "Run 1", href: "https://example.invalid/1" }],
			},
		];
		render(root, content({ evidence: entries }));

		expect(
			root.querySelectorAll("[data-testid='evidence-rollback'] > li"),
		).toHaveLength(0);
		const item = root.querySelector<HTMLElement>(
			"[data-testid='evidence-limit'] > li",
		);
		expect(item?.dataset.tag).toBe("inferred");
		expect(item?.querySelector(".tag")?.textContent).toBe("inferred");
		expect(item?.querySelector("time")?.getAttribute("datetime")).toBe(
			"2026-01-01",
		);
		expect(item?.querySelector("a")?.textContent).toBe("Run 1");
	});

	it("renders every evidence entry from the evidence file", () => {
		render(root, content());

		expect(root.querySelectorAll(".evidence > li")).toHaveLength(
			EVIDENCE.length,
		);
	});

	it("replaces previous content instead of appending to it", () => {
		render(root, content());
		render(root, content());

		expect(root.querySelectorAll("h1")).toHaveLength(1);
		expect(root.querySelectorAll("[data-testid='gates'] > li")).toHaveLength(
			GATES.length,
		);
	});

	/* The page goes on a resume. These must never appear in it. The word is
	   assembled rather than written, so this file does not contain it either.
	   Employer names: the list is Nova's to supply, and is kept out of the
	   repository for the same reason. */
	it("renders no forbidden word and no home path", () => {
		render(root, content());
		const text = root.textContent ?? "";
		const hrefs = [...root.querySelectorAll("a")]
			.map((anchor) => anchor.getAttribute("href") ?? "")
			.join(" ");

		const word = new RegExp(`\\b${["C", "A", "B"].join("")}\\b`, "i");
		const home = /\/Users\/|\/home\/|~\/|[A-Z]:\\/;
		for (const haystack of [text, hrefs]) {
			expect(haystack).not.toMatch(word);
			expect(haystack).not.toMatch(home);
		}
	});
});

describe("the live check", () => {
	const newer = { version: "1.2.4", commit: "b".repeat(40), dirty: false };

	describe("compareBuild", () => {
		it("matches only when the version and the commit both agree", () => {
			expect(compareBuild(page, { ...page, dirty: false })).toEqual({
				kind: "match",
				server: page,
			});
			expect(compareBuild(page, { ...page, commit: "c".repeat(40) }).kind).toBe(
				"mismatch",
			);
			expect(compareBuild(page, { ...page, version: "9.9.9" }).kind).toBe(
				"mismatch",
			);
		});

		it("reports a server answer that names no build as unreadable", () => {
			for (const answer of [null, "1.2.3", 42, {}, { version: "1.2.3" }]) {
				expect(compareBuild(page, answer).kind).toBe("unreadable");
			}
		});
	});

	describe("comparisonLine", () => {
		it("names both builds and says which way it went", () => {
			expect(comparisonLine(page, compareBuild(page, page))).toBe(
				`This page was built from 1.2.3 at ${page.commit}; the server now says 1.2.3 at ${page.commit}: match.`,
			);
			expect(comparisonLine(page, compareBuild(page, newer))).toContain(
				`the server now says 1.2.4 at ${newer.commit}: MISMATCH.`,
			);
			expect(
				comparisonLine(page, { kind: "unreadable", reason: "HTTP 404" }),
			).toBe(
				`This page was built from 1.2.3 at ${page.commit}; the server could not be read: HTTP 404.`,
			);
		});

		it("states the page's own build", () => {
			expect(builtFromLine(page)).toBe(
				`This page was built from 1.2.3 at ${page.commit}.`,
			);
		});
	});

	describe("readServerBuild", () => {
		it("asks past the browser cache and returns the parsed answer", async () => {
			const calls: [unknown, RequestInit | undefined][] = [];
			const fetcher = (async (url: unknown, init?: RequestInit) => {
				calls.push([url, init]);
				return new Response(JSON.stringify(newer), { status: 200 });
			}) as typeof fetch;

			await expect(readServerBuild(fetcher)).resolves.toEqual(newer);
			expect(calls).toEqual([["build-info.json", { cache: "no-store" }]]);
		});

		it("fails on an error status rather than parsing an error page", async () => {
			const fetcher = (async () =>
				new Response("not found", { status: 404 })) as typeof fetch;

			await expect(readServerBuild(fetcher)).rejects.toThrow("HTTP 404");
		});
	});

	describe("checkLive", () => {
		it("turns a failed read into an unreadable result, not an exception", async () => {
			await expect(
				checkLive({
					build: page,
					read: () => Promise.reject(new Error("offline")),
				}),
			).resolves.toEqual({ kind: "unreadable", reason: "offline" });
			await expect(
				checkLive({ build: page, read: () => Promise.reject("odd") }),
			).resolves.toEqual({ kind: "unreadable", reason: "odd" });
		});
	});

	describe("render with a live check", () => {
		let root: HTMLElement;

		beforeEach(() => {
			document.body.innerHTML = "";
			root = document.createElement("main");
			document.body.append(root);
		});

		const press = async (answer: () => Promise<unknown>) => {
			render(root, content({ live: { build: page, read: answer } }));
			const button = root.querySelector<HTMLButtonElement>(
				"[data-testid='check-live']",
			);
			const result = root.querySelector<HTMLElement>(
				"[data-testid='live-result']",
			);
			button?.click();
			await vi.waitFor(() => expect(result?.dataset.result).toBeDefined());
			return { button, result };
		};

		it("sits in the Now live section, above the flow", () => {
			render(root, content());

			const section = root.querySelector("[data-testid='live-check']");
			expect(section?.querySelector("h2")?.textContent).toBe("Now live");
			expect(section?.querySelector("h3")?.textContent).toBe(
				"Is this the live build?",
			);
			expect(root.querySelector("section")).toBe(section);
		});

		it("links build-info.json and the GitHub release of the build", () => {
			render(root, content());

			const hrefs = [
				...root.querySelectorAll("[data-testid='live-check'] a"),
			].map((anchor) => anchor.getAttribute("href"));
			expect(hrefs).toEqual([
				"build-info.json",
				"https://github.com/keonikaku/release-pipeline/releases/tag/v1.2.3",
			]);
		});

		it("shows the page's own build and a labelled status region", () => {
			render(root, content());

			expect(
				root.querySelector("[data-testid='page-build']")?.textContent,
			).toBe(builtFromLine(page));
			expect(
				root.querySelector("[data-testid='live-result']")?.getAttribute("role"),
			).toBe("status");
			expect(
				root
					.querySelector("[data-testid='live-check']")
					?.getAttribute("aria-labelledby"),
			).toBe(root.querySelector("h2")?.id);
		});

		it("reports a match", async () => {
			const { button, result } = await press(async () => ({
				...page,
				dirty: false,
			}));

			expect(result?.dataset.result).toBe("match");
			expect(result?.textContent).toMatch(/: match\.$/);
			expect(button?.hasAttribute("aria-disabled")).toBe(false);
		});

		it("marks itself busy while a check runs and ignores a second press", async () => {
			let calls = 0;
			let answer: (value: unknown) => void = () => {};
			const live: LiveCheck = {
				build: page,
				read: () => {
					calls += 1;
					return new Promise((resolve) => {
						answer = resolve;
					});
				},
			};
			render(root, content({ live }));
			const button = root.querySelector<HTMLButtonElement>(
				"[data-testid='check-live']",
			);
			const result = root.querySelector<HTMLElement>(
				"[data-testid='live-result']",
			);

			button?.click();
			expect(button?.getAttribute("aria-disabled")).toBe("true");
			expect(button?.disabled).toBe(false);
			button?.click();
			expect(calls).toBe(1);

			answer(page);
			await vi.waitFor(() => expect(result?.dataset.result).toBe("match"));
			expect(button?.hasAttribute("aria-disabled")).toBe(false);
		});

		it("reports a mismatch", async () => {
			const { result } = await press(async () => newer);

			expect(result?.dataset.result).toBe("mismatch");
			expect(result?.textContent).toContain("MISMATCH");
		});

		it("reports a server it could not read", async () => {
			const { result } = await press(() =>
				Promise.reject(new Error("HTTP 500")),
			);

			expect(result?.dataset.result).toBe("unreadable");
			expect(result?.textContent).toContain("HTTP 500");
		});
	});
});

describe("parseChangelog", () => {
	const changelog = [
		"# Changelog",
		"",
		"## [0.3.0](https://github.com/o/r/compare/v0.2.0...v0.3.0) (2026-11-24)",
		"",
		"",
		"### Features",
		"",
		"* verify the live site ([#21](https://github.com/o/r/issues/21)) ([49c01fc](https://github.com/o/r/commit/49c01fc))",
		"* a second feature ([#22](https://github.com/o/r/issues/22))",
		"",
		"### Documentation",
		"",
		"* record a thing ([#18](https://github.com/o/r/issues/18))",
		"",
		"## [0.2.1](https://github.com/o/r/compare/v0.2.0...v0.2.1) (2026-11-23)",
		"",
		"### Bug Fixes",
		"",
		"* mend the [button](https://example.invalid) ([#30](https://github.com/o/r/issues/30))",
		"",
		"## 0.1.0 (2026-11-21)",
		"",
		"### Features",
		"",
		"* add the gate set ([#1](https://github.com/o/r/issues/1))",
		"",
		"## [0.0.9](https://github.com/o/r/compare/x...y) (2026-11-20)",
	].join("\n");

	it("reads every release heading, newest first, with its date", () => {
		expect(
			parseChangelog(changelog).map(({ version, date }) => [version, date]),
		).toEqual([
			["0.3.0", "2026-11-24"],
			["0.2.1", "2026-11-23"],
			["0.1.0", "2026-11-21"],
			["0.0.9", "2026-11-20"],
		]);
	});

	it("summarises each release by its first Features entry, references stripped", () => {
		const [latest, , first] = parseChangelog(changelog);

		expect(latest?.summary).toBe("Verify the live site");
		expect(first?.summary).toBe("Add the gate set");
	});

	it("falls back to the first entry when a release has no Features", () => {
		expect(parseChangelog(changelog)[1]?.summary).toBe("Mend the button");
	});

	it("leaves the summary empty for a release with no entries at all", () => {
		expect(parseChangelog(changelog)[3]?.summary).toBe("");
	});

	it("parses nothing from text that is not a changelog", () => {
		expect(parseChangelog("* stray entry\n## not a version\n")).toEqual([]);
	});

	it("parses this repository's own CHANGELOG.md", async () => {
		const { readFileSync } = await import("node:fs");
		const releases = parseChangelog(readFileSync("CHANGELOG.md", "utf8"));

		expect(releases.length).toBeGreaterThan(0);
		for (const release of releases) {
			expect(release.version).toMatch(/^\d+\.\d+\.\d+/);
			expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(release.summary.length).toBeGreaterThan(0);
		}
	});
});

describe("releaseCountLine", () => {
	it("counts one and several", () => {
		expect(releaseCountLine(1)).toBe("1 release, newest first.");
		expect(releaseCountLine(3)).toBe("3 releases, newest first.");
	});
});
