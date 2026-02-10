'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { appNavItems, dueStatusLabels } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

type Employee = { id: string; name: string };
type AsoType = { id: string; name: string };
type DueStatus = 'VALID' | 'DUE_SOON' | 'EXPIRED';

type AsoRecord = {
  id: string;
  employee: Employee;
  asoType: AsoType;
  performedAt: string;
  dueDate: string;
  status: DueStatus;
  daysToDue: number;
};

const statusOptions: { value: DueStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'VALID', label: 'Valido' },
  { value: 'DUE_SOON', label: 'A vencer' },
  { value: 'EXPIRED', label: 'Vencido' },
];

const statusPillClass: globalThis.Record<DueStatus, string> = {
  VALID: 'bg-emerald-50 text-emerald-700',
  DUE_SOON: 'bg-amber-50 text-amber-700',
  EXPIRED: 'bg-red-50 text-red-700',
};

const actionButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold text-white transition hover:opacity-85';

export default function AsoRecordsPage() {
  useAuthGuard('TENANT_ADMIN');
  const router = useRouter();

  const [records, setRecords] = useState<AsoRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<AsoType[]>([]);
  const [form, setForm] = useState({ employeeId: '', asoTypeId: '', performedAt: '' });
  const [showCreate, setShowCreate] = useState(false);

  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<DueStatus | 'ALL'>('ALL');
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  const load = useCallback(async () => {
    const [recordsRes, employeesRes, typesRes] = await Promise.all([
      apiFetch<{ data: AsoRecord[] }>('/employee-aso-records', { auth: true }),
      apiFetch<{ data: Employee[] }>('/employees', { auth: true }),
      apiFetch<{ data: AsoType[] }>('/catalog/aso', { auth: true }),
    ]);

    setRecords(recordsRes.data);
    setEmployees(employeesRes.data);
    setTypes(typesRes.data);

    setForm((prev) => ({
      ...prev,
      employeeId: prev.employeeId || employeesRes.data[0]?.id || '',
      asoTypeId: prev.asoTypeId || typesRes.data[0]?.id || '',
    }));
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [load]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        record.employee?.name?.toLowerCase().includes(normalizedSearch) ||
        record.asoType?.name?.toLowerCase().includes(normalizedSearch);
      const matchesEmployee =
        employeeFilter === 'ALL' || record.employee?.id === employeeFilter;
      const matchesType = typeFilter === 'ALL' || record.asoType?.id === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter;

      return matchesSearch && matchesEmployee && matchesType && matchesStatus;
    });
  }, [employeeFilter, records, search, statusFilter, typeFilter]);

  const summaryCards = useMemo(
    () => [
      { label: 'TOTAL DE ASO', value: records.length, icon: '🩺', iconBg: 'bg-blue-100 text-blue-700' },
      {
        label: 'ASO A VENCER',
        value: records.filter((r) => r.status === 'DUE_SOON').length,
        icon: '⏳',
        iconBg: 'bg-violet-100 text-violet-700',
      },
      {
        label: 'ASO VENCIDO',
        value: records.filter((r) => r.status === 'EXPIRED').length,
        icon: '⚠',
        iconBg: 'bg-emerald-100 text-emerald-700',
      },
    ],
    [records]
  );

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await apiFetch('/employee-aso-records', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(form),
    });
    setForm((prev) => ({ ...prev, performedAt: '' }));
    setShowCreate(false);
    await load();
  };

  const clearFilters = () => {
    setSearch('');
    setEmployeeFilter('ALL');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
  };

  const handleDelete = async (record: AsoRecord) => {
    const confirmed = window.confirm(
      `Excluir o ASO de ${record.employee?.name || 'funcionario'} (${record.asoType?.name || 'tipo'})?`
    );
    if (!confirmed) return;

    setSubmitMessage(null);
    setSubmitError(null);

    try {
      await apiFetch(`/employee-aso-records/${record.id}`, {
        method: 'DELETE',
        auth: true,
      });
      setSubmitMessage('ASO excluido com sucesso.');
      await load();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao excluir ASO.');
    }
  };

  return (
    <AppShell navItems={appNavItems} title='ASO' subtitle='Gestao de ASO ocupacional' onLogout={handleLogout}>
      <section className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-3xl font-semibold text-[color:var(--ink)]'>Todos os ASO</h2>
        <button
          type='button'
          onClick={() => setShowCreate((prev) => !prev)}
          className='rounded-xl bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--primary-strong)]'
        >
          + Incluir ASO
        </button>
      </section>

      <section className='grid gap-4 md:grid-cols-3'>
        {summaryCards.map((card) => (
          <div key={card.label} className='rounded-2xl border border-[color:var(--border)] bg-white px-5 py-4 shadow-[0_8px_20px_-16px_rgba(17,37,48,0.45)]'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--muted)]'>{card.label}</p>
                <p className='mt-2 text-4xl font-semibold leading-none text-[color:var(--ink)]'>{card.value}</p>
              </div>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-base ${card.iconBg}`}>
                {card.icon}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className='glass-panel rounded-3xl p-6'>
        <div className='grid gap-4 lg:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))_auto]'>
          <label className='text-sm font-semibold text-[color:var(--ink)] lg:col-span-2'>
            Busca rapida
            <input
              type='text'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Nome do funcionario ou tipo de ASO'
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            />
          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            Funcionario
            <select
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            >
              <option value='ALL'>Todos os funcionarios</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            Tipo de ASO
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            >
              <option value='ALL'>Todos os tipos</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as DueStatus | 'ALL')}
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className='flex items-end gap-2'>
            <button
              type='button'
              className='rounded-xl bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'
            >
              Buscar
            </button>
            <button
              type='button'
              onClick={clearFilters}
              className='rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)] transition hover:bg-white/70'
            >
              Limpar
            </button>
          </div>
        </div>

        {showCreate && (
          <form
            className='mt-6 grid gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-4 md:grid-cols-3'
            onSubmit={handleCreate}
          >
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Funcionario
              <select
                value={form.employeeId}
                onChange={(event) => setForm((prev) => ({ ...prev, employeeId: event.target.value }))}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Tipo de ASO
              <select
                value={form.asoTypeId}
                onChange={(event) => setForm((prev) => ({ ...prev, asoTypeId: event.target.value }))}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              >
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Data de realizacao
              <input
                type='date'
                value={form.performedAt}
                onChange={(event) => setForm((prev) => ({ ...prev, performedAt: event.target.value }))}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                required
              />
            </label>
            <button
              type='submit'
              className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'
            >
              Salvar ASO
            </button>
          </form>
        )}
      </section>

      <section className='glass-panel rounded-3xl p-6'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Tabela de ASO</h2>
          <span className='rounded-full bg-[color:var(--bg-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]'>
            {filteredRecords.length} registro(s)
          </span>
        </div>

        <div className='mt-5 overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-white'>
          <table className='w-full min-w-[980px] border-separate border-spacing-0 text-sm'>
            <thead>
              <tr className='bg-slate-50 text-left text-[11px] uppercase tracking-[0.13em] text-[color:var(--muted)]'>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Funcionario</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Tipo ASO</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Realizado em</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Vencimento</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Dias</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Status</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3 text-center'>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td className='border-b border-[color:var(--border)] px-4 py-4 font-semibold text-[color:var(--ink)]'>
                    {record.employee?.name}
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4 text-[color:var(--muted)]'>
                    {record.asoType?.name}
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4 text-[color:var(--muted)]'>
                    {formatDate(record.performedAt)}
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4 text-[color:var(--muted)]'>
                    {formatDate(record.dueDate)}
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4 text-[color:var(--muted)]'>
                    {record.daysToDue}
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4'>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPillClass[record.status]}`}>
                      {dueStatusLabels[record.status] || record.status}
                    </span>
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4'>
                    <div className='flex items-center justify-center gap-2'>
                      <button type='button' className={`${actionButtonClass} bg-emerald-500`} title='WhatsApp'>
                        W
                      </button>
                      <button type='button' className={`${actionButtonClass} bg-blue-500`} title='Historico'>
                        H
                      </button>
                      <button type='button' className={`${actionButtonClass} bg-slate-500`} title='Visualizar'>
                        O
                      </button>
                      <button type='button' className={`${actionButtonClass} bg-amber-500`} title='Editar'>
                        E
                      </button>
                      <button
                        type='button'
                        onClick={() => void handleDelete(record)}
                        className={`${actionButtonClass} bg-red-500`}
                        title='Excluir'
                      >
                        X
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {submitMessage && (
          <p className='mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
            {submitMessage}
          </p>
        )}
        {submitError && (
          <p className='mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {submitError}
          </p>
        )}

        {!filteredRecords.length && (
          <p className='mt-4 text-sm text-[color:var(--muted)]'>Nenhum registro encontrado com os filtros atuais.</p>
        )}
      </section>
    </AppShell>
  );
}

