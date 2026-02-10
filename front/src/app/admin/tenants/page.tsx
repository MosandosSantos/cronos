'use client';



import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';



import AppShell from '@/components/app-shell';

import { apiFetch } from '@/lib/api';

import { logout } from '@/lib/auth';

import { formatDate } from '@/lib/format';

import { adminNavItems } from '@/lib/mock-data';

import { useAuthGuard } from '@/lib/use-auth-guard';



type Tenant = {

  id: string;

  name: string;

  status: string;

  cnpj?: string | null;

  segment?: string | null;

  employeesCount: number;

  employeeLimit: number | null;

  usagePercent: number;

  createdAt: string;

};



const statusOptions = ['LEAD', 'TRIAL', 'ACTIVE', 'SUSPENDED'];



export default function TenantsPage() {

  useAuthGuard('SAAS_ADMIN');

  const router = useRouter();

  const [tenants, setTenants] = useState<Tenant[]>([]);

  const [form, setForm] = useState({ name: '', status: 'LEAD', cnpj: '', segment: '' });

  const [loading, setLoading] = useState(true);



  const handleLogout = () => {

    logout();

    router.replace('/logout');

  };



  const load = async () => {

    setLoading(true);

    try {

      const response = await apiFetch<{ data: Tenant[] }>('/tenants', { auth: true });

      setTenants(response.data);

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    load();

  }, []);



  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    await apiFetch('/tenants', {

      method: 'POST',

      auth: true,

      body: JSON.stringify({

        name: form.name,

        status: form.status,

        cnpj: form.cnpj || undefined,

        segment: form.segment || undefined,

      }),

    });

    setForm({ name: '', status: 'LEAD', cnpj: '', segment: '' });

    await load();

  };



  return (

    <AppShell

      navItems={adminNavItems}

      title='Clientes'

      subtitle='Gestão de tenants'

      onLogout={handleLogout}

    >

      <section className='glass-panel rounded-3xl p-6'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Novo cliente</h2>

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

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            CNPJ (opcional)

            <input

              type='text'

              value={form.cnpj}

              onChange={(event) => setForm((prev) => ({ ...prev, cnpj: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Segmento (opcional)

            <input

              type='text'

              value={form.segment}

              onChange={(event) => setForm((prev) => ({ ...prev, segment: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <button

            type='submit'

            className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'

          >

            Criar cliente

          </button>

        </form>

      </section>



      <section className='glass-panel rounded-3xl p-6'>

        <div className='flex items-center justify-between'>

          <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Lista de clientes</h2>

          <span className='text-xs font-semibold text-[color:var(--muted)]'>

            {loading ? 'Carregando...' : `${tenants.length} resultados`}

          </span>

        </div>

        <div className='mt-4 space-y-3'>

          {tenants.map((tenant) => (

            <div

              key={tenant.id}

              className='flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm'

            >

              <div className='flex items-center justify-between font-semibold text-[color:var(--ink)]'>

                <span>{tenant.name}</span>

                <span className='text-xs text-[color:var(--primary)]'>{tenant.status}</span>

              </div>

              <div className='flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]'>

                <span>CNPJ: {tenant.cnpj || 'não informado'}</span>

                <span>Segmento: {tenant.segment || 'não informado'}</span>

                <span>Funcionários: {tenant.employeesCount}</span>

                <span>Uso: {tenant.usagePercent}%</span>

                <span>Criado em {formatDate(tenant.createdAt)}</span>

              </div>

            </div>

          ))}

          {!tenants.length && !loading && (

            <p className='text-sm text-[color:var(--muted)]'>Nenhum cliente cadastrado.</p>

          )}

        </div>

      </section>

    </AppShell>

  );

}


