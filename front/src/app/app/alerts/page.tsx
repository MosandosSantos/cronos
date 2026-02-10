'use client';



import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';



import AppShell from '@/components/app-shell';

import AlertsPanel from '@/components/alerts-panel';

import { apiFetch } from '@/lib/api';

import { logout } from '@/lib/auth';

import { appNavItems } from '@/lib/mock-data';

import { useAuthGuard } from '@/lib/use-auth-guard';



type AlertSummary = { expired: number; due30: number; due60: number; due90: number };



type AlertItem = {

  id: string;

  category: string;

  label: string;

  employeeName?: string | null;

  dueDate: string;

  status: string;

  daysToDue: number;

};



const filters = [

  { label: 'Todos', value: '' },

  { label: 'Vencidos', value: 'expired' },

  { label: '0-30 dias', value: 'due30' },

  { label: '31-60 dias', value: 'due60' },

  { label: '61-90 dias', value: 'due90' },

];



export default function AlertsPage() {

  useAuthGuard('TENANT_ADMIN');

  const router = useRouter();

  const [summary, setSummary] = useState<AlertSummary | null>(null);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const [filter, setFilter] = useState('');



  const handleLogout = () => {

    logout();

    router.replace('/logout');

  };



  const load = async () => {

    const [summaryRes, alertsRes] = await Promise.all([

      apiFetch<{ data: AlertSummary }>('/alerts/summary', { auth: true }),

      apiFetch<{ data: AlertItem[] }>(`/alerts${filter ? `?filter=${filter}` : ''}`, {

        auth: true,

      }),

    ]);

    setSummary(summaryRes.data);

    setAlerts(alertsRes.data);

  };



  useEffect(() => {

    load();

  }, [filter]);



  return (

    <AppShell

      navItems={appNavItems}

      title='Alertas'

      subtitle='Pendências críticas'

      onLogout={handleLogout}

      alertSummary={summary ?? undefined}

      alertContent={<AlertsPanel items={alerts.slice(0, 6)} />}

    >

      <section className='glass-panel rounded-3xl p-6'>

        <div className='flex flex-wrap gap-3'>

          {filters.map((item) => (

            <button

              key={item.value}

              type='button'

              onClick={() => setFilter(item.value)}

              className={[

                'rounded-full border px-4 py-2 text-xs font-semibold transition',

                filter === item.value

                  ? 'border-[color:var(--primary)] bg-[color:var(--primary)] text-white'

                  : 'border-[color:var(--border)] bg-white/80 text-[color:var(--muted)]',

              ].join(' ')}

            >

              {item.label}

            </button>

          ))}

        </div>

        <div className='mt-6'>

          <AlertsPanel items={alerts} />

        </div>

      </section>

    </AppShell>

  );

}


