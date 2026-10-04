export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE' | 'CLIENT';
type StoredRole = Role | string | null | undefined;

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

export function normalizeRole(role: StoredRole): Role | null {
  if (!role) return null;

  const normalized = String(role).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'SUPERADMIN') return 'SUPER_ADMIN';
  if (normalized in RolePermissions) return normalized as Role;

  return null;
}

export function hasPermission(role: StoredRole, permission: keyof typeof RolePermissions.SUPER_ADMIN): boolean {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;
  return RolePermissions[normalizedRole][permission] ?? false;
}
