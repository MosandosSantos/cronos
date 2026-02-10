'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { adminNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

type AsoExamKind =
  | 'ADMISSIONAL'
  | 'PERIODICO'
  | 'RETORNO_TRABALHO'
  | 'MUDANCA_FUNCAO'
  | 'DEMISSIONAL'
  | 'MONITORACAO_PONTUAL';

type CatalogItem = {
  id: string;
  kind: AsoExamKind | null;
  name: string;
  description: string | null;
  legalBasis: string | null;
  triggerCondition: string | null;
  validityDays: number;
  isEsocialOnly: boolean;
  isActive: boolean;
};

type CatalogFormState = {
  kind: AsoExamKind;
  name: string;
  description: string;
  legalBasis: string;
  triggerCondition: string;
  validityDays: string;
  isEsocialOnly: boolean;
  isActive: boolean;
};

const kindOptions: Array<{ value: AsoExamKind; label: string }> = [
  { value: 'ADMISSIONAL', label: 'Admissional' },
  { value: 'PERIODICO', label: 'Periodico' },
  { value: 'RETORNO_TRABALHO', label: 'Retorno ao trabalho' },
  { value: 'MUDANCA_FUNCAO', label: 'Mudanca de funcao / riscos' },
  { value: 'DEMISSIONAL', label: 'Demissional' },
  { value: 'MONITORACAO_PONTUAL', label: 'Monitoracao pontual (eSocial S-2220)' },
];

const actionButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--border)] transition';

const IconPlus = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-4 w-4' stroke='currentColor' strokeWidth='2'>
    <path d='M12 5v14M5 12h14' strokeLinecap='round' />
  </svg>
);

const IconSearch = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-4 w-4' stroke='currentColor' strokeWidth='2'>
    <circle cx='11' cy='11' r='7' />
    <path d='m20 20-3.5-3.5' strokeLinecap='round' />
  </svg>
);

const IconClear = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-4 w-4' stroke='currentColor' strokeWidth='2'>
    <path d='M4 7h16M9 7V5h6v2M10 11v6M14 11v6M6 7l1 12h10l1-12' strokeLinecap='round' />
  </svg>
);

const IconSave = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-4 w-4' stroke='currentColor' strokeWidth='2'>
    <path d='M5 4h12l2 2v14H5z' />
    <path d='M8 4v5h8V4M9 20h6' />
  </svg>
);

const IconFolder = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-5 w-5' stroke='currentColor' strokeWidth='1.8'>
    <path d='M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
  </svg>
);

const IconCheck = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-5 w-5' stroke='currentColor' strokeWidth='1.8'>
    <circle cx='12' cy='12' r='9' />
    <path d='m8 12 2.5 2.5L16 9' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
);

