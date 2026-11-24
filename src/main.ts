/**
 * The whole application, small on purpose (this file and evidence.ts): see
 * docs/decisions/0001-a-separate-repository-and-a-trivial-application.md
 *
 * It renders the landing page: the release flow, the gate set this
 * repository's own pull requests have to pass, the rollbacks, the proof and
 * the limits. The gate data below is the single source of truth for what the
 * page claims about gates, so if a gate is added to the pipeline and not to
 * this list, the page is wrong and the unit test for `summarise` is the thing
 * that notices the count changed. Hand-written claims live in evidence.ts,
 * and nowhere else.
 */

import {
	EVIDENCE,
	type Evidence,
	type EvidenceLink,
	type EvidenceSection,
	evidenceFor,
	fileUrl,
	releaseUrl,
} from "./evidence";

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

/*
 * The release list, generated at build time from CHANGELOG.md by
 * vite.config.ts and handed to the page as `__RELEASES__`. Never typed in.
 */

export interface Release {
	readonly version: string;
	/** YYYY-MM-DD, as release-please wrote it. */
	readonly date: string;
	/** The first Features entry, or the first entry of any kind if the
	    release has no Features section (a fix-only patch release). */
	readonly summary: string;
}

/* "## [0.3.0](compare link) (2026-11-24)" and, for a first release,
   "## 0.1.0 (2026-11-21)". */
const RELEASE_HEADING =
	/^## \[?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\]?(?:\([^)]*\))? \((\d{4}-\d{2}-\d{2})\)\s*$/;
const SECTION_HEADING = /^### (.+?)\s*$/;
const ENTRY = /^\* (.+)$/;

/** "text ([#21](...)) ([49c01fc](...))" to "Text". Drops the issue and
    commit references release-please appends, keeps the words. */
function entryText(raw: string): string {
	const text = raw
		.replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.trim();
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Pure, so the unit gate tests it and the build calls it. */
export function parseChangelog(markdown: string): Release[] {
	const releases: Release[] = [];
	let current: { version: string; date: string } | undefined;
	let section = "";
	let feature: string | undefined;
	let first: string | undefined;

	const close = () => {
		if (current) {
			releases.push({ ...current, summary: feature ?? first ?? "" });
		}
	};

	for (const line of markdown.split(/\r?\n/)) {
		const heading = RELEASE_HEADING.exec(line);
		if (heading) {
			close();
			current = { version: heading[1] ?? "", date: heading[2] ?? "" };
			section = "";
			feature = undefined;
			first = undefined;
			continue;
		}
		const sub = SECTION_HEADING.exec(line);
		if (sub) {
			section = sub[1] ?? "";
			continue;
		}
		const entry = ENTRY.exec(line);
		if (entry && current) {
			const text = entryText(entry[1] ?? "");
			first ??= text;
			if (section === "Features") {
				feature ??= text;
			}
		}
	}
	close();
	return releases;
}

export function releaseCountLine(count: number): string {
	return `${count} ${count === 1 ? "release" : "releases"}, newest first.`;
}

/*
 * The page's words that are not evidence. Exported so the specs can assert
 * on the same strings the page renders, rather than a second copy of them.
 */

export const TITLE = "An ongoing release-management project";
export const LEAD =
	"An ongoing release-management project: every weekly change to this site goes through quality gates, a human approval, a live check and a backout record, and every step below links to the real run.";
export const BYLINE =
	"Release manager and product owner: Keoni Kakugawa. Built by an AI agent team under his direction.";

/** The h2s, in page order. */
export const SECTIONS = [
	"Now live",
	"The flow",
	"The gate set",
	"Rollbacks",
	"Proof you can click",
	"Releases",
	"Honest limits",
] as const;

export const FREEZE_LINE =
	"Freeze window: planned - rules being written by the release manager.";

const FLOW: readonly (readonly [string, string])[] = [
	[
		"Change",
		"A pull request carries one change and states its release impact and rollback plan.",
	],
	[
		"Gates",
		"The gate set below runs on the pull request. A red gate stops the merge for everyone but the admin; see Honest limits.",
	],
	[
		"Release",
		"Merged changes become a version and a changelog entry, and the build that passed the gates is stored on the GitHub release.",
	],
	[
		"Human approval",
		"Merging the release pull request is the decision to release, and the deploy then waits for a person to approve it.",
	],
	[
		"Deploy and live check",
		"The stored build, not a rebuild, goes to GitHub Pages. Smoke checks and a byte-for-byte comparison then run against the live site.",
	],
	[
		"Backout record",
		"Every deploy run writes what replaced what, who approved it, the smoke result and how long it took.",
	],
];

const DEPLOY_GATES: readonly (readonly [string, string])[] = [
	["approval", "The deploy waits until the release manager approves it."],
	["smoke", "The @smoke browser checks run against the live address."],
	[
		"live bytes",
		"Every live file's SHA-256 is compared with the stored build.",
	],
];

/* Small DOM helpers. Text goes in through textContent, never innerHTML, so
   nothing in the evidence file or the changelog can become markup. */

type Child = Node | string;

function h<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attrs: Readonly<Record<string, string>> = {},
	...children: Child[]
): HTMLElementTagNameMap[K] {
	const node = document.createElement(tag);
	for (const [name, value] of Object.entries(attrs)) {
		node.setAttribute(name, value);
	}
	node.append(...children);
	return node;
}

