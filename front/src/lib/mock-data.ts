export const adminNavItems = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Carrinho', href: '/admin/cart' },
  { label: 'Agenda', href: '/admin/agenda' },
  { label: 'CRM', href: '/admin/crm' },
  { label: 'Clientes', href: '/admin/clients' },
  { label: 'Contratos', href: '/admin/contracts' },
  { label: 'ASO', href: '/admin/catalogs/aso' },
  { label: 'Cursos', href: '/admin/catalogs/courses' },
  { label: 'Treinamentos', href: '/admin/catalogs/trainings' },
  { label: 'Laudos', href: '/admin/catalogs/reports' },
];

export const appNavItems = [
  { label: 'Dashboard', href: '/app/dashboard' },
  { label: 'Funcionarios', href: '/app/employees' },
  { label: 'ASO', href: '/app/aso-records' },
  { label: 'Cursos', href: '/app/course-records' },
  { label: 'Treinamentos', href: '/app/training-records' },
  { label: 'Laudos', href: '/app/documents' },
  { label: 'Alertas', href: '/app/alerts' },
];

export const dueStatusLabels: Record<string, string> = {
  VALID: 'Valido',
  DUE_SOON: 'A vencer',
  EXPIRED: 'Vencido',
};
