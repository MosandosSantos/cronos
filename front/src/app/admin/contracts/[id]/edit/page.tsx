'use client';

import { useParams, useRouter } from 'next/navigation';

import AppShell from '@/components/app-shell';
import ContractWizard from '@/components/contract-wizard';
import { logout } from '@/lib/auth';
import { adminNavItems } from '@/lib/mock-data';
import { useAuthGuard } from '@/lib/use-auth-guard';

export default function EditContractPage() {
  useAuthGuard('SAAS_ADMIN');
  const router = useRouter();
  const params = useParams();
  const contractId = String(params?.id ?? '');

  const handleLogout = () => {
    logout();
    router.replace('/logout');
  };

  return (
    <AppShell navItems={adminNavItems} title='Editar contrato' subtitle='Wizard de edicao' onLogout={handleLogout}>
      <ContractWizard mode='edit' contractId={contractId} onDone={() => router.push('/admin/contracts')} />
    </AppShell>
  );
}
