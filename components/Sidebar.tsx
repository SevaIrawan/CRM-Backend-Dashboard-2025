'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { 
  DashboardIcon, 
  StrategyIcon, 
  FlowIcon, 
  GrowthIcon, 
  SalesIcon, 
  ExecutiveOptimizationIcon, 
  ManagementIcon, 
  SupabaseIcon, 
  UserIcon,
  USCIcon,
  MYRIcon,
  SGDIcon
} from './Icons'
import { getMenuItemsByRole, hasPermission } from '@/utils/rolePermissions'
import { getPageVisibilityData, filterMenuItemsByVisibility, PageVisibilityData } from '@/utils/pageVisibilityHelper'
import { getKpiIcon } from '@/lib/CentralIcon'
import { logger } from '@/lib/logger'

// Function to filter menu items based on role for MYR, SGD, and USC pages
const filterMenuItemsByRole = (menuItems: any[], userRole: string) => {
  // Pages to hide for MYR roles (manager_myr, sq_myr) - still in development
  const hiddenPagesForMYRRoles = ['/myr/member-analytic', '/myr/churn-member']
  
  // Pages to hide for SGD roles (manager_sgd, sq_sgd, executive)
  const hiddenPagesForSGDRoles = ['/sgd/member-analytic', '/sgd/churn-member']
  
  // Pages to hide for USC roles (manager_usc, sq_usc, executive)
  const hiddenPagesForUSCRoles = ['/usc/member-analytic', '/usc/churn-member']
  
  // Only admin can see all pages
  if (userRole === 'admin') {
    return menuItems
  }
  
  return menuItems.map(item => {
    // Filter MYR pages for MYR roles and executive
    if (item.title === 'MYR' && item.submenu && (userRole === 'manager_myr' || userRole === 'sq_myr' || userRole === 'executive')) {
      return {
        ...item,
        submenu: item.submenu.filter((subItem: any) => 
          !hiddenPagesForMYRRoles.includes(subItem.path)
        )
      }
    }
    
    // Filter SGD pages for SGD roles and executive
    if (item.title === 'SGD' && item.submenu && (userRole === 'manager_sgd' || userRole === 'sq_sgd' || userRole === 'executive')) {
      return {
        ...item,
        submenu: item.submenu.filter((subItem: any) => 
          !hiddenPagesForSGDRoles.includes(subItem.path)
        )
      }
    }
    
    // Filter USC pages for USC roles and executive
    if (item.title === 'USC' && item.submenu && (userRole === 'manager_usc' || userRole === 'sq_usc' || userRole === 'executive')) {
      return {
        ...item,
        submenu: item.submenu.filter((subItem: any) => 
          !hiddenPagesForUSCRoles.includes(subItem.path)
        )
      }
    }
    
    return item
  })
}

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  darkMode?: boolean
  onToggleDarkMode?: () => void
  onLogout?: () => void
  sidebarExpanded?: boolean
}

