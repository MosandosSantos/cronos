'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { formatCurrency } from '@/lib/format';
import { adminNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

type Mode = 'list' | 'view' | 'edit' | 'delete';

type CatalogItem = {
  id: string;
  code: string;
  name: string;
  validityDays: number;
  generateAlert: boolean;
  alertDays1: number | null;
  alertDays2: number | null;
  alertDays3: number | null;
  isActive: boolean;
};

type FormState = {
  code: string;
  name: string;
  validityDays: string;
  generateAlert: boolean;
  alertDays1: string;
  alertDays2: string;
  alertDays3: string;
  isActive: boolean;
};

type ReportSummary = {
  revenueCurrentMonth: number;
  revenuePreviousMonth: number;
  countCurrentMonth: number;
  countPreviousMonth: number;
  dueIn30Days: number;
  dueIn90Days: number;
};

const actionButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--border)] transition';

const initialForm = (): FormState => ({
  code: '',
  name: '',
  validityDays: '',
  generateAlert: true,
  alertDays1: '90',
  alertDays2: '30',
  alertDays3: '7',
  isActive: true,
});

const normalizeCode = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '_');

const toNullableNumber = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const IconPlus = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-4 w-4' stroke='currentColor' strokeWidth='2'>
    <path d='M12 5v14M5 12h14' strokeLinecap='round' />
  </svg>
);

const IconEye = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-4 w-4' stroke='currentColor' strokeWidth='2'>
    <path d='M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z' />
    <circle cx='12' cy='12' r='2.5' />
  </svg>
);

const IconEdit = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-4 w-4' stroke='currentColor' strokeWidth='2'>
    <path d='m4 20 4-1 9-9-3-3-9 9-1 4Z' />
    <path d='m13 6 3 3' />
  </svg>
);

const IconTrash = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-4 w-4' stroke='currentColor' strokeWidth='2'>
    <path d='M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12' strokeLinecap='round' />
  </svg>
);

