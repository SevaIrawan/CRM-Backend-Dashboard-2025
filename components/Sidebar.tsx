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
  TransactionIcon, 
  SupabaseIcon, 
  UserIcon,
  USCIcon
} from './Icons'
import { getMenuItemsByRole, hasPermission } from '@/utils/rolePermissions'

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

  useEffect(() => {
    fetchLastUpdate()
    // Auto refresh setiap 30 detik
    const interval = setInterval(fetchLastUpdate, 30000)
    return () => clearInterval(interval)
  }, [pathname]) // Re-fetch when page changes (USC vs non-USC)

  // STANDARD SUB MENU RULES:
  // 1. Auto show sub menu ketika user berada di halaman sub menu
  // 2. Toggle sub menu ketika user klik menu yang sama
  // 3. Auto hide sub menu ketika user klik menu lain
  // 4. Highlight icon ketika sub menu aktif
  // 5. Scroll hanya untuk sub menu dengan styling konsisten
  useEffect(() => {
    if (pathname.startsWith('/transaction/')) {
      setOpenSubmenu('Transaction')
    } else if (pathname.startsWith('/usc/')) {
      setOpenSubmenu('USC')
    }
  }, [pathname])

  const fetchLastUpdate = async () => {
    try {
      setIsLoading(true)
      
      // Determine table based on current page
      const isUSCPage = pathname.startsWith('/usc/')
      const tableName = isUSCPage ? 'blue_whale_usc' : 'member_report_daily'
      
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
        const tableName = isUSCPage ? 'blue_whale_usc' : 'member_report_daily'
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
    const roleMenuItems = getMenuItemsByRole(userRole)
    
    // Map role menu items to full menu items with icons and submenus
    const fullMenuItems = [
      {
        title: 'USC',
        icon: <USCIcon size={18} color="#ffffff" />,
        permission: 'usc',
        submenu: [
          { title: 'Overview USC', path: '/usc/overview' },
          { title: 'Member Analytic USC', path: '/usc/member-analytic' },
          { title: 'Brand Comparison USC', path: '/usc/brand-comparison' },
          { title: 'KPI Comparison', path: '/usc/kpi-comparison' },
          { title: 'Customer Retention USC', path: '/usc/customer-retention' },
          { title: 'Churn Member USC', path: '/usc/churn-member' },
          { title: 'Member Report USC', path: '/usc/member-report' }
        ]
      },
      {
        title: 'Transaction',
        icon: <TransactionIcon size={18} color="#ffffff" />,
        permission: 'transaction',
        submenu: [
          { title: 'Adjustment', path: '/transaction/adjustment' },
          { title: 'Deposit', path: '/transaction/deposit' },
          { title: 'Withdraw', path: '/transaction/withdraw' },
          { title: 'Exchange', path: '/transaction/exchange' },
          { title: 'Headcount', path: '/transaction/headcount' },
          { title: 'Member Report', path: '/transaction/member-report' },
          { title: 'New Depositor', path: '/transaction/new-depositor' },
          { title: 'New Register', path: '/transaction/new-register' },
          { title: 'VIP Program', path: '/transaction/vip-program' },
          { title: 'Master Data', path: '/transaction/master-data' }
        ]
      },
      {
        title: 'Supabase',
        path: '/supabase',
        icon: <SupabaseIcon size={18} color="#ffffff" />,
        permission: 'supabase'
      },
      {
        title: 'User Management',
        path: '/users',
        icon: <UserIcon size={18} color="#ffffff" />,
        permission: 'users'
      }
    ]

    // Filter menu items based on user permissions
    return fullMenuItems.filter(item => 
      roleMenuItems.some(roleItem => roleItem.permission === item.permission)
    )
  }

  const menuItems = getMenuItems()

  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)

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

  // HELPER FUNCTIONS FOR STANDARD SUB MENU RULES:
  // Helper function untuk mendeteksi sub menu secara dinamis
  // Tambahkan path baru di sini untuk menambah sub menu baru
  const isSubmenuPath = (path: string) => {
    return path.startsWith('/transaction/') || path.startsWith('/usc/')
  }

  // Helper function untuk mendapatkan parent menu dari path
  // Tambahkan mapping baru di sini untuk menambah sub menu baru
  const getParentMenuFromPath = (path: string) => {
    if (path.startsWith('/transaction/')) return 'Transaction'
    if (path.startsWith('/usc/')) return 'USC'
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

  // Preload function untuk pages yang sering diakses
  const preloadPage = (path: string) => {
    if (typeof window !== 'undefined') {
      router.prefetch(path)
    }
  }

  // Preload common pages on mount
  useEffect(() => {
    const commonPaths = ['/usc/overview']
    commonPaths.forEach(path => {
      setTimeout(() => preloadPage(path), 100)
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
                   onClick={() => toggleSubmenu(item.title)}
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
                    {item.submenu.map((subItem, subIndex) => (
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
                 onClick={() => handleMenuClick(item.path)}
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