// ======================================================
// ROLES
// ======================================================

export const ROLES = {
  ADMIN:
    'admin',

  LAWYER:
    'lawyer',

  INTERN:
    'intern',

  SECRETARY:
    'secretary',
};

export const ROLES_LIST =
  Object.values(
    ROLES
  );

// ======================================================
// ROLE LABELS
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
// PERMISSION KEYS
//
// Tek kaynak burası.
// Route, controller ve admin yetki ekranı
// aynı permission isimlerini kullanacak.
// ======================================================

export const PERMISSION_KEYS = {
  // ----------------------------------------------------
  // CLIENTS
  // ----------------------------------------------------

  VIEW_CLIENTS:
    'view_clients',

  CREATE_CLIENTS:
    'create_clients',

  EDIT_CLIENTS:
    'edit_clients',

  DELETE_CLIENTS:
    'delete_clients',

  // ----------------------------------------------------
  // CASES
  // ----------------------------------------------------

  VIEW_CASES:
    'view_cases',

  /*
   * Record-level erişim.
   *
   * Bu izin yoksa kullanıcı yalnızca:
   *
   * - created_by = kendi ID'si
   * - assigned_to = kendi ID'si
   *
   * olan davalara erişebilir.
   */
  VIEW_ALL_CASES:
    'view_all_cases',

  CREATE_CASES:
    'create_cases',

  EDIT_CASES:
    'edit_cases',

  DELETE_CASES:
    'delete_cases',

  CHANGE_CASE_STATUS:
    'change_case_status',

  MANAGE_CASE_PARTIES:
    'manage_case_parties',

  // ----------------------------------------------------
  // DOCUMENTS
  // ----------------------------------------------------

  VIEW_DOCUMENTS:
    'view_documents',

  UPLOAD_DOCUMENTS:
    'upload_documents',

  EDIT_DOCUMENTS:
    'edit_documents',

  DELETE_DOCUMENTS:
    'delete_documents',

  DOWNLOAD_DOCUMENTS:
    'download_documents',

  MANAGE_DOCUMENT_VERSIONS:
    'manage_document_versions',

  // ----------------------------------------------------
  // TASKS
  // ----------------------------------------------------

  VIEW_TASKS:
    'view_tasks',

  CREATE_TASKS:
    'create_tasks',

  EDIT_TASKS:
    'edit_tasks',

  DELETE_TASKS:
    'delete_tasks',

  ASSIGN_TASKS:
    'assign_tasks',

  WORK_ON_TASKS:
    'work_on_tasks',

  APPROVE_TASKS:
    'approve_tasks',

  VIEW_ALL_TASKS:
    'view_all_tasks',

  // ----------------------------------------------------
  // PERFORMANCE
  // ----------------------------------------------------

  VIEW_OWN_PERFORMANCE:
    'view_own_performance',

  VIEW_TEAM_PERFORMANCE:
    'view_team_performance',

  // ----------------------------------------------------
  // EVENTS / CALENDAR
  // ----------------------------------------------------

  VIEW_EVENTS:
    'view_events',

  CREATE_EVENTS:
    'create_events',

  EDIT_EVENTS:
    'edit_events',

  DELETE_EVENTS:
    'delete_events',

  VIEW_CALENDAR:
    'view_calendar',

  MANAGE_CALENDAR:
    'manage_calendar',

  // ----------------------------------------------------
  // MEETINGS
  // ----------------------------------------------------

  VIEW_MEETINGS:
    'view_meetings',

  CREATE_MEETINGS:
    'create_meetings',

  EDIT_MEETINGS:
    'edit_meetings',

  DELETE_MEETINGS:
    'delete_meetings',

  // ----------------------------------------------------
  // FINANCE / PAYMENTS
  // ----------------------------------------------------

  VIEW_PAYMENTS:
    'view_payments',

  CREATE_PAYMENTS:
    'create_payments',

  EDIT_PAYMENTS:
    'edit_payments',

  DELETE_PAYMENTS:
    'delete_payments',

  REVERSE_PAYMENTS:
    'reverse_payments',

  VIEW_FINANCE_REPORTS:
    'view_finance_reports',

  MANAGE_PAYMENT_PLANS:
    'manage_payment_plans',

  // ----------------------------------------------------
  // NOTES
  // ----------------------------------------------------

  VIEW_NOTES:
    'view_notes',

  CREATE_NOTES:
    'create_notes',

  EDIT_NOTES:
    'edit_notes',

  DELETE_NOTES:
    'delete_notes',

  // ----------------------------------------------------
  // POWER OF ATTORNEY
  // ----------------------------------------------------

  VIEW_POWER_OF_ATTORNEY:
    'view_power_of_attorney',

  CREATE_POWER_OF_ATTORNEY:
    'create_power_of_attorney',

  EDIT_POWER_OF_ATTORNEY:
    'edit_power_of_attorney',

  DELETE_POWER_OF_ATTORNEY:
    'delete_power_of_attorney',

  // ----------------------------------------------------
  // TEMPLATES
  // ----------------------------------------------------

  VIEW_TEMPLATES:
    'view_templates',

  CREATE_TEMPLATES:
    'create_templates',

  EDIT_TEMPLATES:
    'edit_templates',

  DELETE_TEMPLATES:
    'delete_templates',

  // ----------------------------------------------------
  // SEARCH
  // ----------------------------------------------------

  USE_SEARCH:
    'use_search',

  // ----------------------------------------------------
  // AI
  // ----------------------------------------------------

  USE_AI:
    'use_ai',

  // ----------------------------------------------------
  // USERS
  // ----------------------------------------------------

  VIEW_USERS:
    'view_users',

  CREATE_USERS:
    'create_users',

  EDIT_USERS:
    'edit_users',

  DELETE_USERS:
    'delete_users',

  CHANGE_USER_ROLES:
    'change_user_roles',

  MANAGE_USER_STATUS:
    'manage_user_status',

  MANAGE_PERMISSIONS:
    'manage_permissions',

  // ----------------------------------------------------
  // AUDIT
  // ----------------------------------------------------

  VIEW_AUDIT_LOGS:
    'view_audit_logs',

  DELETE_AUDIT_LOGS:
    'delete_audit_logs',

  // ----------------------------------------------------
  // SETTINGS
  // ----------------------------------------------------

  VIEW_SETTINGS:
    'view_settings',

  MANAGE_SETTINGS:
    'manage_settings',
};