export default function CatalogReportsPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [selected, setSelected] = useState<CatalogItem | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm());
  const [editForm, setEditForm] = useState<FormState>(initialForm());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [loading, setLoading] = useState(true);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [response, summaryResponse] = await Promise.all([
        apiFetch<{ data: CatalogItem[] }>('/catalog/reports', { auth: true }),
        apiFetch<{ data: ReportSummary }>('/catalog/reports/summary', { auth: true }),
      ]);
      setItems(response.data);
      setSummary(summaryResponse.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const bySearch = !q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q);
      const byStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.isActive) ||
        (statusFilter === 'INACTIVE' && !item.isActive);
      return bySearch && byStatus;
    });
  }, [items, search, statusFilter]);

  const backToList = () => {
    setMode('list');
    setSelected(null);
    setDeleteConfirm(false);
  };

  const openMode = (next: Exclude<Mode, 'list'>, item: CatalogItem) => {
    setSelected(item);
    setMode(next);
    setSubmitError(null);
    setSubmitMessage(null);

    if (next === 'edit') {
      setEditForm({
        code: item.code,
        name: item.name,
        validityDays: String(item.validityDays),
        generateAlert: item.generateAlert,
        alertDays1: item.alertDays1 != null ? String(item.alertDays1) : '',
        alertDays2: item.alertDays2 != null ? String(item.alertDays2) : '',
        alertDays3: item.alertDays3 != null ? String(item.alertDays3) : '',
        isActive: item.isActive,
      });
    }
  };

  const validateAlertDays = (state: FormState) => {
    if (!state.generateAlert) return;
    const a1 = toNullableNumber(state.alertDays1);
    const a2 = toNullableNumber(state.alertDays2);
    const a3 = toNullableNumber(state.alertDays3);

    if (a1 == null || a2 == null || a3 == null || Number.isNaN(a1) || Number.isNaN(a2) || Number.isNaN(a3)) {
      throw new Error('Preencha os três alertas com valores numéricos.');
    }
    if (a1 < 0 || a2 < 0 || a3 < 0) {
      throw new Error('Os dias de alerta não podem ser negativos.');
    }
    if (!(a1 > a2 && a2 > a3)) {
      throw new Error('A ordem dos alertas deve ser: Alerta 1 > Alerta 2 > Alerta 3.');
    }
  };

  const buildPayload = (state: FormState) => {
    const validityDays = Number(state.validityDays);
    if (!Number.isFinite(validityDays) || validityDays <= 0) {
      throw new Error('Validade (dias) deve ser maior que zero.');
    }

    validateAlertDays(state);

    return {
      code: normalizeCode(state.code),
      name: state.name.trim(),
      validityDays,
      generateAlert: state.generateAlert,
      alertDays1: state.generateAlert ? Number(state.alertDays1) : null,
      alertDays2: state.generateAlert ? Number(state.alertDays2) : null,
      alertDays3: state.generateAlert ? Number(state.alertDays3) : null,
      isActive: state.isActive,
    };
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await apiFetch('/catalog/reports', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(buildPayload(form)),
      });
      setForm(initialForm());
      setShowCreate(false);
      setSubmitMessage('Tipo de laudo criado com sucesso.');
      await load();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao criar tipo de laudo.');
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitError(null);
    try {
      await apiFetch(`/catalog/reports/${selected.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(buildPayload(editForm)),
      });
      await load();
      setSubmitMessage('Tipo de laudo atualizado com sucesso.');
      backToList();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao atualizar tipo de laudo.');
    }
  };

  const handleDelete = async () => {
    if (!selected || !deleteConfirm) return;
    setSubmitError(null);
    try {
      const response = await apiFetch<{ action?: 'deleted' | 'deactivated' }>('/catalog/reports/' + selected.id, {
        method: 'DELETE',
        auth: true,
      });
      await load();
      setSubmitMessage(
        response.action === 'deactivated'
          ? 'Tipo de laudo desativado com sucesso.'
          : 'Tipo de laudo excluído com sucesso.'
      );
      backToList();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao excluir tipo de laudo.');
    }
  };

  const renderFormFields = (state: FormState, setState: React.Dispatch<React.SetStateAction<FormState>>) => (
    <>
      <input
        type='text'
        placeholder='Código (ex.: PGR)'
        value={state.code}
        onChange={(event) => setState((prev) => ({ ...prev, code: normalizeCode(event.target.value) }))}
        className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
        required
      />
      <input
        type='text'
        placeholder='Nome'
        value={state.name}
        onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
        className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm md:col-span-2'
        required
      />
      <input
        type='number'
        min={1}
        placeholder='Validade (dias)'
        value={state.validityDays}
        onChange={(event) => setState((prev) => ({ ...prev, validityDays: event.target.value }))}
        className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
        required
      />
      <select
        value={state.generateAlert ? 'true' : 'false'}
        onChange={(event) => setState((prev) => ({ ...prev, generateAlert: event.target.value === 'true' }))}
        className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
      >
        <option value='true'>Gerar alerta: Sim</option>
        <option value='false'>Gerar alerta: Não</option>
      </select>
      <select
        value={state.isActive ? 'true' : 'false'}
        onChange={(event) => setState((prev) => ({ ...prev, isActive: event.target.value === 'true' }))}
        className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
      >
        <option value='true'>Status: Ativo</option>
        <option value='false'>Status: Inativo</option>
      </select>
      <input
        type='number'
        min={0}
        placeholder='Alerta 1 (dias)'
        value={state.alertDays1}
        onChange={(event) => setState((prev) => ({ ...prev, alertDays1: event.target.value }))}
        className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
        disabled={!state.generateAlert}
        required={state.generateAlert}
      />
      <input
        type='number'
        min={0}
        placeholder='Alerta 2 (dias)'
        value={state.alertDays2}
        onChange={(event) => setState((prev) => ({ ...prev, alertDays2: event.target.value }))}
        className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
        disabled={!state.generateAlert}
        required={state.generateAlert}
      />
      <input
        type='number'
        min={0}
        placeholder='Alerta 3 (dias)'
        value={state.alertDays3}
        onChange={(event) => setState((prev) => ({ ...prev, alertDays3: event.target.value }))}
        className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
        disabled={!state.generateAlert}
        required={state.generateAlert}
      />
    </>
  );

  return (
    <AppShell navItems={adminNavItems} title='Laudos' subtitle='Tipos globais' onLogout={handleLogout}>
      {submitMessage && (
        <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          {submitMessage}
        </p>
      )}
      {submitError && (
        <p className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{submitError}</p>
      )}

      {mode === 'list' && (
        <>
          <section className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-3xl font-semibold text-[color:var(--ink)]'>Todos os tipos de laudo</h2>
            <button
              type='button'
              onClick={() => setShowCreate((prev) => !prev)}
              className='inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-white'
            >
              <IconPlus />
              Novo tipo
            </button>
          </section>

          <section className='grid gap-4 md:grid-cols-3'>
            <div className='rounded-2xl kpi-card px-5 py-4'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80'>Faturamento com laudos</p>
              <p className='mt-2 text-3xl font-semibold text-white'>
                {formatCurrency(summary?.revenueCurrentMonth ?? 0)}
              </p>
              <p className='mt-2 text-xs text-white/80'>Mês anterior: {formatCurrency(summary?.revenuePreviousMonth ?? 0)}</p>
            </div>
            <div className='rounded-2xl kpi-card px-5 py-4'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80'>Laudos no mês</p>
              <p className='mt-2 text-3xl font-semibold text-white'>{summary?.countCurrentMonth ?? 0}</p>
              <p className='mt-2 text-xs text-white/80'>Mês anterior: {summary?.countPreviousMonth ?? 0}</p>
            </div>
            <div className='rounded-2xl kpi-card px-5 py-4'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80'>Laudos a vencer</p>
              <p className='mt-2 text-3xl font-semibold text-white'>{summary?.dueIn30Days ?? 0}</p>
              <p className='mt-2 text-xs text-white/80'>Em 90 dias: {summary?.dueIn90Days ?? 0}</p>
            </div>
          </section>

          <section className='glass-panel rounded-3xl p-6'>
            <div className='grid gap-4 lg:grid-cols-[1.6fr_1fr_auto]'>
              <input
                type='text'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Buscar por código ou nome'
                className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              >
                <option value='ALL'>Todos</option>
                <option value='ACTIVE'>Ativo</option>
                <option value='INACTIVE'>Inativo</option>
              </select>
              <button
                type='button'
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                }}
                className='rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)]'
              >
                Limpar
              </button>
            </div>

            {showCreate && (
              <div className='mt-6 rounded-3xl border border-[#c5e2e2] bg-[#E0F0F0]/90'>
                <div className='flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-6 py-5'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3a36]'>Inclusão de tipo de laudo</p>
                    <h3 className='mt-1 text-xl font-semibold text-[#0e3a36]'>Novo cadastro</h3>
                  </div>
                </div>
                <form className='grid gap-4 p-6 md:grid-cols-3' onSubmit={handleCreate}>
                  {renderFormFields(form, setForm)}
                  <div className='md:col-span-3 flex justify-end gap-2'>
                    <button
                      type='button'
                      onClick={() => {
                        setShowCreate(false);
                        setForm(initialForm());
                      }}
                      className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)]'
                    >
                      Cancelar
                    </button>
                    <button type='submit' className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white'>
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>

          <section className='glass-panel rounded-3xl p-6'>
            {loading ? (
              <p className='text-sm text-[color:var(--muted)]'>Carregando...</p>
            ) : (
              <div className='overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-white'>
                <table className='w-full table-fixed text-sm'>
                  <thead>
                    <tr className='bg-emerald-50 text-left text-[11px] uppercase tracking-[0.13em] text-emerald-800'>
                      <th className='w-[12%] px-4 py-3'>Código</th>
                      <th className='w-[34%] px-4 py-3'>Nome</th>
                      <th className='w-[12%] px-4 py-3'>Validade</th>
                      <th className='w-[16%] px-4 py-3'>Alerta</th>
                      <th className='w-[10%] px-4 py-3'>Status</th>
                      <th className='w-[16%] px-4 py-3 text-center'>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className='border-t border-[color:var(--border)]'>
                        <td className='px-4 py-3 font-semibold text-[color:var(--ink)]'>{item.code}</td>
                        <td className='truncate px-4 py-3 text-[color:var(--muted)]' title={item.name}>{item.name}</td>
                        <td className='px-4 py-3 text-[color:var(--muted)]'>{item.validityDays} dias</td>
                        <td className='px-4 py-3 text-[color:var(--muted)]'>{item.generateAlert ? 'Ativo' : 'Inativo'}</td>
                        <td className='px-4 py-3'>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {item.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-center gap-2'>
                            <button
                              type='button'
                              onClick={() => openMode('view', item)}
                              className={`${actionButtonClass} bg-[color:var(--bg-strong)] text-[color:var(--primary)] hover:bg-white`}
                              title='Visualizar'
                            >
                              <IconEye />
                            </button>
                            <button
                              type='button'
                              onClick={() => openMode('edit', item)}
                              className={`${actionButtonClass} bg-[#eef5f7] text-[color:var(--primary)] hover:bg-white`}
                              title='Editar'
                            >
                              <IconEdit />
                            </button>
                            <button
                              type='button'
                              onClick={() => openMode('delete', item)}
                              className={`${actionButtonClass} bg-[#f8eff2] text-[#8a3b4a] hover:bg-white`}
                              title='Excluir'
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {mode === 'view' && selected && (
        <section className='rounded-3xl border border-[#c5e2e2] bg-[#E0F0F0]/90'>
          <div className='flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-6 py-5'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3a36]'>Consulta de tipo de laudo</p>
              <h3 className='mt-1 text-xl font-semibold text-[#0e3a36]'>{selected.name}</h3>
            </div>
            <button
              type='button'
              onClick={backToList}
              className='rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)]'
            >
              Voltar
            </button>
          </div>
          <div className='grid gap-3 p-6 text-sm text-[#0e3a36] md:grid-cols-2'>
            <div>Código: {selected.code}</div>
            <div>Validade: {selected.validityDays} dias</div>
            <div>Gerar alerta: {selected.generateAlert ? 'Sim' : 'Não'}</div>
            <div>Status: {selected.isActive ? 'Ativo' : 'Inativo'}</div>
            <div>Alerta 1: {selected.alertDays1 ?? '-'}</div>
            <div>Alerta 2: {selected.alertDays2 ?? '-'}</div>
            <div>Alerta 3: {selected.alertDays3 ?? '-'}</div>
          </div>
        </section>
      )}

      {mode === 'edit' && selected && (
        <section className='rounded-3xl border border-[#c5e2e2] bg-[#E0F0F0]/90'>
          <div className='flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-6 py-5'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3a36]'>Edição de tipo de laudo</p>
              <h3 className='mt-1 text-xl font-semibold text-[#0e3a36]'>{selected.name}</h3>
            </div>
            <button
              type='button'
              onClick={backToList}
              className='rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)]'
            >
              Voltar
            </button>
          </div>
          <form className='grid gap-4 p-6 md:grid-cols-3' onSubmit={handleUpdate}>
            {renderFormFields(editForm, setEditForm)}
            <div className='md:col-span-3 flex justify-end gap-2'>
              <button
                type='button'
                onClick={backToList}
                className='rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)]'
              >
                Cancelar
              </button>
              <button type='submit' className='rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white'>
                Salvar
              </button>
            </div>
          </form>
        </section>
      )}

      {mode === 'delete' && selected && (
        <section className='rounded-3xl border border-red-200 bg-white shadow-[0_24px_60px_-35px_rgba(15,35,45,0.5)]'>
          <div className='flex items-center justify-between border-b border-red-200 bg-red-50 px-6 py-5'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.14em] text-red-700'>Exclusão de tipo de laudo</p>
              <h3 className='mt-1 text-xl font-semibold text-red-900'>Confirmar exclusão</h3>
            </div>
            <button
              type='button'
              onClick={backToList}
              className='rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100'
            >
              Fechar
            </button>
          </div>

          <div className='space-y-4 p-6'>
            <div className='rounded-2xl border border-red-200 bg-red-50 p-4'>
              <p className='text-sm text-red-800'>
                Você está prestes a excluir ou desativar o tipo de laudo <strong>{selected.name}</strong>.
              </p>
            </div>

            <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-4'>
              <label className='flex items-start gap-3 text-sm text-emerald-900'>
                <input
                  type='checkbox'
                  checked={deleteConfirm}
                  onChange={(event) => setDeleteConfirm(event.target.checked)}
                  className='mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500'
                />
                <span>Confirmo que entendo a exclusão e desejo continuar.</span>
              </label>
            </div>

            <div className='flex justify-end gap-2 pt-1'>
              <button
                type='button'
                onClick={backToList}
                className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100'
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={handleDelete}
                disabled={!deleteConfirm}
                className='rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60'
              >
                Excluir/Desativar
              </button>
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}

