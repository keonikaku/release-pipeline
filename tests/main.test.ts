import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type BuildId,
	builtFromLine,
	checkLive,
	compareBuild,
	comparisonLine,
	GATES,
	type Gate,
	readServerBuild,
	render,
	summarise,
	summaryLine,
} from "../src/main";

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

	it("renders one row per gate, in order", () => {
		render(root, GATES);

		const rows = [...root.querySelectorAll("li")].map(
			(row) => row.dataset.gate,
		);
		expect(rows).toEqual(GATES.map((entry) => entry.id));
	});

	it("derives the summary line rather than hard coding it", () => {
		render(root, GATES);

		expect(root.querySelector("[data-testid='summary']")?.textContent).toBe(
			summaryLine(summarise(GATES)),
		);
	});

	it("marks only the pull request gates as pull request only", () => {
		render(root, GATES);

		const noted = [...root.querySelectorAll("li")]
			.filter((row) => row.querySelector(".note"))
			.map((row) => row.dataset.gate);

		expect(noted).toEqual(
			GATES.filter((entry) => entry.trigger === "pull-request").map(
				(entry) => entry.id,
			),
		);
	});

	it("replaces previous content instead of appending to it", () => {
		render(root, GATES);
		render(root, GATES);

		expect(root.querySelectorAll("h1")).toHaveLength(1);
		expect(root.querySelectorAll("li")).toHaveLength(GATES.length);
	});
});

describe("the live check", () => {
	const page: BuildId = {
		version: "1.2.3",
		commit: "a".repeat(40),
	};
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
			render(root, GATES, { build: page, read: answer });
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

		it("is left out when no build is given", () => {
			render(root, GATES);

			expect(root.querySelector("[data-testid='live-check']")).toBeNull();
		});

		it("shows the page's own build and a labelled status region", () => {
			render(root, GATES, { build: page, read: async () => page });

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
			render(root, GATES, {
				build: page,
				read: () => {
					calls += 1;
					return new Promise((resolve) => {
						answer = resolve;
					});
				},
			});
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
