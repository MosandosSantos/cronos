'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { getRole, isAuthenticated } from '@/lib/auth';

type Role = 'SAAS_ADMIN' | 'TENANT_ADMIN';

export const useAuthGuard = (expectedRole?: Role) => {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    if (expectedRole) {
      const role = getRole();
      if (role && role !== expectedRole) {
        router.replace(role === 'SAAS_ADMIN' ? '/admin/dashboard' : '/app/dashboard');
      }
    }
  }, [expectedRole, router]);
};
