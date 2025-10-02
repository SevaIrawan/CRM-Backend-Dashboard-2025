'use client'

import React from 'react'

// Icon Component untuk standarisasi icon di seluruh aplikasi
// Menggunakan FontAwesome CDN untuk konsistensi

interface IconProps {
  name: string
  size?: number
  color?: string
  className?: string
  onClick?: () => void
}

// Custom SVG Icons
const CustomSVGIcons = {
  'executive-optimization': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
      <path d="M434.8 54.1C446.7 62.7 451.1 78.3 445.7 91.9L367.3 288L512 288C525.5 288 537.5 296.4 542.1 309.1C546.7 321.8 542.8 336 532.5 344.6L244.5 584.6C233.2 594 217.1 594.5 205.2 585.9C193.3 577.3 188.9 561.7 194.3 548.1L272.7 352L128 352C114.5 352 102.5 343.6 97.9 330.9C93.3 318.2 97.2 304 107.5 295.4L395.5 55.4C406.8 46 422.9 45.5 434.8 54.1z"/>
    </svg>
  ),
  'supabase': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
      <path d="M544 269.8C529.2 279.6 512.2 287.5 494.5 293.8C447.5 310.6 385.8 320 320 320C254.2 320 192.4 310.5 145.5 293.8C127.9 287.5 110.8 279.6 96 269.8L96 352C96 396.2 196.3 432 320 432C443.7 432 544 396.2 544 352L544 269.8zM544 192L544 144C544 99.8 443.7 64 320 64C196.3 64 96 99.8 96 144L96 192C96 236.2 196.3 272 320 272C443.7 272 544 236.2 544 192zM494.5 453.8C447.6 470.5 385.9 480 320 480C254.1 480 192.4 470.5 145.5 453.8C127.9 447.5 110.8 439.6 96 429.8L96 496C96 540.2 196.3 576 320 576C443.7 576 544 540.2 544 496L544 429.8C529.2 439.6 512.2 447.5 494.5 453.8z"/>
    </svg>
  ),
  'usc': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
      <path d="M64 128C64 92.7 92.7 64 128 64L384 64C419.3 64 448 92.7 448 128L448 249.3C401.1 268.3 368 314.3 368 368C368 395.7 376.8 421.4 391.8 442.4C340.3 463.4 304 514 304 573.1C304 574.1 304 575 304 576L128 576C92.7 576 64 547.3 64 512L64 128zM208 464L208 528L261.4 528C268.6 498.6 282.7 471.9 301.8 449.7C295.7 430.2 277.5 416 256 416C229.5 416 208 437.5 208 464zM339 288.3C338 288.1 337 288 336 288L304 288C295.2 288 288 295.2 288 304L288 336C288 344.8 295.2 352 304 352L320.7 352C322.8 329.2 329.1 307.7 339 288.3zM176 160C167.2 160 160 167.2 160 176L160 208C160 216.8 167.2 224 176 224L208 224C216.8 224 224 216.8 224 208L224 176C224 167.2 216.8 160 208 160L176 160zM288 176L288 208C288 216.8 295.2 224 304 224L336 224C344.8 224 352 216.8 352 208L352 176C352 167.2 344.8 160 336 160L304 160C295.2 160 288 167.2 288 176zM176 288C167.2 288 160 295.2 160 304L160 336C160 344.8 167.2 352 176 352L208 352C216.8 352 224 344.8 224 336L224 304C224 295.2 216.8 288 208 288L176 288zM416 368C416 323.8 451.8 288 496 288C540.2 288 576 323.8 576 368C576 412.2 540.2 448 496 448C451.8 448 416 412.2 416 368zM352 576C352 523 395 480 448 480L544 480C597 480 640 523 640 576C640 593.7 625.7 608 608 608L384 608C366.3 608 352 593.7 352 576z"/>
    </svg>
  )
}

