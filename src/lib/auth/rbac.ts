export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'CLIENT';
type StoredRole = Role | string | null | undefined;

export const RolePermissions = {
  SUPER_ADMIN: {
    canManageEmployees: true,
    canManageClients: true,
    canManageProjects: true,
    canViewAllProjects: true,
    canManageInvoices: true,
    canManageIntegrations: true,
    canManageSystemUsers: true,
    canManageTasks: true,
    canManageAttendance: true,
    canManageLeaves: true,
    canManagePayroll: true,
    canManageDocuments: true,
    canManageNotices: true,
    canManageReports: true,
  },
  MANAGER: {
    canManageEmployees: true,
    canManageClients: true,
    canManageProjects: true,
    canViewAllProjects: true,
    canManageInvoices: true,
    canManageIntegrations: true,
    canManageSystemUsers: false,
    canManageTasks: true,
    canManageAttendance: true,
    canManageLeaves: true,
    canManagePayroll: true,
    canManageDocuments: true,
    canManageNotices: true,
    canManageReports: true,
  },
  EMPLOYEE: {
    canManageEmployees: false,
    canManageClients: false,
    canManageProjects: false,
    canViewAllProjects: false,
    canManageInvoices: false,
    canManageIntegrations: false,
    canManageSystemUsers: false,
    canManageTasks: true,
    canManageAttendance: false,
    canManageLeaves: false,
    canManagePayroll: false,
    canManageDocuments: false,
    canManageNotices: false,
    canManageReports: false,
  },
  CLIENT: {
    canManageEmployees: false,
    canManageClients: false,
    canManageProjects: false,
    canViewAllProjects: false,
    canManageInvoices: false,
    canManageIntegrations: false,
    canManageSystemUsers: false,
    canManageTasks: false,
    canManageAttendance: false,
    canManageLeaves: false,
    canManagePayroll: false,
    canManageDocuments: false,
    canManageNotices: false,
    canManageReports: false,
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
