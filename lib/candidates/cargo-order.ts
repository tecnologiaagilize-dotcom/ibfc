/** Ordem de exibição; display_order continua controlando a ordem dentro do cargo. */
export function cargoRank(cargo?: string | null): number {
  const label = (cargo ?? "").trim().toLocaleLowerCase("pt-BR");
  if (label.includes("president")) return 10;
  if (label.includes("governador") || label.includes("governadora")) return 20;
  if (label.includes("senador") || label.includes("senadora")) return 30;
  if (label.startsWith("deputad") && label.includes("federal")) return 40;
  if (label.startsWith("deputad") && label.includes("estadual")) return 50;
  if (label.startsWith("deputad") && label.includes("distrital")) return 60;
  return 90;
}
