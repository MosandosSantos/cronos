'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { adminNavItems } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/format';
import { useAuthGuard } from '@/lib/use-auth-guard';

type TrainingModality = 'PRESENCIAL' | 'SEMIPRESENCIAL' | 'EAD' | 'APOSTILA' | 'VIDEO';
type Mode = 'list' | 'view' | 'edit' | 'delete';

type CatalogItem = {
  id: string;
  name: string;
  description?: string | null;
  targetAudience: string;
  durationHours: number;
  isMandatory: boolean;
  price: number;
  didacticMaterial?: string | null;
  modality: TrainingModality;
  validityDays: number;
  isActive: boolean;
};

type FormState = {
  name: string;
  description: string;
  targetAudience: string;
  durationHours: string;
  isMandatory: boolean;
  price: string;
  didacticMaterial: string;
  modality: TrainingModality;
  validityDays: string;
  isActive: boolean;
};

type TrainingSummary = {
  revenueCurrentMonth: number;
  revenuePreviousMonth: number;
  countCurrentMonth: number;
  countPreviousMonth: number;
  dueIn30Days: number;
  dueIn90Days: number;
};

const modalityOptions: Array<{ value: TrainingModality; label: string }> = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'SEMIPRESENCIAL', label: 'Semi-presencial' },
  { value: 'EAD', label: 'EAD' },
  { value: 'APOSTILA', label: 'Apostila' },
  { value: 'VIDEO', label: 'Vídeo' },
];

const actionButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--border)] transition';

const initialForm = (): FormState => ({
  name: '',
  description: '',
  targetAudience: '',
  durationHours: '',
  isMandatory: false,
  price: 'R$ 0,00',
  didacticMaterial: '',
  modality: 'PRESENCIAL',
  validityDays: '',
  isActive: true,
});

const maskCurrencyInput = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return formatCurrency(Number(digits || '0') / 100);
};

