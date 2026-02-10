'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { apiFetch } from '@/lib/api';
import { logout } from '@/lib/auth';
import { adminNavItems } from '@/lib/mock-data';
import { formatDate } from '@/lib/format';
import { useAuthGuard } from '@/lib/use-auth-guard';

type Mode = 'list' | 'view' | 'edit' | 'delete';
type DocumentType = 'CPF' | 'CNPJ';
type FormContext = 'create' | 'edit';

type ClientItem = {
  id: string;
  userId: string | null;
  fullName: string;
  email: string;
  cpf: string | null;
  cnpj: string | null;
  phone: string;
  birthDate: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  userId: string;
  fullName: string;
  email: string;
  documentType: DocumentType;
  document: string;
  phone: string;
  birthDate: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isActive: boolean;
};

const actionButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--border)] transition';

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

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
};

const formatZip = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
};

const isRepeatedDigits = (value: string) => /^([0-9])\1+$/.test(value);

const isValidCpf = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || isRepeatedDigits(digits)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(digits[index]) * (10 - index);
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10) firstDigit = 0;
  if (firstDigit !== Number(digits[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(digits[index]) * (11 - index);
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10) secondDigit = 0;
  return secondDigit === Number(digits[10]);
};

const isValidCnpj = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || isRepeatedDigits(digits)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const total = base
      .split('')
      .reduce((sum, current, index) => sum + Number(current) * weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calcDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calcDigit(
    `${digits.slice(0, 12)}${firstDigit}`,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  );

  return firstDigit === Number(digits[12]) && secondDigit === Number(digits[13]);
};

const initialForm = (): FormState => ({
  userId: '',
  fullName: '',
  email: '',
  documentType: 'CPF',
  document: '',
  phone: '',
  birthDate: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  isActive: true,
});

const itemToForm = (item: ClientItem): FormState => ({
  userId: item.userId || '',
  fullName: item.fullName,
  email: item.email,
  documentType: item.cnpj ? 'CNPJ' : 'CPF',
  document: item.cnpj ? formatCnpj(item.cnpj) : formatCpf(item.cpf || ''),
  phone: formatPhone(item.phone),
  birthDate: item.birthDate ? item.birthDate.slice(0, 10) : '',
  street: item.street,
  number: item.number,
  complement: item.complement || '',
  neighborhood: item.neighborhood,
  city: item.city,
  state: item.state,
  zipCode: formatZip(item.zipCode),
  isActive: item.isActive,
});

export default function ClientsPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();

  const [items, setItems] = useState<ClientItem[]>([]);
  const [mode, setMode] = useState<Mode>('list');
  const [selected, setSelected] = useState<ClientItem | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm());
  const [editForm, setEditForm] = useState<FormState>(initialForm());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [loading, setLoading] = useState(true);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState<FormContext | null>(null);
  const [cepMessage, setCepMessage] = useState<string | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState<FormContext | null>(null);
  const [cnpjMessage, setCnpjMessage] = useState<string | null>(null);
  const [cnpjVerified, setCnpjVerified] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const lastCnpjLookupRef = useRef('');
  const cnpjDebounceRef = useRef<number | null>(null);

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch<{ data: ClientItem[] }>('/clients', { auth: true });
      setItems(response.data);
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
      const bySearch =
        !q ||
        item.fullName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        (item.cpf || '').includes(onlyDigits(q)) ||
        (item.cnpj || '').includes(onlyDigits(q));
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
    setCepMessage(null);
    setCnpjMessage(null);
    setCnpjVerified(false);
  };

  const openMode = (next: Exclude<Mode, 'list'>, item: ClientItem) => {
    setSelected(item);
    setMode(next);
    setSubmitError(null);
    setSubmitMessage(null);
    setCepMessage(null);
    setCnpjMessage(null);
    setCnpjVerified(false);

    if (next === 'edit') {
      setEditForm(itemToForm(item));
    }
  };

  const buildPayload = (state: FormState) => {
    const isCpf = state.documentType === 'CPF';
    return {
      userId: state.userId.trim() || null,
      fullName: state.fullName.trim(),
      email: state.email.trim(),
      cpf: isCpf ? onlyDigits(state.document) : null,
      cnpj: isCpf ? null : onlyDigits(state.document),
      phone: onlyDigits(state.phone),
      birthDate: state.birthDate || null,
      street: state.street.trim(),
      number: state.number.trim(),
      complement: state.complement.trim() || null,
      neighborhood: state.neighborhood.trim(),
      city: state.city.trim(),
      state: state.state.trim().toUpperCase(),
      zipCode: state.zipCode,
      isActive: state.isActive,
    };
  };

  const validateFormState = (state: FormState) => {
    const docDigits = onlyDigits(state.document);
    const zipDigits = onlyDigits(state.zipCode);

    if (!state.fullName.trim()) return 'Nome completo é obrigatório.';
    if (!state.email.trim()) return 'E-mail é obrigatório.';
    if (!state.phone.trim()) return 'Telefone é obrigatório.';
    if (state.documentType === 'CPF' && !isValidCpf(docDigits)) return 'CPF inválido.';
    if (state.documentType === 'CNPJ' && !isValidCnpj(docDigits)) return 'CNPJ inválido.';
    if (zipDigits.length !== 8) return 'CEP inválido.';
    if (!state.street.trim()) return 'Rua é obrigatória.';
    if (!state.number.trim()) return 'Número é obrigatório.';
    if (!state.neighborhood.trim()) return 'Bairro é obrigatório.';
    if (!state.city.trim()) return 'Cidade é obrigatória.';
    if (state.state.trim().length !== 2) return 'UF deve conter 2 letras.';
    return null;
  };

  const lookupCep = useCallback(
    async (
      zipCode: string,
      context: FormContext,
      setState: React.Dispatch<React.SetStateAction<FormState>>
    ) => {
      const cep = onlyDigits(zipCode);
      if (cep.length !== 8) return;

      setCepMessage(null);
      setCepLoading(context);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('Falha ao consultar CEP.');
        const data = (await response.json()) as {
          erro?: boolean;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
        };
        if (data.erro) throw new Error('CEP não encontrado.');

        setState((prev) => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          zipCode: formatZip(cep),
        }));
      } catch (error) {
        setCepMessage(error instanceof Error ? error.message : 'Não foi possível consultar o CEP.');
      } finally {
        setCepLoading(null);
      }
    },
    []
  );

  const lookupCnpj = useCallback(
    async (
      document: string,
      context: FormContext,
      setState: React.Dispatch<React.SetStateAction<FormState>>
    ) => {
      const cnpj = onlyDigits(document);
      if (cnpj.length !== 14) return;

      setCnpjMessage(null);
      setCnpjLoading(context);
      lastCnpjLookupRef.current = cnpj;
      setCnpjVerified(false);
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (!response.ok) throw new Error('Falha ao consultar CNPJ.');
        const data = (await response.json()) as {
          razao_social?: string;
          nome_fantasia?: string;
          email?: string;
          ddd_telefone_1?: string;
          ddd_telefone_2?: string;
          logradouro?: string;
          numero?: string;
          complemento?: string;
          bairro?: string;
          municipio?: string;
          uf?: string;
          cep?: string;
        };

        const phoneRaw = data.ddd_telefone_1 || data.ddd_telefone_2 || '';

        setState((prev) => ({
          ...prev,
          document: formatCnpj(cnpj),
          fullName: data.razao_social || data.nome_fantasia || prev.fullName,
          email: data.email || prev.email,
          phone: phoneRaw ? formatPhone(phoneRaw) : prev.phone,
          street: data.logradouro || prev.street,
          number: data.numero || prev.number,
          complement: data.complemento || prev.complement,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.municipio || prev.city,
          state: data.uf || prev.state,
          zipCode: data.cep ? formatZip(data.cep) : prev.zipCode,
        }));
        setCnpjVerified(true);
      } catch (error) {
        setCnpjMessage(error instanceof Error ? error.message : 'Não foi possível consultar o CNPJ.');
      } finally {
        setCnpjLoading(null);
      }
    },
    []
  );

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const validationError = validateFormState(form);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    try {
      await apiFetch('/clients', {
        method: 'POST',
        auth: true,
        body: JSON.stringify(buildPayload(form)),
      });
      setForm(initialForm());
      setShowCreate(false);
      setSubmitMessage('Cliente criado com sucesso.');
      await load();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao criar cliente.');
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSubmitError(null);
    const validationError = validateFormState(editForm);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    try {
      await apiFetch(`/clients/${selected.id}`, {
        method: 'PUT',
        auth: true,
        body: JSON.stringify(buildPayload(editForm)),
      });
      await load();
      setSubmitMessage('Cliente atualizado com sucesso.');
      backToList();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao atualizar cliente.');
    }
  };

  const handleDelete = async () => {
    if (!selected || !deleteConfirm) return;
    setSubmitError(null);
    try {
      await apiFetch(`/clients/${selected.id}`, { method: 'DELETE', auth: true });
      await load();
      setSubmitMessage('Cliente excluído com sucesso.');
      backToList();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao excluir cliente.');
    }
  };

  const renderFormFields = (
    state: FormState,
    setState: React.Dispatch<React.SetStateAction<FormState>>,
    context: FormContext
  ) => (
    <>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)]'>
        Documento
        <select
          value={state.documentType}
          onChange={(event) => {
            setCnpjMessage(null);
            setCnpjVerified(false);
            lastCnpjLookupRef.current = '';
            if (cnpjDebounceRef.current) {
              window.clearTimeout(cnpjDebounceRef.current);
              cnpjDebounceRef.current = null;
            }
            setState((prev) => ({ ...prev, documentType: event.target.value as DocumentType, document: '' }));
          }}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
        >
          <option value='CPF'>CPF</option>
          <option value='CNPJ'>CNPJ</option>
        </select>
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)] md:col-span-2'>
        Número do documento
        <input
          type='text'
          placeholder={state.documentType}
          inputMode='numeric'
          value={state.document}
          onChange={(event) => {
            setCnpjMessage(null);
            setCnpjVerified(false);
            const nextDocument =
              state.documentType === 'CPF' ? formatCpf(event.target.value) : formatCnpj(event.target.value);
            const nextDigits = onlyDigits(nextDocument);
            if (nextDigits.length < 14) {
              lastCnpjLookupRef.current = '';
            }
            if (cnpjDebounceRef.current) {
              window.clearTimeout(cnpjDebounceRef.current);
              cnpjDebounceRef.current = null;
            }
            setState((prev) => ({
              ...prev,
              document: nextDocument,
            }));
            if (state.documentType !== 'CNPJ') return;
            if (nextDigits.length !== 14) return;
            if (lastCnpjLookupRef.current === nextDigits || cnpjLoading === context) return;
            cnpjDebounceRef.current = window.setTimeout(() => {
              if (lastCnpjLookupRef.current === nextDigits || cnpjLoading === context) return;
              lastCnpjLookupRef.current = nextDigits;
              void lookupCnpj(nextDocument, context, setState);
            }, 500);
          }}
          onBlur={() => {
            if (state.documentType !== 'CNPJ') return;
            const digits = onlyDigits(state.document);
            if (digits.length !== 14) return;
            if (lastCnpjLookupRef.current === digits || cnpjLoading === context) return;
            lastCnpjLookupRef.current = digits;
            void lookupCnpj(state.document, context, setState);
          }}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
          required
        />
      </label>
      {state.documentType === 'CNPJ' && (
        <div className='flex flex-wrap items-center gap-2 md:col-span-3'>
          <button
            type='button'
            onClick={() => void lookupCnpj(state.document, context, setState)}
            disabled={cnpjLoading === context}
            className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-xs font-semibold text-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60'
          >
            {cnpjLoading === context ? 'Buscando CNPJ...' : 'Buscar CNPJ'}
          </button>
          {cnpjVerified && (
            <span className='inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-800'>
              CNPJ validado
            </span>
          )}
        </div>
      )}
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)] md:col-span-2'>
        Nome completo
        <input
          type='text'
          placeholder='Ex: Maria Fernandes'
          value={state.fullName}
          onChange={(event) => setState((prev) => ({ ...prev, fullName: event.target.value }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
          required
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)]'>
        E-mail
        <input
          type='email'
          placeholder='Ex: contato@empresa.com'
          value={state.email}
          onChange={(event) => setState((prev) => ({ ...prev, email: event.target.value }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
          required
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)] md:col-span-2'>
        ID do usuário (opcional)
        <input
          type='text'
          placeholder='Ex: 6c8d...'
          value={state.userId}
          onChange={(event) => setState((prev) => ({ ...prev, userId: event.target.value }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)]'>
        Telefone
        <input
          type='text'
          placeholder='(00) 00000-0000'
          inputMode='numeric'
          value={state.phone}
          onChange={(event) => setState((prev) => ({ ...prev, phone: formatPhone(event.target.value) }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
          required
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)]'>
        Data de nascimento
        <input
          type='date'
          value={state.birthDate}
          onChange={(event) => setState((prev) => ({ ...prev, birthDate: event.target.value }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)] md:col-span-2'>
        Rua
        <input
          type='text'
          placeholder='Ex: Rua das Flores'
          value={state.street}
          onChange={(event) => setState((prev) => ({ ...prev, street: event.target.value }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
          required
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)]'>
        Número
        <input
          type='text'
          placeholder='Ex: 123'
          value={state.number}
          onChange={(event) => setState((prev) => ({ ...prev, number: event.target.value }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
          required
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)] md:col-span-2'>
        Complemento
        <input
          type='text'
          placeholder='Ex: Sala 12'
          value={state.complement}
          onChange={(event) => setState((prev) => ({ ...prev, complement: event.target.value }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)]'>
        Bairro
        <input
          type='text'
          placeholder='Ex: Centro'
          value={state.neighborhood}
          onChange={(event) => setState((prev) => ({ ...prev, neighborhood: event.target.value }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
          required
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)]'>
        Cidade
        <input
          type='text'
          placeholder='Ex: São Paulo'
          value={state.city}
          onChange={(event) => setState((prev) => ({ ...prev, city: event.target.value }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
          required
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)]'>
        UF
        <input
          type='text'
          placeholder='SP'
          value={state.state}
          maxLength={2}
          onChange={(event) => setState((prev) => ({ ...prev, state: event.target.value.toUpperCase() }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
          required
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)] md:col-span-2'>
        CEP
        <input
          type='text'
          placeholder='00000-000'
          inputMode='numeric'
          value={state.zipCode}
          onChange={(event) => {
            setCepMessage(null);
            setState((prev) => ({ ...prev, zipCode: formatZip(event.target.value) }));
          }}
          onBlur={() => void lookupCep(state.zipCode, context, setState)}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
          required
        />
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)]'>
        Buscar CEP
        <button
          type='button'
          onClick={() => void lookupCep(state.zipCode, context, setState)}
          disabled={cepLoading === context}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-xs font-semibold text-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60'
        >
          {cepLoading === context ? 'Buscando CEP...' : 'Buscar CEP'}
        </button>
      </label>
      <label className='flex flex-col gap-2 text-xs font-semibold text-[color:var(--muted)]'>
        Status
        <select
          value={state.isActive ? 'true' : 'false'}
          onChange={(event) => setState((prev) => ({ ...prev, isActive: event.target.value === 'true' }))}
          className='rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm font-normal text-[color:var(--ink)]'
        >
          <option value='true'>Ativo</option>
          <option value='false'>Inativo</option>
        </select>
      </label>
    </>
  );

  const formatDocument = (item: ClientItem) => (item.cnpj ? formatCnpj(item.cnpj) : formatCpf(item.cpf || ''));

  return (
    <AppShell navItems={adminNavItems} title='Clientes' subtitle='Base global' onLogout={handleLogout}>
      {submitMessage && (
        <p className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          {submitMessage}
        </p>
      )}
      {submitError && (
        <p className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>{submitError}</p>
      )}
      {cepMessage && (
        <p className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>{cepMessage}</p>
      )}
      {cnpjMessage && (
        <p className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>{cnpjMessage}</p>
      )}

      {mode === 'list' && (
        <>
          <section className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-3xl font-semibold text-[color:var(--ink)]'>Todos os clientes</h2>
            <button
              type='button'
              onClick={() => setShowCreate((prev) => !prev)}
              className='inline-flex items-center gap-2 rounded-xl bg-[color:var(--primary)] px-5 py-3 text-sm font-semibold text-white'
            >
              <IconPlus />
              Novo cliente
            </button>
          </section>

          <section className='glass-panel rounded-3xl p-6'>
            <div className='grid gap-4 lg:grid-cols-[1.6fr_1fr_auto]'>
              <input
                type='text'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder='Buscar por nome, documento, e-mail ou cidade'
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
                    <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3a36]'>Inclusão de cliente</p>
                    <h3 className='mt-1 text-xl font-semibold text-[#0e3a36]'>Novo cadastro</h3>
                  </div>
                </div>
                <form className='grid gap-4 p-6 md:grid-cols-3' onSubmit={handleCreate}>
                  {renderFormFields(form, setForm, 'create')}
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
                      <th className='w-[28%] px-4 py-3'>Nome</th>
                      <th className='w-[18%] px-4 py-3'>Documento</th>
                      <th className='w-[20%] px-4 py-3'>E-mail</th>
                      <th className='w-[16%] px-4 py-3'>Cidade/UF</th>
                      <th className='w-[18%] px-4 py-3 text-center'>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id} className='border-t border-[color:var(--border)]'>
                        <td className='truncate px-4 py-3 font-semibold text-[color:var(--ink)]' title={item.fullName}>
                          {item.fullName}
                        </td>
                        <td className='px-4 py-3 text-[color:var(--muted)]'>{formatDocument(item)}</td>
                        <td className='truncate px-4 py-3 text-[color:var(--muted)]' title={item.email}>{item.email}</td>
                        <td className='px-4 py-3 text-[color:var(--muted)]'>{item.city}/{item.state}</td>
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
              <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3a36]'>Consulta de cliente</p>
              <h3 className='mt-1 text-xl font-semibold text-[#0e3a36]'>{selected.fullName}</h3>
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
            <div>E-mail: {selected.email}</div>
            <div>Documento: {formatDocument(selected)}</div>
            <div>Telefone: {formatPhone(selected.phone)}</div>
            <div>Data de nascimento: {formatDate(selected.birthDate)}</div>
            <div>Rua: {selected.street}</div>
            <div>Número: {selected.number}</div>
            <div className='md:col-span-2'>Complemento: {selected.complement || '-'}</div>
            <div>Bairro: {selected.neighborhood}</div>
            <div>Cidade/UF: {selected.city}/{selected.state}</div>
            <div>CEP: {formatZip(selected.zipCode)}</div>
            <div>Status: {selected.isActive ? 'Ativo' : 'Inativo'}</div>
            <div>Criado em: {formatDate(selected.createdAt)}</div>
            <div>Atualizado em: {formatDate(selected.updatedAt)}</div>
          </div>
        </section>
      )}

      {mode === 'edit' && selected && (
        <section className='rounded-3xl border border-[#c5e2e2] bg-[#E0F0F0]/90'>
          <div className='flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-6 py-5'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3a36]'>Edição de cliente</p>
              <h3 className='mt-1 text-xl font-semibold text-[#0e3a36]'>{selected.fullName}</h3>
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
            {renderFormFields(editForm, setEditForm, 'edit')}
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
              <p className='text-xs font-semibold uppercase tracking-[0.14em] text-red-700'>Exclusão de cliente</p>
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
                Você está prestes a excluir o cliente <strong>{selected.fullName}</strong>.
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
                Excluir
              </button>
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}