const IconDoc = () => (
  <svg viewBox='0 0 24 24' fill='none' className='h-5 w-5' stroke='currentColor' strokeWidth='1.8'>
    <path d='M7 3h7l4 4v14H7z' />
    <path d='M14 3v5h5M9 13h6M9 17h6' strokeLinecap='round' />
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

export default function CatalogAsoPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CatalogFormState>({
    kind: 'ADMISSIONAL' as AsoExamKind,
    name: '',
    description: '',
    legalBasis: 'NR-7 / PCMSO',
    triggerCondition: '',
    validityDays: '',
    isEsocialOnly: false,
    isActive: true,
  });

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'ALL' | AsoExamKind>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewItem, setViewItem] = useState<CatalogItem | null>(null);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<CatalogItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState<CatalogFormState>({
    kind: 'ADMISSIONAL',
    name: '',
    description: '',
    legalBasis: '',
    triggerCondition: '',
    validityDays: '',
    isEsocialOnly: false,
    isActive: true,
  });
  const [editing, setEditing] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch<{ data: CatalogItem[] }>('/catalog/aso', { auth: true });
      setItems(response.data);
      setLoadError(null);
    } catch (error) {
      setItems([]);
      setLoadError(error instanceof Error ? error.message : 'Erro ao carregar catalogo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filteredItems = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return items.filter((item) => {
      const bySearch =
        !normalized ||
        item.name.toLowerCase().includes(normalized) ||
        (item.description || '').toLowerCase().includes(normalized) ||
        (item.legalBasis || '').toLowerCase().includes(normalized);
      const byKind = kindFilter === 'ALL' || item.kind === kindFilter;
      const byStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.isActive) ||
        (statusFilter === 'INACTIVE' && !item.isActive);

      return bySearch && byKind && byStatus;
    });
  }, [items, kindFilter, search, statusFilter]);

  const summaryCards = useMemo(
    () => [
      { label: 'TOTAL DE TIPOS', value: items.length, icon: <IconFolder />, iconBg: 'bg-[#cfe9e9] text-[#0e3a36]' },
      {
        label: 'TIPOS ATIVOS',
        value: items.filter((item) => item.isActive).length,
        icon: <IconCheck />,
        iconBg: 'bg-[#cfe9e9] text-[#0e3a36]',
      },
      {
        label: 'SOMENTE ESOCIAL',
        value: items.filter((item) => item.isEsocialOnly).length,
        icon: <IconDoc />,
        iconBg: 'bg-[#cfe9e9] text-[#0e3a36]',
      },
    ],
    [items]
  );

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage(null);
    setSubmitError(null);

    try {
      await apiFetch('/catalog/aso', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          kind: form.kind,
          name: form.name,
          description: form.description,
          legalBasis: form.legalBasis || null,
          triggerCondition: form.triggerCondition || null,
          validityDays: Number(form.validityDays),
          isEsocialOnly: form.isEsocialOnly,
          isActive: form.isActive,
        }),
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar tipo de ASO.');
      return;
    }

    setForm({
      kind: 'ADMISSIONAL',
      name: '',
      description: '',
      legalBasis: 'NR-7 / PCMSO',
      triggerCondition: '',
      validityDays: '',
      isEsocialOnly: false,
      isActive: true,
    });

    setShowCreate(false);
    setSubmitMessage('Tipo de ASO salvo com sucesso.');
    await load();
  };

  const clearFilters = () => {
    setSearch('');
    setKindFilter('ALL');
    setStatusFilter('ALL');
  };

  const openEdit = (item: CatalogItem) => {
    setEditItemId(item.id);
    setEditForm({
      kind: (item.kind || 'ADMISSIONAL') as AsoExamKind,
      name: item.name || '',
      description: item.description || '',
      legalBasis: item.legalBasis || '',
      triggerCondition: item.triggerCondition || '',
      validityDays: String(item.validityDays || ''),
      isEsocialOnly: Boolean(item.isEsocialOnly),
      isActive: Boolean(item.isActive),
    });
  };

  const closeEdit = () => {
    setEditItemId(null);
    setEditing(false);
  };

  const openDelete = (item: CatalogItem) => {
    setDeleteItem(item);
    setDeleteConfirm(false);
  };

  const closeDelete = () => {
    setDeleteItem(null);
    setDeleteConfirm(false);
    setDeleting(false);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editItemId) return;
    setSubmitMessage(null);
    setSubmitError(null);
    setEditing(true);
    try {
      await apiFetch(`/catalog/aso/${editItemId}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({
          kind: editForm.kind,
          name: editForm.name,
          description: editForm.description,
          legalBasis: editForm.legalBasis || null,
          triggerCondition: editForm.triggerCondition || null,
          validityDays: Number(editForm.validityDays),
          isEsocialOnly: editForm.isEsocialOnly,
          isActive: editForm.isActive,
        }),
      });
      setSubmitMessage('Tipo de ASO atualizado com sucesso.');
      closeEdit();
      await load();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao atualizar tipo de ASO.');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem || !deleteConfirm) return;
    setSubmitMessage(null);
    setSubmitError(null);
    setDeleting(true);
    try {
      const response = await apiFetch<{ action?: 'deleted' | 'deactivated'; message?: string }>(
        `/catalog/aso/${deleteItem.id}`,
        {
        method: 'DELETE',
        auth: true,
        }
      );
      setSubmitMessage(
        response?.message ||
          (response?.action === 'deactivated'
            ? 'Tipo de ASO desativado com sucesso.'
            : 'Tipo de ASO excluído com sucesso.')
      );
      closeDelete();
      await load();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao excluir tipo de ASO.');
      setDeleting(false);
    }
  };

  return (
    <AppShell navItems={adminNavItems} title='ASO' subtitle='Tipos globais' onLogout={handleLogout}>
      <section className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-3xl font-semibold text-[color:var(--ink)]'>Todos os tipos de ASO</h2>
        <button
          type='button'
          onClick={() => setShowCreate((prev) => !prev)}
          className='inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--primary-strong)]'
        >
          <IconPlus />
          Novo tipo
        </button>
      </section>

      <section className='grid gap-4 md:grid-cols-3'>
      {summaryCards.map((card) => (
          <div key={card.label} className='rounded-2xl border border-[#c5e2e2] bg-[#E0F0F0]/90 px-5 py-4 shadow-[0_8px_20px_-16px_rgba(17,37,48,0.45)]'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0e3a36]'>{card.label}</p>
                <p className='mt-2 text-4xl font-semibold leading-none text-[#0e3a36]'>{card.value}</p>
              </div>
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-base ${card.iconBg}`}>
                {card.icon}
              </span>
            </div>
          </div>
        ))}
      </section>

      <section className='glass-panel rounded-3xl p-6'>
        <div className='grid gap-4 lg:grid-cols-[1.6fr_repeat(2,minmax(0,1fr))_auto]'>
          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            Busca rapida
            <input
              type='text'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Buscar por nome, descricao ou base legal'
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            />
          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            Tipo
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as 'ALL' | AsoExamKind)}
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            >
              <option value='ALL'>Todos os tipos</option>
              {kindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            >
              <option value='ALL'>Todos</option>
              <option value='ACTIVE'>Ativo</option>
              <option value='INACTIVE'>Inativo</option>
            </select>
          </label>

          <div className='flex items-end gap-2'>
            <button
              type='button'
              className='inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'
            >
              <IconSearch />
              Buscar
            </button>
            <button
              type='button'
              onClick={clearFilters}
              className='inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)] transition hover:bg-white/70'
            >
              <IconClear />
              Limpar
            </button>
          </div>
        </div>

        {showCreate && (
          <form className='mt-6 grid gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-4 md:grid-cols-2' onSubmit={handleCreate}>
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Tipo
              <select
                value={form.kind}
                onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value as AsoExamKind }))}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              >
                {kindOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Nome
              <input
                type='text'
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                required
              />
            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)] md:col-span-2'>
              Descricao
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                rows={3}
                required
              />
            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Base legal
              <input
                type='text'
                value={form.legalBasis}
                onChange={(event) => setForm((prev) => ({ ...prev, legalBasis: event.target.value }))}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              />
            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Validade (dias)
              <input
                type='number'
                value={form.validityDays}
                onChange={(event) => setForm((prev) => ({ ...prev, validityDays: event.target.value }))}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                required
              />
            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Somente eSocial
              <select
                value={form.isEsocialOnly ? 'true' : 'false'}
                onChange={(event) => setForm((prev) => ({ ...prev, isEsocialOnly: event.target.value === 'true' }))}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              >
                <option value='false'>Nao</option>
                <option value='true'>Sim</option>
              </select>
            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Ativo
              <select
                value={form.isActive ? 'true' : 'false'}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              >
                <option value='true'>Sim</option>
                <option value='false'>Nao</option>
              </select>
            </label>

            <button
              type='submit'
              className='inline-flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)] md:col-span-2'
            >
              <IconSave />
              Salvar tipo de ASO
            </button>
          </form>
        )}
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
      </section>

      <section className='glass-panel rounded-3xl p-6'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Tabela de tipos de ASO</h2>
          <span className='rounded-full bg-[color:var(--bg-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]'>
            {filteredItems.length} registro(s)
          </span>
        </div>
        {loading && (
          <p className='mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
            Carregando dados...
          </p>
        )}
        {loadError && (
          <p className='mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {loadError}
          </p>
        )}

        <div className='mt-5 overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-white'>
          <table className='w-full min-w-[1080px] border-separate border-spacing-0 text-sm'>
            <thead>
              <tr className='bg-emerald-50 text-left text-[11px] uppercase tracking-[0.13em] text-emerald-800'>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Nome</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Tipo</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Base legal</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Validade</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>eSocial</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3'>Status</th>
                <th className='border-b border-[color:var(--border)] px-4 py-3 text-center'>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td className='border-b border-[color:var(--border)] px-4 py-4 font-semibold text-[color:var(--ink)]'>
                    {item.name}
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4 text-[color:var(--muted)]'>
                    {item.kind ?? 'SEM_TIPO'}
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4 text-[color:var(--muted)]'>
                    {item.legalBasis || '-'}
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4 text-[color:var(--muted)]'>
                    {item.validityDays} dias
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4'>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.isEsocialOnly ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>
                      {item.isEsocialOnly ? 'Somente eSocial' : 'Uso geral'}
                    </span>
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4'>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {item.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className='border-b border-[color:var(--border)] px-4 py-4'>
                    <div className='flex items-center justify-center gap-2'>
                      <button
                        type='button'
                        onClick={() => setViewItem(item)}
                        className={`${actionButtonClass} bg-[color:var(--bg-strong)] text-[color:var(--primary)] hover:bg-white`}
                        title='Visualizar'
                      >
                        <IconEye />
                      </button>
                      <button
                        type='button'
                        onClick={() => openEdit(item)}
                        className={`${actionButtonClass} bg-[#eef5f7] text-[color:var(--primary)] hover:bg-white`}
                        title='Editar'
                      >
                        <IconEdit />
                      </button>
                      <button
                        type='button'
                        onClick={() => openDelete(item)}
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

        {!filteredItems.length && (
          <p className='mt-4 text-sm text-[color:var(--muted)]'>Nenhum tipo encontrado com os filtros atuais.</p>
        )}
      </section>

      {viewItem && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 py-8 backdrop-blur-[1px]'>
          <div className='w-full max-w-3xl rounded-3xl border border-[color:var(--border)] bg-white shadow-[0_24px_60px_-35px_rgba(15,35,45,0.5)]'>
            <div className='flex items-center justify-between border-b border-emerald-100 bg-emerald-100 px-6 py-5'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700'>Detalhes do tipo de ASO</p>
                <h3 className='mt-1 text-xl font-semibold text-emerald-900'>{viewItem.name}</h3>
              </div>
              <button
                type='button'
                onClick={() => setViewItem(null)}
                className='rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] hover:bg-[color:var(--bg-strong)]'
              >
                Fechar
              </button>
            </div>
            <div className='grid gap-4 p-6 md:grid-cols-2'>
              <div className='rounded-2xl border border-[color:var(--border)] bg-[#f8fbfc] p-4'>
                <p className='text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]'>Tipo</p>
                <p className='mt-2 text-sm font-semibold text-[color:var(--ink)]'>{viewItem.kind || 'SEM_TIPO'}</p>
              </div>
              <div className='rounded-2xl border border-[color:var(--border)] bg-[#f8fbfc] p-4'>
                <p className='text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]'>Validade</p>
                <p className='mt-2 text-sm font-semibold text-[color:var(--ink)]'>{viewItem.validityDays} dias</p>
              </div>
              <div className='rounded-2xl border border-[color:var(--border)] bg-[#f8fbfc] p-4 md:col-span-2'>
                <p className='text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]'>Descrição</p>
                <p className='mt-2 text-sm text-[color:var(--ink)]'>{viewItem.description || '-'}</p>
              </div>
              <div className='rounded-2xl border border-[color:var(--border)] bg-[#f8fbfc] p-4'>
                <p className='text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]'>Base legal</p>
                <p className='mt-2 text-sm text-[color:var(--ink)]'>{viewItem.legalBasis || '-'}</p>
              </div>
              <div className='rounded-2xl border border-[color:var(--border)] bg-[#f8fbfc] p-4'>
                <p className='text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]'>Regra de disparo</p>
                <p className='mt-2 text-sm text-[color:var(--ink)]'>{viewItem.triggerCondition || '-'}</p>
              </div>
              <div className='rounded-2xl border border-[color:var(--border)] bg-[#f8fbfc] p-4'>
                <p className='text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]'>eSocial</p>
                <p className='mt-2 text-sm font-semibold text-[color:var(--ink)]'>
                  {viewItem.isEsocialOnly ? 'Somente eSocial' : 'Uso geral'}
                </p>
              </div>
              <div className='rounded-2xl border border-[color:var(--border)] bg-[#f8fbfc] p-4'>
                <p className='text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]'>Status</p>
                <p className='mt-2 text-sm font-semibold text-[color:var(--ink)]'>{viewItem.isActive ? 'Ativo' : 'Inativo'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {editItemId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 py-8 backdrop-blur-[1px]'>
          <div className='w-full max-w-3xl rounded-3xl border border-[color:var(--border)] bg-white shadow-[0_24px_60px_-35px_rgba(15,35,45,0.5)]'>
            <div className='flex items-center justify-between border-b border-emerald-100 bg-emerald-100 px-6 py-5'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700'>Edição de tipo de ASO</p>
                <h3 className='mt-1 text-xl font-semibold text-emerald-900'>Atualizar cadastro</h3>
              </div>
              <button
                type='button'
                onClick={closeEdit}
                className='rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] hover:bg-[color:var(--bg-strong)]'
              >
                Fechar
              </button>
            </div>
            <form className='grid gap-4 p-6 md:grid-cols-2' onSubmit={handleUpdate}>
              <label className='text-sm font-semibold text-[color:var(--ink)]'>
                Tipo
                <select
                  value={editForm.kind}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, kind: event.target.value as AsoExamKind }))}
                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                >
                  {kindOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className='text-sm font-semibold text-[color:var(--ink)]'>
                Nome
                <input
                  type='text'
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                  required
                />
              </label>
              <label className='text-sm font-semibold text-[color:var(--ink)] md:col-span-2'>
                Descrição
                <textarea
                  value={editForm.description}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                  rows={3}
                  required
                />
              </label>
              <label className='text-sm font-semibold text-[color:var(--ink)]'>
                Base legal
                <input
                  type='text'
                  value={editForm.legalBasis}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, legalBasis: event.target.value }))}
                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                />
              </label>
              <label className='text-sm font-semibold text-[color:var(--ink)]'>
                Validade (dias)
                <input
                  type='number'
                  value={editForm.validityDays}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, validityDays: event.target.value }))}
                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                  required
                />
              </label>
              <label className='text-sm font-semibold text-[color:var(--ink)]'>
                Somente eSocial
                <select
                  value={editForm.isEsocialOnly ? 'true' : 'false'}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, isEsocialOnly: event.target.value === 'true' }))}
                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                >
                  <option value='false'>Nao</option>
                  <option value='true'>Sim</option>
                </select>
              </label>
              <label className='text-sm font-semibold text-[color:var(--ink)]'>
                Ativo
                <select
                  value={editForm.isActive ? 'true' : 'false'}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))}
                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
                >
                  <option value='true'>Sim</option>
                  <option value='false'>Nao</option>
                </select>
              </label>
              <div className='md:col-span-2 flex justify-end gap-2 pt-2'>
                <button
                  type='button'
                  onClick={closeEdit}
                  className='inline-flex items-center gap-2 rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)] hover:bg-[color:var(--bg-strong)]'
                >
                  <IconClear />
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={editing}
                  className='inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70'
                >
                  <IconSave />
                  {editing ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 py-8 backdrop-blur-[1px]'>
          <div className='w-full max-w-2xl rounded-3xl border border-red-200 bg-white shadow-[0_24px_60px_-35px_rgba(15,35,45,0.5)]'>
            <div className='flex items-center justify-between border-b border-red-200 bg-red-50 px-6 py-5'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.14em] text-red-700'>Exclusão de tipo de ASO</p>
                <h3 className='mt-1 text-xl font-semibold text-red-900'>Confirmar exclusão</h3>
              </div>
              <button
                type='button'
                onClick={closeDelete}
                className='rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100'
              >
                Fechar
              </button>
            </div>

            <div className='space-y-4 p-6'>
              <div className='rounded-2xl border border-red-200 bg-red-50 p-4'>
                <p className='text-sm text-red-800'>
                  Você está prestes a excluir o tipo <strong>{deleteItem.name}</strong>. Esta ação pode impactar registros relacionados.
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
                  <span>Confirmo que entendo a exclusão e desejo remover este tipo de ASO.</span>
                </label>
              </div>

              <div className='flex justify-end gap-2 pt-1'>
                <button
                  type='button'
                  onClick={closeDelete}
                  className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100'
                >
                  Cancelar
                </button>
                <button
                  type='button'
                  onClick={handleDelete}
                  disabled={!deleteConfirm || deleting}
                  className='rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {deleting ? 'Excluindo...' : 'Excluir definitivamente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

