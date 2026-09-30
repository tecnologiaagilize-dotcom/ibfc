"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Office = {
  id: string;
  candidate_id: string;
  office_type: string;
  name: string | null;
  address: string | null;
  address_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state_uf: string | null;
  postal_code: string | null;
  phone: string | null;
  whatsapp: string | null;
  public_email: string | null;
  opening_hours: string | null;
  maps_url: string | null;
  contact_name: string | null;
  is_public: boolean;
};

const emptyForm = {
  office_type: "committee",
  name: "",
  address: "",
  address_number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state_uf: "DF",
  postal_code: "",
  phone: "",
  whatsapp: "",
  public_email: "",
  opening_hours: "",
  maps_url: "",
  contact_name: "",
  is_public: true,
};

export default function CandidateOffices({
  candidateId,
}: {
  candidateId: string;
}) {
  const supabase = createClient();

  const [offices, setOffices] = useState<Office[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadOffices() {
    setLoading(true);

    const { data, error } = await supabase
      .from("candidate_offices")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at");

    if (error) {
      setError(error.message);
    } else {
      setOffices(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOffices();
  }, [candidateId]);

  function setField(key: string, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveOffice(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const payload = {
      candidate_id: candidateId,
      ...form,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase
          .from("candidate_offices")
          .update(payload)
          .eq("id", editingId)
      : await supabase
          .from("candidate_offices")
          .insert(payload);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    setSaving(false);

    await loadOffices();
  }

  function editOffice(office: Office) {
    setEditingId(office.id);

    setForm({
      office_type: office.office_type ?? "committee",
      name: office.name ?? "",
      address: office.address ?? "",
      address_number: office.address_number ?? "",
      complement: office.complement ?? "",
      neighborhood: office.neighborhood ?? "",
      city: office.city ?? "",
      state_uf: office.state_uf ?? "DF",
      postal_code: office.postal_code ?? "",
      phone: office.phone ?? "",
      whatsapp: office.whatsapp ?? "",
      public_email: office.public_email ?? "",
      opening_hours: office.opening_hours ?? "",
      maps_url: office.maps_url ?? "",
      contact_name: office.contact_name ?? "",
      is_public: office.is_public ?? true,
    });

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }

  async function deleteOffice(id: string) {
    const confirmed = window.confirm(
      "Deseja realmente excluir este comitê ou ponto de apoio?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("candidate_offices")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadOffices();
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  const fieldStyle = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #d0d5dd",
    borderRadius: 8,
    background: "#fff",
  };

  const labelStyle = {
    display: "block",
    fontWeight: 700,
    marginBottom: 6,
  };

  return (
    <section
      className="card"
      style={{
        padding: 26,
        marginTop: 28,
      }}
    >
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ marginBottom: 6 }}>
          Comitês e Pontos de Apoio
        </h2>

        <p style={{ color: "#667085", margin: 0 }}>
          Cadastre os locais públicos relacionados a este apoiado.
        </p>
      </div>

      {loading ? (
        <p>Carregando locais...</p>
      ) : offices.length === 0 ? (
        <div
          style={{
            padding: 18,
            background: "#f9fafb",
            borderRadius: 10,
            marginBottom: 25,
          }}
        >
          Nenhum comitê ou ponto de apoio cadastrado.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 14,
            marginBottom: 30,
          }}
        >
          {offices.map((office) => (
            <div
              key={office.id}
              style={{
                border: "1px solid #e4e7ec",
                borderRadius: 10,
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 15,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong>
                    {office.name || "Local sem nome"}
                  </strong>

                  <div
                    style={{
                      color: "#667085",
                      marginTop: 5,
                    }}
                  >
                    {office.office_type === "committee" &&
                      "Comitê oficial"}

                    {office.office_type === "support_point" &&
                      "Ponto de apoio"}

                    {office.office_type === "state_coordination" &&
                      "Coordenação estadual"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => editOffice(office)}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => deleteOffice(office.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {(office.address || office.city) && (
                <p style={{ marginBottom: 5 }}>
                  {office.address}
                  {office.address_number
                    ? `, ${office.address_number}`
                    : ""}
                  {office.neighborhood
                    ? ` — ${office.neighborhood}`
                    : ""}
                  {office.city
                    ? ` — ${office.city}/${office.state_uf}`
                    : ""}
                </p>
              )}

              {office.phone && (
                <div>Telefone: {office.phone}</div>
              )}

              {office.whatsapp && (
                <div>WhatsApp: {office.whatsapp}</div>
              )}

              {!office.is_public && (
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 700,
                  }}
                >
                  Não publicado
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={saveOffice}>
        <h3>
          {editingId
            ? "Editar local"
            : "Adicionar comitê ou ponto de apoio"}
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(240px,1fr))",
            gap: 16,
            marginTop: 18,
          }}
        >
          <label>
            <span style={labelStyle}>Tipo *</span>

            <select
              style={fieldStyle}
              value={form.office_type}
              onChange={(e) =>
                setField("office_type", e.target.value)
              }
            >
              <option value="committee">
                Comitê oficial
              </option>

              <option value="support_point">
                Ponto de apoio
              </option>

              <option value="state_coordination">
                Coordenação estadual
              </option>
            </select>
          </label>

          <label>
            <span style={labelStyle}>Nome do local</span>

            <input
              style={fieldStyle}
              value={form.name}
              onChange={(e) =>
                setField("name", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>
              Responsável / contato
            </span>

            <input
              style={fieldStyle}
              value={form.contact_name}
              onChange={(e) =>
                setField("contact_name", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>CEP</span>

            <input
              style={fieldStyle}
              value={form.postal_code}
              onChange={(e) =>
                setField("postal_code", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>Endereço</span>

            <input
              style={fieldStyle}
              value={form.address}
              onChange={(e) =>
                setField("address", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>Número</span>

            <input
              style={fieldStyle}
              value={form.address_number}
              onChange={(e) =>
                setField("address_number", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>Complemento</span>

            <input
              style={fieldStyle}
              value={form.complement}
              onChange={(e) =>
                setField("complement", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>Bairro</span>

            <input
              style={fieldStyle}
              value={form.neighborhood}
              onChange={(e) =>
                setField("neighborhood", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>Cidade</span>

            <input
              style={fieldStyle}
              value={form.city}
              onChange={(e) =>
                setField("city", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>UF</span>

            <input
              style={fieldStyle}
              maxLength={2}
              placeholder="DF"
              value={form.state_uf}
              onChange={(e) =>
                setField(
                  "state_uf",
                  e.target.value.toUpperCase()
                )
              }
            />
          </label>

          <label>
            <span style={labelStyle}>Telefone</span>

            <input
              style={fieldStyle}
              value={form.phone}
              onChange={(e) =>
                setField("phone", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>WhatsApp</span>

            <input
              style={fieldStyle}
              value={form.whatsapp}
              onChange={(e) =>
                setField("whatsapp", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>E-mail público</span>

            <input
              type="email"
              style={fieldStyle}
              value={form.public_email}
              onChange={(e) =>
                setField("public_email", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>
              Horário de atendimento
            </span>

            <input
              style={fieldStyle}
              placeholder="Ex.: segunda a sexta, 9h às 18h"
              value={form.opening_hours}
              onChange={(e) =>
                setField("opening_hours", e.target.value)
              }
            />
          </label>

          <label>
            <span style={labelStyle}>
              Link do Google Maps
            </span>

            <input
              style={fieldStyle}
              placeholder="https://..."
              value={form.maps_url}
              onChange={(e) =>
                setField("maps_url", e.target.value)
              }
            />
          </label>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginTop: 20,
          }}
        >
          <input
            type="checkbox"
            checked={form.is_public}
            onChange={(e) =>
              setField("is_public", e.target.checked)
            }
          />

          Exibir este local publicamente
        </label>

        {error && (
          <div
            style={{
              marginTop: 18,
              padding: 12,
              borderRadius: 8,
              background: "#fef3f2",
              color: "#b42318",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 22,
          }}
        >
          <button
            className="btn btn-primary"
            disabled={saving}
          >
            {saving
              ? "Salvando..."
              : editingId
              ? "Salvar alterações"
              : "Adicionar local"}
          </button>

          {editingId && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelEdit}
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
