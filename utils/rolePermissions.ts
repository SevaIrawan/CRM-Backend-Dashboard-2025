// ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM
// User Management Level Rules:
// 1. Admin = Full Access All Page + User Management + Admin Features
// 2. Executive = Limited Access: Dashboard, MYR, SGD, USC + Read Only
// 3. Manager = Limited Access: Currency Specific (MYR/SGD/USC) + Can Edit Targets
// 4. SQ = Limited Access: Currency Specific (MYR/SGD/USC) + Read Only
// 5. Analyst = Full Dashboard Access (Dashboard, MYR, SGD, USC) + Read Only + No Admin Features
// 6. Ops = Full Dashboard Access (Dashboard, MYR, SGD, USC) + Read Only + No Admin Features
// 7. Demo = Full Dashboard Access (Dashboard, MYR, SGD, USC) + Can Edit ALL Targets (Testing) + For Presentation & Feedback
// 8. Squad Lead MYR = Limited Access: Specific Brands within MYR Market + Read Only
// 9. Squad Lead SGD = Limited Access: Specific Brands within SGD Market + Read Only
// 10. Squad Lead USC = Limited Access: Specific Brands within USC Market + Read Only
// 11. SNR MYR = Marketing role for MYR Market (Brand-level access, auto-locked from username)
// 12. SNR SGD = Marketing role for SGD Market (Brand-level access, auto-locked from username)
// 13. SNR USC = Marketing role for USC Market (Brand-level access, auto-locked from username)
// 14. Marketing USC = Marketing role for USC Market (All Brand access)
// 15. Marketing MYR = Marketing role for MYR Market (All Brand access)
// 16. Marketing SGD = Marketing role for SGD Market (All Brand access)

export interface UserRole {
  id: string
  name: string
  displayName: string
  permissions: string[]
  canAccessUserManagement: boolean
  isReadOnly: boolean
  allowedBrands?: string[] | null // NEW: null = ALL brands, array = specific brands only
}

