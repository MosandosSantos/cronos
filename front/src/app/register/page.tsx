'use client';



import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { useState } from 'react';



import { registerTenant } from '@/lib/auth';



export default function RegisterPage() {

  const router = useRouter();

  const [form, setForm] = useState({

    name: '',

    companyName: '',

    email: '',

    password: '',

    cnpj: '',

  });

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);



  const handleChange = (field: string, value: string) => {

    setForm((prev) => ({ ...prev, [field]: value }));

  };



  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    setError('');

    setLoading(true);

    try {

      await registerTenant({

        name: form.name,

        companyName: form.companyName,

        email: form.email,

        password: form.password,

        cnpj: form.cnpj || undefined,

      });

      router.push('/app/dashboard');

    } catch (err) {

      setError(

        err instanceof Error ? err.message : 'Não foi possível concluir o cadastro.'

      );

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className='min-h-screen bg-atmosphere px-6 py-12'>

      <div className='mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center'>

        <section className='flex-1'>

          <div className='inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--primary)]'>

            Cronos

          </div>

          <h1 className='mt-6 max-w-xl font-[var(--font-display)] text-4xl leading-tight text-[color:var(--ink)] sm:text-5xl'>

            Cadastre sua empresa e comece a controlar os vencimentos.

          </h1>

          <p className='mt-4 max-w-lg text-base leading-7 text-[color:var(--muted)]'>

            Crie o tenant com seu usuário administrador. Ajustes comerciais podem ser feitos depois.

          </p>

          <div className='mt-8 flex flex-wrap gap-4'>

            <Link

              href='/login'

              className='rounded-2xl border border-[color:var(--border)] bg-white/80 px-6 py-3 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-white'

            >

              Já tenho login

            </Link>

          </div>

        </section>

        <section className='w-full max-w-md'>

          <div className='glass-panel rounded-3xl p-8'>

            <h2 className='text-2xl font-semibold text-[color:var(--ink)]'>Criar conta</h2>

            <p className='mt-2 text-sm text-[color:var(--muted)]'>

              Informe os dados básicos para iniciar o trial.

            </p>

            <form className='mt-6 space-y-4' onSubmit={handleSubmit}>

              <label className='block text-sm font-semibold text-[color:var(--ink)]'>

                Nome do administrador

                <input

                  type='text'

                  value={form.name}

                  onChange={(event) => handleChange('name', event.target.value)}

                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--primary)]'

                />

              </label>

              <label className='block text-sm font-semibold text-[color:var(--ink)]'>

                Empresa

                <input

                  type='text'

                  value={form.companyName}

                  onChange={(event) => handleChange('companyName', event.target.value)}

                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--primary)]'

                />

              </label>

              <label className='block text-sm font-semibold text-[color:var(--ink)]'>

                CNPJ (opcional)

                <input

                  type='text'

                  value={form.cnpj}

                  onChange={(event) => handleChange('cnpj', event.target.value)}

                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--primary)]'

                />

              </label>

              <label className='block text-sm font-semibold text-[color:var(--ink)]'>

                E-mail

                <input

                  type='email'

                  value={form.email}

                  onChange={(event) => handleChange('email', event.target.value)}

                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--primary)]'

                />

              </label>

              <label className='block text-sm font-semibold text-[color:var(--ink)]'>

                Senha

                <input

                  type='password'

                  value={form.password}

                  onChange={(event) => handleChange('password', event.target.value)}

                  className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] shadow-sm outline-none transition focus:border-[color:var(--primary)]'

                />

              </label>

              {error && (

                <div className='rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700'>

                  {error}

                </div>

              )}

              <button

                type='submit'

                className='mt-2 flex w-full items-center justify-center rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-20px_rgba(7,91,96,0.8)] transition hover:bg-[color:var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-70'

                disabled={loading}

              >

                {loading ? 'Criando...' : 'Criar conta'}

              </button>

            </form>

          </div>

        </section>

      </div>

    </div>

  );

}


