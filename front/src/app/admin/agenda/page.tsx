'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { adminNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

type TaskStatus = 'OPEN' | 'DONE';
type ViewMode = 'TABLE' | 'CALENDAR';

type AgendaItem = {
  id: string;
  title: string;
  dateTime: string;
  status: TaskStatus;
  source: string;
  calendar: string;
  lead?: {
    id: string;
    companyName: string;
    contactName?: string | null;
  } | null;
};

const sourceLabel: Record<string, string> = {
  LEAD_TASK: 'CRM',
  SAAS_CONTRACT: 'Contrato',
  EMPLOYEE_TRAINING: 'Treinamento',
  EMPLOYEE_ASO: 'ASO',
  EMPLOYEE_EXAM: 'Exame',
  TENANT_DOCUMENT: 'Laudo',
};

const toInputDate = (date: Date) => date.toISOString().slice(0, 10);
const pad2 = (value: number) => String(value).padStart(2, '0');
const toYmd = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
};

export default function AgendaPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();

  const today = new Date();
  const inSevenDays = new Date();
  inSevenDays.setDate(today.getDate() + 7);

  const [from, setFrom] = useState(toInputDate(today));
  const [to, setTo] = useState(toInputDate(inSevenDays));
  const [status, setStatus] = useState<'ALL' | TaskStatus>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (from) params.set('from', `${from}T00:00:00`);
    if (to) params.set('to', `${to}T23:59:59`);
    if (status !== 'ALL') params.set('status', status);

    try {
      const response = await apiFetch<{ data: AgendaItem[] }>(`/agenda?${params.toString()}`, {
        auth: true,
      });
      setItems(response.data);
    } catch (loadError) {
      setItems([]);
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar agenda.');
    } finally {
      setLoading(false);
    }
  }, [from, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const anchorDate = useMemo(() => (from ? new Date(`${from}T00:00:00`) : new Date()), [from]);
  const isCalendarView = viewMode === 'CALENDAR';

  const applyRangeByMode = useCallback((base: Date) => {
    const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
    const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    setFrom(toInputDate(monthStart));
    setTo(toInputDate(monthEnd));
  }, [viewMode]);

  const goToToday = useCallback(() => {
    applyRangeByMode(new Date());
  }, [applyRangeByMode]);

  const movePeriod = useCallback((direction: -1 | 1) => {
    const base = new Date(anchorDate);
    base.setMonth(base.getMonth() + direction);
    applyRangeByMode(base);
  }, [anchorDate, applyRangeByMode, viewMode]);

  useEffect(() => {
    if (!isCalendarView) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        movePeriod(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        movePeriod(1);
      } else if (event.key.toLowerCase() === 't') {
        event.preventDefault();
        goToToday();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToToday, isCalendarView, movePeriod]);

  const monthDays = (() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const eventCountByDay = new Map<number, number>();
    items.forEach((item) => {
      const d = new Date(item.dateTime);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        eventCountByDay.set(day, (eventCountByDay.get(day) ?? 0) + 1);
      }
    });

    const cells: Array<{ day: number | null; count: number }> = [];
    for (let i = 0; i < firstWeekday; i += 1) cells.push({ day: null, count: 0 });
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, count: eventCountByDay.get(day) ?? 0 });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null, count: 0 });
    return cells;
  })();

  return (
    <AppShell
      navItems={adminNavItems}
      title='Agenda'
      subtitle='Google Calendar (padrão): memória única dos eventos do sistema'
      onLogout={handleLogout}
    >
      {error && (
        <p className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</p>
      )}

      <section className='glass-panel rounded-3xl p-6'>
        <div className='grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]'>
          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            De
            <input
              type='date'
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            />
          </label>
          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            Até
            <input
              type='date'
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            />
          </label>
          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as 'ALL' | TaskStatus)}
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            >
              <option value='ALL'>Todos</option>
              <option value='OPEN'>Aberta</option>
              <option value='DONE'>Concluída</option>
            </select>
          </label>
          <div className='text-sm font-semibold text-[color:var(--ink)]'>
            Visualização
            <div className='mt-2 inline-flex rounded-2xl border border-[color:var(--border)] bg-white p-1 text-xs font-semibold'>
              <button
                type='button'
                onClick={() => setViewMode('TABLE')}
                className={`rounded-xl px-4 py-2 transition ${
                  viewMode === 'TABLE'
                    ? 'bg-[color:var(--primary)] text-white'
                    : 'text-[color:var(--muted)] hover:text-[color:var(--ink)]'
                }`}
              >
                Tabela
              </button>
              <button
                type='button'
                onClick={() => {
                  setViewMode('CALENDAR');
                  applyRangeByMode(anchorDate);
                }}
                className={`rounded-xl px-4 py-2 transition ${
                  viewMode === 'CALENDAR'
                    ? 'bg-[color:var(--primary)] text-white'
                    : 'text-[color:var(--muted)] hover:text-[color:var(--ink)]'
                }`}
              >
                Calendário
              </button>
            </div>
          </div>
          <button
            type='button'
            onClick={() => void load()}
            className='mt-7 rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white'
          >
            Atualizar
          </button>
        </div>
        {isCalendarView && (
          <div className='mt-4 flex flex-wrap items-center gap-2'>
            <button
              type='button'
              onClick={() => movePeriod(-1)}
              className='rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--ink)]'
            >
              {'<'}
            </button>
            <button
              type='button'
              onClick={goToToday}
              className='rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--ink)]'
            >
              Hoje
            </button>
            <button
              type='button'
              onClick={() => movePeriod(1)}
              className='rounded-xl border border-[color:var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--ink)]'
            >
              {'>'}
            </button>
          </div>
        )}
      </section>

      {viewMode === 'TABLE' && (
        <section className='glass-panel rounded-3xl p-6'>
        <div className='overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-white'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='bg-emerald-50 text-left text-[11px] uppercase tracking-[0.13em] text-emerald-800'>
                <th className='px-4 py-3'>Título</th>
                <th className='px-4 py-3'>Data</th>
                <th className='px-4 py-3'>Agenda</th>
                <th className='px-4 py-3'>Origem</th>
                <th className='px-4 py-3'>Lead</th>
                <th className='px-4 py-3'>Status</th>
                <th className='px-4 py-3 text-right'>Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className='px-4 py-6 text-center text-[color:var(--muted)]'>
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((item) => (
                  <tr key={item.id} className='border-t border-[color:var(--border)]'>
                    <td className='px-4 py-3 font-semibold text-[color:var(--ink)]'>{item.title}</td>
                    <td className='px-4 py-3 text-[color:var(--muted)]'>{formatDate(item.dateTime)}</td>
                    <td className='px-4 py-3 text-[color:var(--muted)]'>{item.calendar}</td>
                    <td className='px-4 py-3 text-[color:var(--muted)]'>{sourceLabel[item.source] ?? item.source}</td>
                    <td className='px-4 py-3 text-[color:var(--muted)]'>{item.lead?.companyName || '-'}</td>
                    <td className='px-4 py-3'>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === 'DONE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status === 'DONE' ? 'Concluída' : 'Aberta'}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-right'>
                      {item.lead?.id ? (
                        <Link
                          href={`/admin/crm/leads/${item.lead.id}`}
                          className='rounded-lg border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)]'
                        >
                          Ver lead
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              {!loading && items.length === 0 && (
                <tr>
                    <td colSpan={7} className='px-4 py-6 text-center text-[color:var(--muted)]'>
                    Nenhum item encontrado no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
      )}

      {viewMode === 'CALENDAR' && (
        <section className='glass-panel rounded-3xl p-6'>
          <h3 className='text-sm font-semibold text-[color:var(--ink)]'>
            Calendário ({anchorDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })})
          </h3>
          <div className='mt-4 grid grid-cols-7 gap-2 text-center text-xs'>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
              <div key={day} className='font-semibold text-[#0e3a36]'>{day}</div>
            ))}
            {monthDays.map((cell, index) => (
              <div
                key={`${cell.day ?? 'x'}-${index}`}
                className='min-h-16 rounded-xl border border-[#c5e2e2] bg-[#E0F0F0]/90 p-2 text-left'
              >
                {cell.day ? (
                  <>
                    <p className='text-xs font-semibold text-[#0e3a36]'>{cell.day}</p>
                    <p className='mt-1 text-[11px] text-[#0e3a36]'>{cell.count} evento(s)</p>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

