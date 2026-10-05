// Municipal coverage: RIDE-DF. TSE municipality codes come from the official CSV, never IBGE codes.
export const REGION_NAMES: Record<string, string[]> = {"DF": ["Brasília"], "GO": ["Abadiânia", "Água Fria de Goiás", "Águas Lindas de Goiás", "Alexânia", "Alto Paraíso de Goiás", "Alvorada do Norte", "Barro Alto", "Cabeceiras", "Cavalcante", "Cidade Ocidental", "Cocalzinho de Goiás", "Corumbá de Goiás", "Cristalina", "Flores de Goiás", "Formosa", "Goianésia", "Luziânia", "Mimoso de Goiás", "Niquelândia", "Novo Gama", "Padre Bernardo", "Pirenópolis", "Planaltina", "Santo Antônio do Descoberto", "São João d’Aliança", "Simolândia", "Valparaíso de Goiás", "Vila Boa", "Vila Propício"], "MG": ["Arinos", "Buritis", "Cabeceira Grande", "Unaí"]};
export const normalizePlace = (value:string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/’/g, "'").trim().toUpperCase();
export function regionalMunicipality(uf:string,name:string) {
  return REGION_NAMES[uf]?.find(x=>normalizePlace(x)===normalizePlace(name)) ?? null;
}
