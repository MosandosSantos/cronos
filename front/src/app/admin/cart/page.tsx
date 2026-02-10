'use client';

import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import { logout } from '@/lib/auth';
import { adminNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

export default function AdminCartPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  return (
    <AppShell
      navItems={adminNavItems}
      title='Carrinho'
      subtitle='Pedidos de cursos e laudos'
      onLogout={handleLogout}
    >
      <section className='glass-panel rounded-3xl border border-[#c5e2e2] bg-[#E0F0F0]/90 p-6'>
        <h2 className='text-xl font-semibold text-[#0e3a36]'>Central de pedidos</h2>
        <p className='mt-2 text-sm text-[#0e3a36]'>
          Aqui ficarão todos os pedidos de cursos e laudos enviados pelos usuários.
        </p>
      </section>
    </AppShell>
  );
}