// ======================================================
// ALL PERMISSIONS
// ======================================================

export const ALL_PERMISSIONS =
  Object.values(
    PERMISSION_KEYS
  );

// ======================================================
// DEFAULT ROLE PERMISSIONS
// ======================================================

export const PERMISSIONS = {
  // ====================================================
  // ADMIN
  // ====================================================

  [ROLES.ADMIN]: [
    'all',
  ],

  // ====================================================
  // LAWYER
  // ====================================================

  [ROLES.LAWYER]: [
    // Clients
    PERMISSION_KEYS.VIEW_CLIENTS,
    PERMISSION_KEYS.CREATE_CLIENTS,
    PERMISSION_KEYS.EDIT_CLIENTS,

    // Cases
    PERMISSION_KEYS.VIEW_CASES,
    PERMISSION_KEYS.CREATE_CASES,
    PERMISSION_KEYS.EDIT_CASES,
    PERMISSION_KEYS.CHANGE_CASE_STATUS,
    PERMISSION_KEYS.MANAGE_CASE_PARTIES,

    // Documents
    PERMISSION_KEYS.VIEW_DOCUMENTS,
    PERMISSION_KEYS.UPLOAD_DOCUMENTS,
    PERMISSION_KEYS.EDIT_DOCUMENTS,
    PERMISSION_KEYS.DOWNLOAD_DOCUMENTS,
    PERMISSION_KEYS.MANAGE_DOCUMENT_VERSIONS,

    // Tasks
    PERMISSION_KEYS.VIEW_TASKS,
    PERMISSION_KEYS.CREATE_TASKS,
    PERMISSION_KEYS.EDIT_TASKS,
    PERMISSION_KEYS.WORK_ON_TASKS,

    // Performance
    PERMISSION_KEYS.VIEW_OWN_PERFORMANCE,

    // Calendar / Events
    PERMISSION_KEYS.VIEW_EVENTS,
    PERMISSION_KEYS.CREATE_EVENTS,
    PERMISSION_KEYS.EDIT_EVENTS,
    PERMISSION_KEYS.VIEW_CALENDAR,
    PERMISSION_KEYS.MANAGE_CALENDAR,

    // Meetings
    PERMISSION_KEYS.VIEW_MEETINGS,
    PERMISSION_KEYS.CREATE_MEETINGS,
    PERMISSION_KEYS.EDIT_MEETINGS,

    // Finance
    PERMISSION_KEYS.VIEW_PAYMENTS,
    PERMISSION_KEYS.CREATE_PAYMENTS,
    PERMISSION_KEYS.EDIT_PAYMENTS,
    PERMISSION_KEYS.MANAGE_PAYMENT_PLANS,

    // Notes
    PERMISSION_KEYS.VIEW_NOTES,
    PERMISSION_KEYS.CREATE_NOTES,
    PERMISSION_KEYS.EDIT_NOTES,

    // Power of Attorney
    PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY,
    PERMISSION_KEYS.CREATE_POWER_OF_ATTORNEY,
    PERMISSION_KEYS.EDIT_POWER_OF_ATTORNEY,

    // Templates
    PERMISSION_KEYS.VIEW_TEMPLATES,
    PERMISSION_KEYS.CREATE_TEMPLATES,
    PERMISSION_KEYS.EDIT_TEMPLATES,

    // Search / AI
    PERMISSION_KEYS.USE_SEARCH,
    PERMISSION_KEYS.USE_AI,

    // Settings
    PERMISSION_KEYS.VIEW_SETTINGS,
  ],

  // ====================================================
  // SECRETARY
  // ====================================================

  [ROLES.SECRETARY]: [
    // Clients
    PERMISSION_KEYS.VIEW_CLIENTS,
    PERMISSION_KEYS.CREATE_CLIENTS,
    PERMISSION_KEYS.EDIT_CLIENTS,

    // Cases
    PERMISSION_KEYS.VIEW_CASES,
    PERMISSION_KEYS.EDIT_CASES,

    // Documents
    PERMISSION_KEYS.VIEW_DOCUMENTS,
    PERMISSION_KEYS.UPLOAD_DOCUMENTS,
    PERMISSION_KEYS.EDIT_DOCUMENTS,
    PERMISSION_KEYS.DOWNLOAD_DOCUMENTS,

    // Tasks
    PERMISSION_KEYS.VIEW_TASKS,
    PERMISSION_KEYS.CREATE_TASKS,
    PERMISSION_KEYS.EDIT_TASKS,
    PERMISSION_KEYS.WORK_ON_TASKS,

    // Performance
    PERMISSION_KEYS.VIEW_OWN_PERFORMANCE,

    // Calendar / Events
    PERMISSION_KEYS.VIEW_EVENTS,
    PERMISSION_KEYS.CREATE_EVENTS,
    PERMISSION_KEYS.EDIT_EVENTS,
    PERMISSION_KEYS.VIEW_CALENDAR,
    PERMISSION_KEYS.MANAGE_CALENDAR,

    // Meetings
    PERMISSION_KEYS.VIEW_MEETINGS,
    PERMISSION_KEYS.CREATE_MEETINGS,
    PERMISSION_KEYS.EDIT_MEETINGS,

    // Finance
    PERMISSION_KEYS.VIEW_PAYMENTS,
    PERMISSION_KEYS.CREATE_PAYMENTS,

    // Notes
    PERMISSION_KEYS.VIEW_NOTES,
    PERMISSION_KEYS.CREATE_NOTES,
    PERMISSION_KEYS.EDIT_NOTES,

    // Power of Attorney
    PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY,
    PERMISSION_KEYS.CREATE_POWER_OF_ATTORNEY,
    PERMISSION_KEYS.EDIT_POWER_OF_ATTORNEY,

    // Templates
    PERMISSION_KEYS.VIEW_TEMPLATES,

    // Search
    PERMISSION_KEYS.USE_SEARCH,

    // Settings
    PERMISSION_KEYS.VIEW_SETTINGS,
  ],

  // ====================================================
  // INTERN
  // ====================================================

  [ROLES.INTERN]: [
    // Clients
    PERMISSION_KEYS.VIEW_CLIENTS,

    // Cases
    PERMISSION_KEYS.VIEW_CASES,

    // Documents
    PERMISSION_KEYS.VIEW_DOCUMENTS,
    PERMISSION_KEYS.DOWNLOAD_DOCUMENTS,

    // Tasks
    PERMISSION_KEYS.VIEW_TASKS,
    PERMISSION_KEYS.WORK_ON_TASKS,

    // Performance
    PERMISSION_KEYS.VIEW_OWN_PERFORMANCE,

    // Calendar / Events
    PERMISSION_KEYS.VIEW_EVENTS,
    PERMISSION_KEYS.VIEW_CALENDAR,

    // Meetings
    PERMISSION_KEYS.VIEW_MEETINGS,

    // Notes
    PERMISSION_KEYS.VIEW_NOTES,
    PERMISSION_KEYS.CREATE_NOTES,

    // Power of Attorney
    PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY,

    // Templates
    PERMISSION_KEYS.VIEW_TEMPLATES,

    // Search
    PERMISSION_KEYS.USE_SEARCH,
  ],
};

