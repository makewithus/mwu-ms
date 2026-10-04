export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE' | 'CLIENT';

export const RolePermissions = {
  SUPER_ADMIN: {
    canManageEmployees: true,
    canManageClients: true,
    canManageProjects: true,
    canViewAllProjects: true,
    canManageInvoices: true,
    canManageIntegrations: true,
  },
  ADMIN: {
    canManageEmployees: true,
    canManageClients: true,
    canManageProjects: true,
    canViewAllProjects: true,
    canManageInvoices: true,
    canManageIntegrations: true,
  },
  EMPLOYEE: {
    canManageEmployees: false,
    canManageClients: false,
    canManageProjects: false,
    canViewAllProjects: false,
    canManageInvoices: false,
    canManageIntegrations: false,
  },
  CLIENT: {
    canManageEmployees: false,
    canManageClients: false,
    canManageProjects: false,
    canViewAllProjects: false,
    canManageInvoices: false,
    canManageIntegrations: false,
  }
};

export function hasPermission(role: Role, permission: keyof typeof RolePermissions.SUPER_ADMIN): boolean {
  if (!role || !RolePermissions[role]) return false;
  return RolePermissions[role][permission] ?? false;
}
