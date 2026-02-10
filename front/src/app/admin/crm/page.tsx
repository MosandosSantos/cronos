'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/format';
import { adminNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

type LeadStage = 'LEAD' | 'CONTATO' | 'PROPOSTA' | 'NEGOCIACAO' | 'FECHADO';
type LeadStatus = 'ABERTO' | 'GANHO' | 'PERDIDO';

type LeadCard = {
  id: string;
  companyName: string;
  contactName?: string | null;
  phone?: string | null;
  city?: string | null;
  source?: string | null;
  tags?: string[];
  stage: LeadStage;
  status: LeadStatus;
  estimatedValue?: number | null;
  nextStep?: string | null;
  nextStepAt?: string | null;
  daysStale: number;
  owner?: { id: string; email: string };
  lastActivity?: { type: string; title?: string | null; createdAt: string } | null;
};

type FilterState = {
  q: string;
  ownerId: string;
  source: string;
  tag: string;
  city: string;
  createdFrom: string;
  createdTo: string;
  staleDaysGt: string;
};

type LeadFormState = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  tags: string;
  estimatedValue: string;
  nextStep: string;
  nextStepAt: string;
};

const stages: Array<{ id: LeadStage; label: string }> = [
  { id: 'LEAD', label: 'Lead' },
  { id: 'CONTATO', label: 'Contato' },
  { id: 'PROPOSTA', label: 'Proposta' },
  { id: 'NEGOCIACAO', label: 'Negociacao' },
  { id: 'FECHADO', label: 'Fechado' },
];

const initialForm = (): LeadFormState => ({
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  city: '',
  source: '',
  tags: '',
  estimatedValue: '',
  nextStep: '',
  nextStepAt: '',
});

