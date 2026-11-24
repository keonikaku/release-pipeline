/**
 * The hand-written claims on the landing page, and the only place they live.
 *
 * Everything else the page says is generated at build time: the version and
 * commit (`__BUILD__`), the gate set and its counts (`GATES` in main.ts), and
 * the release list (`__RELEASES__`, parsed from CHANGELOG.md). What cannot be
 * generated is written here, one entry per claim, each with the date it was
 * seen, whether it was observed or inferred, and the run or file that shows
 * it. Observed and inferred are never blended in one entry: if a sentence
 * needs both, it is two entries.
 *
 * Dates are UTC, as GitHub records them. A number that appears in prose on
 * the page and is not generated must be inside one of these entries.
 */

export const REPO = "https://github.com/keonikaku/release-pipeline";

export const runUrl = (id: string): string => `${REPO}/actions/runs/${id}`;
export const fileUrl = (path: string): string => `${REPO}/blob/main/${path}`;
export const releaseUrl = (version: string): string =>
	`${REPO}/releases/tag/v${version}`;

export type EvidenceSection = "rollback" | "proof" | "limit";
export type EvidenceTag = "observed" | "inferred";

export interface EvidenceLink {
	/** Names what the link is, e.g. "Rollback run 45278248966". */
	readonly text: string;
	readonly href: string;
}

export interface Evidence {
	/** YYYY-MM-DD, UTC. */
	readonly date: string;
	readonly section: EvidenceSection;
	readonly text: string;
	readonly tag: EvidenceTag;
	readonly links: readonly EvidenceLink[];
}

const ROLLBACK_RUN = "45278248966";
const ROLL_FORWARD_RUN = "45281128227";
const RELEASE_RUN = "45298078098";
const LIVE_BYTES_RUN = "45290589637";

const rollbackRun: EvidenceLink = {
	text: `Rollback run ${ROLLBACK_RUN}`,
	href: runUrl(ROLLBACK_RUN),
};
const rollForwardRun: EvidenceLink = {
	text: `Roll-forward run ${ROLL_FORWARD_RUN}`,
	href: runUrl(ROLL_FORWARD_RUN),
};
const releaseRun: EvidenceLink = {
	text: `v0.3.0 release run ${RELEASE_RUN}`,
	href: runUrl(RELEASE_RUN),
};
const liveBytesRun: EvidenceLink = {
	text: `Live-bytes run ${LIVE_BYTES_RUN}`,
	href: runUrl(LIVE_BYTES_RUN),
};

export const EVIDENCE: readonly Evidence[] = [
	/* Rollbacks */
	{
		date: "2026-11-23",
		section: "rollback",
		tag: "observed",
		text: "Drill, not an incident. v0.2.0 was live and fine. The stored v0.1.0 build was deployed back over it, smoke-checked, then v0.2.0 was rolled forward the same way. The rollback took 11m 31s against a 15 minute target, from the run's creation to smoke green, as its backout record states.",
		links: [rollbackRun, rollForwardRun],
	},
	{
		date: "2026-11-23",
		section: "rollback",
		tag: "inferred",
		text: "About ten minutes of the drill's 11m 31s was the wait for a human approval, inferred from the job durations: the jobs themselves add up to about one minute.",
		links: [rollbackRun],
	},

	/* Proof you can click */
	{
		date: "2026-11-24",
		section: "proof",
		tag: "observed",
		text: "v0.3.0 released and deployed on release: the full gate set passed on the tagged commit, the deploy waited for approval, smoke passed against the live site, and the live bytes check found 4 of 4 files matching the stored build on the first poll.",
		links: [
			releaseRun,
			{ text: "GitHub release v0.3.0", href: releaseUrl("0.3.0") },
		],
	},
	{
		date: "2026-11-23",
		section: "proof",
		tag: "observed",
		text: "The first live bytes check in a deploy: v0.2.0 deployed over itself, and 4 of 4 live files matched the stored build's SHA-256 on the first poll.",
		links: [liveBytesRun],
	},
	{
		date: "2026-11-23",
		section: "proof",
		tag: "observed",
		text: "The drill's rollback: v0.1.0 deployed over v0.2.0, smoke 3 of 3, the approver named in the run's backout record.",
		links: [rollbackRun],
	},
	{
		date: "2026-11-23",
		section: "proof",
		tag: "observed",
		text: "The drill's roll forward: v0.2.0 deployed back over v0.1.0, smoke 3 of 3.",
		links: [rollForwardRun],
	},

	/* Honest limits */
	{
		date: "2026-11-23",
		section: "limit",
		tag: "observed",
		text: "Change pull requests merge by admin bypass. There is one account, so the author of a change cannot also be its approving reviewer. Release pull requests, authored by the release App, are approved and then merged without a bypass.",
		links: [
			{ text: "docs/quality-gates.md", href: fileUrl("docs/quality-gates.md") },
		],
	},
	{
		date: "2026-11-24",
		section: "limit",
		tag: "observed",
		text: "5 of the 7 pull request gates have never been seen failing in a real run: typecheck, test, audit, build and e2e. lint and pr-title have, on pull request 2.",
		links: [
			{ text: "docs/quality-gates.md", href: fileUrl("docs/quality-gates.md") },
		],
	},
	{
		date: "2026-11-24",
		section: "limit",
		tag: "observed",
		text: "No live mismatch has been seen in a real run. The live bytes check and the page's own check have only ever answered match.",
		links: [liveBytesRun, releaseRun],
	},
	{
		date: "2026-11-23",
		section: "limit",
		tag: "observed",
		text: "The smoke after the drill's rollback ran the specs on main, not the ones the v0.1.0 build shipped with.",
		links: [rollbackRun],
	},
	{
		date: "2026-11-24",
		section: "limit",
		tag: "inferred",
		text: "Whether a deploy purges the CDN cache is not established. The smoke allows for a cached copy rather than assume a purge.",
		links: [{ text: "docs/RELEASE.md", href: fileUrl("docs/RELEASE.md") }],
	},
];

export function evidenceFor(
	section: EvidenceSection,
	entries: readonly Evidence[] = EVIDENCE,
): Evidence[] {
	return entries.filter((entry) => entry.section === section);
}
