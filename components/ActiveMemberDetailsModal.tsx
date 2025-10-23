'use client'

import React, { useState, useEffect } from 'react'
import { formatCurrencyKPI, formatIntegerKPI } from '@/lib/formatHelpers'

interface ActiveMemberDetail {
  uniqueCode: string
  userName: string
  lastDepositDate: string
  daysInactive: number
  daysActive: number
  atv: number
  depositCases: number
  depositAmount: number
  withdrawCases: number
  withdrawAmount: number
  ggr: number
  netProfit: number
  winrate: number
  withdrawalRate: number
  status: 'Retention' | 'Reactivation' | 'New Depositor'
  brand: string
}

interface MiniKPI {
  count: number
  atv: number
  depositCases: number
  depositAmount: number
  netProfit: number
}

interface ActiveMemberDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  totalCount: number
  currency: string
  year: string
  quarter: string
  startDate?: string
  endDate?: string
  isDateRange: boolean
}

export default function ActiveMemberDetailsModal({
  isOpen,
  onClose,
  totalCount,
  currency,
  year,
  quarter,
  startDate,
  endDate,
  isDateRange
}: ActiveMemberDetailsModalProps) {
  const [members, setMembers] = useState<ActiveMemberDetail[]>([])
  const [miniKPI, setMiniKPI] = useState<MiniKPI | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(100)
  const [sliceVisible, setSliceVisible] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [brandFilter, setBrandFilter] = useState<string>('ALL')
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      setPage(1)
      fetchMemberDetails()
    }
  }, [isOpen, currency, year, quarter, startDate, endDate, statusFilter, brandFilter])

  useEffect(() => {
    if (isOpen && page > 1) {
      fetchMemberDetails()
    }
  }, [page, limit])

  const fetchMemberDetails = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        currency,
        year,
        quarter,
        isDateRange: isDateRange.toString(),
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        brand: brandFilter
      })
      
      if (isDateRange && startDate && endDate) {
        params.append('startDate', startDate)
        params.append('endDate', endDate)
      }
      
      const response = await fetch(`/api/myr-business-performance/active-member-details?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setMembers(data.data.members)
        setMiniKPI(data.data.miniKPI)
        setTotalPages(data.data.pagination?.totalPages || 1)
        setTotalRecords(data.data.pagination?.totalRecords || 0)
        setAvailableBrands(data.data.availableBrands || [])
      } else {
        setError(data.error || 'Failed to fetch active member details')
      }
    } catch (err) {
      setError('Network error occurred')
      console.error('❌ Error fetching active member details:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const headers = [
        'Unique Code', 'User Name', 'Last Deposit Date', 'Days Inactive', 'Days Active',
        'ATV', 'DC', 'DA', 'WC', 'WA', 'GGR', 'Net Profit', 'Win Rate', 'Withdrawal Rate', 'Status', 'Brand'
      ]
      const allRows: string[] = []
      allRows.push(headers.join(','))

      // Fetch all pages in batches of 1000 rows
      const exportLimit = 1000
      const pages = Math.max(1, Math.ceil(totalRecords / exportLimit))
      for (let p = 1; p <= pages; p++) {
        const params = new URLSearchParams({
          currency,
          year,
          quarter,
          isDateRange: isDateRange.toString(),
          page: String(p),
          limit: String(exportLimit),
          status: statusFilter,
          brand: brandFilter
        })
        
        if (isDateRange && startDate && endDate) {
          params.append('startDate', startDate)
          params.append('endDate', endDate)
        }
        
        const res = await fetch(`/api/myr-business-performance/active-member-details?${params}`)
        const json = await res.json()
        const rows: ActiveMemberDetail[] = json?.data?.members || []
        if (!rows.length) break
        
        rows.forEach(m => {
          allRows.push([
            m.uniqueCode,
            m.userName,
            m.lastDepositDate,
            String(m.daysInactive),
            String(m.daysActive),
            String(m.atv.toFixed(2)),
            String(m.depositCases),
            String(m.depositAmount.toFixed(2)),
            String(m.withdrawCases),
            String(m.withdrawAmount.toFixed(2)),
            String(m.ggr.toFixed(2)),
            String(m.netProfit.toFixed(2)),
            String(m.winrate.toFixed(2)),
            String(m.withdrawalRate.toFixed(2)),
            m.status,
            m.brand
          ].join(','))
        })
      }

      const csvContent = allRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const dateRange = isDateRange ? `${startDate}-${endDate}` : `${year}-${quarter}`
      a.download = `active-member-details-${currency}-${dateRange}-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Retention':
        return 'bg-green-100 text-green-800'
      case 'Reactivation':
        return 'bg-blue-100 text-blue-800'
      case 'New Depositor':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full mx-4 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Active Member Details
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalCount} members • {currency} • {isDateRange ? `${startDate} to ${endDate}` : `${year} ${quarter}`}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="Retention">Retention</option>
              <option value="Reactivation">Reactivation</option>
              <option value="New Depositor">New Depositor</option>
            </select>

            {/* Brand Filter Dropdown */}
            <select
              value={brandFilter}
              onChange={(e) => {
                setBrandFilter(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Brands</option>
              {availableBrands.map((brand) => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`px-4 py-2 text-white rounded-md transition-colors ${exporting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {exporting ? 'Exporting…' : 'Export CSV (All)'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Mini KPI Cards */}
        {miniKPI && !loading && (
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="grid grid-cols-5 gap-4">
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <div className="text-xs text-gray-600 mb-1">COUNT</div>
                <div className="text-lg font-bold text-gray-900">{formatIntegerKPI(miniKPI.count)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <div className="text-xs text-gray-600 mb-1">ATV</div>
                <div className="text-lg font-bold text-gray-900">{formatCurrencyKPI(miniKPI.atv, currency)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <div className="text-xs text-gray-600 mb-1">DC</div>
                <div className="text-lg font-bold text-gray-900">{formatIntegerKPI(miniKPI.depositCases)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <div className="text-xs text-gray-600 mb-1">DA</div>
                <div className="text-lg font-bold text-gray-900">{formatCurrencyKPI(miniKPI.depositAmount, currency)}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm border">
                <div className="text-xs text-gray-600 mb-1">NET PROFIT</div>
                <div className="text-lg font-bold text-gray-900">{formatCurrencyKPI(miniKPI.netProfit, currency)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading active members...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-600 mb-2">❌ Error</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchMemberDetails}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-2">📭 No Data</div>
              <p className="text-gray-600">No active members found for the selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="min-w-full" style={{ borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
                  <thead className="sticky top-0" style={{ zIndex: 10 }}>
                    <tr>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '120px', whiteSpace: 'nowrap' }}>Unique Code</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '150px', whiteSpace: 'nowrap' }}>User Name</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '110px', whiteSpace: 'nowrap' }}>Last Deposit Date</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '90px', whiteSpace: 'nowrap' }}>Days Inactive</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '90px', whiteSpace: 'nowrap' }}>Days Active</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '100px', whiteSpace: 'nowrap' }}>ATV</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '80px', whiteSpace: 'nowrap' }}>DC</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '120px', whiteSpace: 'nowrap' }}>DA</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '80px', whiteSpace: 'nowrap' }}>WC</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '120px', whiteSpace: 'nowrap' }}>WA</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '120px', whiteSpace: 'nowrap' }}>GGR</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '120px', whiteSpace: 'nowrap' }}>Net Profit</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '90px', whiteSpace: 'nowrap' }}>Win Rate (%)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '120px', whiteSpace: 'nowrap' }}>Withdrawal Rate (%)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '120px', whiteSpace: 'nowrap' }}>Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, border: '1px solid #e5e7eb', backgroundColor: '#374151', color: 'white', minWidth: '80px', whiteSpace: 'nowrap' }}>Brand</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.slice(0, sliceVisible).map((member, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>{member.uniqueCode}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>{member.userName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900" style={{ border: '1px solid #e5e7eb' }}>{member.lastDepositDate}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center" style={{ border: '1px solid #e5e7eb' }}>{member.daysInactive}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center" style={{ border: '1px solid #e5e7eb' }}>{member.daysActive}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ border: '1px solid #e5e7eb' }}>{formatCurrencyKPI(member.atv, currency)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ border: '1px solid #e5e7eb' }}>{formatIntegerKPI(member.depositCases)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ border: '1px solid #e5e7eb' }}>{formatCurrencyKPI(member.depositAmount, currency)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ border: '1px solid #e5e7eb' }}>{formatIntegerKPI(member.withdrawCases)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ border: '1px solid #e5e7eb' }}>{formatCurrencyKPI(member.withdrawAmount, currency)}</td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${member.ggr >= 0 ? 'text-green-700' : 'text-red-700'}`} style={{ border: '1px solid #e5e7eb', fontWeight: 600 }}>{formatCurrencyKPI(member.ggr, currency)}</td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm text-right ${member.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`} style={{ border: '1px solid #e5e7eb', fontWeight: 600 }}>{formatCurrencyKPI(member.netProfit, currency)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ border: '1px solid #e5e7eb' }}>{member.winrate.toFixed(2)}%</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right" style={{ border: '1px solid #e5e7eb' }}>{member.withdrawalRate.toFixed(2)}%</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center" style={{ border: '1px solid #e5e7eb' }}>
                          <span className={`px-2 py-1 rounded-full text-xs inline-block ${getStatusBadgeClass(member.status)}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center" style={{ border: '1px solid #e5e7eb' }}>{member.brand}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {members.length > 0 && (
          <div className="border-t px-6 py-3 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {Math.min(sliceVisible, members.length)} of {totalRecords} members
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rows</label>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={sliceVisible}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '20')
                  setSliceVisible(Math.min(100, Math.max(1, v)))
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className="text-sm text-gray-700">
                Page {page} / {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