export const USER_ROLES: { [key: string]: UserRole } = {
  // Admin = All Access All Page
  'admin': {
    id: 'admin',
    name: 'admin',
    displayName: 'Administrator',
    permissions: [
      'dashboard',
      'myr',
      'sgd',
      'usc',
      'transaction',
      'supabase',
      'users',
      'admin'
    ],
    canAccessUserManagement: true,
    isReadOnly: false
  },
  // Executive = Level/Role Execute = Limited Access > Dashboard, MYR, SGD, USC
  'executive': {
    id: 'executive',
    name: 'executive',
    displayName: 'Executive',
    permissions: [
      'dashboard',
      'myr',
      'sgd',
      'usc'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  // Manager MYR = Level/Role Manager = Limited Access > MYR
  'manager_myr': {
    id: 'manager_myr',
    name: 'manager_myr',
    displayName: 'Manager MYR',
    permissions: [
      'myr'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  // Manager SGD = Level/Role Manager = Limited Access > SGD
  'manager_sgd': {
    id: 'manager_sgd',
    name: 'manager_sgd',
    displayName: 'Manager SGD',
    permissions: [
      'sgd'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  // Manager USC = Level/Role Manager = Limited Access > USC
  'manager_usc': {
    id: 'manager_usc',
    name: 'manager_usc',
    displayName: 'Manager USC',
    permissions: [
      'usc'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  // SQ_MYR = Level/Role User = Limited Access > MYR
  'sq_myr': {
    id: 'sq_myr',
    name: 'sq_myr',
    displayName: 'SQ MYR',
    permissions: [
      'myr'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  // SQ_SGD = Level/Role User = Limited Access > SGD
  'sq_sgd': {
    id: 'sq_sgd',
    name: 'sq_sgd',
    displayName: 'SQ SGD',
    permissions: [
      'sgd'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  // SQ_USC = Level/Role User = Limited Access > USC
  'sq_usc': {
    id: 'sq_usc',
    name: 'sq_usc',
    displayName: 'SQ USC',
    permissions: [
      'usc'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  // Analyst = Full Dashboard Access (No Admin Features)
  'analyst': {
    id: 'analyst',
    name: 'analyst',
    displayName: 'Analyst',
    permissions: [
      'dashboard',
      'myr',
      'sgd',
      'usc'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  // Ops = Operations (Full Dashboard Access, No Admin Features)
  'ops': {
    id: 'ops',
    name: 'ops',
    displayName: 'Operations',
    permissions: [
      'dashboard',
      'myr',
      'sgd',
      'usc'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  // Demo = Demo User (Full Dashboard Access, Can Edit Targets for Testing, For Presentation & Feedback)
  'demo': {
    id: 'demo',
    name: 'demo',
    displayName: 'Demo User',
    permissions: [
      'dashboard',
      'myr',
      'sgd',
      'usc'
    ],
    canAccessUserManagement: false,
    isReadOnly: true,  // Read-only for most features, but can edit targets for testing purposes
    allowedBrands: null
  },
  // Squad Lead MYR = Limited Access > Specific Brands within MYR Market + Read Only
  'squad_lead_myr': {
    id: 'squad_lead_myr',
    name: 'squad_lead_myr',
    displayName: 'Squad Lead MYR',
    permissions: ['myr'], // MYR market only
    canAccessUserManagement: false,
    isReadOnly: true,
    allowedBrands: null // Will be populated from database per user
  },
  // Squad Lead SGD = Limited Access > Specific Brands within SGD Market + Read Only
  'squad_lead_sgd': {
    id: 'squad_lead_sgd',
    name: 'squad_lead_sgd',
    displayName: 'Squad Lead SGD',
    permissions: ['sgd'], // SGD market only
    canAccessUserManagement: false,
    isReadOnly: true,
    allowedBrands: null // Will be populated from database per user
  },
  // Squad Lead USC = Limited Access > Specific Brands within USC Market + Read Only
  'squad_lead_usc': {
    id: 'squad_lead_usc',
    name: 'squad_lead_usc',
    displayName: 'Squad Lead USC',
    permissions: ['usc'], // USC market only
    canAccessUserManagement: false,
    isReadOnly: true,
    allowedBrands: null // Will be populated from database per user
  },
  // SNR MYR = Marketing role for MYR market (Brand-level access)
  'snr_myr': {
    id: 'snr_myr',
    name: 'snr_myr',
    displayName: 'SNR Marketing MYR',
    permissions: ['myr'], // MYR market only
    canAccessUserManagement: false,
    isReadOnly: true,
    allowedBrands: null // Will be populated from database per user (auto-locked from username)
  },
  // SNR SGD = Marketing role for SGD market (Brand-level access)
  'snr_sgd': {
    id: 'snr_sgd',
    name: 'snr_sgd',
    displayName: 'SNR Marketing SGD',
    permissions: ['sgd'], // SGD market only
    canAccessUserManagement: false,
    isReadOnly: true,
    allowedBrands: null // Will be populated from database per user (auto-locked from username)
  },
  // SNR USC = Marketing role for USC market (Brand-level access)
  'snr_usc': {
    id: 'snr_usc',
    name: 'snr_usc',
    displayName: 'SNR Marketing USC',
    permissions: ['usc'], // USC market only
    canAccessUserManagement: false,
    isReadOnly: true,
    allowedBrands: null // Will be populated from database per user (auto-locked from username)
  },
  // Marketing USC = Marketing role for USC market (All Brand access)
  'marketing_usc': {
    id: 'marketing_usc',
    name: 'marketing_usc',
    displayName: 'Marketing USC',
    permissions: ['usc'], // USC market only, All Brand
    canAccessUserManagement: false,
    isReadOnly: true,
    allowedBrands: null // null = ALL brands (unrestricted)
  },
  // Marketing MYR = Marketing role for MYR market (All Brand access)
  'marketing_myr': {
    id: 'marketing_myr',
    name: 'marketing_myr',
    displayName: 'Marketing MYR',
    permissions: ['myr'], // MYR market only, All Brand
    canAccessUserManagement: false,
    isReadOnly: true,
    allowedBrands: null // null = ALL brands (unrestricted)
  },
  // Marketing SGD = Marketing role for SGD market (All Brand access)
  'marketing_sgd': {
    id: 'marketing_sgd',
    name: 'marketing_sgd',
    displayName: 'Marketing SGD',
    permissions: ['sgd'], // SGD market only, All Brand
    canAccessUserManagement: false,
    isReadOnly: true,
    allowedBrands: null // null = ALL brands (unrestricted)
  }
}

// Helper functions for role management
export const getRoleInfo = (roleName: string): UserRole | null => {
  const role = USER_ROLES[roleName.toLowerCase()]
  return role || null
}

export const hasPermission = (userRole: string, pagePath: string): boolean => {
  console.log('🔍 hasPermission called with:', { userRole, pagePath })
  
  const role = getRoleInfo(userRole)
  console.log('👤 Role info:', role)
  
  if (!role) {
    console.log('❌ No role found')
    return false
  }

  // ✅ SNR roles can ONLY access their SNR customer pages
  if (userRole.startsWith('snr_')) {
    const allowedSNRPages = [
      '/myr/snr-customers',
      '/sgd/snr-customers',
      '/usc/snr-customers'
    ]
    const hasAccess = allowedSNRPages.includes(pagePath)
    console.log('🔒 [SNR] Access check:', { pagePath, hasAccess })
    return hasAccess
  }

  // ✅ Manager and Squad Lead can also access SNR Customer pages in their market
  // (SNR pages are already mapped in pathToPermission below, so they'll get access via normal permission check)

  // Map page paths to permission names (exact matches take priority)
  const pathToPermission: { [key: string]: string } = {
    '/dashboard': 'dashboard',
    '/myr': 'myr',
    '/sgd': 'sgd',
    '/usc': 'usc',
    '/transaction': 'transaction',
    '/transaction/adjustment': 'transaction',
    '/transaction/deposit': 'transaction',
    '/transaction/withdraw': 'transaction',
    '/transaction/exchange': 'transaction',
    '/transaction/headcount': 'transaction',
    '/transaction/new-depositor': 'transaction',
    '/transaction/new-register': 'transaction',
    '/transaction/vip-program': 'transaction',
    '/transaction/master-data': 'transaction',
    '/supabase': 'supabase',
    '/users': 'users'
  }

  // ✅ Check exact match first
  let permission = pathToPermission[pagePath]
  
  // ✅ If no exact match, check prefix matching
  if (!permission) {
    if (pagePath.startsWith('/myr/')) {
      permission = 'myr'
    } else if (pagePath.startsWith('/sgd/')) {
      permission = 'sgd'
    } else if (pagePath.startsWith('/usc/')) {
      permission = 'usc'
    } else if (pagePath.startsWith('/transaction/')) {
      permission = 'transaction'
    } else if (pagePath.startsWith('/admin/')) {
      permission = 'admin'
    }
  }

  console.log('🎯 Required permission:', permission)
  console.log('📋 User permissions:', role.permissions)
  
  const hasAccess = permission ? role.permissions.includes(permission) : false
  console.log('✅ Has access:', hasAccess)
  
  return hasAccess
}

export const canAccessUserManagement = (userRole: string): boolean => {
  const role = getRoleInfo(userRole)
  return role ? role.canAccessUserManagement : false
}

export const isReadOnly = (userRole: string): boolean => {
  const role = getRoleInfo(userRole)
  return role ? role.isReadOnly : true
}

export const getAvailableRoles = (): string[] => {
  return Object.keys(USER_ROLES)
}

export const getRoleDisplayName = (roleName: string): string => {
  const role = getRoleInfo(roleName)
  return role ? role.displayName : roleName
}

// Function to get menu items based on role
export const getMenuItemsByRole = (userRole: string) => {
  console.log('🔍 [getMenuItemsByRole] Input userRole:', userRole)
  const role = getRoleInfo(userRole)
  console.log('👤 [getMenuItemsByRole] Role info:', role)
  if (!role) return []

  const allMenuItems = [
    { title: 'Dashboard', path: '/dashboard', permission: 'dashboard' },
    { title: 'MYR', path: '/myr', permission: 'myr' },
    { title: 'SGD', path: '/sgd', permission: 'sgd' },
    { title: 'USC', path: '/usc', permission: 'usc', hasSubmenu: true },
    { title: 'Transaction', path: '/transaction', permission: 'transaction', hasSubmenu: true },
    { title: 'Supabase', path: '/supabase', permission: 'supabase' },
    { title: 'User Management', path: '/users', permission: 'users' },
    { title: 'Activity Logs', path: '/admin/activity-logs', permission: 'admin' }
  ]

  const filteredItems = allMenuItems.filter(item => 
    role.permissions.includes(item.permission)
  )
  console.log('✅ [getMenuItemsByRole] Filtered items:', filteredItems)
  return filteredItems
}

// Get default page based on user role
export const getDefaultPageByRole = (userRole: string): string => {
  switch (userRole) {
    case 'executive':
    case 'manager_myr':
    case 'sq_myr':
    case 'squad_lead_myr':  // Squad Lead MYR → MYR Overview
      return '/myr/overview'
    case 'manager_sgd':
    case 'sq_sgd':
    case 'squad_lead_sgd':  // Squad Lead SGD → SGD Overview
      return '/sgd/overview'
    case 'manager_usc':
    case 'sq_usc':
    case 'squad_lead_usc':  // Squad Lead USC → USC Overview
      return '/usc/overview'
    case 'snr_myr':  // SNR MYR → MYR SNR Customers (will be created later)
      return '/myr/snr-customers'
    case 'snr_sgd':  // SNR SGD → SGD SNR Customers (will be created later)
      return '/sgd/snr-customers'
    case 'snr_usc':  // SNR USC → USC SNR Customers (will be created later)
      return '/usc/snr-customers'
    case 'marketing_usc':  // Marketing USC → USC Overview
      return '/usc/overview'
    case 'marketing_myr':  // Marketing MYR → MYR Overview
      return '/myr/overview'
    case 'marketing_sgd':  // Marketing SGD → SGD Overview
      return '/sgd/overview'
    case 'admin':
    case 'analyst':
    case 'demo':
      return '/dashboard'
    case 'ops':
    case 'manager_xbpo':
      return '/myr/auto-approval-monitor'  // Ops & manager_xbpo default: Deposit Auto-Approval MYR
    default:
      return '/myr/overview' // fallback to MYR overview
  }
}

// NEW: Get user's allowed brands from session
export const getUserAllowedBrands = (): string[] | null => {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('nexmax_user')
  if (!userStr) return null
  try {
    const user = JSON.parse(userStr)
    return user.allowed_brands || null // null = ALL brands (unrestricted)
  } catch {
    return null
  }
}

// NEW: Check if user can access specific brand
export const canAccessBrand = (brandName: string): boolean => {
  const allowedBrands = getUserAllowedBrands()
  if (!allowedBrands || allowedBrands.length === 0) return true // null/empty = access ALL brands
  return allowedBrands.includes(brandName)
}

// NEW: Check if user is Squad Lead (any market)
export const isSquadLead = (userRole: string): boolean => {
  return userRole.startsWith('squad_lead_')
}

// NEW: Check if user is SNR (any market)
export const isSNR = (userRole: string): boolean => {
  return userRole.startsWith('snr_')
}

// NEW: Check if user is Marketing (any market)
export const isMarketing = (userRole: string): boolean => {
  return userRole.startsWith('marketing_')
} 