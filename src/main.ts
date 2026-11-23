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

/*
 * The manual live check (phase 3, slice 6). The page carries the version and
 * commit it was built from, fixed at build time, and a button that asks the
 * server for build-info.json now. If the two disagree, the page in front of
 * the reader is not the build the server is now serving: a cached copy, or a
 * newer deploy since the page loaded. The machine check of the same question
 * is scripts/verify-live-bytes.sh, which compares every file's bytes.
 */

/** A build as build-info.json names it, reduced to what identifies it. */
export interface BuildId {
	readonly version: string;
	readonly commit: string;
}

export type LiveComparison =
	| { readonly kind: "match"; readonly server: BuildId }
	| { readonly kind: "mismatch"; readonly server: BuildId }
	| { readonly kind: "unreadable"; readonly reason: string };

/** What the page needs to run the check. Passed in, so the unit gate can
    supply a build and a fake server instead of a network. */
export interface LiveCheck {
	readonly build: BuildId;
	readonly read: () => Promise<unknown>;
}

function isBuildId(value: unknown): value is BuildId {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const { version, commit } = value as Record<string, unknown>;
	return typeof version === "string" && typeof commit === "string";
}

/** Compares the page's own build with what the server says. Pure. */
export function compareBuild(page: BuildId, server: unknown): LiveComparison {
	if (!isBuildId(server)) {
		return {
			kind: "unreadable",
			reason:
				"the server's build-info.json does not name a version and a commit",
		};
	}
	const same = server.version === page.version && server.commit === page.commit;
	return {
		kind: same ? "match" : "mismatch",
		server: { version: server.version, commit: server.commit },
	};
}

export function builtFromLine(page: BuildId): string {
	return `This page was built from ${page.version} at ${page.commit}.`;
}

/** The sentence the reader sees after pressing the button. */
export function comparisonLine(page: BuildId, result: LiveComparison): string {
	const built = `This page was built from ${page.version} at ${page.commit}`;
	switch (result.kind) {
		case "match":
			return `${built}; the server now says ${result.server.version} at ${result.server.commit}: match.`;
		case "mismatch":
			return `${built}; the server now says ${result.server.version} at ${result.server.commit}: MISMATCH. This page is not the build the server is serving now.`;
		case "unreadable":
			return `${built}; the server could not be read: ${result.reason}.`;
	}
}

/** Asks the server, never the browser's cache, which build it serves now.
    cache: "no-store" keeps the browser's own cache out of it; it does not
    get past a CDN in front of the server, and is not meant to: what the CDN
    serves is what every visitor gets. */
export async function readServerBuild(
	fetcher: typeof fetch,
	url = "build-info.json",
): Promise<unknown> {
	const response = await fetcher(url, { cache: "no-store" });
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	return response.json();
}

export async function checkLive(check: LiveCheck): Promise<LiveComparison> {
	try {
		return compareBuild(check.build, await check.read());
	} catch (error) {
		return {
			kind: "unreadable",
			reason: error instanceof Error ? error.message : String(error),
		};
	}
}

function renderLiveCheck(check: LiveCheck): HTMLElement {
	const section = document.createElement("section");
	section.className = "build";
	section.dataset.testid = "live-check";
	section.setAttribute("aria-labelledby", "build-heading");

	const heading = document.createElement("h2");
	heading.id = "build-heading";
	heading.textContent = "Is this the live build?";

	const built = document.createElement("p");
	built.dataset.testid = "page-build";
	built.textContent = builtFromLine(check.build);

	const button = document.createElement("button");
	button.type = "button";
	button.dataset.testid = "check-live";
	button.textContent = "Check what the server is serving now";

	/* role="status" is a polite live region, so a screen reader announces the
	   result when it arrives without moving focus off the button. */
	const result = document.createElement("p");
	result.className = "result";
	result.dataset.testid = "live-result";
	result.setAttribute("role", "status");

	button.addEventListener("click", async () => {
		button.disabled = true;
		delete result.dataset.result;
		result.textContent = "Checking.";
		const outcome = await checkLive(check);
		result.dataset.result = outcome.kind;
		result.textContent = comparisonLine(check.build, outcome);
		button.disabled = false;
	});

	section.append(heading, built, button, result);
	return section;
}

export function render(
	root: HTMLElement,
	gates: readonly Gate[],
	live?: LiveCheck,
): void {
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
	if (live) {
		root.append(renderLiveCheck(live));
	}
}

/* Replaced at build time by vite.config.ts with the version and commit that
   build-info.json names for the same build. */
declare const __BUILD__: BuildId;

/*
 * The bootstrap. Excluded from unit coverage deliberately: it is exercised by
 * the e2e gate, which loads the built page in a real browser and asserts on
 * what this produced. Excluding it keeps the coverage number meaning "the
 * logic is tested" rather than "the entry point was imported once".
 */
/* v8 ignore start */
const root = document.querySelector<HTMLElement>("#app");
if (root) {
	render(root, GATES, {
		build: __BUILD__,
		read: () => readServerBuild(fetch.bind(window)),
	});
}
/* v8 ignore stop */
