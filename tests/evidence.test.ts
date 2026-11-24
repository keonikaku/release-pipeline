import { describe, expect, it } from "vitest";
import {
	EVIDENCE,
	evidenceFor,
	fileUrl,
	REPO,
	releaseUrl,
	runUrl,
} from "../src/evidence";

const OWN_REPO = "https://github.com/keonikaku/release-pipeline/";

describe("the evidence file", () => {
	it("is not empty in any section", () => {
		for (const section of ["rollback", "proof", "limit"] as const) {
			expect(evidenceFor(section).length).toBeGreaterThan(0);
		}
	});

	it("dates every entry, as a real calendar date", () => {
		for (const entry of EVIDENCE) {
			expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(new Date(`${entry.date}T00:00:00Z`).toISOString()).toBe(
				`${entry.date}T00:00:00.000Z`,
			);
		}
	});

	it("tags every entry observed or inferred, nothing else", () => {
		for (const entry of EVIDENCE) {
			expect(["observed", "inferred"]).toContain(entry.tag);
		}
	});

	it("links every entry to this repository, absolutely", () => {
		for (const entry of EVIDENCE) {
			expect(entry.links.length).toBeGreaterThan(0);
			expect(entry.links.some((link) => link.href.startsWith(OWN_REPO))).toBe(
				true,
			);
			for (const link of entry.links) {
				expect(link.href.startsWith(OWN_REPO)).toBe(true);
				expect(link.text.length).toBeGreaterThan(0);
			}
		}
	});

	it("names the run a run link points to", () => {
		for (const entry of EVIDENCE) {
			for (const link of entry.links) {
				const run = /\/actions\/runs\/(\d+)$/.exec(link.href)?.[1];
				if (run) {
					expect(link.text).toContain(run);
				}
			}
		}
	});

	it("labels the rollback as a drill, not an incident", () => {
		const drill = evidenceFor("rollback").filter((entry) =>
			/\bdrill\b/i.test(entry.text),
		);

		expect(drill.length).toBeGreaterThan(0);
		expect(drill[0]?.text).toContain("Drill, not an incident.");
		expect(drill[0]?.tag).toBe("observed");
	});

	it("keeps an inferred claim out of an observed entry", () => {
		for (const entry of EVIDENCE.filter((item) => item.tag === "observed")) {
			expect(entry.text).not.toMatch(/\binferred\b/i);
		}
	});

	it("cites the drill's two runs", () => {
		const hrefs = evidenceFor("rollback").flatMap((entry) =>
			entry.links.map((link) => link.href),
		);

		expect(hrefs).toContain(runUrl("45278248966"));
		expect(hrefs).toContain(runUrl("45281128227"));
	});

	it("filters a supplied list by section", () => {
		const [first] = EVIDENCE;
		expect(first).toBeDefined();
		if (first) {
			expect(evidenceFor(first.section, [first])).toEqual([first]);
			expect(
				evidenceFor(first.section === "limit" ? "proof" : "limit", [first]),
			).toEqual([]);
		}
	});
});

describe("link builders", () => {
	it("build absolute links to this repository", () => {
		expect(REPO).toBe("https://github.com/keonikaku/release-pipeline");
		expect(runUrl("1")).toBe(`${OWN_REPO}actions/runs/1`);
		expect(fileUrl("docs/RELEASE.md")).toBe(
			`${OWN_REPO}blob/main/docs/RELEASE.md`,
		);
		expect(releaseUrl("0.3.0")).toBe(`${OWN_REPO}releases/tag/v0.3.0`);
	});
});
