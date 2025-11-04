// ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM
// User Management Level Rules:
// 1. Admin = Full Access All Page + User Management + Admin Features
// 2. Executive = Limited Access: Dashboard, MYR, SGD, USC + Read Only
// 3. Manager = Limited Access: Currency Specific (MYR/SGD/USC) + Can Edit Targets
// 4. SQ = Limited Access: Currency Specific (MYR/SGD/USC) + Read Only
// 5. Analyst = Full Dashboard Access (Dashboard, MYR, SGD, USC) + Read Only + No Admin Features
// 6. Ops = Full Dashboard Access (Dashboard, MYR, SGD, USC) + Read Only + No Admin Features
// 7. Demo = Full Dashboard Access (Dashboard, MYR, SGD, USC) + Can Edit ALL Targets (Testing) + For Presentation & Feedback
// 8. Squad Lead = Limited Access: Specific Brands within Currency (MYR/SGD/USC) + Read Only

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
  // Squad Lead = Limited Access > Specific Brands Only (Market auto-detected from brands) + Read Only
  'squad_lead': {
    id: 'squad_lead',
    name: 'squad_lead',
    displayName: 'Squad Lead',
    permissions: ['myr', 'sgd', 'usc'], // Base permissions - will be filtered by Sidebar based on allowed_brands
    canAccessUserManagement: false,
    isReadOnly: true,
    allowedBrands: null // Will be populated from database per user
  }
}

// NEW: Detect market from allowed brands
export const getMarketFromBrands = (allowedBrands: string[] | null): string | null => {
  if (!allowedBrands || allowedBrands.length === 0) return null
  
  const firstBrand = allowedBrands[0]
  const suffix = firstBrand.slice(-2).toUpperCase()
  
  // KH = USC (Khmer/Cambodia brands)
  if (suffix === 'KH' || firstBrand.includes('KH') || firstBrand.includes('CAM') || firstBrand.includes('WIN')) return 'usc'
  // MY = MYR
  if (suffix === 'MY') return 'myr'
  // SG = SGD
  if (suffix === 'SG') return 'sgd'
  
  return null
}

// Helper functions for role management
export const getRoleInfo = (roleName: string): UserRole | null => {
  const role = USER_ROLES[roleName.toLowerCase()]
  
  // ✅ NEW: For Squad Lead, dynamically add market permission based on brands
  if (roleName.toLowerCase() === 'squad_lead' && typeof window !== 'undefined') {
    const userStr = localStorage.getItem('nexmax_user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        const market = getMarketFromBrands(user.allowed_brands)
        if (market && role) {
          return {
            ...role,
            permissions: [market] // Dynamic permission based on brands
          }
        }
      } catch (error) {
        console.error('Error detecting market for Squad Lead:', error)
      }
    }
  }
  
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

  // Map page paths to permission names
  const pathToPermission: { [key: string]: string } = {
    '/dashboard': 'dashboard',
    '/myr': 'myr',
    '/sgd': 'sgd',
    '/usc': 'usc',
    '/usc/overview': 'usc',
    '/usc/member-analytic': 'usc',
    '/usc/brand-comparison': 'usc',
    '/usc/kpi-comparison': 'usc',
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

  const permission = pathToPermission[pagePath]
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
      return '/myr/overview'
    case 'manager_sgd':
    case 'sq_sgd':
      return '/sgd/overview'
    case 'manager_usc':
    case 'sq_usc':
      return '/usc/overview'
    case 'squad_lead':  // Squad Lead default: based on first allowed brand's market
      return '/usc/overview' // Default to USC, will be dynamic based on allowed_brands
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

// NEW: Check if user is Squad Lead
export const isSquadLead = (userRole: string): boolean => {
  return userRole === 'squad_lead'
} 