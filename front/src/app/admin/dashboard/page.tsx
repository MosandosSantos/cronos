
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/format';
import { adminNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

type TenantSummary = {
  id: string;
  name: string;
  status: string;
  employeeLimit: number | null;
  employeesCount: number;
  usagePercent: number;
  contractStatus: string | null;
  createdAt: string;
};

type CountResponse = { data: unknown[] };

type ApiContract = {
  id: string;
  client?: { fullName: string } | null;
  contractName?: string | null;
  contractValue: number;
  status: string;
  startDate: string;
  endDate: string | null;
};

type ContractSummary = {
  id: string;
  client?: { fullName: string } | null;
  items: { type: 'PLAN' | 'ADDON'; label: string }[];
  mrrAmount: number;
  totalAmount: number;
  status: string;
  startDate: string;
  endDate: string | null;
  renewalDate: string;
};

type SummaryCards = {
  tenants: number;
  contacts: number;
  proposals: number;
  contracts: number;
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

type CourseOrderRow = {
  id: string;
  course: string;
  client: string;
  orderDate: string;
  orderValue: number;
};

export default function AdminDashboardPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();

  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [summary, setSummary] = useState<SummaryCards>({
    tenants: 0,
    contacts: 0,
    proposals: 0,
    contracts: 0,
  });
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [mrr, setMrr] = useState(0);
  const [loading, setLoading] = useState(true);
  const [compliancePage, setCompliancePage] = useState(1);

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [tenantsRes, contactsRes, proposalsRes, contractsRes] = await Promise.all([
          apiFetch<CountResponse>('/tenants', { auth: true }),
          apiFetch<CountResponse>('/crm/contacts', { auth: true }),
          apiFetch<CountResponse>('/crm/proposals', { auth: true }),
          apiFetch<{ data: ApiContract[] }>('/contracts', { auth: true }),
        ]);

        const contractItems = (contractsRes.data as ApiContract[]).map((contract) => ({
          id: contract.id,
          client: contract.client,
          items: contract.contractName
            ? [{ type: 'PLAN' as const, label: contract.contractName }]
            : [],
          mrrAmount: Number(contract.contractValue || 0),
          totalAmount: Number(contract.contractValue || 0),
          status: contract.status,
          startDate: contract.startDate,
          endDate: contract.endDate,
          renewalDate: contract.endDate ?? contract.startDate,
        }));

        setTenants(tenantsRes.data as TenantSummary[]);
        setContracts(contractItems);
        setSummary({
          tenants: tenantsRes.data.length,
          contacts: contactsRes.data.length,
          proposals: proposalsRes.data.length,
          contracts: contractItems.length,
        });

        const activeValue = contractItems
          .filter((contract) => contract.status === 'ACTIVE')
          .reduce((acc, contract) => acc + Number(contract.mrrAmount || 0), 0);
        setMrr(activeValue);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const latestTenants = useMemo(() => tenants.slice(0, 6), [tenants]);
  const contractStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inDays = (days: number) => new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const dayDiff = (date: Date) =>
      Math.ceil((date.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    const activeContracts = contracts.filter((contract) => contract.status === 'ACTIVE');
    const withEndDate = contracts
      .map((contract) => ({
        ...contract,
        end: contract.endDate ? new Date(contract.endDate) : new Date(contract.renewalDate),
      }))
      .filter((contract) => contract.end);

    const expired = withEndDate.filter((contract) => (contract.end as Date) < today).length;
    const due15 = withEndDate.filter(
      (contract) => (contract.end as Date) >= today && (contract.end as Date) <= inDays(15)
    ).length;
    const due90 = withEndDate.filter(
      (contract) => (contract.end as Date) > inDays(15) && (contract.end as Date) <= inDays(90)
    ).length;

    const upcoming = withEndDate
      .filter((contract) => (contract.end as Date) >= today)
      .sort((a, b) => (a.end as Date).getTime() - (b.end as Date).getTime())
      .slice(0, 5)
      .map((contract) => ({
        id: contract.id,
        tenant: contract.client?.fullName ?? 'Cliente',
        planName: contract.items.find((item) => item.type === 'PLAN')?.label ?? 'Plano',
        endDate: contract.end as Date,
        daysLeft: dayDiff(contract.end as Date),
      }));

    const barData = [
      { label: 'Ativos', value: activeContracts.length, color: 'bg-[color:var(--primary)]' },
      { label: 'Vencidos', value: expired, color: 'bg-red-400' },
      { label: 'Vencem 15d', value: due15, color: 'bg-amber-400' },
      { label: 'Vencem 90d', value: due90, color: 'bg-emerald-400' },
    ];

    const maxBar = Math.max(1, ...barData.map((item) => item.value));

    return {
      activeCount: activeContracts.length,
      expired,
      due15,
      due90,
      upcoming,
      barData,
      maxBar,
    };
  }, [contracts]);

  const revenueSeries = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + index, 1);
      return {
        label: date.toLocaleDateString('pt-BR', { month: 'short' }),
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });

    const values = months.map((month) => {
      const monthStart = new Date(month.year, month.month, 1);
      const monthEnd = new Date(month.year, month.month + 1, 0, 23, 59, 59, 999);
      return contracts
        .filter((contract) => contract.status === 'ACTIVE')
        .filter((contract) => {
          const startDate = new Date(contract.startDate);
          const endDate = contract.endDate
            ? new Date(contract.endDate)
            : new Date(contract.renewalDate);
          return startDate <= monthEnd && (!endDate || endDate >= monthStart);
        })
        .reduce((acc, contract) => acc + Number(contract.mrrAmount || 0), 0);
    });

    return { months, values };
  }, [contracts]);

  const revenueChart = useMemo(() => {
    const width = 640;
    const height = 180;
    const padding = 18;
    const maxValue = Math.max(1, ...revenueSeries.values);
    const step =
      revenueSeries.values.length > 1
        ? (width - padding * 2) / (revenueSeries.values.length - 1)
        : 0;

    const points = revenueSeries.values.map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - (value / maxValue) * (height - padding * 2);
      return { x, y, value };
    });

    const path = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(' ');

    return { width, height, padding, points, path };
  }, [revenueSeries]);

  const mrrInsights = useMemo(() => {
    const now = new Date();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const previousMonthRevenue = contracts
      .filter((contract) => contract.status === 'ACTIVE')
      .filter((contract) => {
        const startDate = new Date(contract.startDate);
        const endDate = contract.endDate
          ? new Date(contract.endDate)
          : new Date(contract.renewalDate);
        return startDate <= previousMonthEnd && (!endDate || endDate >= previousMonthStart);
      })
      .reduce((acc, contract) => acc + Number(contract.mrrAmount || 0), 0);

    const averageRevenue =
      revenueSeries.values.reduce((acc, value) => acc + value, 0) /
      Math.max(1, revenueSeries.values.length);

    const growthPercent =
      previousMonthRevenue > 0
        ? ((mrr - previousMonthRevenue) / previousMonthRevenue) * 100
        : mrr > 0
          ? 100
          : 0;

    return {
      previousMonthRevenue,
      averageRevenue,
      growthPercent,
    };
  }, [contracts, mrr, revenueSeries.values]);

  const receivablesInsights = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthLastDay = monthEnd.getDate();
    const weekDay = (today.getDay() + 6) % 7;
    const weekEndRaw = new Date(today);
    weekEndRaw.setDate(today.getDate() + (6 - weekDay));
    const weekEnd = weekEndRaw > monthEnd ? monthEnd : weekEndRaw;

    const hashNumber = (input: string) =>
      input.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const invoices = contracts
      .filter((contract) => contract.status === 'ACTIVE')
      .map((contract) => {
        const amount = Number(contract.mrrAmount) || 0;
        const hash = hashNumber(contract.id);
        const dueDay = (hash % 27) + 1;
        const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, monthLastDay));
        const paidProbability = hashNumber(`${contract.id}-paid`) % 100;
        const paid = dueDate <= today ? paidProbability < 65 : paidProbability < 25;
        return { amount, dueDate, paid };
      });

    const totalMonth = invoices.reduce((acc, invoice) => acc + invoice.amount, 0);
    const paidMonth = invoices
      .filter((invoice) => invoice.paid)
      .reduce((acc, invoice) => acc + invoice.amount, 0);
    const toReceive = Math.max(0, totalMonth - paidMonth);
    const overdueMonth = invoices
      .filter((invoice) => !invoice.paid && invoice.dueDate < today)
      .reduce((acc, invoice) => acc + invoice.amount, 0);
    const weekForecast = invoices
      .filter((invoice) => !invoice.paid && invoice.dueDate >= today && invoice.dueDate <= weekEnd)
      .reduce((acc, invoice) => acc + invoice.amount, 0);
    const delinquencyPercent = totalMonth > 0 ? (overdueMonth / totalMonth) * 100 : 0;

    return {
      paidMonth,
      toReceive: Math.max(0, Math.min(toReceive, mrr)),
      overdueMonth,
      weekForecast,
      delinquencyPercent,
    };
  }, [contracts, mrr]);
  const funnelData = useMemo(() => {
    const rawStages = [
      { id: 'contacts', label: 'Contatos', value: summary.contacts, color: '#49b8cc' },
      { id: 'proposals', label: 'Propostas', value: summary.proposals, color: '#3aa5bc' },
      { id: 'contracts', label: 'Contratos', value: summary.contracts, color: '#99bdd0' },
      { id: 'active', label: 'Ativos', value: contractStats.activeCount, color: '#b9cfdd' },
    ];

    const stages = rawStages.map((stage, index) => {
      if (index === 0) {
        return stage;
      }
      const previousValue = rawStages[index - 1].value;
      return {
        ...stage,
        value: Math.min(stage.value, previousValue),
      };
    });

    const first = stages[0]?.value ?? 0;
    const last = stages[stages.length - 1]?.value ?? 0;
    const conversionRate = first > 0 ? (last / first) * 100 : 0;
    const neckValue = Math.max(
      0,
      Math.round(((stages[0]?.value ?? 0) + (stages[1]?.value ?? 0)) / 2)
    );

    return { stages, conversionRate, neckValue };
  }, [contractStats.activeCount, summary.contacts, summary.contracts, summary.proposals]);

  const funnelShapes = useMemo(() => {
    const svgWidth = 420;
    const segmentHeight = 56;
    const segmentGap = 0;
    const baseY = 10;
    const topWidth = 330;
    const minWidth = 124;
    const reference = Math.max(1, funnelData.stages[0]?.value ?? 1);
    const harmonicColors = ['#35AFC6', '#4BB8CE', '#B8D4E2', '#D3E4EC'];

    let previousWidth = topWidth;
    const widths = funnelData.stages.map((stage, index) => {
      const widthFromData = minWidth + (topWidth - minWidth) * (stage.value / reference);
      const width = index === 0 ? topWidth : Math.max(minWidth, Math.min(previousWidth - 42, widthFromData));
      previousWidth = width;
      return width;
    });

    const segments = funnelData.stages.map((stage, index) => {
      const topW = widths[index];
      const bottomW = index < widths.length - 1 ? widths[index + 1] : Math.max(86, topW * 0.64);
      const yTop = baseY + index * (segmentHeight + segmentGap);
      const yBottom = yTop + segmentHeight;
      return {
        ...stage,
        fill: harmonicColors[index] ?? stage.color,
        topW,
        bottomW,
        yTop,
        yBottom,
      };
    });

    const neckTop = segments[segments.length - 1]?.yBottom ?? baseY;
    const neckWidth = Math.max(60, (segments[segments.length - 1]?.bottomW ?? 80) * 0.72);
    const neckHeight = 24;
    const tipHeight = 20;
    const svgHeight = neckTop + neckHeight + tipHeight + 10;

    return {
      svgWidth,
      svgHeight,
      segments,
      neckTop,
      neckWidth,
      neckHeight,
      tipHeight,
    };
  }, [funnelData.stages]);

  const complianceRows = useMemo<ComplianceRow[]>(
    () => [
      {
        id: 'cmp-01',
        company: 'Alpha Engenharia',
        contractValidUntil: '2026-04-15',
        paid: true,
        courses: 100,
        aso: 92,
        reports: 88,
      },
      {
        id: 'cmp-02',
        company: 'Beta Logistica',
        contractValidUntil: '2026-03-10',
        paid: false,
        courses: 76,
        aso: 84,
        reports: 90,
      },
      {
        id: 'cmp-03',
        company: 'Gamma Transportes',
        contractValidUntil: '2026-05-02',
        paid: true,
        courses: 96,
        aso: 88,
        reports: 72,
      },
      {
        id: 'cmp-04',
        company: 'Delta Saude Ocupacional',
        contractValidUntil: '2026-02-28',
        paid: true,
        courses: 82,
        aso: 100,
        reports: 94,
      },
      {
        id: 'cmp-05',
        company: 'Epsilon Seguranca',
        contractValidUntil: '2026-06-18',
        paid: true,
        courses: 91,
        aso: 79,
        reports: 86,
      },
      {
        id: 'cmp-06',
        company: 'Fenix Construcoes',
        contractValidUntil: '2026-03-22',
        paid: false,
        courses: 68,
        aso: 74,
        reports: 80,
      },
      {
        id: 'cmp-07',
        company: 'Horizonte Industrial',
        contractValidUntil: '2026-05-30',
        paid: true,
        courses: 100,
        aso: 96,
        reports: 92,
      },
      {
        id: 'cmp-08',
        company: 'Iris Servicos',
        contractValidUntil: '2026-04-07',
        paid: true,
        courses: 87,
        aso: 90,
        reports: 85,
      },
      {
        id: 'cmp-09',
        company: 'Jupiter Facilities',
        contractValidUntil: '2026-02-20',
        paid: false,
        courses: 73,
        aso: 70,
        reports: 78,
      },
      {
        id: 'cmp-10',
        company: 'Kappa Energia',
        contractValidUntil: '2026-07-12',
        paid: true,
        courses: 95,
        aso: 90,
        reports: 93,
      },
      {
        id: 'cmp-11',
        company: 'Lumen Tecnologia',
        contractValidUntil: '2026-03-05',
        paid: true,
        courses: 80,
        aso: 88,
        reports: 86,
      },
      {
        id: 'cmp-12',
        company: 'Mercurio Agro',
        contractValidUntil: '2026-06-01',
        paid: false,
        courses: 62,
        aso: 71,
        reports: 77,
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

  const courseOrders = useMemo<CourseOrderRow[]>(() => {
    const courseCatalog = [
      'NR-35 Trabalho em Altura',
      'NR-10 Seguranca em Eletricidade',
      'Brigada de Incendio',
      'Primeiros Socorros',
      'CIPA - Formacao',
    ];
    return tenants
      .map((tenant, index) => ({
        id: `order-${tenant.id}`,
        course: courseCatalog[index % courseCatalog.length],
        client: tenant.name,
        orderDate: tenant.createdAt,
        orderValue: Math.max(1, tenant.employeesCount || 1) * 129.9,
      }))
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [tenants]);

  return (
    <AppShell
      navItems={adminNavItems}
      title='Dashboard comercial'
      subtitle='Backoffice'
      onLogout={handleLogout}
    >
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        <div className='rounded-3xl border border-[#c5e2e2] bg-[#E0F0F0]/90 p-5'>
          <div className='flex items-center justify-between'>
            <p className='text-xs uppercase tracking-[0.2em] text-[#0e3a36]'>Contratos ativos</p>
            <span className='rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#0e3a36]'>
              {summary.contracts} totais
            </span>
          </div>
          <p className='mt-3 text-3xl font-semibold text-[#0e3a36]'>
            {contractStats.activeCount}
          </p>
          <div className='mt-4 grid grid-cols-3 gap-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#0e3a36]'>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 py-2 text-center'>
              <span className='block text-[11px] normal-case text-red-500'>{contractStats.expired}</span>
              Vencidos
            </div>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 py-2 text-center'>
              <span className='block text-[11px] normal-case text-amber-500'>{contractStats.due15}</span>
              15 dias
            </div>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 py-2 text-center'>
              <span className='block text-[11px] normal-case text-emerald-600'>{contractStats.due90}</span>
              90 dias
            </div>
          </div>
        </div>
        <div className='rounded-3xl border border-[#c5e2e2] bg-[#E0F0F0]/90 p-5'>
          <p className='text-xs uppercase tracking-[0.2em] text-[#0e3a36]'>MRR (receita recorrente)</p>
          <p className='mt-3 text-3xl font-semibold text-[#0e3a36]'>{formatCurrency(mrr)}</p>
          <div className='mt-4 grid grid-cols-3 gap-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#0e3a36]'>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 py-2 text-center'>
              <span className='block text-[11px] normal-case text-[#0e3a36]'>
                {formatCurrency(mrrInsights.averageRevenue)}
              </span>
              Media
            </div>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 py-2 text-center'>
              <span className='block text-[11px] normal-case text-[#0e3a36]'>
                {formatCurrency(mrrInsights.previousMonthRevenue)}
              </span>
              Mes ant.
            </div>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 py-2 text-center'>
              <span className='block text-[11px] normal-case text-[#0e3a36]'>
                {`${mrrInsights.growthPercent >= 0 ? '+' : ''}${Number(mrrInsights.growthPercent ?? 0).toFixed(1)}%`}
              </span>
              Cresc.
            </div>
          </div>
        </div>
        <div className='rounded-3xl border border-[#c5e2e2] bg-[#E0F0F0]/90 p-5'>
          <p className='text-xs uppercase tracking-[0.2em] text-[#0e3a36]'>A receber (mes)</p>
          <p className='mt-3 text-3xl font-semibold text-[#0e3a36]'>
            {formatCurrency(receivablesInsights.toReceive)}
          </p>
          <div className='mt-4 grid grid-cols-3 gap-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#0e3a36]'>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 py-2 text-center'>
              <span className='block text-[11px] normal-case text-[#0e3a36]'>
                {formatCurrency(receivablesInsights.paidMonth)}
              </span>
              <span className='whitespace-nowrap'>Pago</span>
            </div>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 px-3 py-2 text-center'>
              <span className='block text-[11px] normal-case text-[#0e3a36]'>
                {formatCurrency(receivablesInsights.toReceive)}
              </span>
              <span className='whitespace-nowrap'>A receber</span>
            </div>
            <div className='rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-center'>
              <span className='block text-[11px] normal-case text-red-700'>
                {`${Number(receivablesInsights.delinquencyPercent ?? 0).toFixed(1)}%`}
              </span>
              <span className='whitespace-nowrap'>Inadimplencia</span>
            </div>
          </div>
        </div>
      </section>
      <section className='glass-panel rounded-3xl p-6'>
        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>
          Funil CRM (Contatos  Propostas  Contratos)
        </h2>
        <p className='text-sm text-[color:var(--muted)]'>Conversao comercial por etapa.</p>

        <div className='mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]'>
          <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 p-4'>
            <svg viewBox={`0 0 ${funnelShapes.svgWidth} ${funnelShapes.svgHeight}`} className='h-[320px] w-full'>
              {funnelShapes.segments.map((segment, index) => {
                const xTopLeft = (funnelShapes.svgWidth - segment.topW) / 2;
                const xTopRight = xTopLeft + segment.topW;
                const xBottomLeft = (funnelShapes.svgWidth - segment.bottomW) / 2;
                const xBottomRight = xBottomLeft + segment.bottomW;
                const textColor = index <= 1 ? '#FFFFFF' : '#214457';
                return (
                  <g key={segment.id}>
                    <polygon
                      points={`${xTopLeft},${segment.yTop} ${xTopRight},${segment.yTop} ${xBottomRight},${segment.yBottom} ${xBottomLeft},${segment.yBottom}`}
                      fill={segment.fill}
                      stroke='#FFFFFF'
                      strokeOpacity='0.65'
                      strokeWidth='1'
                    />
                    <text
                      x={funnelShapes.svgWidth / 2}
                      y={segment.yTop + 28}
                      textAnchor='middle'
                      fontSize='24'
                      fontWeight='700'
                      fill={textColor}
                    >
                      {segment.value}
                    </text>
                    <text
                      x={funnelShapes.svgWidth / 2}
                      y={segment.yTop + 46}
                      textAnchor='middle'
                      fontSize='12'
                      fontWeight='500'
                      fill={textColor}
                    >
                      {segment.label}
                    </text>
                  </g>
                );
              })}

              <rect
                x={(funnelShapes.svgWidth - funnelShapes.neckWidth) / 2}
                y={funnelShapes.neckTop}
                width={funnelShapes.neckWidth}
                height={funnelShapes.neckHeight}
                fill='#43abc2'
                rx='2'
              />
              <polygon
                points={`${funnelShapes.svgWidth / 2 - funnelShapes.neckWidth / 2},${funnelShapes.neckTop + funnelShapes.neckHeight} ${funnelShapes.svgWidth / 2 + funnelShapes.neckWidth / 2},${funnelShapes.neckTop + funnelShapes.neckHeight} ${funnelShapes.svgWidth / 2},${funnelShapes.neckTop + funnelShapes.neckHeight + funnelShapes.tipHeight}`}
                fill='#43abc2'
              />
              <text
                x={funnelShapes.svgWidth / 2}
                y={funnelShapes.neckTop + 20}
                textAnchor='middle'
                fontSize='22'
                fontWeight='700'
                fill='#FFFFFF'
              >
                {funnelData.neckValue}
              </text>
            </svg>
          </div>

          <div className='space-y-3'>
            {funnelData.stages.map((stage) => (
              <div key={`${stage.id}-detail`} className='rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3'>
                <div className='flex items-center justify-between gap-3'>
                  <p className='text-sm font-semibold text-[color:var(--ink)]'>{stage.label}</p>
                  <p className='text-base font-semibold text-[color:var(--ink)]'>{stage.value}</p>
                </div>
              </div>
            ))}

            <div className='inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-white/85 px-4 py-2'>
              <span className='text-sm font-semibold text-[color:var(--ink)]'>
                {Number(funnelData.conversionRate ?? 0).toFixed(0)}%
              </span>
              <span className='text-sm text-[color:var(--muted)]'>Taxa de conversao total</span>
            </div>
          </div>
        </div>
      </section>
      <section className='glass-panel rounded-3xl p-6'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Compliance</h2>
            <p className='text-sm text-[color:var(--muted)]'>Monitoramento de compliance por empresa.</p>
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
                    <td className='py-4 pr-4 text-[color:var(--muted)]'>
                      {formatDate(row.contractValidUntil)}
                    </td>
                    <td className='py-4 pr-4'>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          row.paid
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
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
            Mostrando {complianceSlice.length} de {complianceRows.length} empresas
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
      <section className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
        <div className='glass-panel rounded-3xl p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Carrinho</h2>
              <p className='text-sm text-[color:var(--muted)]'>Relacao de pedidos de curso por cliente.</p>
            </div>
            <span className='rounded-full bg-[color:var(--bg-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]'>
              {courseOrders.length} pedido(s)
            </span>
          </div>
          <div className='mt-6 overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-white'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-emerald-50 text-left text-[11px] uppercase tracking-[0.13em] text-emerald-800'>
                  <th className='px-4 py-3'>Curso</th>
                  <th className='px-4 py-3'>Cliente</th>
                  <th className='px-4 py-3'>Data</th>
                  <th className='px-4 py-3 text-right'>Valor</th>
                </tr>
              </thead>
              <tbody>
                {courseOrders.length ? (
                  courseOrders.map((order) => (
                    <tr key={order.id} className='border-t border-[color:var(--border)]'>
                      <td className='px-4 py-3 font-semibold text-[color:var(--ink)]'>{order.course}</td>
                      <td className='px-4 py-3 text-[color:var(--muted)]'>{order.client}</td>
                      <td className='px-4 py-3 text-[color:var(--muted)]'>{formatDate(order.orderDate)}</td>
                      <td className='px-4 py-3 text-right font-semibold text-[color:var(--ink)]'>
                        {formatCurrency(order.orderValue)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className='px-4 py-6 text-center text-sm text-[color:var(--muted)]'>
                      Nenhum pedido de curso encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className='glass-panel rounded-3xl p-6'>
          <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Faturamento projetado</h2>
          <p className='text-sm text-[color:var(--muted)]'>Proximos 12 meses (contratos ativos).</p>
          <div className='mt-6 rounded-2xl border border-[color:var(--border)] bg-white/80 p-4'>
            <svg viewBox={`0 0 ${revenueChart.width} ${revenueChart.height}`} className='h-44 w-full'>
              <defs>
                <linearGradient id='revenueGradient' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='rgba(11, 111, 116, 0.35)' />
                  <stop offset='100%' stopColor='rgba(11, 111, 116, 0)' />
                </linearGradient>
              </defs>
              <rect
                x='0'
                y='0'
                width={revenueChart.width}
                height={revenueChart.height}
                rx='18'
                fill='transparent'
              />
              <path
                d={`${revenueChart.path} L ${revenueChart.width - revenueChart.padding} ${
                  revenueChart.height - revenueChart.padding
                } L ${revenueChart.padding} ${revenueChart.height - revenueChart.padding} Z`}
                fill='url(#revenueGradient)'
              />
              <path
                d={revenueChart.path}
                fill='none'
                stroke='var(--primary)'
                strokeWidth='3'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              {revenueChart.points.map((point) => (
                <circle
                  key={`${point.x}-${point.y}`}
                  cx={point.x}
                  cy={point.y}
                  r='4'
                  fill='white'
                  stroke='var(--primary)'
                  strokeWidth='2'
                />
              ))}
            </svg>
            <div className='mt-4 grid grid-cols-12 gap-1 pb-3 text-[10px] uppercase text-[color:var(--muted)] sm:gap-2 sm:pb-0 sm:tracking-[0.2em]'>
              {revenueSeries.months.map((month, index) => (
                <span key={`${month.year}-${month.month}-${index}`} className='flex h-8 items-start justify-center sm:h-auto'>
                  <span className='inline-block origin-top whitespace-nowrap -rotate-45 tracking-[0.08em] sm:rotate-0 sm:tracking-[0.2em]'>
                    {month.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className='mt-4 flex items-center justify-between text-xs text-[color:var(--muted)]'>
            <span>MRR estimado hoje</span>
            <span className='text-sm font-semibold text-[color:var(--ink)]'>{formatCurrency(mrr)}</span>
          </div>
        </div>
      </section>

      <section className='grid gap-6 lg:grid-cols-[1.3fr_1fr]'>
        <div className='glass-panel rounded-3xl p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Clientes recentes</h2>
              <p className='text-sm text-[color:var(--muted)]'>Ultimos cadastros e uso do contrato.</p>
            </div>
            <span className='rounded-full bg-[color:var(--bg-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]'>
              {loading ? 'Carregando...' : `${tenants.length} clientes`}
            </span>
          </div>
          <div className='mt-6 space-y-3'>
            {latestTenants.map((tenant) => (
              <div
                key={tenant.id}
                className='flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm'
              >
                <div className='flex items-center justify-between font-semibold text-[color:var(--ink)]'>
                  <span>{tenant.name}</span>
                  <span className='text-xs text-[color:var(--primary)]'>{tenant.status}</span>
                </div>
                <div className='flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]'>
                  <span>Contrato: {tenant.contractStatus ?? 'sem contrato'}</span>
                  <span>Uso: {tenant.usagePercent}%</span>
                  <span>Funcionarios: {tenant.employeesCount}</span>
                  <span>Criado em {formatDate(tenant.createdAt)}</span>
                </div>
              </div>
            ))}
            {!latestTenants.length && !loading && (
              <p className='text-sm text-[color:var(--muted)]'>Nenhum cliente cadastrado.</p>
            )}
          </div>
        </div>

        <div className='glass-panel rounded-3xl p-6'>
          <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Resumo financeiro</h2>
          <p className='text-sm text-[color:var(--muted)]'>Totais estimados com base em contratos ativos.</p>
          <div className='mt-6 space-y-4'>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 p-4'>
              <p className='text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]'>MRR estimado</p>
              <p className='mt-2 text-2xl font-semibold text-[color:var(--ink)]'>
                {formatCurrency(mrr)}
              </p>
            </div>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 text-sm text-[color:var(--muted)]'>
              Ajuste valores na tela de contratos para atualizar o MRR real.
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

