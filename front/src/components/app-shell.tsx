"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getRole, getUserEmail } from "@/lib/auth";

type NavItem = { label: string; href: string };

type AlertSummary = {
  expired: number;
  due30: number;
  due60: number;
  due90: number;
};

type AppShellProps = {
  navItems: NavItem[];
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onLogout: () => void;
  topRight?: React.ReactNode;
  alertSummary?: AlertSummary;
  alertContent?: React.ReactNode;
};

export default function AppShell({
  navItems,
  title,
  subtitle,
  children,
  onLogout,
  topRight,
  alertSummary,
  alertContent,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    setUserEmail(getUserEmail());
    setUserRole(getRole());
  }, []);

  const roleLabel = useMemo(() => {
    if (userRole === "SAAS_ADMIN") return "Admin SaaS";
    if (userRole === "TENANT_ADMIN") return "Admin Empresa";
    return userRole ? userRole : "Usuario";
  }, [userRole]);

  const totalAlerts = alertSummary
    ? alertSummary.expired + alertSummary.due30 + alertSummary.due60 + alertSummary.due90
    : 0;

  const getNavIcon = (item: NavItem) => {
    const key = item.href;
    const iconClass = "h-4 w-4";
    switch (key) {
      case "/admin/dashboard":
      case "/app/dashboard":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <path d="M3 13h7V3H3v10Zm11 8h7V9h-7v12ZM3 21h7v-6H3v6Zm11-10h7V3h-7v8Z" />
          </svg>
        );
      case "/admin/cart":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L22 7H7" />
            <circle cx="10" cy="20" r="1.5" />
            <circle cx="18" cy="20" r="1.5" />
          </svg>
        );
      case "/admin/agenda":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        );
      case "/admin/crm":
      case "/admin/crm/proposals":
      case "/admin/crm/contacts":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <path d="M7 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 4a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            <path d="M2 22a6 6 0 0 1 10 0M12 22a6 6 0 0 1 10 0" />
          </svg>
        );
      case "/admin/clients":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
            <path d="M4 22a8 8 0 0 1 16 0" />
          </svg>
        );
      case "/admin/contracts":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <path d="M7 3h8l4 4v14H7V3Z" />
            <path d="M15 3v4h4" />
            <path d="M9 13h6M9 17h6M9 9h3" />
          </svg>
        );
      case "/admin/catalogs/aso":
      case "/app/aso-records":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M2 12h20" />
            <circle cx="12" cy="12" r="7" />
          </svg>
        );
      case "/admin/catalogs/trainings":
      case "/admin/catalogs/courses":
      case "/app/training-records":
      case "/app/course-records":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <path d="M3 4h18v12H3V4Z" />
            <path d="M7 20h10" />
            <path d="M12 16v4" />
          </svg>
        );
      case "/admin/catalogs/reports":
      case "/app/documents":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <path d="M6 3h9l5 5v13H6V3Z" />
            <path d="M15 3v5h5" />
            <path d="M9 12h6M9 16h6" />
          </svg>
        );
      case "/app/employees":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <path d="M12 7a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
            <path d="M4 22a8 8 0 0 1 16 0" />
          </svg>
        );
      case "/app/alerts":
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <path d="M12 3v10" />
            <path d="M12 17h.01" />
            <path d="M5 20h14l-7-14-7 14Z" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" className={iconClass} stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v10M7 12h10" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-atmosphere">
      <div className="flex">
        <aside
          className={[
            "fixed left-0 top-0 z-40 h-full bg-[color:var(--primary)] text-white shadow-[0_20px_40px_-30px_rgba(6,25,31,0.7)] transition-all duration-300",
            isCollapsed ? "w-20" : "w-72",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
            "lg:translate-x-0",
          ].join(" ")}
        >
          <div className="flex h-full flex-col p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-lg font-semibold">
                  CR
                </div>
                {!isCollapsed && (
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                      Cronos
                    </p>
                    <p className="text-lg font-semibold">Gestao</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed((prev) => !prev)}
                className="hidden rounded-full border border-white/30 p-2 text-white/80 transition hover:bg-white/10 lg:inline-flex"
                aria-label="Alternar menu"
              >
                <span className="text-lg">=</span>
              </button>
            </div>

            <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-semibold transition",
                    pathname === item.href
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-xs font-bold">
                    {getNavIcon(item)}
                  </span>
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </nav>

          </div>
        </aside>

        <div className={`flex-1 ${isCollapsed ? "lg:ml-20" : "lg:ml-72"}`}>
          <header className="flex items-center justify-between gap-4 px-6 py-6 lg:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                className="rounded-2xl bg-white/70 px-3 py-2 text-sm font-semibold text-[color:var(--ink)] shadow-sm lg:hidden"
              >
                Menu
              </button>
              <div>
                {subtitle && (
                  <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    {subtitle}
                  </p>
                )}
                <h1 className="font-[var(--font-display)] text-3xl text-[color:var(--ink)]">
                  {title}
                </h1>
              </div>
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-2 text-left text-xs font-semibold text-[color:var(--ink)]"
                >
                  <span className="uppercase tracking-[0.18em] text-[color:var(--muted)]">
                    Perfil
                  </span>
                  <div className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
                    {userEmail || "Usuario"}
                  </div>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full z-20 mt-3 w-64 rounded-2xl border border-[color:var(--border)] bg-white p-4 text-sm shadow-lg">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                      Logado
                    </p>
                    <p className="mt-2 font-semibold text-[color:var(--ink)]">
                      {userEmail || "Usuario"}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">{roleLabel}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onLogout();
                          router.replace("/logout");
                        }}
                        className="rounded-2xl border border-[color:var(--border)] px-3 py-2 text-xs font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--bg-strong)]"
                      >
                        Sair
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {alertSummary && (
                <button
                  type="button"
                  onClick={() => setAlertsOpen((prev) => !prev)}
                  className="relative rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
                >
                  Alertas
                  {totalAlerts > 0 && (
                    <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {totalAlerts}
                    </span>
                  )}
                </button>
              )}
              {topRight}
            </div>
          </header>

          <main className="space-y-8 px-6 pb-10 lg:px-10">{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Fechar menu"
        />
      )}

      {alertSummary && alertsOpen && (
        <div className="fixed right-6 top-24 z-50 w-full max-w-md">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[color:var(--ink)]">
                Alertas prioritarios
              </h2>
              <button
                type="button"
                onClick={() => setAlertsOpen(false)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]"
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold text-[color:var(--muted)]">
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
                Vencidos: {alertSummary.expired}
              </span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                0-30 dias: {alertSummary.due30}
              </span>
              <span className="rounded-full bg-yellow-50 px-3 py-1 text-yellow-700">
                31-60 dias: {alertSummary.due60}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                61-90 dias: {alertSummary.due90}
              </span>
            </div>
            <div className="mt-4">{alertContent}</div>
          </div>
        </div>
      )}
    </div>
  );
}
