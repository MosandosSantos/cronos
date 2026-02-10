'use client';

import { useEffect, useMemo, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';

const steps = ['Cliente', 'Valores', 'Vigencia', 'Revisao'] as const;

type Client = { id: string; fullName: string; email: string };

type ContractResponse = {
  id: string;
  client: Client | null;
  startDate: string;
  endDate: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CANCELED' | 'EXPIRED';
  contractValue: number;
  employeeLimit: number | null;
  contractName?: string | null;
  billingCycle?: 'MONTHLY' | 'ANNUAL';
};

type WizardProps = {
  mode: 'create' | 'edit';
  contractId?: string;
  onDone?: () => void;
};

export default function ContractWizard({ mode, contractId, onDone }: WizardProps) {
  const [step, setStep] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  const [clientId, setClientId] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [employeeLimit, setEmployeeLimit] = useState('');
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState<ContractResponse['status']>('ACTIVE');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [clientsRes] = await Promise.all([
          apiFetch<{ data: Client[] }>('/clients', { auth: true }),
        ]);
        setClients(clientsRes.data);

        if (!clientId && clientsRes.data.length) {
          setClientId(clientsRes.data[0].id);
        }

        if (mode === 'edit' && contractId) {
          const contractRes = await apiFetch<{ data: ContractResponse }>(`/contracts/${contractId}`, { auth: true });
          const contract = contractRes.data;
          setClientId(contract.client?.id ?? '');
          setContractValue(String(contract.contractValue ?? ''));
          setBillingCycle(contract.billingCycle ?? 'MONTHLY');
          setEmployeeLimit(String(contract.employeeLimit ?? ''));
          setStartDate(contract.startDate.slice(0, 10));
          setEndDate(contract.endDate ? contract.endDate.slice(0, 10) : '');
          setStatus(contract.status);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [mode, contractId, clientId]);

  const totals = useMemo(() => {
    const totalAmount = Number(contractValue || 0);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    let termMonths = 12;
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const yearDiff = end.getFullYear() - start.getFullYear();
      const monthDiff = end.getMonth() - start.getMonth();
      const rawMonths = yearDiff * 12 + monthDiff + 1;
      termMonths = Math.max(1, rawMonths);
    }
    const monthly = billingCycle === 'ANNUAL' ? totalAmount / termMonths : totalAmount;
    return { totalAmount, monthly, termMonths };
  }, [contractValue, billingCycle, startDate, endDate]);

  const handleSubmit = async (nextStatus: ContractResponse['status']) => {
    setSubmitError(null);
    setSubmitMessage(null);

    if (!clientId) {
      setSubmitError('Selecione um cliente.');
      return;
    }
    if (!contractValue) {
      setSubmitError('Informe o valor do contrato.');
      return;
    }
    if (!startDate) {
      setSubmitError('Informe a data de inicio.');
      return;
    }
    if (!employeeLimit) {
      setSubmitError('Informe o limite de funcionarios.');
      return;
    }

    const payload = {
      clientId,
      startDate,
      endDate: endDate || null,
      status: nextStatus,
      contractValue: Number(contractValue),
      billingCycle,
      employeeLimit: employeeLimit ? Number(employeeLimit) : null,
    };

    try {
      if (mode === 'create') {
        await apiFetch('/contracts', {
          method: 'POST',
          auth: true,
          body: JSON.stringify(payload),
        });
        setSubmitMessage('Contrato criado com sucesso.');
      } else if (contractId) {
        await apiFetch(`/contracts/${contractId}`, {
          method: 'PUT',
          auth: true,
          body: JSON.stringify(payload),
        });
        setSubmitMessage('Contrato atualizado com sucesso.');
      }
      if (onDone) onDone();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar contrato.');
    }
  };

  if (loading) {
    return (
      <div className='glass-panel rounded-3xl p-6'>
        <p className='text-sm text-[color:var(--muted)]'>Carregando...</p>
      </div>
    );
  }

  return (
    <div className='grid gap-6 lg:grid-cols-[1.5fr_0.8fr]'>
      <div className='glass-panel rounded-3xl p-6'>
        <div className='flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]'>
          {steps.map((label, index) => (
            <span
              key={label}
              className={`rounded-full px-3 py-1 ${index === step ? 'bg-[color:var(--primary)] text-white' : 'bg-[color:var(--bg-strong)]'}`}
            >
              {index + 1}. {label}
            </span>
          ))}
        </div>

        {submitError && (
          <p className='mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{submitError}</p>
        )}
        {submitMessage && (
          <p className='mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
            {submitMessage}
          </p>
        )}

        {step === 0 && (
          <div className='mt-6 grid gap-4 md:grid-cols-2'>
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Cliente
              <select
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Limite de funcionarios
              <input
                type='number'
                min={1}
                value={employeeLimit}
                onChange={(event) => setEmployeeLimit(event.target.value)}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className='mt-6 grid gap-4 md:grid-cols-2'>
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Valor do contrato (R$)
              <input
                type='number'
                min={0}
                step='0.01'
                value={contractValue}
                onChange={(event) => setContractValue(event.target.value)}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              />
            </label>
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Tipo de cobranca
              <select
                value={billingCycle}
                onChange={(event) => setBillingCycle(event.target.value as 'MONTHLY' | 'ANNUAL')}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              >
                <option value='MONTHLY'>Mensal</option>
                <option value='ANNUAL'>Anual</option>
              </select>
            </label>
          </div>
        )}

        {step === 2 && (
          <div className='mt-6 grid gap-4 md:grid-cols-2'>
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Inicio da vigencia
              <input
                type='date'
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              />
            </label>
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Fim da vigencia (opcional)
              <input
                type='date'
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className='mt-6 grid gap-4 md:grid-cols-2'>
            <div className='rounded-2xl border border-[color:var(--border)] bg-white p-4'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]'>Resumo</p>
              <p className='mt-2 text-sm'>Valor mensal: {formatCurrency(totals.monthly)}</p>
              <p className='text-sm'>Valor total: {formatCurrency(totals.totalAmount)}</p>
              <p className='text-sm'>Fim da vigencia: {endDate ? formatDate(endDate) : '-'}</p>
            </div>
            <label className='text-sm font-semibold text-[color:var(--ink)]'>
              Status do contrato
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ContractResponse['status'])}
                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'
              >
                <option value='ACTIVE'>Ativo</option>
                <option value='DRAFT'>Rascunho</option>
              </select>
            </label>
          </div>
        )}

        <div className='mt-6 flex items-center justify-between'>
          <button
            type='button'
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            disabled={step === 0}
            className='rounded-xl border border-[color:var(--border)] px-4 py-2 text-xs font-semibold text-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60'
          >
            Voltar
          </button>
          {step < steps.length - 1 ? (
            <button
              type='button'
              onClick={() => setStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className='rounded-xl bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-white'
            >
              Proximo
            </button>
          ) : (
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => void handleSubmit('DRAFT')}
                className='rounded-xl border border-[color:var(--border)] px-4 py-2 text-xs font-semibold text-[color:var(--muted)]'
              >
                Salvar rascunho
              </button>
              <button
                type='button'
                onClick={() => void handleSubmit(status)}
                className='rounded-xl bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-white'
              >
                {mode === 'create' ? 'Criar contrato' : 'Atualizar contrato'}
              </button>
            </div>
          )}
        </div>
      </div>

      <aside className='glass-panel rounded-3xl p-6'>
        <h3 className='text-sm font-semibold text-[color:var(--ink)]'>Resumo em tempo real</h3>
        <div className='mt-4 space-y-3 text-sm text-[color:var(--muted)]'>
          <div className='rounded-2xl border border-[color:var(--border)] bg-white p-3'>
            <p className='text-xs uppercase tracking-[0.2em]'>Valor mensal</p>
            <p className='mt-2 text-lg font-semibold text-[color:var(--ink)]'>
              {formatCurrency(totals.monthly)}
            </p>
          </div>
          <div className='rounded-2xl border border-[color:var(--border)] bg-white p-3'>
            <p className='text-xs uppercase tracking-[0.2em]'>Valor total</p>
            <p className='mt-2 text-lg font-semibold text-[color:var(--ink)]'>
              {formatCurrency(totals.totalAmount)}
            </p>
          </div>
          <div className='rounded-2xl border border-[color:var(--border)] bg-white p-3'>
            <p className='text-xs uppercase tracking-[0.2em]'>Fim da vigencia</p>
            <p className='mt-2 text-lg font-semibold text-[color:var(--ink)]'>
              {endDate ? formatDate(endDate) : '-'}
            </p>
          </div>
          <div className='rounded-2xl border border-[color:var(--border)] bg-white p-3'>
            <p className='text-xs uppercase tracking-[0.2em]'>Limite contratado</p>
            <p className='mt-2 text-lg font-semibold text-[color:var(--ink)]'>
              {employeeLimit || '-'}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
