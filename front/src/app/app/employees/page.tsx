'use client';



import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';



import AppShell from '@/components/app-shell';

import { apiFetch } from '@/lib/api';

import { logout } from '@/lib/auth';

import { formatDate } from '@/lib/format';

import { appNavItems } from '@/lib/mock-data';

import { useAuthGuard } from '@/lib/use-auth-guard';



type Employee = {

  id: string;

  name: string;

  cpf?: string | null;

  roleTitle?: string | null;

  admissionDate?: string | null;

  isActive: boolean;

};



export default function EmployeesPage() {

  useAuthGuard('TENANT_ADMIN');

  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [form, setForm] = useState({

    name: '',

    cpf: '',

    roleTitle: '',

    admissionDate: '',

    isActive: true,

  });



  const handleLogout = () => {

    logout();

    router.replace('/logout');

  };



  const load = async () => {

    const response = await apiFetch<{ data: Employee[] }>('/employees', { auth: true });

    setEmployees(response.data);

  };



  useEffect(() => {

    load();

  }, []);



  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    await apiFetch('/employees', {

      method: 'POST',

      auth: true,

      body: JSON.stringify({

        name: form.name,

        cpf: form.cpf || undefined,

        roleTitle: form.roleTitle || undefined,

        admissionDate: form.admissionDate || undefined,

        isActive: form.isActive,

      }),

    });

    setForm({ name: '', cpf: '', roleTitle: '', admissionDate: '', isActive: true });

    await load();

  };



  return (

    <AppShell navItems={appNavItems} title='Funcionários' subtitle='Cadastros da empresa' onLogout={handleLogout}>

      <section className='glass-panel rounded-3xl p-6'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Novo funcionário</h2>

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

            CPF (opcional)

            <input

              type='text'

              value={form.cpf}

              onChange={(event) => setForm((prev) => ({ ...prev, cpf: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Cargo

            <input

              type='text'

              value={form.roleTitle}

              onChange={(event) => setForm((prev) => ({ ...prev, roleTitle: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Admissão

            <input

              type='date'

              value={form.admissionDate}

              onChange={(event) => setForm((prev) => ({ ...prev, admissionDate: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Ativo

            <select

              value={form.isActive ? 'true' : 'false'}

              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.value === 'true' }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            >

              <option value='true'>Sim</option>

              <option value='false'>Não</option>

            </select>

          </label>

          <button

            type='submit'

            className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'

          >

            Salvar funcionário

          </button>

        </form>

      </section>



      <section className='glass-panel rounded-3xl p-6'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Equipe cadastrada</h2>

        <div className='mt-4 space-y-3'>

          {employees.map((employee) => (

            <div

              key={employee.id}

              className='flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm'

            >

              <div className='flex items-center justify-between font-semibold text-[color:var(--ink)]'>

                <span>{employee.name}</span>

                <span className='text-xs text-[color:var(--primary)]'>

                  {employee.isActive ? 'Ativo' : 'Inativo'}

                </span>

              </div>

              <div className='flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]'>

                <span>CPF: {employee.cpf || '?'}</span>

                <span>Cargo: {employee.roleTitle || '?'}</span>

                <span>Admissão: {formatDate(employee.admissionDate)}</span>

              </div>

            </div>

          ))}

          {!employees.length && (

            <p className='text-sm text-[color:var(--muted)]'>Nenhum funcionário cadastrado.</p>

          )}

        </div>

      </section>

    </AppShell>

  );

}


