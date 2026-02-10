'use client';



import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';



import AppShell from '@/components/app-shell';

import { apiFetch, getApiUrl } from '@/lib/api';

import { logout } from '@/lib/auth';

import { formatDate } from '@/lib/format';

import { appNavItems, dueStatusLabels } from '@/lib/mock-data';

import { useAuthGuard } from '@/lib/use-auth-guard';



type ReportType = { id: string; name: string };



type DocumentRecord = {

  id: string;

  reportType: ReportType;

  issuedAt: string;

  dueDate: string;

  status: string;

  daysToDue: number;

};



export default function DocumentsPage() {

  useAuthGuard('TENANT_ADMIN');

  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  const [types, setTypes] = useState<ReportType[]>([]);

  const [form, setForm] = useState({ reportTypeId: '', issuedAt: '', file: null as File | null });



  const handleLogout = () => {

    logout();

    router.replace('/logout');

  };



  const load = async () => {

    const [documentsRes, typesRes] = await Promise.all([

      apiFetch<{ data: DocumentRecord[] }>('/tenant-documents', { auth: true }),

      apiFetch<{ data: ReportType[] }>('/catalog/reports', { auth: true }),

    ]);

    setDocuments(documentsRes.data);

    setTypes(typesRes.data);

    if (!form.reportTypeId && typesRes.data.length) {

      setForm((prev) => ({ ...prev, reportTypeId: typesRes.data[0].id }));

    }

  };



  useEffect(() => {

    load();

  }, []);



  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (!form.file) return;



    const payload = new FormData();

    payload.append('reportTypeId', form.reportTypeId);

    payload.append('issuedAt', form.issuedAt);

    payload.append('file', form.file);



    const token = localStorage.getItem('vencimentos_token');

    await fetch(`${getApiUrl()}/tenant-documents`, {

      method: 'POST',

      headers: token ? { Authorization: `Bearer ${token}` } : undefined,

      body: payload,

    });



    setForm((prev) => ({ ...prev, issuedAt: '', file: null }));

    await load();

  };



  return (

    <AppShell navItems={appNavItems} title='Laudos e documentos' subtitle='PGR, PCMSO, LTCAT' onLogout={handleLogout}>

      <section className='glass-panel rounded-3xl p-6'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Novo laudo</h2>

        <form className='mt-4 grid gap-4 md:grid-cols-3' onSubmit={handleUpload}>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            Tipo de laudo

            <select

              value={form.reportTypeId}

              onChange={(event) => setForm((prev) => ({ ...prev, reportTypeId: event.target.value }))}

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

            Data de emissão

            <input

              type='date'

              value={form.issuedAt}

              onChange={(event) => setForm((prev) => ({ ...prev, issuedAt: event.target.value }))}

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

              required

            />

          </label>

          <label className='text-sm font-semibold text-[color:var(--ink)]'>

            PDF

            <input

              type='file'

              accept='application/pdf'

              onChange={(event) =>

                setForm((prev) => ({ ...prev, file: event.target.files?.[0] || null }))

              }

              className='mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 text-sm'

              required

            />

          </label>

          <button

            type='submit'

            className='rounded-2xl bg-[color:var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]'

          >

            Enviar documento

          </button>

        </form>

      </section>



      <section className='glass-panel rounded-3xl p-6'>

        <h2 className='text-lg font-semibold text-[color:var(--ink)]'>Documentos cadastrados</h2>

        <div className='mt-4 space-y-3'>

          {documents.map((doc) => (

            <div

              key={doc.id}

              className='flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-sm'

            >

              <div className='flex items-center justify-between font-semibold text-[color:var(--ink)]'>

                <span>{doc.reportType?.name}</span>

                <span className='text-xs text-[color:var(--primary)]'>

                  {dueStatusLabels[doc.status] || doc.status}

                </span>

              </div>

              <div className='flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]'>

                <span>Emissão: {formatDate(doc.issuedAt)}</span>

                <span>Vence em: {formatDate(doc.dueDate)}</span>

                <span>{doc.daysToDue} dias</span>

              </div>

            </div>

          ))}

          {!documents.length && (

            <p className='text-sm text-[color:var(--muted)]'>Nenhum documento enviado.</p>

          )}

        </div>

      </section>

    </AppShell>

  );

}


