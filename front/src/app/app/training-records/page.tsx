'use client';



import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';



import AppShell from '@/components/app-shell';

import { apiFetch } from '@/lib/api';

import { logout } from '@/lib/auth';

import { formatDate } from '@/lib/format';

import { appNavItems, dueStatusLabels } from '@/lib/mock-data';

import { useAuthGuard } from '@/lib/use-auth-guard';



type Employee = { id: string; name: string };



type TrainingType = { id: string; name: string };



type Record = {

  id: string;

  employee: Employee;

  trainingType: TrainingType;

  performedAt: string;

  dueDate: string;

  status: string;

  daysToDue: number;

};



export default function TrainingRecordsPage() {

  useAuthGuard('TENANT_ADMIN');

  const router = useRouter();

  const [records, setRecords] = useState<Record[]>([]);

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [types, setTypes] = useState<TrainingType[]>([]);

  const [form, setForm] = useState({ employeeId: '', trainingTypeId: '', performedAt: '' });



  const handleLogout = () => {

    logout();

    router.replace('/logout');

  };



  const load = async () => {

    const [recordsRes, employeesRes, typesRes] = await Promise.all([

      apiFetch<{ data: Record[] }>('/employee-training-records', { auth: true }),

      apiFetch<{ data: Employee[] }>('/employees', { auth: true }),

      apiFetch<{ data: TrainingType[] }>('/catalog/trainings', { auth: true }),

    ]);

    setRecords(recordsRes.data);

    setEmployees(employeesRes.data);

    setTypes(typesRes.data);

    if (!form.employeeId && employeesRes.data.length) {

      setForm((prev) => ({ ...prev, employeeId: employeesRes.data[0].id }));

    }

    if (!form.trainingTypeId && typesRes.data.length) {

      setForm((prev) => ({ ...prev, trainingTypeId: typesRes.data[0].id }));

    }

  };



  useEffect(() => {

    load();

  }, []);



  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    await apiFetch('/employee-training-records', {

      method: 'POST',

      auth: true,

      body: JSON.stringify(form),

    });

    setForm((prev) => ({ ...prev, performedAt: '' }));

    await load();

  };



  return (

    <AppShell navItems={appNavItems} title='Treinamentos' subtitle='Registros por funcionário' onLogout={handleLogout}>

      <section className='glass-panel rounded-3xl p-6'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Novo registro de treinamento</h2>

        <form className='mt-4 grid gap-4 md:grid-cols-3' onSubmit={handleCreate}>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Funcionário

            <select

              value={form.employeeId}

              onChange={(event) => setForm((prev) => ({ ...prev, employeeId: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            >

              {employees.map((employee) => (

                <option key={employee.id} value={employee.id}>

                  {employee.name}

                </option>

              ))}

            </select>

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Tipo de treinamento

            <select

              value={form.trainingTypeId}

              onChange={(event) => setForm((prev) => ({ ...prev, trainingTypeId: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

            >

              {types.map((type) => (

                <option key={type.id} value={type.id}>

                  {type.name}

                </option>

              ))}

            </select>

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Data de realização

            <input

              type='date'

              value={form.performedAt}

              onChange={(event) => setForm((prev) => ({ ...prev, performedAt: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

              required

            />

          </label>

          <button

            type='submit'

            className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'

          >

            Registrar treinamento

          </button>

        </form>

      </section>



      <section className='glass-panel rounded-3xl p-6'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Histórico de treinamentos</h2>

        <div className='mt-4 space-y-3'>

          {records.map((record) => (

            <div

              key={record.id}

              className='flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm'

            >

              <div className='flex items-center justify-between font-semibold text-[color:var(--ink)]'>

                <span>{record.employee?.name}</span>

                <span className='text-xs text-[color:var(--primary)]'>

                  {dueStatusLabels[record.status] || record.status}

                </span>

              </div>

              <div className='flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]'>

                <span>{record.trainingType?.name}</span>

                <span>Realizado: {formatDate(record.performedAt)}</span>

                <span>Vence em: {formatDate(record.dueDate)}</span>

                <span>{record.daysToDue} dias</span>

              </div>

            </div>

          ))}

          {!records.length && (

            <p className='text-sm text-[color:var(--muted)]'>Nenhum registro cadastrado.</p>

          )}

        </div>

      </section>

    </AppShell>

  );

}


