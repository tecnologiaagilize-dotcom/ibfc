"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/browser";

type Mode =
  | "login"
  | "signup";

export function MemberAuthForm({
  mode,
}: {
  mode: Mode;
}) {
  const signup =
    mode === "signup";

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  async function submit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const form =
      new FormData(
        e.currentTarget
      );

    const email =
      String(
        form.get("email") || ""
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        form.get("password") || ""
      );

    const supabase =
      createClient();

    try {
      /*
       * CADASTRO
       */
      if (signup) {
        const fullName =
          String(
            form.get(
              "full_name"
            ) || ""
          ).trim();

        const whatsapp =
          String(
            form.get(
              "whatsapp"
            ) || ""
          ).trim();

        const stateUf =
          String(
            form.get(
              "state_uf"
            ) || ""
          )
            .trim()
            .toUpperCase();

        const city =
          String(
            form.get(
              "city"
            ) || ""
          ).trim();

        const interest = String(form.get("interest") || "").trim();
        const whatsappOptIn = form.get("whatsapp_opt_in") === "on";
        const updatesOptIn = form.get("updates_opt_in") === "on";
        const source = new URLSearchParams(window.location.search).get("origem");
        const allowedSources = ["instagram_ibfc", "portal_ibfc", "whatsapp_ibfc", "indicacao_ibfc"];
        const signupSource = source && allowedSources.includes(source) ? source : "portal_ibfc";

        const {
          data,
          error:
            signupError,
        } =
          await supabase.auth.signUp(
            {
              email,
              password,

              options: {
                data: {
                  full_name:
                    fullName,
                  whatsapp,
                  state_uf:
                    stateUf,
                  city,
                  ibfc_interest: interest,
                  ibfc_source: signupSource,
                  ibfc_locality: String(form.get("locality") || "").trim().slice(0, 100),
                  ibfc_campaign: (new URLSearchParams(window.location.search).get("campanha") || "").trim().slice(0, 64),
                  ibfc_whatsapp_opt_in: whatsappOptIn,
                  ibfc_updates_opt_in: updatesOptIn,
                  ibfc_consent_version: "2026-09-29",
                },
              },
            }
          );

        if (signupError) {
          setError(
            signupError.message
          );
          return;
        }

        /*
         * Se o Supabase já criou
         * uma sessão, seguimos para
         * o servidor decidir o
         * destino.
         */
        if (
          data.session &&
          data.user
        ) {
          window.location.assign(
            "/acesso"
          );

          return;
        }

        setMessage(
          "Cadastro realizado. Confira seu e-mail para confirmar a conta e depois faça login."
        );

        return;
      }

      /*
       * LOGIN
       */
      const {
        data,
        error:
          loginError,
      } =
        await supabase.auth
          .signInWithPassword({
            email,
            password,
          });

      if (loginError) {
        setError(
          loginError.message
        );
        return;
      }

      if (
        !data.user ||
        !data.session
      ) {
        setError(
          "Não foi possível criar uma sessão válida."
        );
        return;
      }

      /*
       * IMPORTANTE:
       *
       * Não consultamos
       * admin_profiles aqui.
       *
       * A sessão já foi criada.
       * Agora fazemos uma nova
       * requisição completa ao
       * servidor.
       */
      window.location.assign(
        "/acesso"
      );
    } catch (err) {
      console.error(
        "Erro de autenticação:",
        err
      );

      setError(
        "Ocorreu um erro ao realizar o acesso. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="member-auth-page">
      <section className="member-auth-brand">
        <div className="member-auth-copy">
          <Link
            href="/"
            className="member-back"
          >
            ← Voltar ao IBFC
          </Link>

          <Image src="/logo-ibfc.png" alt="Instituto Brasileiro da Família Cristã" width={410} height={137} className="ibfc-auth-logo" />
          <div className="member-kicker">
            COMUNIDADE IBFC
          </div>

          <h1>
            {signup
              ? "Faça parte do Instituto Brasileiro da Família Cristã"
              : "Bem-vindo de volta"}
          </h1>

          <p>
            {signup
              ? "Escolha como participar e acompanhe sua inscrição, formação e atividades no portal do IBFC."
              : "Acesse seu ambiente exclusivo, continue seus cursos e acompanhe as atividades da comunidade."}
          </p>

          <div className="member-benefits">
            <span>
              ✓ Cursos e trilhas
            </span>

            <span>
              ✓ Conteúdo exclusivo
            </span>

            <span>
              ✓ Eventos e pesquisas
            </span>

            <span>
              ✓ Perfil e certificados
            </span>
          </div>
        </div>
      </section>

      <section className="member-auth-form-wrap">
        <form
          className="member-auth-card"
          onSubmit={submit}
        >
          <div className="member-auth-title">
            <div className="member-mark">IBFC</div>

            <h2>
              {signup
                ? "Criar minha conta"
                : "Entrar na minha conta"}
            </h2>

            <p>
              {signup
                ? "Leva menos de dois minutos."
                : "Informe seus dados de acesso."}
            </p>
          </div>

          {signup && (
            <>
              <label>
                Nome completo
              </label>

              <input
                className="field"
                name="full_name"
                required
                autoComplete="name"
              />

              <label>
                WhatsApp
              </label>

              <input
                className="field"
                name="whatsapp"
                type="tel"
                required
                autoComplete="tel"
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "110px 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label>
                    UF
                  </label>

                  <input
                    className="field"
                    name="state_uf"
                    maxLength={2}
                    placeholder="DF"
                  />
                </div>

                <div>
                  <label>
                    Cidade
                  </label>

                  <input
                    className="field"
                    name="city"
                  />
                </div>
              </div>
              <label htmlFor="ibfc-locality">Região administrativa (DF) ou bairro</label>
              <input id="ibfc-locality" className="field" name="locality" maxLength={100} placeholder="Ex.: Guará, Samambaia ou Águas Claras" />
              <label htmlFor="ibfc-interest">Como gostaria de participar?</label>
              <select id="ibfc-interest" className="field" name="interest" required defaultValue="">
                <option value="" disabled>Escolha uma opção</option>
                <option value="formacao">Cursos e formação</option>
                <option value="acao_comunitaria">Ações comunitárias</option>
                <option value="eventos">Eventos e organização local</option>
                <option value="voluntariado">Voluntariado</option>
                <option value="conhecer">Quero conhecer o instituto</option>
              </select>
              <label style={{display:"flex",alignItems:"flex-start",gap:8,marginTop:12}}>
                <input type="checkbox" name="whatsapp_opt_in" />
                <span>Autorizo contato pelo WhatsApp sobre minha inscrição e as atividades que eu escolher. Posso pedir a interrupção a qualquer momento.</span>
              </label>
              <label style={{display:"flex",alignItems:"flex-start",gap:8,marginTop:10}}>
                <input type="checkbox" name="updates_opt_in" />
                <span>Também quero receber convites e conteúdos futuros do IBFC pelo WhatsApp.</span>
              </label>
            </>
          )}

          <label>
            E-mail
          </label>

          <input
            className="field"
            name="email"
            type="email"
            required
            autoComplete="email"
          />

          <label>
            Senha
          </label>

          <input
            className="field"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={
              signup
                ? "new-password"
                : "current-password"
            }
          />

          {error && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 8,
                background:
                  "#fef3f2",
                border:
                  "1px solid #fecdca",
                color:
                  "#b42318",
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 8,
                background:
                  "#ecfdf3",
                border:
                  "1px solid #abefc6",
                color:
                  "#027a48",
              }}
            >
              {message}
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              marginTop: 20,
              opacity:
                loading
                  ? 0.7
                  : 1,
            }}
          >
            {loading
              ? signup
                ? "Criando conta..."
                : "Entrando..."
              : signup
                ? "Criar conta"
                : "Entrar"}
          </button>

          <div
            className="member-auth-switch"
            style={{
              marginTop: 20,
              textAlign:
                "center",
            }}
          >
            {signup ? (
              <>
                Já possui uma
                conta?{" "}
                <Link href="/entrar">
                  Entrar
                </Link>
              </>
            ) : (
              <>
                Ainda não possui
                conta?{" "}
                <Link href="/cadastro">
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}
