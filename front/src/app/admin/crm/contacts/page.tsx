'use client';



import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';



import AppShell from '@/components/app-shell';

import { apiFetch } from '@/lib/api';

import { logout } from '@/lib/auth';

import { formatDate } from '@/lib/format';

import { adminNavItems } from '@/lib/mock-data';

import { useAuthGuard } from '@/lib/use-auth-guard';



type Contact = {

  id: string;

  name: string;

  email: string;

  phone?: string | null;

  companyName?: string | null;

  source?: string | null;

  nextActionAt?: string | null;

  notes?: string | null;

  createdAt: string;

};



export default function ContactsPage() {

  useAuthGuard('SAAS_ADMIN');

  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);

  const [form, setForm] = useState({

    name: '',

    email: '',

    phone: '',

    companyName: '',

    source: '',

    nextActionAt: '',

    notes: '',

  });



  const handleLogout = () => {

    logout();

    router.replace('/logout');

  };



  const load = async () => {

    const response = await apiFetch<{ data: Contact[] }>('/crm/contacts', { auth: true });

    setContacts(response.data);

  };



  useEffect(() => {

    load();

  }, []);



  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    await apiFetch('/crm/contacts', {

      method: 'POST',

      auth: true,

      body: JSON.stringify({

        name: form.name,

        email: form.email,

        phone: form.phone || undefined,

        companyName: form.companyName || undefined,

        source: form.source || undefined,

        nextActionAt: form.nextActionAt || undefined,

        notes: form.notes || undefined,

      }),

    });

    setForm({ name: '', email: '', phone: '', companyName: '', source: '', nextActionAt: '', notes: '' });

    await load();

  };



  return (

    <AppShell navItems={adminNavItems} title='CRM - Contatos' subtitle='Leads e follow-up' onLogout={handleLogout}>

      <section className='glass-panel rounded-3xl p-6'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Novo contato</h2>

        <form className='mt-4 grid gap-4 md:grid-cols-2' onSubmit={handleCreate}>

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

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            E-mail

            <input

              type='email'

              value={form.email}

              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

              required

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Telefone

            <input

              type='text'

              value={form.phone}

              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Empresa

            <input

              type='text'

              value={form.companyName}

              onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Origem

            <input

              type='text'

              value={form.source}

              onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Próxima ação

            <input

              type='date'

              value={form.nextActionAt}

              onChange={(event) => setForm((prev) => ({ ...prev, nextActionAt: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)] md:col-span-2'>

            Observações

            <textarea

              value={form.notes}

              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

              rows={3}

            />

          </label>

          <button

            type='submit'

            className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'

          >

            Salvar contato

          </button>

        </form>

      </section>



      <section className='glass-panel rounded-3xl p-6'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Leads cadastrados</h2>

        <div className='mt-4 space-y-3'>

          {contacts.map((contact) => (

            <div

              key={contact.id}

              className='flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm'

            >

              <div className='flex items-center justify-between font-semibold text-[color:var(--ink)]'>

                <span>{contact.name}</span>

                <span className='text-xs text-[color:var(--primary)]'>{contact.companyName || '?'}</span>

              </div>

              <div className='flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]'>

                <span>{contact.email}</span>

                <span>{contact.phone || 'Sem telefone'}</span>

                <span>Próxima ação: {formatDate(contact.nextActionAt)}</span>

                <span>Origem: {contact.source || '?'}</span>

              </div>

            </div>

          ))}

          {!contacts.length && (

            <p className='text-sm text-[color:var(--muted)]'>Nenhum contato cadastrado.</p>

          )}

        </div>

      </section>

    </AppShell>

  );

}