// ======================================================
// PERMISSION GROUPS
// ======================================================

export const PERMISSION_GROUPS = {
  clients: {
    label:
      'Müvekkiller',

    permissions: [
      PERMISSION_KEYS.VIEW_CLIENTS,
      PERMISSION_KEYS.CREATE_CLIENTS,
      PERMISSION_KEYS.EDIT_CLIENTS,
      PERMISSION_KEYS.DELETE_CLIENTS,
    ],
  },

  cases: {
    label:
      'Davalar',

    permissions: [
      PERMISSION_KEYS.VIEW_CASES,

      /*
       * Admin yetki ekranında artık ayrı seçenek olarak
       * görünebilir.
       */
      PERMISSION_KEYS.VIEW_ALL_CASES,

      PERMISSION_KEYS.CREATE_CASES,
      PERMISSION_KEYS.EDIT_CASES,
      PERMISSION_KEYS.DELETE_CASES,
      PERMISSION_KEYS.CHANGE_CASE_STATUS,
      PERMISSION_KEYS.MANAGE_CASE_PARTIES,
    ],
  },

  documents: {
    label:
      'Belgeler',

    permissions: [
      PERMISSION_KEYS.VIEW_DOCUMENTS,
      PERMISSION_KEYS.UPLOAD_DOCUMENTS,
      PERMISSION_KEYS.EDIT_DOCUMENTS,
      PERMISSION_KEYS.DELETE_DOCUMENTS,
      PERMISSION_KEYS.DOWNLOAD_DOCUMENTS,
      PERMISSION_KEYS.MANAGE_DOCUMENT_VERSIONS,
    ],
  },

  tasks: {
    label:
      'Görevler',

    permissions: [
      PERMISSION_KEYS.VIEW_TASKS,
      PERMISSION_KEYS.CREATE_TASKS,
      PERMISSION_KEYS.EDIT_TASKS,
      PERMISSION_KEYS.DELETE_TASKS,
      PERMISSION_KEYS.ASSIGN_TASKS,
      PERMISSION_KEYS.WORK_ON_TASKS,
      PERMISSION_KEYS.APPROVE_TASKS,
      PERMISSION_KEYS.VIEW_ALL_TASKS,
    ],
  },

  performance: {
    label:
      'Performans',

    permissions: [
      PERMISSION_KEYS.VIEW_OWN_PERFORMANCE,
      PERMISSION_KEYS.VIEW_TEAM_PERFORMANCE,
    ],
  },

  calendar: {
    label:
      'Takvim ve Etkinlikler',

    permissions: [
      PERMISSION_KEYS.VIEW_EVENTS,
      PERMISSION_KEYS.CREATE_EVENTS,
      PERMISSION_KEYS.EDIT_EVENTS,
      PERMISSION_KEYS.DELETE_EVENTS,
      PERMISSION_KEYS.VIEW_CALENDAR,
      PERMISSION_KEYS.MANAGE_CALENDAR,
    ],
  },

  meetings: {
    label:
      'Toplantılar',

    permissions: [
      PERMISSION_KEYS.VIEW_MEETINGS,
      PERMISSION_KEYS.CREATE_MEETINGS,
      PERMISSION_KEYS.EDIT_MEETINGS,
      PERMISSION_KEYS.DELETE_MEETINGS,
    ],
  },

  finance: {
    label:
      'Finans',

    permissions: [
      PERMISSION_KEYS.VIEW_PAYMENTS,
      PERMISSION_KEYS.CREATE_PAYMENTS,
      PERMISSION_KEYS.EDIT_PAYMENTS,
      PERMISSION_KEYS.DELETE_PAYMENTS,
      PERMISSION_KEYS.REVERSE_PAYMENTS,
      PERMISSION_KEYS.VIEW_FINANCE_REPORTS,
      PERMISSION_KEYS.MANAGE_PAYMENT_PLANS,
    ],
  },

  notes: {
    label:
      'Notlar',

    permissions: [
      PERMISSION_KEYS.VIEW_NOTES,
      PERMISSION_KEYS.CREATE_NOTES,
      PERMISSION_KEYS.EDIT_NOTES,
      PERMISSION_KEYS.DELETE_NOTES,
    ],
  },

  powerOfAttorney: {
    label:
      'Vekaletnameler',

    permissions: [
      PERMISSION_KEYS.VIEW_POWER_OF_ATTORNEY,
      PERMISSION_KEYS.CREATE_POWER_OF_ATTORNEY,
      PERMISSION_KEYS.EDIT_POWER_OF_ATTORNEY,
      PERMISSION_KEYS.DELETE_POWER_OF_ATTORNEY,
    ],
  },

  templates: {
    label:
      'Şablonlar',

    permissions: [
      PERMISSION_KEYS.VIEW_TEMPLATES,
      PERMISSION_KEYS.CREATE_TEMPLATES,
      PERMISSION_KEYS.EDIT_TEMPLATES,
      PERMISSION_KEYS.DELETE_TEMPLATES,
    ],
  },

  system: {
    label:
      'Sistem',

    permissions: [
      PERMISSION_KEYS.USE_SEARCH,
      PERMISSION_KEYS.USE_AI,
      PERMISSION_KEYS.VIEW_SETTINGS,
      PERMISSION_KEYS.MANAGE_SETTINGS,
    ],
  },

  administration: {
    label:
      'Yönetim',

    permissions: [
      PERMISSION_KEYS.VIEW_USERS,
      PERMISSION_KEYS.CREATE_USERS,
      PERMISSION_KEYS.EDIT_USERS,
      PERMISSION_KEYS.DELETE_USERS,
      PERMISSION_KEYS.CHANGE_USER_ROLES,
      PERMISSION_KEYS.MANAGE_USER_STATUS,
      PERMISSION_KEYS.MANAGE_PERMISSIONS,

      PERMISSION_KEYS.VIEW_AUDIT_LOGS,
      PERMISSION_KEYS.DELETE_AUDIT_LOGS,
    ],
  },
};