export default function Icon({ 
  name, 
  size = 16, 
  color = 'currentColor', 
  className = '',
  onClick 
}: IconProps) {
  const iconStyle = {
    fontSize: `${size}px`,
    color: color,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease'
  }

  // Check if it's a custom SVG icon first
  const customIcon = CustomSVGIcons[name.toLowerCase() as keyof typeof CustomSVGIcons]
  if (customIcon) {
    return (
      <div 
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease'
        }}
        onClick={onClick}
        className={className}
      >
        {React.cloneElement(customIcon, {
          style: {
            width: '100%',
            height: '100%',
            fill: color
          }
        })}
      </div>
    )
  }

  // Mapping icon names ke FontAwesome classes
  const getIconClass = (iconName: string): string => {
    const iconMap: { [key: string]: string } = {
      // Dashboard Icons
      'dashboard': 'fas fa-chart-line',
      'chart': 'fas fa-chart-bar',
      'analytics': 'fas fa-chart-pie',
      'stats': 'fas fa-chart-area',
      
             // Business Icons
       'business': 'fas fa-briefcase',
       'growth': 'fas fa-chart-line',
       'optimization': 'fas fa-cogs',
       'strategy': 'fas fa-chess',
       'executive': 'fas fa-user-tie',
       'flow': 'fas fa-project-diagram',
       'executive-optimization': 'executive-optimization', // Custom SVG
      
      // Sales & Revenue Icons
      'sales': 'fas fa-dollar-sign',
      'revenue': 'fas fa-money-bill-wave',
      'customers': 'fas fa-users',
      'leads': 'fas fa-user-plus',
      'conversion': 'fas fa-exchange-alt',
      
      // Operations Icons
      'operations': 'fas fa-cogs',
      'support': 'fas fa-headset',
      'management': 'fas fa-tasks',
      'workflow': 'fas fa-stream',
      'process': 'fas fa-sitemap',
      
      // Transaction Icons
      'transaction': 'fas fa-credit-card',
      'deposit': 'fas fa-arrow-down',
      'withdraw': 'fas fa-arrow-up',
      'exchange': 'fas fa-exchange-alt',
      'adjustment': 'fas fa-edit',
      'headcount': 'fas fa-users-cog',
      'vip': 'fas fa-crown',
      'register': 'fas fa-user-plus',
      'depositor': 'fas fa-user-check',
      
      // User Management Icons
      'user': 'fas fa-user',
      'users': 'fas fa-users',
      'admin': 'fas fa-user-shield',
      'profile': 'fas fa-user-circle',
      'settings': 'fas fa-cog',
      'permissions': 'fas fa-key',
      
             // System Icons
       'database': 'fas fa-database',
       'connection': 'fas fa-plug',
       'api': 'fas fa-code',
       'server': 'fas fa-server',
       'cloud': 'fas fa-cloud',
       'supabase': 'supabase', // Custom SVG
      
      // Navigation Icons
      'home': 'fas fa-home',
      'menu': 'fas fa-bars',
      'close': 'fas fa-times',
      'back': 'fas fa-arrow-left',
      'forward': 'fas fa-arrow-right',
      'refresh': 'fas fa-sync',
      
      // Action Icons
      'add': 'fas fa-plus',
      'edit': 'fas fa-edit',
      'delete': 'fas fa-trash',
      'save': 'fas fa-save',
      'cancel': 'fas fa-times',
      'search': 'fas fa-search',
      'filter': 'fas fa-filter',
      'sort': 'fas fa-sort',
      'download': 'fas fa-download',
      'upload': 'fas fa-upload',
      'export': 'fas fa-file-export',
      'import': 'fas fa-file-import',
      
      // Status Icons
      'success': 'fas fa-check-circle',
      'error': 'fas fa-exclamation-circle',
      'warning': 'fas fa-exclamation-triangle',
      'info': 'fas fa-info-circle',
      'loading': 'fas fa-spinner fa-spin',
      'pending': 'fas fa-clock',
      'active': 'fas fa-play-circle',
      'inactive': 'fas fa-pause-circle',
      
      // Data Icons
      'data': 'fas fa-database',
      'table': 'fas fa-table',
      'list': 'fas fa-list',
      'grid': 'fas fa-th',
      'calendar': 'fas fa-calendar',
      'clock': 'fas fa-clock',
      'date': 'fas fa-calendar-alt',
      'time': 'fas fa-clock',
      
      // Communication Icons
      'message': 'fas fa-comment',
      'email': 'fas fa-envelope',
      'phone': 'fas fa-phone',
      'notification': 'fas fa-bell',
      'chat': 'fas fa-comments',
      
      // Security Icons
      'security': 'fas fa-shield-alt',
      'lock': 'fas fa-lock',
      'unlock': 'fas fa-unlock',
      'key': 'fas fa-key',
      'password': 'fas fa-key',
      'login': 'fas fa-sign-in-alt',
      'logout': 'fas fa-sign-out-alt',
      
      // Finance Icons
      'money': 'fas fa-money-bill',
      'wallet': 'fas fa-wallet',
      'bank': 'fas fa-university',
      'credit-card': 'fas fa-credit-card',
      'payment': 'fas fa-credit-card',
      'invoice': 'fas fa-file-invoice',
      'receipt': 'fas fa-receipt',
      
      // Report Icons
      'report': 'fas fa-chart-bar',
      'insights': 'fas fa-lightbulb',
      'metrics': 'fas fa-chart-line',
      'kpi': 'fas fa-target',
      'performance': 'fas fa-tachometer-alt',
      
      // Settings Icons
      'configuration': 'fas fa-sliders-h',
      'preferences': 'fas fa-user-cog',
      'theme': 'fas fa-palette',
      'language': 'fas fa-language',
      
      // File Icons
      'file': 'fas fa-file',
      'folder': 'fas fa-folder',
      'document': 'fas fa-file-alt',
      'pdf': 'fas fa-file-pdf',
      'excel': 'fas fa-file-excel',
      'word': 'fas fa-file-word',
      'image': 'fas fa-file-image',
      
      // Location Icons
      'location': 'fas fa-map-marker-alt',
      'map': 'fas fa-map',
      'globe': 'fas fa-globe',
      'flag': 'fas fa-flag',
      
      // Time Icons
      'schedule': 'fas fa-calendar-check',
      'deadline': 'fas fa-hourglass-end',
      'timer': 'fas fa-stopwatch',
      
      // Social Icons
      'facebook': 'fab fa-facebook',
      'twitter': 'fab fa-twitter',
      'linkedin': 'fab fa-linkedin',
      'instagram': 'fab fa-instagram',
      'youtube': 'fab fa-youtube',
      
      // Technology Icons
      'code': 'fas fa-code',
      'bug': 'fas fa-bug',
      'terminal': 'fas fa-terminal',
      'network': 'fas fa-network-wired',
      
      // Default fallback
      'default': 'fas fa-question'
    }

    return iconMap[iconName.toLowerCase()] || iconMap['default']
  }

  return (
    <i 
      className={`${getIconClass(name)} ${className}`}
      style={iconStyle}
      onClick={onClick}
    />
  )
}

