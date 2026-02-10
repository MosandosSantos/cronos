'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/format';
import { adminNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

type LeadStage = 'LEAD' | 'CONTATO' | 'PROPOSTA' | 'NEGOCIACAO' | 'FECHADO';
type LeadStatus = 'ABERTO' | 'GANHO' | 'PERDIDO';
type ActivityType = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'MEETING' | 'VISIT' | 'NOTE';
type TaskStatus = 'OPEN' | 'DONE';
type ProposalStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';

type LeadActivity = {
  id: string;
  type: ActivityType;
  title?: string | null;
  description?: string | null;
  createdAt: string;
};

type LeadTask = {
  id: string;
  title: string;
  description?: string | null;
  dueAt: string;
  status: TaskStatus;
};

type LeadProposal = {
  id: string;
  status: ProposalStatus;
  value?: number | string | null;
  description?: string | null;
  sentAt?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
};

type LeadAttachment = {
  id: string;
  url: string;
  filename: string;
  uploadedAt: string;
};

type LeadDetails = {
  id: string;
  companyName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  source?: string | null;
  tags?: string[];
  stage: LeadStage;
  status: LeadStatus;
  closeReason?: string | null;
  estimatedValue?: number | string | null;
  nextStep?: string | null;
  nextStepAt?: string | null;
  owner?: { id: string; email: string };
  activities: LeadActivity[];
  tasks: LeadTask[];
  proposals: LeadProposal[];
  attachments: LeadAttachment[];
  stageHistory: Array<{
    id: string;
    fromStage?: LeadStage | null;
    toStage: LeadStage;
    changedAt: string;
  }>;
};

const stageOptions: LeadStage[] = ['LEAD', 'CONTATO', 'PROPOSTA', 'NEGOCIACAO', 'FECHADO'];
const activityOptions: ActivityType[] = ['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'VISIT', 'NOTE'];
const proposalOptions: ProposalStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'];

export default function LeadDetailsPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const leadId = params?.id;

  const [lead, setLead] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [newActivity, setNewActivity] = useState({
    type: 'CALL' as ActivityType,
    title: '',
    description: '',
  });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueAt: '',
  });
  const [newProposal, setNewProposal] = useState({
    status: 'DRAFT' as ProposalStatus,
    value: '',
    description: '',
    sentAt: '',
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [nextStage, setNextStage] = useState<LeadStage>('LEAD');
  const [summaryForm, setSummaryForm] = useState({
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

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  const loadLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ data: LeadDetails }>(`/crm/leads/${leadId}`, { auth: true });
      setLead(response.data);
      setNextStage(response.data.stage);
      setSummaryForm({
        companyName: response.data.companyName || '',
        contactName: response.data.contactName || '',
        phone: response.data.phone || '',
        email: response.data.email || '',
        city: response.data.city || '',
        source: response.data.source || '',
        tags: (response.data.tags || []).join(', '),
        estimatedValue:
          response.data.estimatedValue == null ? '' : String(response.data.estimatedValue),
        nextStep: response.data.nextStep || '',
        nextStepAt: response.data.nextStepAt ? response.data.nextStepAt.slice(0, 16) : '',
      });
    } catch (loadError) {
      setLead(null);
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar lead.');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLead();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadLead]);

  const resetNotices = () => {
    setMessage(null);
    setError(null);
  };

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    resetNotices();
    try {
      await action();
      setMessage(successMessage);
      await loadLead();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Erro ao executar acao.');
    }
  };

  const handleSaveSummary = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadId) return;
    setUpdating(true);
    await runAction(async () => {
      const estimatedValue =
        summaryForm.estimatedValue.trim() === '' ? null : Number(summaryForm.estimatedValue);
      if (estimatedValue != null && (!Number.isFinite(estimatedValue) || estimatedValue < 0)) {
        throw new Error('Valor estimado invalido.');
      }
      await apiFetch(`/crm/leads/${leadId}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify({
          companyName: summaryForm.companyName,
          contactName: summaryForm.contactName || null,
          phone: summaryForm.phone || null,
          email: summaryForm.email || null,
          city: summaryForm.city || null,
          source: summaryForm.source || null,
          tags: summaryForm.tags || null,
          estimatedValue,
          nextStep: summaryForm.nextStep || null,
          nextStepAt: summaryForm.nextStepAt || null,
        }),
      });
    }, 'Resumo atualizado com sucesso.');
    setUpdating(false);
  };

  const handleMoveStage = async () => {
    if (!leadId) return;
    if (nextStage === 'FECHADO') {
      setError('Para fechar, use os botoes Ganho ou Perdido.');
      return;
    }
    await runAction(async () => {
      await apiFetch(`/crm/leads/${leadId}/stage`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ stage: nextStage }),
      });
    }, 'Fase atualizada com sucesso.');
  };

  const handleClose = async (result: 'GANHO' | 'PERDIDO') => {
    if (!leadId) return;
    let reason: string | undefined;
    if (result === 'PERDIDO') {
      const input = window.prompt('Informe o motivo da perda:');
      if (!input || !input.trim()) return;
      reason = input.trim();
    }

    await runAction(async () => {
      await apiFetch(`/crm/leads/${leadId}/close`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ result, reason }),
      });
    }, `Lead fechado como ${result}.`);
  };

  const handleCreateActivity = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadId) return;
    await runAction(async () => {
      await apiFetch(`/crm/leads/${leadId}/activities`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify(newActivity),
      });
      setNewActivity({ type: 'CALL', title: '', description: '' });
    }, 'Atividade registrada.');
  };

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadId) return;
    await runAction(async () => {
      await apiFetch(`/crm/leads/${leadId}/tasks`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description || undefined,
          dueAt: newTask.dueAt,
        }),
      });
      setNewTask({ title: '', description: '', dueAt: '' });
    }, 'Tarefa criada e enviada para Agenda.');
  };

  const handleToggleTask = async (taskId: string, currentStatus: TaskStatus) => {
    await runAction(async () => {
      await apiFetch(`/crm/tasks/${taskId}`, {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify({ status: currentStatus === 'DONE' ? 'OPEN' : 'DONE' }),
      });
    }, 'Status da tarefa atualizado.');
  };

  const handleCreateProposal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadId) return;
    await runAction(async () => {
      const value = newProposal.value.trim() === '' ? undefined : Number(newProposal.value);
      if (value != null && (!Number.isFinite(value) || value < 0)) {
        throw new Error('Valor da proposta invalido.');
      }
      await apiFetch(`/crm/leads/${leadId}/proposals`, {
        method: 'POST',
        auth: true,
        body: JSON.stringify({
          status: newProposal.status,
          value,
          description: newProposal.description || undefined,
          sentAt: newProposal.sentAt || undefined,
        }),
      });
      setNewProposal({ status: 'DRAFT', value: '', description: '', sentAt: '' });
    }, 'Proposta registrada.');
  };

  const handleUploadAttachment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadId || !attachmentFile) return;
    await runAction(async () => {
      const formData = new FormData();
      formData.append('file', attachmentFile);
      await apiFetch(`/crm/leads/${leadId}/attachments`, {
        method: 'POST',
        auth: true,
        body: formData,
      });
      setAttachmentFile(null);
    }, 'Anexo enviado com sucesso.');
  };

  const timeline = useMemo(() => lead?.activities ?? [], [lead]);

  return (
    <AppShell navItems={adminNavItems} title='CRM' subtitle='Detalhe do lead' onLogout={handleLogout}>
      <section className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-[color:var(--ink)]'>{lead?.companyName || 'Lead'}</h2>
          <p className='text-sm text-[color:var(--muted)]'>
            Fase: {lead?.stage || '-'} | Status: {lead?.status || '-'}
          </p>
        </div>
        <Link
          href='/admin/crm'
          className='rounded-xl border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--muted)]'
        >
          Voltar ao Kanban
        </Link>
      </section>

      {message && (
        <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          {message}
        </p>
      )}
      {error && (
        <p className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</p>
      )}

      {loading && (
        <section className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-700'>
          Carregando lead...
        </section>
      )}

      {!loading && !lead && (
        <section className='rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700'>
          Lead nao encontrado.
        </section>
      )}

      {!loading && lead && (
        <>
          <section className='rounded-3xl border border-[color:var(--border)] bg-white'>
            <div className='flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-6 py-4'>
              <p className='text-sm font-semibold text-emerald-900'>Resumo</p>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => void handleClose('GANHO')}
                  className='rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800'
                >
                  Fechar como GANHO
                </button>
                <button
                  type='button'
                  onClick={() => void handleClose('PERDIDO')}
                  className='rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-800'
                >
                  Fechar como PERDIDO
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSummary} className='grid gap-4 p-6 md:grid-cols-2'>
              <input
                type='text'
                value={summaryForm.companyName}
                onChange={(event) => setSummaryForm((prev) => ({ ...prev, companyName: event.target.value }))}
                placeholder='Empresa'
                className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                required
              />
              <input
                type='text'
                value={summaryForm.contactName}
                onChange={(event) => setSummaryForm((prev) => ({ ...prev, contactName: event.target.value }))}
                placeholder='Contato'
                className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
              />
              <input
                type='text'
                value={summaryForm.phone}
                onChange={(event) => setSummaryForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder='Telefone'
                className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
              />
              <input
                type='email'
                value={summaryForm.email}
                onChange={(event) => setSummaryForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder='E-mail'
                className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
              />
              <input
                type='text'
                value={summaryForm.city}
                onChange={(event) => setSummaryForm((prev) => ({ ...prev, city: event.target.value }))}
                placeholder='Cidade'
                className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
              />
              <input
                type='text'
                value={summaryForm.source}
                onChange={(event) => setSummaryForm((prev) => ({ ...prev, source: event.target.value }))}
                placeholder='Origem'
                className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
              />
              <input
                type='text'
                value={summaryForm.tags}
                onChange={(event) => setSummaryForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder='Tags (separadas por virgula)'
                className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
              />
              <input
                type='number'
                min={0}
                step='0.01'
                value={summaryForm.estimatedValue}
                onChange={(event) => setSummaryForm((prev) => ({ ...prev, estimatedValue: event.target.value }))}
                placeholder='Valor estimado'
                className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
              />
              <input
                type='text'
                value={summaryForm.nextStep}
                onChange={(event) => setSummaryForm((prev) => ({ ...prev, nextStep: event.target.value }))}
                placeholder='Proximo passo'
                className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
              />
              <input
                type='datetime-local'
                value={summaryForm.nextStepAt}
                onChange={(event) => setSummaryForm((prev) => ({ ...prev, nextStepAt: event.target.value }))}
                className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
              />
              <div className='flex items-center gap-2'>
                <select
                  value={nextStage}
                  onChange={(event) => setNextStage(event.target.value as LeadStage)}
                  className='w-full rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                >
                  {stageOptions.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  onClick={() => void handleMoveStage()}
                  className='rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)]'
                >
                  Mover
                </button>
              </div>

              <div className='md:col-span-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--muted)]'>
                <span>Valor atual: {formatCurrency(lead.estimatedValue)}</span>
                <span>Proximo passo: {lead.nextStep || '-'}</span>
                <span>Data: {formatDate(lead.nextStepAt)}</span>
                <button
                  type='submit'
                  disabled={updating}
                  className='rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70'
                >
                  {updating ? 'Salvando...' : 'Salvar resumo'}
                </button>
              </div>
            </form>
          </section>

          <section className='grid gap-6 xl:grid-cols-2'>
            <div className='rounded-3xl border border-[color:var(--border)] bg-white p-6'>
              <h3 className='text-lg font-semibold text-[color:var(--ink)]'>Atividades (timeline)</h3>
              <form onSubmit={handleCreateActivity} className='mt-4 grid gap-3'>
                <select
                  value={newActivity.type}
                  onChange={(event) =>
                    setNewActivity((prev) => ({ ...prev, type: event.target.value as ActivityType }))
                  }
                  className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                >
                  {activityOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input
                  type='text'
                  value={newActivity.title}
                  onChange={(event) => setNewActivity((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder='Titulo curto'
                  className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                />
                <textarea
                  value={newActivity.description}
                  onChange={(event) => setNewActivity((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder='Descricao'
                  rows={3}
                  className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                />
                <button type='submit' className='rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white'>
                  Adicionar atividade
                </button>
              </form>

              <div className='mt-5 space-y-3'>
                {timeline.map((activity) => (
                  <div key={activity.id} className='rounded-xl border border-[color:var(--border)] bg-[#f8fbfc] p-3'>
                    <p className='text-xs font-semibold text-[color:var(--muted)]'>
                      {activity.type} - {formatDate(activity.createdAt)}
                    </p>
                    <p className='mt-1 text-sm font-semibold text-[color:var(--ink)]'>{activity.title || '-'}</p>
                    <p className='mt-1 text-sm text-[color:var(--muted)]'>{activity.description || '-'}</p>
                  </div>
                ))}
                {!timeline.length && <p className='text-sm text-[color:var(--muted)]'>Sem atividades registradas.</p>}
              </div>
            </div>

            <div className='rounded-3xl border border-[color:var(--border)] bg-white p-6'>
              <h3 className='text-lg font-semibold text-[color:var(--ink)]'>Tarefas e proximos passos</h3>
              <form onSubmit={handleCreateTask} className='mt-4 grid gap-3'>
                <input
                  type='text'
                  value={newTask.title}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder='Titulo da tarefa'
                  className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                  required
                />
                <textarea
                  value={newTask.description}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder='Descricao'
                  rows={2}
                  className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                />
                <input
                  type='datetime-local'
                  value={newTask.dueAt}
                  onChange={(event) => setNewTask((prev) => ({ ...prev, dueAt: event.target.value }))}
                  className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                  required
                />
                <button type='submit' className='rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white'>
                  Criar tarefa
                </button>
              </form>

              <div className='mt-5 space-y-3'>
                {lead.tasks.map((task) => (
                  <div key={task.id} className='flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[#f8fbfc] p-3'>
                    <div>
                      <p className='text-sm font-semibold text-[color:var(--ink)]'>{task.title}</p>
                      <p className='text-xs text-[color:var(--muted)]'>Vencimento: {formatDate(task.dueAt)}</p>
                    </div>
                    <button
                      type='button'
                      onClick={() => void handleToggleTask(task.id, task.status)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        task.status === 'DONE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {task.status === 'DONE' ? 'Concluida' : 'Aberta'}
                    </button>
                  </div>
                ))}
                {!lead.tasks.length && <p className='text-sm text-[color:var(--muted)]'>Sem tarefas cadastradas.</p>}
              </div>
            </div>
          </section>

          <section className='grid gap-6 xl:grid-cols-2'>
            <div className='rounded-3xl border border-[color:var(--border)] bg-white p-6'>
              <h3 className='text-lg font-semibold text-[color:var(--ink)]'>Propostas</h3>
              <form onSubmit={handleCreateProposal} className='mt-4 grid gap-3'>
                <select
                  value={newProposal.status}
                  onChange={(event) =>
                    setNewProposal((prev) => ({ ...prev, status: event.target.value as ProposalStatus }))
                  }
                  className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                >
                  {proposalOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  type='number'
                  min={0}
                  step='0.01'
                  value={newProposal.value}
                  onChange={(event) => setNewProposal((prev) => ({ ...prev, value: event.target.value }))}
                  placeholder='Valor'
                  className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                />
                <input
                  type='datetime-local'
                  value={newProposal.sentAt}
                  onChange={(event) => setNewProposal((prev) => ({ ...prev, sentAt: event.target.value }))}
                  className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                />
                <textarea
                  value={newProposal.description}
                  onChange={(event) => setNewProposal((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder='Descricao'
                  rows={2}
                  className='rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm'
                />
                <button type='submit' className='rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white'>
                  Registrar proposta
                </button>
              </form>

              <div className='mt-5 space-y-3'>
                {lead.proposals.map((proposal) => (
                  <div key={proposal.id} className='rounded-xl border border-[color:var(--border)] bg-[#f8fbfc] p-3'>
                    <p className='text-xs font-semibold text-[color:var(--muted)]'>{proposal.status}</p>
                    <p className='mt-1 text-sm font-semibold text-[color:var(--ink)]'>
                      {formatCurrency(proposal.value)}
                    </p>
                    <p className='text-xs text-[color:var(--muted)]'>Envio: {formatDate(proposal.sentAt || null)}</p>
                    <p className='mt-1 text-sm text-[color:var(--muted)]'>{proposal.description || '-'}</p>
                  </div>
                ))}
                {!lead.proposals.length && <p className='text-sm text-[color:var(--muted)]'>Sem propostas registradas.</p>}
              </div>
            </div>

            <div className='rounded-3xl border border-[color:var(--border)] bg-white p-6'>
              <h3 className='text-lg font-semibold text-[color:var(--ink)]'>Anexos</h3>
              <form onSubmit={handleUploadAttachment} className='mt-4 flex flex-wrap items-center gap-2'>
                <input
                  type='file'
                  onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)}
                  className='rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm'
                />
                <button
                  type='submit'
                  disabled={!attachmentFile}
                  className='rounded-xl bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70'
                >
                  Enviar
                </button>
              </form>

              <div className='mt-5 space-y-2'>
                {lead.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target='_blank'
                    rel='noreferrer'
                    className='block rounded-xl border border-[color:var(--border)] bg-[#f8fbfc] px-3 py-2 text-sm text-[color:var(--ink)]'
                  >
                    {attachment.filename} - {formatDate(attachment.uploadedAt)}
                  </a>
                ))}
                {!lead.attachments.length && <p className='text-sm text-[color:var(--muted)]'>Sem anexos.</p>}
              </div>
            </div>
          </section>

          <section className='rounded-3xl border border-[color:var(--border)] bg-white p-6'>
            <h3 className='text-lg font-semibold text-[color:var(--ink)]'>Historico de fases</h3>
            <div className='mt-4 overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-emerald-50 text-left text-[11px] uppercase tracking-[0.13em] text-emerald-800'>
                    <th className='px-4 py-3'>De</th>
                    <th className='px-4 py-3'>Para</th>
                    <th className='px-4 py-3'>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {lead.stageHistory.map((item) => (
                    <tr key={item.id} className='border-t border-[color:var(--border)]'>
                      <td className='px-4 py-3 text-[color:var(--muted)]'>{item.fromStage || '-'}</td>
                      <td className='px-4 py-3 font-semibold text-[color:var(--ink)]'>{item.toStage}</td>
                      <td className='px-4 py-3 text-[color:var(--muted)]'>{formatDate(item.changedAt)}</td>
                    </tr>
                  ))}
                  {!lead.stageHistory.length && (
                    <tr>
                      <td colSpan={3} className='px-4 py-4 text-[color:var(--muted)]'>
                        Sem historico de mudancas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
