export const ROLES = {
  ADMIN: 'admin',
  LAWYER: 'lawyer',
  INTERN: 'intern',
  SECRETARY: 'secretary',
};

export const ROLES_LIST =
  Object.values(ROLES);

// ======================================================
// LABELS
// ======================================================

export const ROLE_LABELS = {
  [ROLES.ADMIN]:
    'Yönetici',

  [ROLES.LAWYER]:
    'Avukat',

  [ROLES.INTERN]:
    'Stajyer',

  [ROLES.SECRETARY]:
    'Sekreter',
};

// ======================================================
// UI COLORS
// ======================================================

export const ROLE_COLORS = {
  [ROLES.ADMIN]:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/[0.08] dark:text-violet-300 dark:border-violet-500/15',

  [ROLES.LAWYER]:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/[0.08] dark:text-blue-300 dark:border-blue-500/15',

  [ROLES.INTERN]:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/[0.08] dark:text-amber-300 dark:border-amber-500/15',

  [ROLES.SECRETARY]:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/[0.08] dark:text-emerald-300 dark:border-emerald-500/15',
};

// ======================================================
// ICONS
// ======================================================

export const ROLE_ICONS = {
  [ROLES.ADMIN]: '👑',
  [ROLES.LAWYER]: '⚖️',
  [ROLES.INTERN]: '📚',
  [ROLES.SECRETARY]: '📋',
};

// ======================================================
// SELECT OPTIONS
// ======================================================

export const ROLE_OPTIONS =
  ROLES_LIST.map(
    (value) => ({
      value,
      label:
        ROLE_LABELS[value] ||
        value,
    })
  );

// ======================================================
// PERMISSIONS
// ======================================================

export const PERMISSIONS = {
  USERS_VIEW:
    'users.view',

  USERS_MANAGE:
    'users.manage',

  CLIENTS_VIEW:
    'clients.view',

  CLIENTS_CREATE:
    'clients.create',

  CLIENTS_UPDATE:
    'clients.update',

  CLIENTS_DELETE:
    'clients.delete',

  CASES_VIEW:
    'cases.view',

  CASES_CREATE:
    'cases.create',

  CASES_UPDATE:
    'cases.update',

  CASES_DELETE:
    'cases.delete',

  DOCUMENTS_VIEW:
    'documents.view',

  DOCUMENTS_CREATE:
    'documents.create',

  DOCUMENTS_UPDATE:
    'documents.update',

  DOCUMENTS_DELETE:
    'documents.delete',

  TASKS_VIEW:
    'tasks.view',

  TASKS_CREATE:
    'tasks.create',

  TASKS_UPDATE:
    'tasks.update',

  TASKS_DELETE:
    'tasks.delete',

  MEETINGS_VIEW:
    'meetings.view',

  MEETINGS_CREATE:
    'meetings.create',

  MEETINGS_UPDATE:
    'meetings.update',

  MEETINGS_DELETE:
    'meetings.delete',

  CALENDAR_VIEW:
    'calendar.view',

  CALENDAR_UPDATE:
    'calendar.update',

  FINANCE_VIEW:
    'finance.view',

  FINANCE_UPDATE:
    'finance.update',

  FINANCE_DELETE:
    'finance.delete',

  DOCUMENT_TEMPLATES_VIEW:
    'templates.view',

  DOCUMENT_TEMPLATES_CREATE:
    'templates.create',

  DOCUMENT_TEMPLATES_UPDATE:
    'templates.update',

  DOCUMENT_TEMPLATES_DELETE:
    'templates.delete',

  POWER_OF_ATTORNEY_VIEW:
    'power_of_attorney.view',

  POWER_OF_ATTORNEY_CREATE:
    'power_of_attorney.create',

  POWER_OF_ATTORNEY_UPDATE:
    'power_of_attorney.update',

  POWER_OF_ATTORNEY_DELETE:
    'power_of_attorney.delete',

  AUDIT_LOG_VIEW:
    'audit_log.view',

  AUDIT_LOG_DELETE:
    'audit_log.delete',

  AI_USE:
    'ai.use',

  SETTINGS_MANAGE:
    'settings.manage',
};