export default function CrmKanbanPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();

  const [leads, setLeads] = useState<LeadCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    q: '',
    ownerId: '',
    source: '',
    tag: '',
    city: '',
    createdFrom: '',
    createdTo: '',
    staleDaysGt: '',
  });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<LeadFormState>(initialForm());
  const [creating, setCreating] = useState(false);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (filters.q.trim()) params.set('q', filters.q.trim());
    if (filters.ownerId) params.set('ownerId', filters.ownerId);
    if (filters.source.trim()) params.set('source', filters.source.trim());
    if (filters.tag.trim()) params.set('tag', filters.tag.trim());
    if (filters.city.trim()) params.set('city', filters.city.trim());
    if (filters.createdFrom) params.set('createdFrom', `${filters.createdFrom}T00:00:00`);
    if (filters.createdTo) params.set('createdTo', `${filters.createdTo}T23:59:59`);
    if (filters.staleDaysGt.trim()) params.set('staleDaysGt', filters.staleDaysGt.trim());

    const suffix = params.toString() ? `?${params.toString()}` : '';

    try {
      const response = await apiFetch<{ data: LeadCard[] }>(`/crm/leads${suffix}`, { auth: true });
      setLeads(response.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar o CRM.');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLeads();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadLeads]);

  const ownerOptions = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach((lead) => {
      if (lead.owner?.id && lead.owner?.email) map.set(lead.owner.id, lead.owner.email);
    });
    return Array.from(map.entries()).map(([id, email]) => ({ id, email }));
  }, [leads]);

  const grouped = useMemo(() => {
    const groups = new Map<LeadStage, LeadCard[]>();
    stages.forEach((stage) => groups.set(stage.id, []));
    leads.forEach((lead) => {
      const current = groups.get(lead.stage);
      if (current) current.push(lead);
    });
    return groups;
  }, [leads]);

  const summary = useMemo(() => {
    const total = leads.length;
    const open = leads.filter((lead) => lead.status === 'ABERTO').length;
    const won = leads.filter((lead) => lead.status === 'GANHO').length;
    const lost = leads.filter((lead) => lead.status === 'PERDIDO').length;
    return { total, open, won, lost };
  }, [leads]);

  const clearFilters = () => {
    setFilters({
      q: '',
      ownerId: '',
      source: '',
      tag: '',
      city: '',
      createdFrom: '',
      createdTo: '',
      staleDaysGt: '',
    });
  };

  const handleCreateLead = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setCreating(true);
    try {
      const estimatedValue =
        createForm.estimatedValue.trim() === '' ? undefined : Number(createForm.estimatedValue);
      if (estimatedValue != null && (!Number.isFinite(estimatedValue) || estimatedValue < 0)) {
        throw new Error('Valor estimado invalido.');
      }

      await apiFetch('/crm/leads', {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          companyName: createForm.companyName,
          contactName: createForm.contactName || undefined,
          phone: createForm.phone || undefined,
          email: createForm.email || undefined,
          city: createForm.city || undefined,
          source: createForm.source || undefined,
          tags: createForm.tags || undefined,
          estimatedValue,
          nextStep: createForm.nextStep || undefined,
          nextStepAt: createForm.nextStepAt || undefined,
        }),
      });
      setCreateForm(initialForm());
      setShowCreate(false);
      setMessage('Lead criado com sucesso.');
      await loadLeads();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Erro ao criar lead.');
    } finally {
      setCreating(false);
    }
  };

  const moveLead = async (leadId: string, nextStage: LeadStage) => {
    if (nextStage === 'FECHADO') {
      setError('Para fechar, use os botoes Ganho ou Perdido no card.');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/crm/leads/${leadId}/stage`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ stage: nextStage }),
      });
      setMessage('Lead movido com sucesso.');
      await loadLeads();
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : 'Erro ao mover lead.');
    }
  };

  const quickEditLead = async (lead: LeadCard) => {
    const companyName = window.prompt('Empresa:', lead.companyName);
    if (!companyName || !companyName.trim()) return;
    const contactName = window.prompt('Contato:', lead.contactName || '') ?? '';
    const estimated = window.prompt(
      'Valor estimado (numero):',
      lead.estimatedValue == null ? '' : String(lead.estimatedValue)
    );

    let estimatedValue: number | null = null;
    if (estimated != null && estimated.trim() !== '') {
      const parsed = Number(estimated);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError('Valor estimado invalido.');
        return;
      }
      estimatedValue = parsed;
    }

    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/crm/leads/${lead.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactName: contactName.trim() || null,
          estimatedValue,
        }),
      });
      setMessage('Lead atualizado com sucesso.');
      await loadLeads();
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : 'Erro ao atualizar lead.');
    }
  };

  const closeLead = async (leadId: string, result: Exclude<LeadStatus, 'ABERTO'>) => {
    setError(null);
    setMessage(null);
    try {
      let reason: string | undefined;
      if (result === 'PERDIDO') {
        const input = window.prompt('Informe o motivo da perda:');
        if (!input || !input.trim()) return;
        reason = input.trim();
      }

      await apiFetch(`/crm/leads/${leadId}/close`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ result, reason }),
      });
      setMessage(`Lead fechado como ${result === 'GANHO' ? 'GANHO' : 'PERDIDO'}.`);
      await loadLeads();
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : 'Erro ao fechar lead.');
    }
  };

  return (
    <AppShell navItems={adminNavItems} title='CRM' subtitle='Kanban de leads' onLogout={handleLogout}>
      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <div className='rounded-2xl border border-[#c5e2e2] bg-[#E0F0F0]/90 px-5 py-4'>
          <p className='text-xs uppercase tracking-[0.14em] text-[#0e3a36]'>Leads</p>
          <p className='mt-2 text-3xl font-semibold text-[#0e3a36]'>{summary.total}</p>
        </div>
        <div className='rounded-2xl border border-[#c5e2e2] bg-[#E0F0F0]/90 px-5 py-4'>
          <p className='text-xs uppercase tracking-[0.14em] text-[#0e3a36]'>Abertos</p>
          <p className='mt-2 text-3xl font-semibold text-[#0e3a36]'>{summary.open}</p>
        </div>
        <div className='rounded-2xl border border-[#c5e2e2] bg-[#E0F0F0]/90 px-5 py-4'>
          <p className='text-xs uppercase tracking-[0.14em] text-[#0e3a36]'>Ganhos</p>
          <p className='mt-2 text-3xl font-semibold text-[#0e3a36]'>{summary.won}</p>
        </div>
        <div className='rounded-2xl border border-[#c5e2e2] bg-[#E0F0F0]/90 px-5 py-4'>
          <p className='text-xs uppercase tracking-[0.14em] text-[#0e3a36]'>Perdidos</p>
          <p className='mt-2 text-3xl font-semibold text-[#0e3a36]'>{summary.lost}</p>
        </div>
      </section>

      {message && (
        <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          {message}
        </p>
      )}
      {error && (
        <p className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</p>
      )}

      <section className='glass-panel rounded-3xl p-6'>
        <div className='grid gap-4 lg:grid-cols-[1.4fr_repeat(7,minmax(0,1fr))_auto]'>
          <input
            type='text'
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
            placeholder='Buscar por empresa, contato, telefone ou e-mail'
            className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
          />
          <select
            value={filters.ownerId}
            onChange={(event) => setFilters((prev) => ({ ...prev, ownerId: event.target.value }))}
            className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
          >
            <option value=''>Responsavel</option>
            {ownerOptions.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.email}
              </option>
            ))}
          </select>
          <input
            type='text'
            value={filters.source}
            onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
            placeholder='Origem'
            className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
          />
          <input
            type='text'
            value={filters.tag}
            onChange={(event) => setFilters((prev) => ({ ...prev, tag: event.target.value }))}
            placeholder='Tag'
            className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
          />
          <input
            type='text'
            value={filters.city}
            onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
            placeholder='Cidade'
            className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
          />
          <input
            type='date'
            value={filters.createdFrom}
            onChange={(event) => setFilters((prev) => ({ ...prev, createdFrom: event.target.value }))}
            className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
          />
          <input
            type='date'
            value={filters.createdTo}
            onChange={(event) => setFilters((prev) => ({ ...prev, createdTo: event.target.value }))}
            className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
          />
          <input
            type='number'
            min={0}
            value={filters.staleDaysGt}
            onChange={(event) => setFilters((prev) => ({ ...prev, staleDaysGt: event.target.value }))}
            placeholder='Parado > X dias'
            className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
          />
          <button
            type='button'
            onClick={clearFilters}
            className='rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)]'
          >
            Limpar
          </button>
        </div>

        <div className='mt-4 flex flex-wrap items-center gap-2'>
          <button
            type='button'
            onClick={() => setShowCreate((prev) => !prev)}
            className='rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white'
          >
            {showCreate ? 'Fechar formulario' : 'Criar lead'}
          </button>
          <button
            type='button'
            onClick={() => void loadLeads()}
            className='rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--muted)]'
          >
            Atualizar
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreateLead} className='mt-5 grid gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-4 md:grid-cols-2'>
            <input
              type='text'
              value={createForm.companyName}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, companyName: event.target.value }))}
              placeholder='Empresa *'
              className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
              required
            />
            <input
              type='text'
              value={createForm.contactName}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, contactName: event.target.value }))}
              placeholder='Contato'
              className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
            />
            <input
              type='text'
              value={createForm.phone}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
              placeholder='Telefone'
              className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
            />
            <input
              type='email'
              value={createForm.email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder='E-mail'
              className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
            />
            <input
              type='text'
              value={createForm.city}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, city: event.target.value }))}
              placeholder='Cidade'
              className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
            />
            <input
              type='text'
              value={createForm.source}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, source: event.target.value }))}
              placeholder='Origem'
              className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
            />
            <input
              type='text'
              value={createForm.tags}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, tags: event.target.value }))}
              placeholder='Tags (separadas por virgula)'
              className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
            />
            <input
              type='number'
              min={0}
              step='0.01'
              value={createForm.estimatedValue}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, estimatedValue: event.target.value }))}
              placeholder='Valor estimado'
              className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
            />
            <input
              type='text'
              value={createForm.nextStep}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, nextStep: event.target.value }))}
              placeholder='Proximo passo'
              className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
            />
            <input
              type='datetime-local'
              value={createForm.nextStepAt}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, nextStepAt: event.target.value }))}
              className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm md:col-span-2'
            />
            <div className='md:col-span-2 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setShowCreate(false);
                  setCreateForm(initialForm());
                }}
                className='rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)]'
              >
                Cancelar
              </button>
              <button
                type='submit'
                disabled={creating}
                className='rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-70'
              >
                {creating ? 'Salvando...' : 'Salvar lead'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className='overflow-x-auto'>
        <div className='grid min-w-[1260px] grid-cols-5 gap-4'>
          {stages.map((stage) => {
            const stageLeads = grouped.get(stage.id) ?? [];
            return (
              <div
                key={stage.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggingLeadId) {
                    void moveLead(draggingLeadId, stage.id);
                  }
                  setDraggingLeadId(null);
                }}
                className='rounded-2xl border border-[color:var(--border)] bg-white/80 p-3'
              >
                <div className='flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2'>
                  <p className='text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800'>{stage.label}</p>
                  <span className='rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[color:var(--muted)]'>
                    {stageLeads.length}
                  </span>
                </div>
                <div className='mt-3 space-y-3'>
                  {loading && stage.id === 'LEAD' && (
                    <p className='rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700'>
                      Carregando...
                    </p>
                  )}
                  {!loading &&
                    stageLeads.map((lead) => (
                      <article
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggingLeadId(lead.id)}
                        className='rounded-xl border border-[color:var(--border)] bg-white p-3 shadow-sm'
                      >
                        <Link href={`/admin/crm/leads/${lead.id}`} className='block'>
                          <h3 className='text-sm font-semibold text-[color:var(--ink)]'>{lead.companyName}</h3>
                          <p className='mt-1 text-xs text-[color:var(--muted)]'>{lead.contactName || 'Sem contato'}</p>
                        </Link>

                        <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
                          {lead.phone && (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                              target='_blank'
                              rel='noreferrer'
                              className='rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700'
                            >
                              WhatsApp
                            </a>
                          )}
                          <span className='rounded-full bg-slate-100 px-2 py-1 text-[color:var(--muted)]'>
                            {lead.city || 'Sem cidade'}
                          </span>
                          <span className='rounded-full bg-slate-100 px-2 py-1 text-[color:var(--muted)]'>
                            {lead.source || 'Sem origem'}
                          </span>
                          {(lead.tags || []).slice(0, 2).map((tag) => (
                            <span key={tag} className='rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-800'>
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <div className='mt-3 space-y-1 text-xs text-[color:var(--muted)]'>
                          <p>Valor: {formatCurrency(lead.estimatedValue ?? null)}</p>
                          <p>
                            Ultima atividade:{' '}
                            {lead.lastActivity ? `${lead.lastActivity.type} (${formatDate(lead.lastActivity.createdAt)})` : '-'}
                          </p>
                          <p>Proximo passo: {lead.nextStep || '-'}</p>
                          <p>Data do proximo passo: {formatDate(lead.nextStepAt || null)}</p>
                          <p className='font-semibold text-amber-700'>Dias parado: {lead.daysStale}</p>
                        </div>

                        <div className='mt-3 grid grid-cols-2 gap-2'>
                          <button
                            type='button'
                            onClick={() => void quickEditLead(lead)}
                            className='rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-800'
                          >
                            Edicao rapida
                          </button>
                          <button
                            type='button'
                            onClick={() => void closeLead(lead.id, 'GANHO')}
                            className='rounded-lg bg-emerald-100 px-2 py-1.5 text-xs font-semibold text-emerald-800'
                          >
                            Ganho
                          </button>
                          <button
                            type='button'
                            onClick={() => void closeLead(lead.id, 'PERDIDO')}
                            className='rounded-lg bg-red-100 px-2 py-1.5 text-xs font-semibold text-red-800'
                          >
                            Perdido
                          </button>
                        </div>
                      </article>
                    ))}

                  {!loading && stageLeads.length === 0 && (
                    <p className='rounded-xl border border-dashed border-[color:var(--border)] px-3 py-3 text-center text-xs text-[color:var(--muted)]'>
                      Sem leads nesta fase.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

