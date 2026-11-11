/**
 * The whole application. One file, on purpose: see
 * docs/decisions/0001-a-separate-repository-and-a-trivial-application.md
 *
 * It renders the gate set that this repository's own pull requests have to pass.
 * The data below is the single source of truth for what the page claims, so if
 * a gate is added to the pipeline and not to this list, the page is wrong and
 * the unit test for `summarise` is the thing that notices the count changed.
 */

/** When a gate runs. `pull-request` gates have nothing to check on a push. */
export type GateTrigger = "every-run" | "pull-request";

export interface Gate {
	/** The CI job name. This is also the required status check name. */
	readonly id: string;
	readonly tool: string;
	readonly question: string;
	readonly trigger: GateTrigger;
	/** False means it reports but does not stop a merge. */
	readonly blocking: boolean;
}

export const GATES: readonly Gate[] = [
	{
		id: "lint",
		tool: "Biome",
		question: "Is this the house style?",
		trigger: "every-run",
		blocking: true,
	},
	{
		id: "typecheck",
		tool: "TypeScript",
		question: "Does it hold together?",
		trigger: "every-run",
		blocking: true,
	},
	{
		id: "test",
		tool: "Vitest",
		question: "Does the logic do what it claims?",
		trigger: "every-run",
		blocking: true,
	},
	{
		id: "audit",
		tool: "npm audit",
		question: "Is anything we depend on known to be broken?",
		trigger: "every-run",
		blocking: true,
	},
	{
		id: "build",
		tool: "Vite",
		question: "Does it produce an artifact?",
		trigger: "every-run",
		blocking: true,
	},
	{
		id: "e2e",
		tool: "Playwright",
		question: "Does that artifact behave in a browser?",
		trigger: "every-run",
		blocking: true,
	},
	{
		id: "pr-title",
		tool: "Conventional commits",
		question: "Can a version be derived from this change?",
		trigger: "pull-request",
		blocking: true,
	},
];

export interface GateSummary {
	readonly total: number;
	readonly blocking: number;
	readonly advisory: number;
	readonly pullRequestOnly: number;
}

/**
 * Counts the gate set. Pure, so it is the thing the unit gate tests, and the
 * reason the page cannot quietly disagree with itself about how many gates
 * there are.
 */
export function summarise(gates: readonly Gate[]): GateSummary {
	const blocking = gates.filter((gate) => gate.blocking).length;
	return {
		total: gates.length,
		blocking,
		advisory: gates.length - blocking,
		pullRequestOnly: gates.filter((gate) => gate.trigger === "pull-request")
			.length,
	};
}

/** The sentence under the heading. Derived, never typed in by hand. */
export function summaryLine(summary: GateSummary): string {
	const checks = summary.total === 1 ? "check" : "checks";
	return `${summary.total} ${checks} on every pull request, ${summary.blocking} of them blocking.`;
}

export function render(root: HTMLElement, gates: readonly Gate[]): void {
	const summary = summarise(gates);

	const heading = document.createElement("h1");
	heading.textContent = "The gate set";

	const line = document.createElement("p");
	line.className = "summary";
	line.dataset.testid = "summary";
	line.textContent = summaryLine(summary);

	const list = document.createElement("ul");
	list.className = "gates";
	list.dataset.testid = "gates";

	for (const gate of gates) {
		const item = document.createElement("li");
		item.dataset.gate = gate.id;

		const name = document.createElement("code");
		name.textContent = gate.id;

		const tool = document.createElement("span");
		tool.className = "tool";
		tool.textContent = gate.tool;

		const question = document.createElement("span");
		question.className = "question";
		question.textContent = gate.question;

		item.append(name, tool, question);

		if (gate.trigger === "pull-request") {
			const note = document.createElement("span");
			note.className = "note";
			note.textContent = "pull requests only";
			item.append(note);
		}

		list.append(item);
	}

	root.replaceChildren(heading, line, list);
}

/*
 * The bootstrap. Excluded from unit coverage deliberately: it is exercised by
 * the e2e gate, which loads the built page in a real browser and asserts on
 * what this produced. Excluding it keeps the coverage number meaning "the
 * logic is tested" rather than "the entry point was imported once".
 */
/* v8 ignore start */
const root = document.querySelector<HTMLElement>("#app");
if (root) {
	render(root, GATES);
}
/* v8 ignore stop */
