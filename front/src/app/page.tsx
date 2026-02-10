import Link from "next/link";



export default function Home() {

  return (

    <div className="min-h-screen bg-atmosphere px-6 py-12">

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center">

        <section className="flex-1">

          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--primary)]">

            Cronos

          </div>

          <h1 className="mt-6 max-w-xl font-[var(--font-display)] text-4xl leading-tight text-[color:var(--ink)] sm:text-5xl">

            Controle total de vencimentos de ASO, laudos e treinamentos.

          </h1>

          <p className="mt-4 max-w-lg text-base leading-7 text-[color:var(--muted)]">

            Organize eventos por colaborador, documentos por empresa e receba alertas claros

            antes do vencimento. Tudo em um painel simples, com viso por contrato e

            multiempresa.

          </p>

          <div className="mt-8 flex flex-wrap gap-4">

            <Link

              href="/register"

              className="rounded-2xl bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-20px_rgba(7,91,96,0.8)] transition hover:bg-[color:var(--primary-strong)]"

            >

              Cadastre-se

            </Link>

            <Link

              href="/login"

              className="rounded-2xl border border-[color:var(--border)] bg-white/70 px-6 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-white"

            >

              Entrar

            </Link>

          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">

            {[

              {

                title: "Catlogos globais",

                text: "Tipos e validades padro para todos os clientes.",

              },

              {

                title: "Alertas acionveis",

                text: "Sininho com vencidos e itens por janela de 30/60/90 dias.",

              },

              {

                title: "Multiempresa",

                text: "Cada cliente com sua viso isolada e segura.",

              },

              {

                title: "Contrato vs uso",

                text: "Controle de limite de funcionrios e consumo contratado.",

              },

            ].map((item) => (

              <div

                key={item.title}

                className="rounded-2xl border border-white/70 bg-white/70 p-4 text-sm text-[color:var(--muted)] shadow-[0_12px_30px_-24px_rgba(16,52,68,0.7)]"

              >

                <p className="text-base font-semibold text-[color:var(--ink)]">

                  {item.title}

                </p>

                <p className="mt-2">{item.text}</p>

              </div>

            ))}

          </div>

        </section>

        <section className="w-full max-w-md">

          <div className="glass-panel rounded-3xl p-8">

            <h2 className="text-2xl font-semibold text-[color:var(--ink)]">

              Comece em minutos

            </h2>

            <p className="mt-2 text-sm text-[color:var(--muted)]">

              Crie sua empresa, cadastre funcionrios e acompanhe as datas em um nico lugar.

            </p>

            <div className="mt-6 space-y-3 text-sm text-[color:var(--muted)]">

              <div className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3">

                Catlogo global de ASO e treinamentos

              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3">

                Upload de laudos (PDF) com vencimento automtico

              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3">

                Painel com alertas priorizados e histrico

              </div>

            </div>

            <Link

              href="/register"

              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-20px_rgba(7,91,96,0.8)] transition hover:bg-[color:var(--primary-strong)]"

            >

              Criar conta

            </Link>

          </div>

        </section>

      </div>

    </div>

  );

}



