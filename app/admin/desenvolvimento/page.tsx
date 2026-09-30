import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const defaultDevelopment = {
  company_name: "Agilize Tecnologia",
  cnpj: "01.596.311/0001-28",
  website_url: "https://site-agilize-tecnologia.vercel.app/",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  instagram_url: "",
  facebook_url: "",
  linkedin_url: "",
  youtube_url: "",
  x_url: "",
  tiktok_url: ""
};

async function saveDevelopment(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: staff } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!staff) redirect("/membro");

  const value = Object.fromEntries(
    Object.keys(defaultDevelopment).map((key) => [
      key,
      String(formData.get(key) || "").trim()
    ])
  );

  await supabase.from("platform_settings").upsert({
    setting_key: "development",
    ...value,
    updated_by: user.id,
    updated_at: new Date().toISOString()
  }, { onConflict: "setting_key" });

  redirect("/admin/desenvolvimento?saved=1");
}

export default async function DevelopmentPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: staff } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!staff) redirect("/membro");

  const { data } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("setting_key", "development")
    .maybeSingle();
  const development = { ...defaultDevelopment, ...(data || {}) };
  const { saved } = await searchParams;

  return (
    <AdminShell email={user.email}>
      <div className="admin-heading">
        <div>
          <span className="badge">INSTITUCIONAL</span>
          <h1>Desenvolvimento</h1>
          <p>Gerencie os dados da empresa desenvolvedora, contatos e mídias exibidos pela plataforma.</p>
        </div>
      </div>

      {saved === "1" && <div className="development-success">Dados de desenvolvimento salvos com sucesso.</div>}

      <section className="admin-panel development-panel">
        <form action={saveDevelopment} className="admin-form development-form">
          <div className="panel-title development-title">
            <div>
              <h2>Agilize Tecnologia</h2>
              <p>Os dados principais alimentam automaticamente o rodapé global do aplicativo.</p>
            </div>
          </div>

          <div className="form-grid development-fields">
            <label>Razão ou nome institucional
              <input name="company_name" defaultValue={development.company_name} required />
            </label>
            <label>CNPJ
              <input name="cnpj" defaultValue={development.cnpj} required />
            </label>
            <label className="span-2">Site
              <input name="website_url" type="url" defaultValue={development.website_url} required />
            </label>
            <label>E-mail
              <input name="email" type="email" defaultValue={development.email} />
            </label>
            <label>Telefone
              <input name="phone" type="tel" defaultValue={development.phone} />
            </label>
            <label>WhatsApp
              <input name="whatsapp" type="tel" defaultValue={development.whatsapp} />
            </label>
            <label>Endereço
              <input name="address" defaultValue={development.address} />
            </label>
          </div>

          <div className="development-section-title">
            <h3>Mídias sociais</h3>
            <p>Informe URLs completas, começando com https://.</p>
          </div>

          <div className="form-grid development-fields">
            <label>Instagram
              <input name="instagram_url" type="url" defaultValue={development.instagram_url} />
            </label>
            <label>Facebook
              <input name="facebook_url" type="url" defaultValue={development.facebook_url} />
            </label>
            <label>LinkedIn
              <input name="linkedin_url" type="url" defaultValue={development.linkedin_url} />
            </label>
            <label>YouTube
              <input name="youtube_url" type="url" defaultValue={development.youtube_url} />
            </label>
            <label>X / Twitter
              <input name="x_url" type="url" defaultValue={development.x_url} />
            </label>
            <label>TikTok
              <input name="tiktok_url" type="url" defaultValue={development.tiktok_url} />
            </label>
          </div>

          <div className="development-actions">
            <button className="btn btn-primary" type="submit">Salvar dados</button>
          </div>
        </form>
      </section>
    </AdminShell>
  );
}
