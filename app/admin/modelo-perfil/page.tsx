import { redirect } from "next/navigation";

// O certificado de apoio não faz mais parte da página pública dos candidatos.
export default function LegacyTemplatePage() {
  redirect("/admin/candidatos");
}