function link({ text, href }: EvidenceLink): HTMLAnchorElement {
	return h("a", { href }, text);
}

function links(items: readonly EvidenceLink[]): HTMLUListElement {
	return h(
		"ul",
		{ class: "links" },
		...items.map((item) => h("li", {}, link(item))),
	);
}

function section(id: string, title: string, ...children: Child[]): HTMLElement {
	return h(
		"section",
		{ "aria-labelledby": id },
		h("h2", { id }, title),
		...children,
	);
}

function renderLiveCheck(check: LiveCheck): HTMLElement {
	const built = h(
		"p",
		{ "data-testid": "page-build" },
		builtFromLine(check.build),
	);

	const button = h(
		"button",
		{ type: "button", "data-testid": "check-live" },
		"Check what the server is serving now",
	);

	/* role="status" is a polite live region, so a screen reader announces the
	   result when it arrives without moving focus off the button. */
	const result = h("p", {
		class: "result",
		"data-testid": "live-result",
		role: "status",
	});

	/* aria-disabled rather than disabled while a check runs: a disabled
	   button drops keyboard focus, and the reader would lose their place. A
	   press while it is set does nothing. */
	button.addEventListener("click", async () => {
		if (button.getAttribute("aria-disabled") === "true") {
			return;
		}
		button.setAttribute("aria-disabled", "true");
		delete result.dataset.result;
		result.textContent = "Checking.";
		const outcome = await checkLive(check);
		result.dataset.result = outcome.kind;
		result.textContent = comparisonLine(check.build, outcome);
		button.removeAttribute("aria-disabled");
	});

	const node = section(
		"now-live",
		"Now live",
		h("h3", {}, "Is this the live build?"),
		built,
		button,
		result,
		links([
			{ text: "build-info.json", href: "build-info.json" },
			{
				text: `GitHub release v${check.build.version}`,
				href: releaseUrl(check.build.version),
			},
		]),
	);
	node.className = "build panel";
	node.dataset.testid = "live-check";
	return node;
}

function renderFlow(): HTMLElement {
	return section(
		"flow",
		"The flow",
		h(
			"ol",
			{ class: "flow", "data-testid": "flow" },
			...FLOW.map(([step, detail]) =>
				h("li", {}, h("strong", {}, step), " ", h("span", {}, detail)),
			),
		),
		links([{ text: "docs/RELEASE.md", href: fileUrl("docs/RELEASE.md") }]),
	);
}

