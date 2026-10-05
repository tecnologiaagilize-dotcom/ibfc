import regionData from "./region-data.json";
// Municipal coverage: RIDE-DF. TSE municipality codes come from the official CSV, never IBGE codes.
export const REGION_NAMES: Record<string, string[]> = regionData;
export const normalizePlace = (value:string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/’/g, "'").trim().toUpperCase();
export function regionalMunicipality(uf:string,name:string) {
  return REGION_NAMES[uf]?.find(x=>normalizePlace(x)===normalizePlace(name)) ?? null;
}