export default function Sidebar({ 
  sidebarOpen, 
  setSidebarOpen, 
  darkMode = false, 
  onToggleDarkMode = () => {}, 
  onLogout = () => {},
  sidebarExpanded = true 
}: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [lastUpdate, setLastUpdate] = useState<string>('Loading...')
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [pageVisibilityData, setPageVisibilityData] = useState<PageVisibilityData[]>([])
  const [pageVisibilityLoading, setPageVisibilityLoading] = useState<boolean>(true)

  useEffect(() => {
    fetchLastUpdate()
    loadPageVisibilityData()
    // Auto refresh setiap 30 detik
    const interval = setInterval(fetchLastUpdate, 30000)
    return () => clearInterval(interval)
  }, [pathname]) // Re-fetch when page changes (USC vs non-USC)

  // Load page visibility data
  const loadPageVisibilityData = async () => {
    try {
      setPageVisibilityLoading(true)
      logger.log('🔍 [Sidebar] Loading page visibility data...')
      
      const data = await getPageVisibilityData()
      setPageVisibilityData(data)
      
      logger.log('✅ [Sidebar] Page visibility data loaded:', data.length, 'pages')
    } catch (error) {
      console.error('❌ [Sidebar] Error loading page visibility:', error)
      // Fallback will be handled by getPageVisibilityData
      setPageVisibilityData([])
    } finally {
      setPageVisibilityLoading(false)
    }
  }

  // STANDARD SUB MENU RULES:
  // 1. Auto show sub menu ketika user berada di halaman sub menu
  // 2. Toggle sub menu ketika user klik menu yang sama
  // 3. Auto hide sub menu ketika user klik menu lain
  // 4. Highlight icon ketika sub menu aktif
  // 5. Scroll hanya untuk sub menu dengan styling konsisten
  useEffect(() => {
    if (pathname.startsWith('/usc/')) {
      setOpenSubmenu('USC')
    } else if (pathname.startsWith('/myr/')) {
      setOpenSubmenu('MYR')
    } else if (pathname.startsWith('/sgd/')) {
      setOpenSubmenu('SGD')
    } else if (pathname.startsWith('/admin/') || pathname.startsWith('/users') || pathname.startsWith('/supabase')) {
      setOpenSubmenu('Admin')
    }
  }, [pathname])

  const fetchLastUpdate = async () => {
    try {
      setIsLoading(true)
      
      // Determine table based on current page
      let tableName = 'blue_whale_myr' // default
      if (pathname.startsWith('/usc/')) {
        tableName = 'blue_whale_usc'
      } else if (pathname.startsWith('/myr/')) {
        tableName = 'blue_whale_myr'
      } else if (pathname.startsWith('/sgd/')) {
        tableName = 'blue_whale_sgd'
      }
      
      console.log(`🔍 [Sidebar] Fetching last update from ${tableName} for path: ${pathname}`)
      
      // Mengambil MAX(date) dari table yang sesuai
      const { data, error } = await supabase
        .from(tableName)
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
      
      if (error) {
        console.error('❌ Sidebar - Error fetching MAX(date):', error)
        setIsConnected(false)
        setLastUpdate('Error')
        setIsLoading(false)
        return
      }

      if (data && data.length > 0) {
        const maxDate = data[0].date
        
        // Handle different date formats
        let date: Date | null = null
        
        if (typeof maxDate === 'string') {
          // Try different date formats
          const formats = [
            // yyyy-mm-dd (ISO format)
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/, 
            // yyyy/mm/dd
            /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, 
            // dd/mm/yyyy
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, 
            // mm/dd/yyyy
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
          ]
          
          for (const format of formats) {
            const match = maxDate.match(format)
            if (match) {
              const [, first, second, third] = match
              
              // Determine format based on first number
              if (parseInt(first) > 31) {
                // yyyy-mm-dd or yyyy/mm/dd
                date = new Date(parseInt(first), parseInt(second) - 1, parseInt(third))
              } else if (parseInt(third) > 31) {
                // dd/mm/yyyy or mm/dd/yyyy - assume dd/mm/yyyy
                date = new Date(parseInt(third), parseInt(second) - 1, parseInt(first))
              }
              
              if (date && !isNaN(date.getTime())) {
                break
              }
            }
          }
        } else if (maxDate instanceof Date) {
          date = maxDate
        }
        
        if (date && !isNaN(date.getTime())) {
          const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
          
          setLastUpdate(formattedDate)
          setIsConnected(true)
          setIsLoading(false)
        } else {
          console.error('❌ Sidebar - Invalid date format:', maxDate)
          setLastUpdate('Invalid Date')
          setIsConnected(false)
          setIsLoading(false)
        }
      } else {
        const isUSCPage = pathname.startsWith('/usc/')
        const tableName = isUSCPage ? 'blue_whale_usc' : 'blue_whale_myr'
        console.log(`⚠️ Sidebar - No data found in ${tableName}`)
        setLastUpdate('No Data')
        setIsConnected(false)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('❌ Sidebar - Exception fetching MAX(date):', error)
      setLastUpdate('Error')
      setIsConnected(false)
      setIsLoading(false)
    }
  }

  // Get user role from session
  const getUserRole = () => {
    try {
      if (typeof window === 'undefined') {
        return 'user' // Default for server-side rendering
      }
      
      const session = localStorage.getItem('nexmax_session')
      if (session) {
        const sessionData = JSON.parse(session)
        const role = sessionData.role || 'user'
        return role
      }
    } catch (error) {
      console.error('Error getting user role:', error)
    }
    return 'user' // Default to user instead of admin
  }
  
  // IMPORTANT: Avoid hydration mismatch by resolving userRole after mount
  const [userRole, setUserRole] = useState<string>('user')
  useEffect(() => {
    // Read role from localStorage only on client after mount
    const role = getUserRole()
    setUserRole(role)
  }, [])
  
  // Get menu items based on user role
  const getMenuItems = () => {
    logger.log('🔍 [Sidebar] Current userRole:', userRole)
    const roleMenuItems = getMenuItemsByRole(userRole)
    logger.log('📋 [Sidebar] Role menu items:', roleMenuItems)
    
    // Map role menu items to full menu items with icons and submenus
    const fullMenuItems = [
      {
        title: 'Dashboard',
        path: '/dashboard',
        icon: <DashboardIcon size={18} color="#ffffff" />,
        permission: 'dashboard'
      },
      {
        title: 'MYR',
        icon: <MYRIcon size={18} color="#ffffff" />,
        permission: 'myr',
        submenu: [
          { title: 'Overview', path: '/myr/overview' },
          { title: 'Business Performance', path: '/myr/business-performance' },
          { title: 'Brand Comparison Trends', path: '/myr/brand-performance-trends' },
          { title: 'KPI Comparison', path: '/myr/kpi-comparison' },
          { title: 'Overall Label', path: '/myr/overall-label' },
          { title: 'AIA Candy Mechanism', path: '/myr/aia-candy-tracking' },
          { title: 'Deposit Auto‑Approval', path: '/myr/auto-approval-monitor' },
          { title: 'Withdrawal Auto‑Approval', path: '/myr/auto-approval-withdraw' },
          { title: 'Member Analytic', path: '/myr/member-analytic' },
          { title: 'Customer Retention', path: '/myr/customer-retention' },
          { title: 'Churn Member', path: '/myr/churn-member' },
          { title: 'Member Report', path: '/myr/member-report' }
        ]
      },
      {
        title: 'SGD',
        icon: <SGDIcon size={18} color="#ffffff" />,
        permission: 'sgd',
        submenu: [
        { title: 'Overview', path: '/sgd/overview' },
        { title: 'Business Performance', path: '/sgd/business-performance' },
        { title: 'Brand Comparison Trends', path: '/sgd/brand-performance-trends' },
        { title: 'KPI Comparison', path: '/sgd/kpi-comparison' },
        { title: 'AIA Candy Mechanism', path: '/sgd/aia-candy-tracking' },
        { title: 'Auto-Approval Monitor', path: '/sgd/auto-approval-monitor' },
        { title: 'Member Analytic', path: '/sgd/member-analytic' },
        { title: 'Customer Retention', path: '/sgd/customer-retention' },
          { title: 'Churn Member', path: '/sgd/churn-member' },
          { title: 'Member Report', path: '/sgd/member-report' }
        ]
      },
      {
        title: 'USC',
        icon: <USCIcon size={18} color="#ffffff" />,
        permission: 'usc',
        submenu: [
        { title: 'Overview', path: '/usc/overview' },
        { title: 'Business Performance', path: '/usc/business-performance' },
        { title: 'Brand Comparison Trends', path: '/usc/brand-performance-trends' },
        { title: 'KPI Comparison', path: '/usc/kpi-comparison' },
        { title: 'Auto-Approval Monitor', path: '/usc/auto-approval-monitor' },
        { title: 'Member Analytic', path: '/usc/member-analytic' },
        { title: 'Customer Retention', path: '/usc/customer-retention' },
          { title: 'Churn Member', path: '/usc/churn-member' },
          { title: 'Member Report', path: '/usc/member-report' }
        ]
      },
      {
        title: 'Admin',
        icon: <UserIcon size={18} color="#ffffff" />,
        permission: 'admin',
        submenu: [
          { title: 'User Management', path: '/users' },
          { title: 'Supabase', path: '/supabase' },
          { title: 'Activity Logs', path: '/admin/activity-logs' },
          { title: 'Feedback & Support', path: '/admin/feedback' },
          { title: 'Page Status Management', path: '/admin/page-status' }
        ]
      }
    ]

    // Filter menu items based on user permissions
    const filteredItems = fullMenuItems.filter(item => 
      roleMenuItems.some(roleItem => roleItem.permission === item.permission)
    )
    
    // Apply page visibility filtering (NEW SYSTEM with fallback)
    let finalFilteredItems
    if (pageVisibilityData.length > 0 && !pageVisibilityLoading) {
      logger.log('🆕 [Sidebar] Using database page visibility data')
      finalFilteredItems = filterMenuItemsByVisibility(filteredItems, userRole, pageVisibilityData)
    } else {
      logger.log('🔄 [Sidebar] Using fallback hardcoded filtering')
      finalFilteredItems = filterMenuItemsByRole(filteredItems, userRole)
    }
    
    logger.log('✅ [Sidebar] Filtered menu items:', finalFilteredItems)
    return finalFilteredItems
  }

  const menuItems = getMenuItems()

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)

  // Load submenu state from localStorage on mount
  useEffect(() => {
    try {
      const savedSubmenu = localStorage.getItem('nexmax_open_submenu')
      if (savedSubmenu && savedSubmenu !== 'null') {
        setOpenSubmenu(savedSubmenu)
      }
    } catch (error) {
      console.error('Error loading submenu state:', error)
    }
  }, [])

  // Save submenu state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('nexmax_open_submenu', openSubmenu || 'null')
    } catch (error) {
      console.error('Error saving submenu state:', error)
    }
  }, [openSubmenu])

  const toggleSubmenu = (title: string) => {
    // Jika user klik menu yang sama, toggle (buka/tutup) submenu
    if (openSubmenu === title) {
      // User ingin hide submenu
      setOpenSubmenu(null)
    } else {
      // Jika user klik menu lain, buka submenu baru dan tutup yang lama
      setOpenSubmenu(title)
    }
  }

  // Enhanced submenu state management with persistence
  const handleSubmenuToggle = (title: string, isActivePage: boolean) => {
    if (isActivePage) {
      // Jika user sedang di halaman submenu, biarkan terbuka
      setOpenSubmenu(title)
    } else {
      // Jika user klik menu yang sama tapi tidak di halaman submenu, toggle
      toggleSubmenu(title)
    }
  }

  // HELPER FUNCTIONS FOR STANDARD SUB MENU RULES:
  // Helper function untuk mendeteksi sub menu secara dinamis
  // Tambahkan path baru di sini untuk menambah sub menu baru
  const isSubmenuPath = (path: string) => {
    return path.startsWith('/usc/') || path.startsWith('/myr/') || path.startsWith('/sgd/') || path.startsWith('/admin/') || path.startsWith('/users') || path.startsWith('/supabase')
  }

  // Helper function untuk mendapatkan parent menu dari path
  // Tambahkan mapping baru di sini untuk menambah sub menu baru
  const getParentMenuFromPath = (path: string) => {
    if (path.startsWith('/usc/')) return 'USC'
    if (path.startsWith('/myr/')) return 'MYR'
    if (path.startsWith('/sgd/')) return 'SGD'
    if (path.startsWith('/admin/') || path.startsWith('/users') || path.startsWith('/supabase')) return 'Admin'
    return null
  }

  const handleMenuClick = (path: string) => {
    // Skip navigation if already on the same path
    if (pathname === path) return
    
    // Cek apakah path ini adalah sub menu dari menu manapun
    const parentMenu = getParentMenuFromPath(path)
    
    if (parentMenu) {
      // Jika user klik sub menu, tetap buka sub menu parent
      setOpenSubmenu(parentMenu)
    } else {
      // Jika user klik menu lain (bukan sub menu), tutup sub menu
      setOpenSubmenu(null)
    }
    
    // Optimized navigation with smooth transition
    router.push(path)
  }

  // Enhanced menu click handler for main menu items (non-submenu)
  const handleMainMenuClick = (item: any) => {
    if (item.submenu) {
      // Jika menu memiliki submenu, toggle submenu
      handleSubmenuToggle(item.title, isSubmenuPath(pathname) && getParentMenuFromPath(pathname) === item.title)
    } else if (item.path) {
      // Jika menu tidak memiliki submenu, navigasi langsung
      handleMenuClick(item.path)
    }
  }

  // Preload function untuk pages yang sering diakses
  const preloadPage = (path: string) => {
    if (typeof window !== 'undefined') {
      router.prefetch(path)
    }
  }

  // Preload common pages on mount
  useEffect(() => {
    const commonPaths = [
      '/usc/overview',
      '/usc/customer-retention',
      '/usc/churn-member',
      '/usc/member-report',
      '/myr/overview',
      '/myr/customer-retention',
      '/myr/churn-member',
      '/myr/member-report',
      '/sgd/overview',
      '/sgd/customer-retention',
      '/sgd/churn-member',
      '/sgd/member-report',
      '/dashboard'
    ]
    commonPaths.forEach((path, index) => {
      setTimeout(() => preloadPage(path), 100 * (index + 1))
    })
  }, [])

  return (
         <div 
       className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}
       style={{ 
         backgroundColor: '#1f2937' // Dark blue background
       }}
     >
      {/* Logo Section with Circular Gold Border */}
             <div style={{
         padding: sidebarOpen ? '20px' : '20px 0',
         borderBottom: '1px solid #374151', // Darker border for dark blue
         display: 'flex',
         alignItems: 'center',
         justifyContent: sidebarOpen ? 'flex-start' : 'center',
         minHeight: '80px',
         flexShrink: 0, // Prevent logo section from shrinking
         backgroundColor: '#1f2937' // Dark blue background
       }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '3px solid #FFD700',
            padding: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1f2937' // Dark blue background
          }}>
            <Image
              src="/aset/images (1).jpg"
              alt="NEXMAX Logo"
              width={44}
              height={44}
              priority
              style={{ 
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
          </div>
          {sidebarOpen && (
            <span style={{ 
              fontSize: '18px', 
              fontWeight: '600',
              color: '#ffffff'
            }}>
              NEXMAX
            </span>
          )}
        </div>
      </div>

      {/* Menu Items - NO SCROLL */}
             <div style={{
         flex: 1,
         overflow: 'hidden', // NO SCROLL for main menu
         padding: '16px 0',
         backgroundColor: '#1f2937', // Dark blue background
         display: 'flex',
         flexDirection: 'column',
         alignItems: sidebarOpen ? 'stretch' : 'center'
       }}>
        {menuItems.map((item, index) => (
          <div key={index}>
            {item.submenu ? (
              <div>
                                 <div
                   onClick={() => handleSubmenuToggle(item.title, isSubmenuPath(pathname) && getParentMenuFromPath(pathname) === item.title)}
                   style={{
                     padding: sidebarOpen ? '12px 20px' : '12px 0',
                     cursor: 'pointer',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: sidebarOpen ? 'space-between' : 'center',
                     backgroundColor: openSubmenu === item.title ? '#374151' : 'transparent', // Darker blue for active
                     transition: 'all 0.2s ease',
                     color: '#ffffff'
                   }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.backgroundColor = '#374151'
                     // Highlight icon on hover
                     const iconElement = e.currentTarget.querySelector('[data-icon]') as HTMLElement
                     if (iconElement) {
                       iconElement.style.color = '#3b82f6' // Bright blue
                     }
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.backgroundColor = openSubmenu === item.title ? '#374151' : 'transparent'
                     // Reset icon color on leave
                     const iconElement = e.currentTarget.querySelector('[data-icon]') as HTMLElement
                     if (iconElement) {
                       iconElement.style.color = '#ffffff'
                     }
                   }}
                 >
                   <div style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     gap: sidebarOpen ? '12px' : '0',
                     justifyContent: sidebarOpen ? 'flex-start' : 'center',
                     width: sidebarOpen ? 'auto' : '100%'
                   }}>
                     <div 
                       style={{ 
                         display: 'flex', 
                         alignItems: 'center', 
                         justifyContent: 'center', 
                         width: '16px',
                         flexShrink: 0
                       }}
                       data-icon="true"
                     >
                       {React.cloneElement(item.icon, {
                         color: (isSubmenuPath(pathname) && openSubmenu === item.title) ? '#3b82f6' : '#ffffff'
                       })}
                     </div>
                    {sidebarOpen && (
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: '500',
                        color: '#ffffff',
                        lineHeight: '1.2',
                        wordWrap: 'break-word',
                        maxWidth: '140px'
                      }}>{item.title}</span>
                    )}
                  </div>
                  {sidebarOpen && (
                    <span style={{ fontSize: '12px', color: '#ffffff' }}>
                      {openSubmenu === item.title ? '▼' : '▶'}
                    </span>
                  )}
                </div>
                
                {openSubmenu === item.title && sidebarOpen && (
                  <div style={{ 
                    backgroundColor: '#1f2937', // DARK BLUE background for submenu (same as sidebar)
                    maxHeight: '200px', // Fixed height for submenu
                    overflowY: 'auto', // SCROLL ONLY FOR SUBMENU
                    overflowX: 'hidden',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#4a5568 #1f2937' // Dark gray scrollbar on dark blue
                  }}
                  className="sidebar-submenu"
                >
                    {item.submenu.map((subItem: { title: string; path: string }, subIndex: number) => (
                                             <div
                         key={subIndex}
                         onClick={() => handleMenuClick(subItem.path)}
                         style={{
                           padding: '8px 20px 8px 52px',
                           cursor: 'pointer',
                           fontSize: '13px',
                           backgroundColor: pathname === subItem.path ? '#374151' : 'transparent', // Darker blue for active submenu item
                           transition: 'all 0.2s ease',
                           color: '#ffffff',
                           display: 'flex',
                           alignItems: 'center',
                           gap: '8px'
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.backgroundColor = '#374151'
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.backgroundColor = pathname === subItem.path ? '#374151' : 'transparent'
                         }}
                       >
                        {/* White Bullet Point */}
                        <span style={{
                          width: '4px',
                          height: '4px',
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          flexShrink: 0
                        }}></span>
                        <span>{subItem.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
                             <div
                 onClick={() => handleMainMenuClick(item)}
                 style={{
                   padding: sidebarOpen ? '12px 20px' : '12px 0',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: sidebarOpen ? 'flex-start' : 'center',
                   gap: sidebarOpen ? '12px' : '0',
                   backgroundColor: pathname === item.path ? '#374151' : 'transparent', // Darker blue for active
                   transition: 'all 0.2s ease',
                   color: '#ffffff'
                 }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.backgroundColor = '#374151'
                   // Highlight icon on hover
                   const iconElement = e.currentTarget.querySelector('[data-icon]') as HTMLElement
                   if (iconElement) {
                     iconElement.style.color = '#3b82f6' // Bright blue
                   }
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.backgroundColor = pathname === item.path ? '#374151' : 'transparent'
                   // Reset icon color on leave
                   const iconElement = e.currentTarget.querySelector('[data-icon]') as HTMLElement
                   if (iconElement) {
                     iconElement.style.color = '#ffffff'
                   }
                 }}
               >
                 <div 
                   style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'center', 
                     width: '16px',
                     flexShrink: 0
                   }}
                   data-icon="true"
                 >
                   {React.cloneElement(item.icon, {
                     color: pathname === item.path ? '#3b82f6' : '#ffffff'
                   })}
                 </div>
                {sidebarOpen && (
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '500',
                    color: '#ffffff',
                    lineHeight: '1.2',
                    wordWrap: 'break-word',
                    maxWidth: '140px'
                  }}>{item.title}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* LAST UPDATE Section with Enhanced Loading Animation */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid #374151', // Darker border for dark blue
        backgroundColor: '#1f2937', // DARK BLUE background for update section
        flexShrink: 0 // Prevent last update section from shrinking
      }}>
        {sidebarOpen ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              padding: '8px 12px',
              backgroundColor: '#1f2937', // DARK BLUE background
              borderRadius: '8px',
              border: `2px solid #FFD700`,
              marginBottom: '4px',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #FFD700',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ color: '#ffffff', fontSize: '12px' }}>Loading Update...</span>
                </div>
              ) : (
                <>
                  <span style={{ color: '#ffffff' }}>Update: </span>
                  <span style={{ color: '#ffffff' }}>{lastUpdate}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '10px',
              color: '#ffffff',
              fontWeight: '600',
              padding: '4px 8px',
              backgroundColor: '#1f2937', // DARK BLUE background
              borderRadius: '4px',
              border: `1px solid #FFD700`,
              position: 'relative',
              overflow: 'hidden',
              minHeight: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    border: '1px solid #FFD700',
                    borderTop: '1px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ color: '#ffffff', fontSize: '8px' }}>Loading...</span>
                </div>
              ) : (
                <>
                  <span style={{ color: '#ffffff' }}>Update: </span>
                  <span style={{ color: '#ffffff' }}>{lastUpdate}</span>
                </>
              )}
            </div>
          </div>
        )}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
} 