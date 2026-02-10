'use client';



import { useCallback, useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';



import AppShell from '@/components/app-shell';

import { apiFetch } from '@/lib/api';

import { logout } from '@/lib/auth';

import { formatCurrency, formatDate } from '@/lib/format';

import { adminNavItems } from '@/lib/mock-data';

import { useAuthGuard } from '@/lib/use-auth-guard';



type Contact = { id: string; name: string; companyName?: string | null };



type Proposal = {

  id: string;

  contact: Contact;

  proposedValue: number;

  validUntil: string;

  status: string;

};



type Client = { id: string; fullName: string };



const statusOptions = ['SENT', 'NEGOTIATING', 'APPROVED', 'REJECTED'];



export default function ProposalsPage() {

  useAuthGuard('SAAS_ADMIN');

  const router = useRouter();

  const [proposals, setProposals] = useState<Proposal[]>([]);

  const [contacts, setContacts] = useState<Contact[]>([]);

  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState({

    contactId: '',

    proposedValue: '',

    validUntil: '',

    status: 'SENT',

  });

  const [approval, setApproval] = useState({

    proposalId: '',

    clientId: '',

    employeeLimit: '',

    contractValue: '',

    startDate: '',

    endDate: '',

  });



  const handleLogout = () => {

    logout();

    router.replace('/logout');

  };



  const load = useCallback(async () => {

    const [proposalsRes, contactsRes, clientsRes] = await Promise.all([

      apiFetch<{ data: Proposal[] }>('/crm/proposals', { auth: true }),

      apiFetch<{ data: Contact[] }>('/crm/contacts', { auth: true }),

      apiFetch<{ data: Client[] }>('/clients', { auth: true }),

    ]);

    setProposals(proposalsRes.data);

    setContacts(contactsRes.data);

    setClients(clientsRes.data);

    if (!form.contactId && contactsRes.data.length) {

      setForm((prev) => ({ ...prev, contactId: contactsRes.data[0].id }));

    }

    if (!approval.clientId && clientsRes.data.length) {

      setApproval((prev) => ({ ...prev, clientId: clientsRes.data[0].id }));

    }

  }, [approval.clientId, form.contactId]);



  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);



  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    await apiFetch('/crm/proposals', {

      method: 'POST',

      auth: true,

      body: JSON.stringify({

        contactId: form.contactId,

        proposedValue: Number(form.proposedValue),

        validUntil: form.validUntil,

        status: form.status,

      }),

    });

    setForm({ contactId: form.contactId, proposedValue: '', validUntil: '', status: 'SENT' });

    await load();

  };



  const handleApprove = async (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    await apiFetch(`/crm/proposals/${approval.proposalId}/approve`, {

      method: 'POST',

      auth: true,

      body: JSON.stringify({

        clientId: approval.clientId,

        employeeLimit: Number(approval.employeeLimit),

        contractValue: Number(approval.contractValue),

        startDate: approval.startDate,

        endDate: approval.endDate || undefined,

      }),

    });

    setApproval({

      proposalId: '',

      clientId: approval.clientId,

      employeeLimit: '',

      contractValue: '',

      startDate: '',

      endDate: '',

    });

    await load();

  };



  return (

    <AppShell navItems={adminNavItems} title='CRM - Propostas' subtitle='Pipeline comercial' onLogout={handleLogout}>

      <section className='grid gap-6 lg:grid-cols-2'>

        <div className='glass-panel rounded-3xl p-6'>

          <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Nova proposta</h2>

          <form className='mt-4 space-y-4' onSubmit={handleCreate}>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>

              Contato

              <select

                value={form.contactId}

                onChange={(event) => setForm((prev) => ({ ...prev, contactId: event.target.value }))}

                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

              >

                {contacts.map((contact) => (

                  <option key={contact.id} value={contact.id}>

                    {contact.name} - {contact.companyName || 'Sem empresa'}

                  </option>

                ))}

              </select>

            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>

              Valor proposto (R$)

              <input

                type='number'

                value={form.proposedValue}

                onChange={(event) => setForm((prev) => ({ ...prev, proposedValue: event.target.value }))}

                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

                required

              />

            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>

              Validade

              <input

                type='date'

                value={form.validUntil}

                onChange={(event) => setForm((prev) => ({ ...prev, validUntil: event.target.value }))}

                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

                required

              />

            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>

              Status

              <select

                value={form.status}

                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}

                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

              >

                {statusOptions.map((status) => (

                  <option key={status} value={status}>

                    {status}

                  </option>

                ))}

              </select>

            </label>

            <button

              type='submit'

              className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'

            >

              Salvar proposta

            </button>

          </form>

        </div>



        <div className='glass-panel rounded-3xl p-6'>

          <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Aprovar proposta</h2>

          <form className='mt-4 space-y-4' onSubmit={handleApprove}>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>

              Proposta

              <select

                value={approval.proposalId}

                onChange={(event) => setApproval((prev) => ({ ...prev, proposalId: event.target.value }))}

                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

                required

              >

                <option value=''>Selecione</option>

                {proposals.map((proposal) => (

                  <option key={proposal.id} value={proposal.id}>

                    {proposal.contact?.name} - {formatCurrency(proposal.proposedValue)}

                  </option>

                ))}

              </select>

            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>

              Cliente

              <select

                value={approval.clientId}

                onChange={(event) => setApproval((prev) => ({ ...prev, clientId: event.target.value }))}

                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

                required

              >

                {clients.map((client) => (

                  <option key={client.id} value={client.id}>

                    {client.fullName}

                  </option>

                ))}

              </select>

            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>

              Limite de funcionários

              <input

                type='number'

                value={approval.employeeLimit}

                onChange={(event) => setApproval((prev) => ({ ...prev, employeeLimit: event.target.value }))}

                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

                required

              />

            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>

              Valor do contrato (R$)

              <input

                type='number'

                value={approval.contractValue}

                onChange={(event) => setApproval((prev) => ({ ...prev, contractValue: event.target.value }))}

                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

                required

              />

            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>

              Início

              <input

                type='date'

                value={approval.startDate}

                onChange={(event) => setApproval((prev) => ({ ...prev, startDate: event.target.value }))}

                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

                required

              />

            </label>

            <label className='text-sm font-semibold text-[color:var(--ink)]'>

              Fim (opcional)

              <input

                type='date'

                value={approval.endDate}

                onChange={(event) => setApproval((prev) => ({ ...prev, endDate: event.target.value }))}

                className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

              />

            </label>

            <button

              type='submit'

              className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'

            >

              Aprovar e gerar contrato

            </button>

          </form>

        </div>

      </section>



      <section className='glass-panel rounded-3xl p-6'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Propostas registradas</h2>

        <div className='mt-4 space-y-3'>

          {proposals.map((proposal) => (

            <div

              key={proposal.id}

              className='flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm'

            >

              <div className='flex items-center justify-between font-semibold text-[color:var(--ink)]'>

                <span>{proposal.contact?.name ?? 'Contato'}</span>

                <span className='text-xs text-[color:var(--primary)]'>{proposal.status}</span>

              </div>

              <div className='flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]'>

                <span>{proposal.contact?.companyName || 'Sem empresa'}</span>

                <span>Valor: {formatCurrency(proposal.proposedValue)}</span>

                <span>Validade: {formatDate(proposal.validUntil)}</span>

              </div>

            </div>

          ))}

          {!proposals.length && (

            <p className='text-sm text-[color:var(--muted)]'>Nenhuma proposta registrada.</p>

          )}

        </div>

      </section>

    </AppShell>

  );

}





