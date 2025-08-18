// ROLE-BASED ACCESS CONTROL (RBAC) SYSTEM
// User Management Level Rules:
// 1. Admin = Full Access All Page + User Management
// 2. Executive = Limited Access: Dashboard, Strategic Executive, Business Flow + Read Only
// 3. Manager = Limited Access: Dashboard, Strategic Executive, Business Flow, BGO, SR, XOO, OS + Read Only
// 4. USC_DEP = Limited Access: USC Page (Overview, Sales) + Read Only
// 5. User = Limited Access (No User Management) + Read Only

export interface UserRole {
  id: string
  name: string
  displayName: string
  permissions: string[]
  canAccessUserManagement: boolean
  isReadOnly: boolean
}

export const USER_ROLES: { [key: string]: UserRole } = {
  'admin': {
    id: 'admin',
    name: 'admin',
    displayName: 'Administrator',
    permissions: [
      'dashboard',
      'strategic-executive', 
      'business-flow',
      'usc',
      'bgo',
      'sr',
      'xoo',
      'os',
      'transaction',
      'supabase',
      'users'
    ],
    canAccessUserManagement: true,
    isReadOnly: false
  },
  'executive': {
    id: 'executive',
    name: 'executive',
    displayName: 'Executive',
    permissions: [
      'dashboard',
      'strategic-executive',
      'business-flow'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  'manager': {
    id: 'manager',
    name: 'manager',
    displayName: 'Manager',
    permissions: [
      'dashboard',
      'strategic-executive',
      'business-flow',
      'bgo',
      'sr',
      'xoo',
      'os'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  'usc_dep': {
    id: 'usc_dep',
    name: 'usc_dep',
    displayName: 'USC Department',
    permissions: [
      'usc',
      'dashboard'  // Allow access to dashboard as well to prevent redirect loops
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  },
  'user': {
    id: 'user',
    name: 'user',
    displayName: 'User',
    permissions: [
      'dashboard',
      'strategic-executive',
      'business-flow',
      'usc',
      'bgo',
      'sr',
      'xoo',
      'os',
      'transaction',
      'supabase'
    ],
    canAccessUserManagement: false,
    isReadOnly: true
  }
}

// Helper functions untuk role management
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

  // Map page paths to permission names
  const pathToPermission: { [key: string]: string } = {
    '/dashboard': 'dashboard',
    '/strategic-executive': 'strategic-executive',
    '/business-flow': 'business-flow',
    '/usc': 'usc',
    '/usc/overview': 'usc',
    '/usc/sales': 'usc',
    '/bgo': 'bgo',
    '/sr': 'sr',
    '/xoo': 'xoo',
    '/os': 'os',
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

// Function untuk mendapatkan menu items berdasarkan role
export const getMenuItemsByRole = (userRole: string) => {
  const role = getRoleInfo(userRole)
  if (!role) return []

  const allMenuItems = [
    { title: 'Dashboard', path: '/dashboard', permission: 'dashboard' },
    { title: 'Strategic Executive', path: '/strategic-executive', permission: 'strategic-executive' },
    { title: 'Business Flow', path: '/business-flow', permission: 'business-flow' },
    { title: 'USC', path: '/usc', permission: 'usc', hasSubmenu: true },
    { title: 'BGO', path: '/bgo', permission: 'bgo' },
    { title: 'Sales & Revenue', path: '/sr', permission: 'sr' },
    { title: 'XOO', path: '/xoo', permission: 'xoo' },
    { title: 'OS', path: '/os', permission: 'os' },
    { title: 'Transaction', path: '/transaction', permission: 'transaction', hasSubmenu: true },
    { title: 'Supabase', path: '/supabase', permission: 'supabase' },
    { title: 'User Management', path: '/users', permission: 'users' }
  ]

  return allMenuItems.filter(item => 
    role.permissions.includes(item.permission)
  )
} 