import Link from "next/link";

export default function LogoutPage() {
  return (
    <div className="min-h-screen bg-atmosphere px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 text-center">
        <div className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--primary)]">
          Cronos
        </div>
        <h1 className="font-[var(--font-display)] text-3xl text-[color:var(--ink)] sm:text-4xl">
          Obrigado por usar o sistema
        </h1>
        <p className="max-w-xl text-base text-[color:var(--muted)]">
          Sua sessão foi encerrada com sucesso. Quando quiser, é só voltar ao painel.
        </p>
        <Link
          href="/login"
          className="rounded-2xl bg-[color:var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-20px_rgba(7,91,96,0.8)] transition hover:bg-[color:var(--primary-strong)]"
        >
          Voltar ao sistema
        </Link>
      </div>
    </div>
  );
}