// Predefined icon components for common use cases
export const DashboardIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="dashboard" {...props} />
)

export const BusinessIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="business" {...props} />
)

export const SalesIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="sales" {...props} />
)

export const OperationsIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="operations" {...props} />
)

export const TransactionIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="transaction" {...props} />
)

export const UserIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="user" {...props} />
)

export const SettingsIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="settings" {...props} />
)

export const ChartIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="chart" {...props} />
)

export const AnalyticsIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="analytics" {...props} />
)

export const ReportIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="report" {...props} />
)

export const AddIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="add" {...props} />
)

export const EditIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="edit" {...props} />
)

export const DeleteIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="delete" {...props} />
)

export const SearchIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="search" {...props} />
)

export const FilterIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="filter" {...props} />
)

export const ExportIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="export" {...props} />
)

export const ImportIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="import" {...props} />
)

export const SuccessIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="success" {...props} />
)

export const ErrorIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="error" {...props} />
)

export const WarningIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="warning" {...props} />
)

export const InfoIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="info" {...props} />
)

export const LoadingIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="loading" {...props} />
)

export const LogoutIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="logout" {...props} />
)

export const MenuIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="menu" {...props} />
)

export const CloseIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="close" {...props} />
)

// KPI Specific Icons
export const RevenueIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="revenue" {...props} />
)

