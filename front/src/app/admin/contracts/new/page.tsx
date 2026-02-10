'use client';

import { useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import ContractWizard from '@/components/contract-wizard';
import { logout } from '@/lib/auth';
import { adminNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

export default function NewContractPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  return (
    <AppShell navItems={adminNavItems} title='Novo contrato' subtitle='Wizard de criacao' onLogout={handleLogout}>
      <ContractWizard mode='create' onDone={() => router.push('/admin/contracts')} />
    </AppShell>
  );
}

