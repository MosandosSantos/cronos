'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import AlertsPanel from '@/components/alerts-panel';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/format';
import { appNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

type Employee = { id: string };

type Contract = {
  employeeLimit?: number | null;
  contractValue?: number;
  startDate?: string;
  endDate?: string | null;
  status?: string;
} | null;

type AlertSummary = { expired: number; due30: number; due60: number; due90: number };

type AlertItem = {
  id: string;
  category: string;
  label: string;
  employeeName?: string | null;
  dueDate: string;
  status: string;
  daysToDue: number;
};

type ComplianceRow = {
  id: string;
  company: string;
  contractValidUntil: string;
  paid: boolean;
  courses: number;
  aso: number;
  reports: number;
};

export default function AppDashboardPage() {
  useAuthGuard('TENANT_ADMIN');
  const router = useRouter();

  const [employeesCount, setEmployeesCount] = useState(0);
  const [contract, setContract] = useState<Contract>(null);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [compliancePage, setCompliancePage] = useState(1);

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  useEffect(() => {
    const load = async () => {
      const [employeesRes, contractRes, summaryRes, alertsRes] = await Promise.all([
        apiFetch<{ data: Employee[] }>('/employees', { auth: true }),
        apiFetch<{ data: Contract }>('/contracts/current', { auth: true }),
        apiFetch<{ data: AlertSummary }>('/alerts/summary', { auth: true }),
        apiFetch<{ data: AlertItem[] }>('/alerts', { auth: true }),
      ]);
      setEmployeesCount(employeesRes.data.length);
      setContract(contractRes.data);
      setAlertSummary(summaryRes.data);
      setAlerts(alertsRes.data.slice(0, 6));
    };

    load();
  }, []);

  const usagePercent = useMemo(() => {
    if (!contract?.employeeLimit) return 0;
    return Math.round((employeesCount / contract.employeeLimit) * 100);
  }, [contract?.employeeLimit, employeesCount]);

  const complianceRows = useMemo<ComplianceRow[]>(
    () => [
      {
        id: 'comp-01',
        company: 'Operacoes',
        contractValidUntil: '2026-06-30',
        paid: true,
        courses: 92,
        aso: 88,
        reports: 90,
      },
      {
        id: 'comp-02',
        company: 'Logistica',
        contractValidUntil: '2026-05-18',
        paid: true,
        courses: 100,
        aso: 95,
        reports: 96,
      },
      {
        id: 'comp-03',
        company: 'Financeiro',
        contractValidUntil: '2026-03-12',
        paid: false,
        courses: 78,
        aso: 84,
        reports: 81,
      },
      {
        id: 'comp-04',
        company: 'Juridico',
        contractValidUntil: '2026-04-21',
        paid: true,
        courses: 85,
        aso: 90,
        reports: 88,
      },
      {
        id: 'comp-05',
        company: 'RH',
        contractValidUntil: '2026-07-02',
        paid: true,
        courses: 94,
        aso: 92,
        reports: 91,
      },
      {
        id: 'comp-06',
        company: 'Manutencao',
        contractValidUntil: '2026-02-28',
        paid: false,
        courses: 68,
        aso: 70,
        reports: 74,
      },
      {
        id: 'comp-07',
        company: 'Producao',
        contractValidUntil: '2026-06-05',
        paid: true,
        courses: 88,
        aso: 82,
        reports: 86,
      },
      {
        id: 'comp-08',
        company: 'Qualidade',
        contractValidUntil: '2026-05-29',
        paid: true,
        courses: 97,
        aso: 94,
        reports: 93,
      },
      {
        id: 'comp-09',
        company: 'Comercial',
        contractValidUntil: '2026-03-25',
        paid: false,
        courses: 72,
        aso: 79,
        reports: 75,
      },
      {
        id: 'comp-10',
        company: 'Compras',
        contractValidUntil: '2026-04-08',
        paid: true,
        courses: 90,
        aso: 87,
        reports: 89,
      },
      {
        id: 'comp-11',
        company: 'Engenharia',
        contractValidUntil: '2026-08-01',
        paid: true,
        courses: 100,
        aso: 96,
        reports: 95,
      },
      {
        id: 'comp-12',
        company: 'Facilities',
        contractValidUntil: '2026-06-12',
        paid: false,
        courses: 66,
        aso: 72,
        reports: 70,
      },
    ],
    []
  );

  const compliancePageSize = 10;
  const complianceTotalPages = Math.max(1, Math.ceil(complianceRows.length / compliancePageSize));

  useEffect(() => {
    setCompliancePage((current) => Math.min(current, complianceTotalPages));
  }, [complianceTotalPages]);

  const complianceSlice = useMemo(() => {
    const start = (compliancePage - 1) * compliancePageSize;
    return complianceRows.slice(start, start + compliancePageSize);
  }, [compliancePage, complianceRows]);

  const complianceAverage = (row: ComplianceRow) => {
    return Math.round((row.courses + row.aso + row.reports) / 3);
  };

  return (
    <AppShell
      navItems={appNavItems}
      title='Dashboard'
      subtitle='Controle de vencimentos'
      onLogout={handleLogout}
      alertSummary={alertSummary ?? undefined}
      alertContent={<AlertsPanel items={alerts} />}
    >
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {
          [
            { label: 'Funcionarios', value: employeesCount },
            { label: 'Limite contratado', value: contract?.employeeLimit ?? '?' },
            { label: 'Uso do contrato', value: `${usagePercent}%` },
            { label: 'Vencidos', value: alertSummary?.expired ?? 0 },
          ].map((card) => (
            <div key={card.label} className='rounded-3xl border border-emerald-300 bg-emerald-50 p-5'>
              <p className='text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]'>{card.label}</p>
              <p className='mt-3 text-3xl font-semibold text-[color:var(--ink)]'>{card.value}</p>
              <p className='mt-2 text-xs font-semibold text-[color:var(--primary)]'>Atualizado agora</p>
            </div>
          ))
        }
      </section>
      <section className='glass-panel rounded-3xl p-6'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Compliance</h2>
            <p className='text-sm text-[color:var(--muted)]'>Indicadores de compliance por empresa.</p>
          </div>
          <span className='rounded-full bg-[color:var(--bg-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]'>
            Pagina {compliancePage} de {complianceTotalPages}
          </span>
        </div>

        <div className='mt-6 overflow-x-auto'>
          <table className='w-full min-w-[860px] border-separate border-spacing-0 text-sm'>
            <thead>
              <tr className='text-left text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]'>
                <th className='border-b border-[color:var(--border)] pb-3'>Empresa</th>
                <th className='border-b border-[color:var(--border)] pb-3'>Validade do contrato</th>
                <th className='border-b border-[color:var(--border)] pb-3'>Pagamento</th>
                <th className='border-b border-[color:var(--border)] pb-3'>Cursos</th>
                <th className='border-b border-[color:var(--border)] pb-3'>ASO</th>
                <th className='border-b border-[color:var(--border)] pb-3'>Laudos</th>
                <th className='border-b border-[color:var(--border)] pb-3 text-right'>Total compliance</th>
              </tr>
            </thead>
            <tbody>
              {complianceSlice.map((row) => {
                const total = complianceAverage(row);
                return (
                  <tr key={row.id} className='border-b border-[color:var(--border)]'>
                    <td className='py-4 pr-4'>
                      <p className='font-semibold text-[color:var(--ink)]'>{row.company}</p>
                    </td>
                    <td className='py-4 pr-4 text-[color:var(--muted)]'>{formatDate(row.contractValidUntil)}</td>
                    <td className='py-4 pr-4'>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          row.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {row.paid ? 'Sim' : 'Nao'}
                      </span>
                    </td>
                    <td className='py-4 pr-4 text-[color:var(--muted)]'>{row.courses}%</td>
                    <td className='py-4 pr-4 text-[color:var(--muted)]'>{row.aso}%</td>
                    <td className='py-4 pr-4 text-[color:var(--muted)]'>{row.reports}%</td>
                    <td className='py-4 text-right'>
                      <span className='rounded-full bg-[color:var(--bg-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]'>
                        {total}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className='mt-6 flex flex-wrap items-center justify-between gap-3 text-sm'>
          <span className='text-[color:var(--muted)]'>
            Mostrando {complianceSlice.length} de {complianceRows.length} linhas
          </span>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={() => setCompliancePage((prev) => Math.max(1, prev - 1))}
              disabled={compliancePage === 1}
              className='rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60'
            >
              Anterior
            </button>
            <button
              type='button'
              onClick={() => setCompliancePage((prev) => Math.min(complianceTotalPages, prev + 1))}
              disabled={compliancePage === complianceTotalPages}
              className='rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60'
            >
              Proxima
            </button>
          </div>
        </div>
      </section>

      <section className='grid gap-6 lg:grid-cols-[1.2fr_1fr]'>
        <div className='glass-panel rounded-3xl p-6'>
          <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Alertas prioritarios</h2>
          <p className='text-sm text-[color:var(--muted)]'>Itens com vencimento mais proximo.</p>
          <div className='mt-6'>
            <AlertsPanel items={alerts} />
          </div>
        </div>
        <div className='glass-panel rounded-3xl p-6'>
          <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Resumo do contrato</h2>
          <p className='text-sm text-[color:var(--muted)]'>Uso e limite acordado com o SaaS.</p>
          <div className='mt-6 space-y-4'>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 text-sm'>
              <p className='font-semibold text-[color:var(--ink)]'>Limite contratado</p>
              <p className='mt-2 text-2xl font-semibold text-[color:var(--primary)]'>
                {contract?.employeeLimit ?? 'Sem contrato ativo'}
              </p>
              <p className='mt-2 text-xs text-[color:var(--muted)]'>Uso atual: {usagePercent}%</p>
            </div>
            {contract?.employeeLimit && employeesCount > contract.employeeLimit && (
              <div className='rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700'>
                Voce excedeu o limite contratado. Considere revisar o contrato.
              </div>
            )}
            {contract?.contractValue != null && (
              <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 text-sm'>
                <p className='font-semibold text-[color:var(--ink)]'>Valor do contrato</p>
                <p className='mt-2 text-lg font-semibold text-[color:var(--ink)]'>
                  {formatCurrency(contract.contractValue)}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}