export const CustomersIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="customers" {...props} />
)

export const GrowthIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="growth" {...props} />
)

export const PerformanceIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="performance" {...props} />
)

export const KPIIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="kpi" {...props} />
)

// Transaction Specific Icons
export const DepositIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="deposit" {...props} />
)

export const WithdrawIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="withdraw" {...props} />
)

export const ExchangeIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="exchange" {...props} />
)

export const AdjustmentIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="adjustment" {...props} />
)

export const HeadcountIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="headcount" {...props} />
)

export const VIPIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="vip" {...props} />
)

export const RegisterIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="register" {...props} />
)

export const DepositorIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="depositor" {...props} />
)

// Business Specific Icons
export const StrategyIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="strategy" {...props} />
)

export const ExecutiveIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="executive" {...props} />
)

export const FlowIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="flow" {...props} />
)

export const OptimizationIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="optimization" {...props} />
)

export const SupportIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="support" {...props} />
)

export const ManagementIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="management" {...props} />
)

// Custom SVG Icons
export const ExecutiveOptimizationIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="executive-optimization" {...props} />
)

export const SupabaseIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="supabase" {...props} />
)

export const USCIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="usc" {...props} />
)

export const MYRIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="usc" {...props} />
)

export const SGDIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="usc" {...props} />
)

// System Icons
export const DatabaseIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="database" {...props} />
)

export const ConnectionIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="connection" {...props} />
)

export const ServerIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="server" {...props} />
)

export const CloudIcon = (props: Omit<IconProps, 'name'>) => (
  <Icon name="cloud" {...props} />
)

// Utility function untuk mendapatkan semua available icons
export const getAvailableIcons = () => {
  return [
    'dashboard', 'chart', 'analytics', 'stats',
    'business', 'growth', 'optimization', 'strategy', 'executive', 'flow',
    'sales', 'revenue', 'customers', 'leads', 'conversion',
    'operations', 'support', 'management', 'workflow', 'process',
    'transaction', 'deposit', 'withdraw', 'exchange', 'adjustment', 'headcount', 'vip', 'register', 'depositor',
    'user', 'users', 'admin', 'profile', 'settings', 'permissions',
    'database', 'connection', 'api', 'server', 'cloud',
    'home', 'menu', 'close', 'back', 'forward', 'refresh',
    'add', 'edit', 'delete', 'save', 'cancel', 'search', 'filter', 'sort', 'download', 'upload', 'export', 'import',
    'success', 'error', 'warning', 'info', 'loading', 'pending', 'active', 'inactive',
    'data', 'table', 'list', 'grid', 'calendar', 'clock', 'date', 'time',
    'message', 'email', 'phone', 'notification', 'chat',
    'security', 'lock', 'unlock', 'key', 'password', 'login', 'logout',
    'money', 'wallet', 'bank', 'credit-card', 'payment', 'invoice', 'receipt',
    'report', 'analytics', 'insights', 'metrics', 'kpi', 'performance',
    'settings', 'configuration', 'preferences', 'theme', 'language',
    'file', 'folder', 'document', 'pdf', 'excel', 'word', 'image',
    'location', 'map', 'globe', 'flag',
    'time', 'schedule', 'deadline', 'timer',
    'facebook', 'twitter', 'linkedin', 'instagram', 'youtube',
    'code', 'bug', 'terminal', 'database', 'server', 'network'
  ]
} 