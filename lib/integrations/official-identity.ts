export function normalizedPersonName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

type OfficialPerson = {
  id: string;
  names: string[];
  stateUf: string;
};

// Só vincula automaticamente se houver um único nome exato na mesma UF.
export function uniqueOfficialIdentity<T extends OfficialPerson>(
  people: T[],
  candidateNames: (string | null | undefined)[],
  stateUf: string | null | undefined
): T | null {
  if (!stateUf) return null;
  const names = new Set(candidateNames.filter((name): name is string => Boolean(name))
    .map(normalizedPersonName).filter(Boolean));
  if (!names.size) return null;

  const matches = people.filter((person) =>
    person.stateUf.toUpperCase() === stateUf.toUpperCase() &&
    person.names.some((name) => names.has(normalizedPersonName(name)))
  );
  return matches.length === 1 ? matches[0] : null;
}
