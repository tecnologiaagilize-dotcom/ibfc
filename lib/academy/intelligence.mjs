/**
 * IBFC Intelligence: deterministic study-matrix core.
 * Does not infer subjects, legal rules, weights or exam frequencies.
 * Source evidence must be supplied by an audited importer or editor.
 */
const statuses = new Set(["not_started", "studying", "reviewing", "mastered"]);
const normalize = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

export function buildStudyMatrix(topics) {
 if (!Array.isArray(topics)) throw new TypeError("Topics must be an array.");
 const seen = new Set();
 return topics.map((topic, index) => {
  const title = String(topic?.title ?? "").trim().replace(/\s+/g, " ");
  if (!title) throw new Error("Topic title is required.");
  const key = normalize(title);
  if (seen.has(key)) throw new Error("Duplicate topic: " + title);
  seen.add(key);
  const source = topic.source && typeof topic.source.document === "string" &&
    topic.source.document.trim() && String(topic.source.section ?? "").trim()
    ? { document: topic.source.document.trim(), section: String(topic.source.section).trim(), page: topic.source.page ?? null }
    : null;
  return { id: `topic-${index + 1}`, title, status: "not_started",
   evidence: source ? "verified" : "pending", source };
 });
}
export function updateTopicStatus(matrix, id, status) {
 if (!statuses.has(status)) throw new Error("Invalid checklist status.");
 if (!matrix.some((row) => row.id === id)) throw new Error("Topic not found.");
 return matrix.map((row) => row.id === id ? { ...row, status } : row);
}
export function planDailyMinutes(minutes) {
 if (minutes !== 120 && minutes !== 180) throw new Error("Daily workload must be 120 or 180 minutes.");
 return minutes === 120
  ? { theory: 40, questions: 45, review: 25, analytics: 10 }
  : { theory: 60, questions: 65, review: 40, analytics: 15 };
}
