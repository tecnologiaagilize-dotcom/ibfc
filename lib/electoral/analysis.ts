import type { LocalComparison, SectionComparison } from "./types";

export function summarize(rows: SectionComparison[], commonOnly = false) {
  const selected = commonOnly ? rows.filter(r => r.old_valid !== null && r.new_valid !== null) : rows;
  const oldAvailable = selected.some(r => r.old_valid !== null);
  const newAvailable = selected.some(r => r.new_valid !== null);
  const oldVotes = selected.reduce((n, r) => n + (r.old_votes ?? 0), 0);
  const newVotes = selected.reduce((n, r) => n + (r.new_votes ?? 0), 0);
  const oldValid = selected.reduce((n, r) => n + (r.old_valid ?? 0), 0);
  const newValid = selected.reduce((n, r) => n + (r.new_valid ?? 0), 0);
  const oldShare = oldValid > 0 ? oldVotes / oldValid * 100 : null;
  const newShare = newValid > 0 ? newVotes / newValid * 100 : null;
  const comparable = oldAvailable && newAvailable;
  return {
    oldAvailable, newAvailable, oldVotes, newVotes, oldValid, newValid, oldShare, newShare,
    delta: comparable ? newVotes - oldVotes : null,
    percent: comparable && oldVotes > 0 ? (newVotes - oldVotes) / oldVotes * 100 : null,
    points: oldShare !== null && newShare !== null ? newShare - oldShare : null,
    oldSections: selected.filter(r => r.old_valid !== null).length,
    newSections: selected.filter(r => r.new_valid !== null).length,
    commonSections: selected.filter(r => r.old_valid !== null && r.new_valid !== null).length,
    movedSections: selected.filter(r => r.old_local !== null && r.new_local !== null && r.old_local !== r.new_local).length,
  };
}

// Section identifiers are election-specific. A matching key is not proof of an unchanged electorate.
export function groupLocations(rows: SectionComparison[]): LocalComparison[] {
  const groups = new Map<string, LocalComparison>();
  for (const r of rows) {
    const local = r.new_local ?? r.old_local;
    const key = `${r.uf}:${r.municipality}:${r.zone}:${local ?? `section-${r.section}`}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, uf:r.uf, municipality:r.municipality, municipality_name:r.municipality_name, zone: r.zone, local, name: r.new_name ?? r.old_name ?? `Local ${local ?? "não vinculado"}`,
        address: r.address ?? "", latitude: r.latitude, longitude: r.longitude, coordinate_year: r.coordinate_year, sections: [] };
      groups.set(key, g);
    }
    g.sections.push(r);
  }
  return [...groups.values()].sort((a, b) => a.zone - b.zone || (a.local ?? 0) - (b.local ?? 0));
}

export function percentage(value: number | null) {
  return value === null ? "Não calculável" : `${value.toLocaleString("pt-BR", {maximumFractionDigits: 2})}%`;
}
export function number(value: number | null) {
  return value === null ? "Sem dados" : value.toLocaleString("pt-BR");
}

// Prevent spreadsheet formula execution in exported text, including imported candidate/place names.
export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