// ======================================================
// ROLE -> PERMISSIONS
// Frontend fallback.
// Asıl source of truth backend olmalı.
// ======================================================

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    '*',
  ],

  [ROLES.LAWYER]: [
    PERMISSIONS.CLIENTS_VIEW,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,

    PERMISSIONS.CASES_VIEW,
    PERMISSIONS.CASES_CREATE,
    PERMISSIONS.CASES_UPDATE,

    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_CREATE,
    PERMISSIONS.DOCUMENTS_UPDATE,

    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,

    PERMISSIONS.MEETINGS_VIEW,
    PERMISSIONS.MEETINGS_CREATE,
    PERMISSIONS.MEETINGS_UPDATE,

    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_UPDATE,

    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_UPDATE,

    PERMISSIONS.DOCUMENT_TEMPLATES_VIEW,
    PERMISSIONS.DOCUMENT_TEMPLATES_CREATE,
    PERMISSIONS.DOCUMENT_TEMPLATES_UPDATE,

    PERMISSIONS.POWER_OF_ATTORNEY_VIEW,
    PERMISSIONS.POWER_OF_ATTORNEY_CREATE,
    PERMISSIONS.POWER_OF_ATTORNEY_UPDATE,

    PERMISSIONS.AI_USE,
  ],

  [ROLES.SECRETARY]: [
    PERMISSIONS.CLIENTS_VIEW,
    PERMISSIONS.CLIENTS_CREATE,
    PERMISSIONS.CLIENTS_UPDATE,

    PERMISSIONS.CASES_VIEW,
    PERMISSIONS.CASES_CREATE,
    PERMISSIONS.CASES_UPDATE,

    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_CREATE,
    PERMISSIONS.DOCUMENTS_UPDATE,

    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_UPDATE,

    PERMISSIONS.MEETINGS_VIEW,
    PERMISSIONS.MEETINGS_CREATE,
    PERMISSIONS.MEETINGS_UPDATE,

    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_UPDATE,

    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_UPDATE,

    PERMISSIONS.DOCUMENT_TEMPLATES_VIEW,

    PERMISSIONS.POWER_OF_ATTORNEY_VIEW,
    PERMISSIONS.POWER_OF_ATTORNEY_CREATE,
    PERMISSIONS.POWER_OF_ATTORNEY_UPDATE,
  ],

  [ROLES.INTERN]: [
    PERMISSIONS.CLIENTS_VIEW,

    PERMISSIONS.CASES_VIEW,

    PERMISSIONS.DOCUMENTS_VIEW,

    PERMISSIONS.TASKS_VIEW,

    PERMISSIONS.MEETINGS_VIEW,

    PERMISSIONS.CALENDAR_VIEW,

    PERMISSIONS.FINANCE_VIEW,

    PERMISSIONS.DOCUMENT_TEMPLATES_VIEW,

    PERMISSIONS.POWER_OF_ATTORNEY_VIEW,
  ],
};

// ======================================================
// PERMISSION HELPERS
// ======================================================

export const hasPermission = (
  userRole,
  permission
) => {
  if (
    !userRole ||
    !permission
  ) {
    return false;
  }

  const permissions =
    ROLE_PERMISSIONS[
      userRole
    ] || [];

  return (
    permissions.includes('*') ||
    permissions.includes(
      permission
    )
  );
};

export const hasAnyPermission = (
  userRole,
  permissions = []
) => {
  if (
    !Array.isArray(
      permissions
    )
  ) {
    return false;
  }

  return permissions.some(
    (permission) =>
      hasPermission(
        userRole,
        permission
      )
  );
};

export const hasAllPermissions = (
  userRole,
  permissions = []
) => {
  if (
    !Array.isArray(
      permissions
    )
  ) {
    return false;
  }

  return permissions.every(
    (permission) =>
      hasPermission(
        userRole,
        permission
      )
  );
};

// ======================================================
// ROLE HELPERS
// ======================================================

export const hasAnyRole = (
  userRole,
  roles = []
) => {
  if (
    !userRole ||
    !Array.isArray(roles)
  ) {
    return false;
  }

  return roles.includes(
    userRole
  );
};

// ======================================================
// ROLE HIERARCHY
// ======================================================

export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.LAWYER]: 3,
  [ROLES.SECRETARY]: 2,
  [ROLES.INTERN]: 1,
};

export const hasRoleLevel = (
  userRole,
  targetRole
) => {
  if (
    !userRole ||
    !targetRole
  ) {
    return false;
  }

  return (
    (
      ROLE_HIERARCHY[
        userRole
      ] || 0
    ) >=
    (
      ROLE_HIERARCHY[
        targetRole
      ] || 0
    )
  );
};

export default {
  ROLES,
  ROLES_LIST,

  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_ICONS,
  ROLE_OPTIONS,

  PERMISSIONS,
  ROLE_PERMISSIONS,

  hasPermission,
  hasAnyPermission,
  hasAllPermissions,

  hasAnyRole,
  hasRoleLevel,
};