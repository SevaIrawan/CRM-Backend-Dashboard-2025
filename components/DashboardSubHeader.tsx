'use client'

import React from 'react'
import YearSlicer from './slicers/YearSlicer'
import MonthSlicer from './slicers/MonthSlicer'
import CurrencySlicer from './slicers/CurrencySlicer'

interface DashboardSubHeaderProps {
  selectedYear: string
  setSelectedYear: (value: string) => void
  selectedMonth: string
  setSelectedMonth: (value: string) => void
  selectedCurrency: string
  setSelectedCurrency: (value: string) => void
}

export default function DashboardSubHeader({
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  selectedCurrency,
  setSelectedCurrency
}: DashboardSubHeaderProps) {
  return (
    <div className="dashboard-subheader">
      <div className="subheader-title">
        
      </div>
      
      <div className="subheader-controls">
        <div className="slicer-group">
          <label className="slicer-label">YEAR:</label>
          <YearSlicer 
            value={selectedYear} 
            onChange={setSelectedYear}
          />
        </div>
        
        <div className="slicer-group">
          <label className="slicer-label">CURRENCY:</label>
          <CurrencySlicer 
            value={selectedCurrency} 
            onChange={setSelectedCurrency}
          />
        </div>
        
        <div className="slicer-group">
          <label className="slicer-label">MONTH:</label>
          <MonthSlicer 
            value={selectedMonth} 
            onChange={setSelectedMonth}
            selectedYear={selectedYear}
            selectedCurrency={selectedCurrency}
          />
        </div>
      </div>
    </div>
  )
} 