const parseCurrencyInput = (masked: string) => {
  const value = Number(masked.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : NaN;
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

export default function CatalogTrainingPage() {
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
  const [summary, setSummary] = useState<TrainingSummary | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [response, summaryResponse] = await Promise.all([
        apiFetch<{ data: CatalogItem[] }>('/catalog/trainings', { auth: true }),
        apiFetch<{ data: TrainingSummary }>('/catalog/trainings/summary', { auth: true }),
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
      const bySearch = !q || item.name.toLowerCase().includes(q) || item.targetAudience.toLowerCase().includes(q);
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
        name: item.name,
        description: item.description || '',
        targetAudience: item.targetAudience,
        durationHours: String(item.durationHours),
        isMandatory: item.isMandatory,
        price: formatCurrency(Number(item.price)),
        didacticMaterial: item.didacticMaterial || '',
        modality: item.modality,
        validityDays: String(item.validityDays),
        isActive: item.isActive,
      });
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      const price = parseCurrencyInput(form.price);
      if (!Number.isFinite(price) || price < 0) throw new Error('Valor inválido.');
      await apiFetch('/catalog/trainings', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({ ...form, durationHours: Number(form.durationHours), validityDays: Number(form.validityDays), price }),
      });
      setForm(initialForm());
      setShowCreate(false);
      setSubmitMessage('Treinamento criado com sucesso.');
      await load();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao criar treinamento.');
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitError(null);
    try {
      const price = parseCurrencyInput(editForm.price);
      if (!Number.isFinite(price) || price < 0) throw new Error('Valor inválido.');
      await apiFetch(`/catalog/trainings/${selected.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({ ...editForm, durationHours: Number(editForm.durationHours), validityDays: Number(editForm.validityDays), price }),
      });
      await load();
      setSubmitMessage('Treinamento atualizado com sucesso.');
      backToList();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao atualizar treinamento.');
    }
  };

  const handleDelete = async () => {
    if (!selected || !deleteConfirm) return;
    setSubmitError(null);
    try {
      await apiFetch(`/catalog/trainings/${selected.id}`, { method: 'DELETE', auth: true });
      await load();
      setSubmitMessage('Treinamento excluído/desativado com sucesso.');
      backToList();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao excluir treinamento.');
    }
  };

  return (
    <AppShell navItems={adminNavItems} title='Treinamentos' subtitle='Tipos globais' onLogout={handleLogout}>
      {submitMessage && <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>{submitMessage}</p>}
      {submitError && <p className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{submitError}</p>}

      {mode === 'list' && (
        <>
          <section className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-3xl font-semibold text-[color:var(--ink)]'>Todos os tipos de treinamento</h2>
            <button type='button' onClick={() => setShowCreate((prev) => !prev)} className='inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-white'><IconPlus />Novo tipo</button>
          </section>

          <section className='grid gap-4 md:grid-cols-3'>
            <div className='rounded-2xl kpi-card px-5 py-4'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80'>Faturamento com treinamentos</p>
              <p className='mt-2 text-3xl font-semibold text-white'>
                {formatCurrency(summary?.revenueCurrentMonth ?? 0)}
              </p>
              <p className='mt-2 text-xs text-white/80'>Mês anterior: {formatCurrency(summary?.revenuePreviousMonth ?? 0)}</p>
            </div>
            <div className='rounded-2xl kpi-card px-5 py-4'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80'>Treinamentos no mês</p>
              <p className='mt-2 text-3xl font-semibold text-white'>{summary?.countCurrentMonth ?? 0}</p>
              <p className='mt-2 text-xs text-white/80'>Mês anterior: {summary?.countPreviousMonth ?? 0}</p>
            </div>
            <div className='rounded-2xl kpi-card px-5 py-4'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80'>Treinamentos a vencer</p>
              <p className='mt-2 text-3xl font-semibold text-white'>{summary?.dueIn30Days ?? 0}</p>
              <p className='mt-2 text-xs text-white/80'>Em 90 dias: {summary?.dueIn90Days ?? 0}</p>
            </div>
          </section>

          <section className='glass-panel rounded-3xl p-6'>
            <div className='grid gap-4 lg:grid-cols-[1.6fr_1fr_auto]'>
              <input type='text' value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Buscar por nome ou público-alvo' className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm' />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'>
                <option value='ALL'>Todos</option><option value='ACTIVE'>Ativo</option><option value='INACTIVE'>Inativo</option>
              </select>
              <button type='button' onClick={() => { setSearch(''); setStatusFilter('ALL'); }} className='rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)]'>Limpar</button>
            </div>

            {showCreate && (
              <div className='mt-6 rounded-3xl border border-[#c5e2e2] bg-[#E0F0F0]/90'>
                <div className='flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-6 py-5'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3a36]'>Inclusão de tipo de treinamento</p>
                    <h3 className='mt-1 text-xl font-semibold text-[#0e3a36]'>Novo cadastro</h3>
                  </div>
                </div>
                <form className='grid gap-4 p-6 md:grid-cols-3' onSubmit={handleCreate}>
                  <input type='text' placeholder='Nome' value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm md:col-span-2' required />
                  <select value={form.modality} onChange={(event) => setForm((prev) => ({ ...prev, modality: event.target.value as TrainingModality }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'>{modalityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  <textarea placeholder='Descrição' value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm md:col-span-3' rows={2} />
                  <input type='text' placeholder='Público-alvo' value={form.targetAudience} onChange={(event) => setForm((prev) => ({ ...prev, targetAudience: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm md:col-span-2' required />
                  <input type='number' min={1} placeholder='Duração (h)' value={form.durationHours} onChange={(event) => setForm((prev) => ({ ...prev, durationHours: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm' required />
                  <input type='text' placeholder='Material didático' value={form.didacticMaterial} onChange={(event) => setForm((prev) => ({ ...prev, didacticMaterial: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm md:col-span-2' />
                  <select value={form.isMandatory ? 'true' : 'false'} onChange={(event) => setForm((prev) => ({ ...prev, isMandatory: event.target.value === 'true' }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'><option value='true'>Obrigatório</option><option value='false'>Não obrigatório</option></select>
                  <input type='text' inputMode='numeric' placeholder='Valor' value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: maskCurrencyInput(event.target.value) }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm' required />
                  <input type='number' min={1} placeholder='Validade (dias)' value={form.validityDays} onChange={(event) => setForm((prev) => ({ ...prev, validityDays: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm' required />
                  <div className='md:col-span-3 flex justify-end gap-2'>
                    <button type='button' onClick={() => { setShowCreate(false); setForm(initialForm()); }} className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)]'>Cancelar</button>
                    <button type='submit' className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white'>Salvar</button>
                  </div>
                </form>
              </div>
            )}
          </section>

          <section className='glass-panel rounded-3xl p-6'>
            {loading ? <p className='text-sm text-[color:var(--muted)]'>Carregando...</p> : (
              <div className='overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-white'>
                <table className='w-full table-fixed text-sm'>
                  <thead>
                    <tr className='bg-emerald-50 text-left text-[11px] uppercase tracking-[0.13em] text-emerald-800'>
                      <th className='w-[30%] px-4 py-3'>Nome</th>
                      <th className='w-[12%] px-4 py-3'>Duração (h)</th>
                      <th className='w-[11%] px-4 py-3'>Valor</th>
                      <th className='px-4 py-3'>Modalidade</th>
                      <th className='w-[16%] px-4 py-3 text-center'>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className='border-t border-[color:var(--border)]'>
                        <td className='truncate px-4 py-3 font-semibold text-[color:var(--ink)]' title={item.name}>{item.name}</td>
                        <td className='px-4 py-3 text-center text-[color:var(--muted)]'>{item.durationHours}</td>
                        <td className='px-4 py-3 text-[color:var(--muted)]'>{formatCurrency(Number(item.price))}</td>
                        <td className='px-4 py-3 text-[color:var(--muted)]'>{modalityOptions.find((m) => m.value === item.modality)?.label || item.modality}</td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center justify-center gap-2'>
                            <button type='button' onClick={() => openMode('view', item)} className={`${actionButtonClass} bg-[color:var(--bg-strong)] text-[color:var(--primary)] hover:bg-white`} title='Visualizar'><IconEye /></button>
                            <button type='button' onClick={() => openMode('edit', item)} className={`${actionButtonClass} bg-[#eef5f7] text-[color:var(--primary)] hover:bg-white`} title='Editar'><IconEdit /></button>
                            <button type='button' onClick={() => openMode('delete', item)} className={`${actionButtonClass} bg-[#f8eff2] text-[#8a3b4a] hover:bg-white`} title='Excluir'><IconTrash /></button>
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
              <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3a36]'>Consulta de tipo de treinamento</p>
              <h3 className='mt-1 text-xl font-semibold text-[#0e3a36]'>{selected.name}</h3>
            </div>
            <button type='button' onClick={backToList} className='rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)]'>Voltar</button>
          </div>
          <div className='grid gap-3 p-6 text-sm text-[#0e3a36] md:grid-cols-2'>
            <div>Público-alvo: {selected.targetAudience}</div><div>Modalidade: {modalityOptions.find((m) => m.value === selected.modality)?.label || selected.modality}</div>
            <div>Duração: {selected.durationHours} h</div><div>Validade: {selected.validityDays} dias</div>
            <div>Obrigatório: {selected.isMandatory ? 'Sim' : 'Não'}</div><div>Valor: {formatCurrency(Number(selected.price))}</div>
            <div className='md:col-span-2'>Material didático: {selected.didacticMaterial || '-'}</div><div className='md:col-span-2'>Descrição: {selected.description || '-'}</div>
          </div>
        </section>
      )}

      {mode === 'edit' && selected && (
        <section className='rounded-3xl border border-[#c5e2e2] bg-[#E0F0F0]/90'>
          <div className='flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-6 py-5'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3a36]'>Edição de tipo de treinamento</p>
              <h3 className='mt-1 text-xl font-semibold text-[#0e3a36]'>{selected.name}</h3>
            </div>
            <button type='button' onClick={backToList} className='rounded-xl border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)]'>Voltar</button>
          </div>
          <form className='grid gap-4 p-6 md:grid-cols-2' onSubmit={handleUpdate}>
            <input type='text' value={editForm.name} onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm md:col-span-2' required />
            <select value={editForm.modality} onChange={(event) => setEditForm((prev) => ({ ...prev, modality: event.target.value as TrainingModality }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'>{modalityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            <input type='text' value={editForm.targetAudience} onChange={(event) => setEditForm((prev) => ({ ...prev, targetAudience: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm' required />
            <textarea value={editForm.description} onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm md:col-span-2' rows={2} />
            <input type='number' min={1} value={editForm.durationHours} onChange={(event) => setEditForm((prev) => ({ ...prev, durationHours: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm' required />
            <input type='text' inputMode='numeric' value={editForm.price} onChange={(event) => setEditForm((prev) => ({ ...prev, price: maskCurrencyInput(event.target.value) }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm' required />
            <input type='text' value={editForm.didacticMaterial} onChange={(event) => setEditForm((prev) => ({ ...prev, didacticMaterial: event.target.value }))} placeholder='Material didático' className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm' />
            <select value={editForm.isMandatory ? 'true' : 'false'} onChange={(event) => setEditForm((prev) => ({ ...prev, isMandatory: event.target.value === 'true' }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'><option value='true'>Obrigatório</option><option value='false'>Não obrigatório</option></select>
            <input type='number' min={1} value={editForm.validityDays} onChange={(event) => setEditForm((prev) => ({ ...prev, validityDays: event.target.value }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm' required />
            <select value={editForm.isActive ? 'true' : 'false'} onChange={(event) => setEditForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))} className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'><option value='true'>Ativo</option><option value='false'>Inativo</option></select>
            <div className='md:col-span-2 flex justify-end gap-2'><button type='button' onClick={backToList} className='rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)]'>Cancelar</button><button type='submit' className='rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white'>Salvar</button></div>
          </form>
        </section>
      )}

      {mode === 'delete' && selected && (
        <section className='rounded-3xl border border-red-200 bg-white shadow-[0_24px_60px_-35px_rgba(15,35,45,0.5)]'>
          <div className='flex items-center justify-between border-b border-red-200 bg-red-50 px-6 py-5'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.14em] text-red-700'>Exclusão de treinamento</p>
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
                Você está prestes a excluir ou desativar o treinamento <strong>{selected.name}</strong>.
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

