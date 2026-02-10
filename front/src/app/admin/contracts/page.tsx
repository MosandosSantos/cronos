'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/format';
import { adminNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

type Client = { id: string; fullName: string; email: string };

type Contract = {
  id: string;
  client: Client | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED' | 'EXPIRED';
  startDate: string;
  endDate: string | null;
  contractValue: number;
  employeeLimit: number | null;
  contractName?: string | null;
};

const statusLabel: Record<Contract['status'], string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  CANCELED: 'Cancelado',
  EXPIRED: 'Expirado',
};

const statusBadgeClass: Record<Contract['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PAUSED: 'bg-amber-100 text-amber-800',
  CANCELED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-zinc-200 text-zinc-700',
};

export default function ContractsPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Contract['status']>('ALL');
  const [loading, setLoading] = useState(true);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const query = params.toString();
      const response = await apiFetch<{ data: Contract[] }>(`/contracts${query ? `?${query}` : ''}`, { auth: true });
      setContracts(response.data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);


  const filteredContracts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((item) => {
      const bySearch = !q || (item.client?.fullName || '').toLowerCase().includes(q);
      const byStatus = statusFilter === 'ALL' || item.status === statusFilter;
      return bySearch && byStatus;
    });
  }, [contracts, search, statusFilter]);

  const kpis = useMemo(() => {
    const activeContracts = contracts.filter((item) => item.status === 'ACTIVE');
    const totalValue = activeContracts.reduce((acc, item) => acc + Number(item.contractValue || 0), 0);
    return {
      total: contracts.length,
      active: activeContracts.length,
      totalValue,
    };
  }, [contracts]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
  };

  const handlePause = async (id: string) => {
    setSubmitMessage(null);
    setSubmitError(null);
    if (!confirm('Deseja pausar este contrato?')) return;
    try {
      await apiFetch(`/contracts/${id}/pause`, { method: 'POST', auth: true });
      setSubmitMessage('Contrato pausado com sucesso.');
      await load();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao pausar contrato.');
    }
  };

  const handleCancel = async (id: string) => {
    setSubmitMessage(null);
    setSubmitError(null);
    if (!confirm('Deseja cancelar este contrato?')) return;
    try {
      await apiFetch(`/contracts/${id}/cancel`, { method: 'POST', auth: true });
      setSubmitMessage('Contrato cancelado com sucesso.');
      await load();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao cancelar contrato.');
    }
  };

  return (
    <AppShell navItems={adminNavItems} title='Contratos' subtitle='Gestao comercial' onLogout={handleLogout}>
      {submitMessage && (
        <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          {submitMessage}
        </p>
      )}
      {submitError && (
        <p className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{submitError}</p>
      )}

      <section className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-3xl font-semibold text-[color:var(--ink)]'>Todos os contratos</h2>
        <button
          type='button'
          onClick={() => router.push('/admin/contracts/new')}
          className='inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'
        >
          Novo contrato
        </button>
      </section>

      <section className='grid gap-4 md:grid-cols-3'>
        <div className='rounded-2xl kpi-card px-5 py-4'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80'>Total de contratos</p>
          <p className='mt-2 text-4xl font-semibold leading-none text-white'>{kpis.total}</p>
        </div>
        <div className='rounded-2xl kpi-card px-5 py-4'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80'>Contratos ativos</p>
          <p className='mt-2 text-4xl font-semibold leading-none text-white'>{kpis.active}</p>
        </div>
        <div className='rounded-2xl kpi-card px-5 py-4'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-white/80'>Valor ativo</p>
          <p className='mt-2 text-3xl font-semibold leading-none text-white'>{formatCurrency(kpis.totalValue)}</p>
        </div>
      </section>
      <section className='glass-panel rounded-3xl p-6'>
        <div className='grid gap-4 lg:grid-cols-[1.4fr_1fr_auto]'>
          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            Busca rapida
            <input
              type='text'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Buscar por cliente'
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            />
          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>
            Status do contrato
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | Contract['status'])}
              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
            >
              <option value='ALL'>Todos</option>
              {Object.keys(statusLabel).map((status) => (
                <option key={status} value={status}>
                  {statusLabel[status as Contract['status']]}
                </option>
              ))}
            </select>
          </label>

          <button
            type='button'
            onClick={clearFilters}
            className='mt-7 rounded-xl border border-[color:var(--border)] px-4 py-3 text-xs font-semibold text-[color:var(--muted)]'
          >
            Limpar
          </button>
        </div>
      </section>

      <section className='glass-panel rounded-3xl p-6'>
        {loading ? (
          <p className='text-sm text-[color:var(--muted)]'>Carregando...</p>
        ) : (
          <div className='overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-white'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-emerald-50 text-left text-[11px] uppercase tracking-[0.13em] text-emerald-800'>
                  <th className='px-4 py-3'>Cliente</th>
                  <th className='px-4 py-3'>Inicio</th>
                  <th className='px-4 py-3'>Fim</th>
                  <th className='px-4 py-3'>Status contrato</th>
                  <th className='px-4 py-3 text-right'>Valor</th>
                  <th className='px-4 py-3 text-right'>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className='border-t border-[color:var(--border)]'>
                    <td className='px-4 py-3 font-semibold text-[color:var(--ink)]'>
                      {contract.client?.fullName ?? 'Cliente'}
                    </td>
                    <td className='px-4 py-3 text-[color:var(--muted)]'>
                      {formatDate(contract.startDate)}
                    </td>
                    <td className='px-4 py-3 text-[color:var(--muted)]'>
                      {contract.endDate ? formatDate(contract.endDate) : '-'}
                    </td>
                    <td className='px-4 py-3'>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass[contract.status]}`}>
                        {statusLabel[contract.status]}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-right font-semibold text-[color:var(--ink)]'>
                      {formatCurrency(Number(contract.contractValue || 0))}
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex justify-end gap-2'>
                        <button
                          type='button'
                          onClick={() => router.push(`/admin/contracts/${contract.id}/edit`)}
                          className='rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]'
                        >
                          Editar
                        </button>
                        {contract.status === 'ACTIVE' && (
                          <button
                            type='button'
                            onClick={() => void handlePause(contract.id)}
                            className='rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700'
                          >
                            Pausar
                          </button>
                        )}
                        {contract.status !== 'CANCELED' && (
                          <button
                            type='button'
                            onClick={() => void handleCancel(contract.id)}
                            className='rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700'
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredContracts.length && (
                  <tr>
                    <td colSpan={6} className='px-4 py-6 text-center text-[color:var(--muted)]'>
                      Nenhum contrato encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}









