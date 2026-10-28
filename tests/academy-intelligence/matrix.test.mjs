import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStudyMatrix, updateTopicStatus, planDailyMinutes } from "../../lib/academy/intelligence.mjs";

test("preserves source evidence and marks unverified topics", () => {
 const rows = buildStudyMatrix([
  { title: "  Direito BM ", source: { document: "Edital 006/2026", section: "16", page: 8 } },
  { title: "Administração BM" }
 ]);
 assert.equal(rows[0].status, "not_started");
 assert.equal(rows[0].evidence, "verified");
 assert.equal(rows[1].evidence, "pending");
 assert.equal(rows[0].source.section, "16");
});
test("rejects missing titles and duplicate topics", () => {
 assert.throws(() => buildStudyMatrix([{title: "  "}]));
 assert.throws(() => buildStudyMatrix([{title: "Direito BM"}, {title: " direito bm "}]));
});
test("updates checklist without changing original matrix", () => {
 const rows = buildStudyMatrix([{title: "Direito BM"}]);
 const next = updateTopicStatus(rows, rows[0].id, "reviewing");
 assert.equal(next[0].status, "reviewing");
 assert.equal(rows[0].status, "not_started");
 assert.throws(() => updateTopicStatus(rows, rows[0].id, "invalid"));
});
test("daily plan allocates exactly 120 or 180 minutes", () => {
 assert.equal(Object.values(planDailyMinutes(120)).reduce((a,b)=>a+b,0),120);
 assert.equal(Object.values(planDailyMinutes(180)).reduce((a,b)=>a+b,0),180);
 assert.throws(() => planDailyMinutes(90));
});
