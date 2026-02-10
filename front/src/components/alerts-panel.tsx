'use client';



import { formatDate } from '@/lib/format';

import { dueStatusLabels } from '@/lib/mock-data';



type AlertItem = {

  id: string;

  category: string;

  label: string;

  employeeName?: string | null;

  dueDate: string;

  status: string;

  daysToDue: number;

};



type AlertsPanelProps = {

  items: AlertItem[];

};



const categoryLabel: Record<string, string> = {

  aso: 'ASO',

  exam: 'ASO',

  training: 'Treinamento',

  document: 'Laudo',

};



export default function AlertsPanel({ items }: AlertsPanelProps) {

  if (!items.length) {

    return (

      <div className='rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 text-sm text-[color:var(--muted)]'>

        Nenhum alerta crítico nos próximos dias.

      </div>

    );

  }



  return (

    <div className='space-y-3'>

      {items.map((item) => (

        <div

          key={item.id}

          className='flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-white/85 px-4 py-3 text-xs'

        >

          <div className='flex items-center justify-between text-sm font-semibold text-[color:var(--ink)]'>

            <span>{categoryLabel[item.category] ?? item.category}</span>

            <span className='text-[color:var(--primary)]'>{dueStatusLabels[item.status] || item.status}</span>

          </div>

          <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--muted)]'>

            <span>{item.label}</span>

            {item.employeeName && <span>{item.employeeName}</span>}

            <span>Vence em {formatDate(item.dueDate)}</span>

            <span>{item.daysToDue} dias</span>

          </div>

        </div>

      ))}

    </div>

  );

}