// ======================================================
// PRESETS
// ======================================================

export const PERMISSION_PRESETS = {
  STANDARD_LAWYER: {
    label:
      'Standart Avukat',

    role:
      ROLES.LAWYER,

    overrides:
      {},
  },

  SENIOR_LAWYER: {
    label:
      'Kıdemli Avukat',

    role:
      ROLES.LAWYER,

    overrides: {
      [PERMISSION_KEYS.DELETE_DOCUMENTS]:
        true,

      [PERMISSION_KEYS.DELETE_TASKS]:
        true,

      [PERMISSION_KEYS.ASSIGN_TASKS]:
        true,

      [PERMISSION_KEYS.VIEW_ALL_TASKS]:
        true,

      [PERMISSION_KEYS.VIEW_FINANCE_REPORTS]:
        true,
    },
  },

  MANAGING_LAWYER: {
    label:
      'Yönetici Avukat',

    role:
      ROLES.LAWYER,

    overrides: {
      /*
       * Yönetici avukat bütün dava kayıtlarını
       * görebilir.
       */
      [PERMISSION_KEYS.VIEW_ALL_CASES]:
        true,

      [PERMISSION_KEYS.DELETE_CLIENTS]:
        true,

      [PERMISSION_KEYS.DELETE_CASES]:
        true,

      [PERMISSION_KEYS.DELETE_DOCUMENTS]:
        true,

      [PERMISSION_KEYS.DELETE_TASKS]:
        true,

      [PERMISSION_KEYS.ASSIGN_TASKS]:
        true,

      [PERMISSION_KEYS.APPROVE_TASKS]:
        true,

      [PERMISSION_KEYS.VIEW_ALL_TASKS]:
        true,

      [PERMISSION_KEYS.VIEW_TEAM_PERFORMANCE]:
        true,

      [PERMISSION_KEYS.DELETE_MEETINGS]:
        true,

      [PERMISSION_KEYS.VIEW_FINANCE_REPORTS]:
        true,

      [PERMISSION_KEYS.EDIT_PAYMENTS]:
        true,

      [PERMISSION_KEYS.VIEW_AUDIT_LOGS]:
        true,
    },
  },
};

// ======================================================
// HELPERS
// ======================================================

export const isValidRole = (
  role
) => {
  return ROLES_LIST.includes(
    role
  );
};

export const isValidPermission = (
  permission
) => {
  return ALL_PERMISSIONS.includes(
    permission
  );
};

export const getRolePermissions = (
  role
) => {
  return (
    PERMISSIONS[
      role
    ] || []
  );
};

export const getEffectivePermissions = (
  role,
  overrides = {}
) => {
  if (
    role ===
    ROLES.ADMIN
  ) {
    return ALL_PERMISSIONS;
  }

  const defaults =
    new Set(
      getRolePermissions(
        role
      )
    );

  for (
    const [
      permission,
      enabled,
    ] of Object.entries(
      overrides || {}
    )
  ) {
    if (
      !isValidPermission(
        permission
      )
    ) {
      continue;
    }

    if (
      enabled ===
      true
    ) {
      defaults.add(
        permission
      );
    }

    if (
      enabled ===
      false
    ) {
      defaults.delete(
        permission
      );
    }
  }

  return Array.from(
    defaults
  );
};