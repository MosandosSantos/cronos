'use client';



import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';



import AppShell from '@/components/app-shell';

import { apiFetch } from '@/lib/api';

import { logout } from '@/lib/auth';

import { adminNavItems } from '@/lib/mock-data';

import { useAuthGuard } from '@/lib/use-auth-guard';



type Settings = { window30: number; window60: number; window90: number };



export default function AlertSettingsPage() {

  useAuthGuard('SAAS_ADMIN');

  const router = useRouter();

  const [form, setForm] = useState({ window30: '30', window60: '60', window90: '90' });



  const handleLogout = () => {

    logout();

    router.replace('/logout');

  };



  useEffect(() => {

    const load = async () => {

      const response = await apiFetch<{ data: Settings }>('/alert-settings', { auth: true });

      setForm({

        window30: String(response.data.window30),

        window60: String(response.data.window60),

        window90: String(response.data.window90),

      });

    };

    load();

  }, []);



  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    await apiFetch('/alert-settings', {

      method: 'PUT',

      auth: true,

      body: JSON.stringify({

        window30: Number(form.window30),

        window60: Number(form.window60),

        window90: Number(form.window90),

      }),

    });

  };



  return (

    <AppShell navItems={adminNavItems} title='Configuração de alertas' subtitle='Janelas globais' onLogout={handleLogout}>

      <section className='glass-panel rounded-3xl p-6 max-w-xl'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Janelas de aviso</h2>

        <form className='mt-4 space-y-4' onSubmit={handleSave}>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Aviso curto (dias)

            <input

              type='number'

              value={form.window30}

              onChange={(event) => setForm((prev) => ({ ...prev, window30: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Aviso médio (dias)

            <input

              type='number'

              value={form.window60}

              onChange={(event) => setForm((prev) => ({ ...prev, window60: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Aviso longo (dias)

            <input

              type='number'

              value={form.window90}

              onChange={(event) => setForm((prev) => ({ ...prev, window90: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <button

            type='submit'

            className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'

          >

            Salvar configuração

          </button>

        </form>

      </section>

    </AppShell>

  );

}


