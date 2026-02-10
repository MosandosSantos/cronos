"use client";



import Link from "next/link";

import { useRouter } from "next/navigation";

import { useState } from "react";



import { getRole, login } from "@/lib/auth";



export default function LoginPage() {

  const router = useRouter();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);



  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    setError("");

    setLoading(true);

    try {

      await login(email, password);

      const role = getRole();

      router.push(role === "SAAS_ADMIN" ? "/admin/dashboard" : "/app/dashboard");

    } catch (err) {

      setError(

        err instanceof Error

          ? err.message

          : "Não foi possível entrar. Verifique os dados."

      );

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="min-h-screen bg-atmosphere px-6 py-12">

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center">

        <section className="flex-1">

          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--primary)]">

            Cronos

          </div>

          <h1 className="mt-6 max-w-xl font-[var(--font-display)] text-4xl leading-tight text-[color:var(--ink)] sm:text-5xl">

            Acompanhe vencimentos com clareza e ação imediata.

          </h1>

          <p className="mt-4 max-w-lg text-base leading-7 text-[color:var(--muted)]">

            Login com e-mail para acessar seu painel. Se ainda não possui conta, faça o

            cadastro da empresa e comece o controle agora.

          </p>

          <div className="mt-8 flex flex-wrap gap-4">

            <Link

              href="/register"

              className="rounded-2xl border border-[color:var(--border)] bg-white/80 px-6 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-white"

            >

              Criar conta

            </Link>

          </div>

        </section>

        <section className="w-full max-w-md">

          <div className="glass-panel rounded-3xl p-8">

            <h2 className="text-2xl font-semibold text-[color:var(--ink)]">Entrar</h2>

            <p className="mt-2 text-sm text-[color:var(--muted)]">

              Use o e-mail cadastrado para acessar o painel.

            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>

              <label className="block text-sm font-semibold text-[color:var(--ink)]">

                E-mail

                <input

                  type="email"

                  value={email}

                  onChange={(event) => setEmail(event.target.value)}

                  className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--primary)]"

                />

              </label>

              <label className="block text-sm font-semibold text-[color:var(--ink)]">

                Senha

                <input

                  type="password"

                  value={password}

                  onChange={(event) => setPassword(event.target.value)}

                  className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--primary)]"

                />

              </label>

              {error && (

                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">

                  {error}

                </div>

              )}

              <button

                type="submit"

                className="mt-2 flex w-full items-center justify-center rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-20px_rgba(7,91,96,0.8)] transition hover:bg-[color:var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"

                disabled={loading}

              >

                {loading ? "Entrando..." : "Entrar no painel"}

              </button>

            </form>

          </div>

        </section>

      </div>

    </div>

  );

}


