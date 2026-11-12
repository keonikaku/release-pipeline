import { beforeEach, describe, expect, it } from "vitest";
import { GATES, type Gate, render, summarise, summaryLine } from "../src/main";

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