function renderGates(gates: readonly Gate[]): HTMLElement {
	const list = h("ul", { class: "gates", "data-testid": "gates" });

	for (const gate of gates) {
		const item = h(
			"li",
			{ "data-gate": gate.id },
			h("code", {}, gate.id),
			h("span", { class: "tool" }, gate.tool),
			h("span", { class: "question" }, gate.question),
		);
		if (gate.trigger === "pull-request") {
			item.append(h("span", { class: "note" }, "pull requests only"));
		}
		list.append(item);
	}

	return section(
		"gate-set",
		"The gate set",
		h(
			"p",
			{ class: "summary", "data-testid": "summary" },
			summaryLine(summarise(gates)),
		),
		list,
		h("h3", {}, "Deploy gates"),
		h(
			"ul",
			{ class: "gates deploy-gates", "data-testid": "deploy-gates" },
			...DEPLOY_GATES.map(([id, question]) =>
				h(
					"li",
					{},
					h("code", {}, id),
					h("span", { class: "question" }, question),
				),
			),
		),
		h("p", { class: "freeze", "data-testid": "freeze" }, FREEZE_LINE),
		links([
			{ text: "ci.yml", href: fileUrl(".github/workflows/ci.yml") },
			{ text: "deploy.yml", href: fileUrl(".github/workflows/deploy.yml") },
		]),
	);
}

function renderEvidence(
	id: string,
	title: string,
	kind: EvidenceSection,
	evidence: readonly Evidence[],
): HTMLElement {
	return section(
		id,
		title,
		h(
			"ul",
			{ class: "evidence", "data-testid": `evidence-${kind}` },
			...evidenceFor(kind, evidence).map((entry) =>
				h(
					"li",
					{ class: "panel", "data-tag": entry.tag },
					h(
						"p",
						{ class: "meta" },
						h("time", { datetime: entry.date }, `${entry.date} UTC`),
						" ",
						h("span", { class: "tag", "data-tag": entry.tag }, entry.tag),
					),
					h("p", {}, entry.text),
					links(entry.links),
				),
			),
		),
	);
}

function renderReleases(releases: readonly Release[]): HTMLElement {
	return section(
		"releases",
		"Releases",
		h(
			"p",
			{ class: "summary", "data-testid": "release-count" },
			releaseCountLine(releases.length),
		),
		h(
			"ol",
			{ class: "releases", "data-testid": "releases" },
			...releases.map((release) =>
				h(
					"li",
					{ "data-version": release.version },
					h(
						"a",
						{ href: releaseUrl(release.version) },
						h("code", {}, `v${release.version}`),
					),
					h("time", { datetime: release.date }, release.date),
					h("span", { class: "question" }, release.summary),
				),
			),
		),
		links([{ text: "CHANGELOG.md", href: fileUrl("CHANGELOG.md") }]),
	);
}

export interface PageContent {
	readonly gates: readonly Gate[];
	readonly releases: readonly Release[];
	readonly evidence: readonly Evidence[];
	readonly live: LiveCheck;
}

export function render(root: HTMLElement, content: PageContent): void {
	const intro = h(
		"header",
		{ class: "intro" },
		h("h1", {}, TITLE),
		h("p", { class: "lead", "data-testid": "lead" }, LEAD),
		h("p", { class: "byline", "data-testid": "byline" }, BYLINE),
	);

	root.replaceChildren(
		intro,
		renderLiveCheck(content.live),
		renderFlow(),
		renderGates(content.gates),
		renderEvidence("rollbacks", "Rollbacks", "rollback", content.evidence),
		renderEvidence("proof", "Proof you can click", "proof", content.evidence),
		renderReleases(content.releases),
		renderEvidence("limits", "Honest limits", "limit", content.evidence),
	);
}

/* Replaced at build time by vite.config.ts: the version and commit that
   build-info.json names for the same build, and the release list parsed
   from CHANGELOG.md. */
declare const __BUILD__: BuildId;
declare const __RELEASES__: readonly Release[];

/*
 * The bootstrap. Excluded from unit coverage deliberately: it is exercised by
 * the e2e gate, which loads the built page in a real browser and asserts on
 * what this produced. Excluding it keeps the coverage number meaning "the
 * logic is tested" rather than "the entry point was imported once".
 *
 * Guarded on `document` because vite.config.ts imports `parseChangelog` from
 * this file at build time, in Node, where there is no page to render.
 */
/* v8 ignore start */
const root =
	typeof document === "undefined"
		? null
		: document.querySelector<HTMLElement>("#app");
if (root) {
	render(root, {
		gates: GATES,
		releases: __RELEASES__,
		evidence: EVIDENCE,
		live: {
			build: __BUILD__,
			read: () => readServerBuild(fetch.bind(window)),
		},
	});
}
/* v8 ignore stop */
