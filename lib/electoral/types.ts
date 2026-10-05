export type ElectionCandidate = {
  uf: string; year: number; election: number; turn: number; office: number;
  number: string; name: string; office_name: string;
};
export type SectionComparison = {
  uf: string; municipality_name: string; municipality: number; zone: number; section: number;
  old_votes: number | null; new_votes: number | null;
  old_valid: number | null; new_valid: number | null;
  old_local: number | null; new_local: number | null;
  old_name: string | null; new_name: string | null;
  latitude: number | null; longitude: number | null;
  address: string | null; coordinate_year: number | null;
};
export type ImportLog = { id: string; kind: string; year: number; filename: string; status: string; rows_saved: number; created_at: string; error: string | null };
export type ElectionLocation = {uf:string; municipality_name:string; municipality: number; zone: number; local: number; name: string; address: string; latitude: number | null; longitude: number | null};
export type Catalogue = { candidates: ElectionCandidate[]; imports: ImportLog[]; locations: ElectionLocation[] };
export type Comparison = { rows: SectionComparison[]; generated_at: string; sources?: {year:number;filename:string;source_url:string;finished_at:string}[] };
export type LocalComparison = {
  key: string; uf:string; municipality:number; municipality_name:string; zone: number; local: number | null; name: string; address: string;
  latitude: number | null; longitude: number | null; coordinate_year: number | null;
  sections: SectionComparison[];
};
export const candidateKey = (c: ElectionCandidate) => [c.uf, c.year, c.election, c.turn, c.office, c.number].join(":");
