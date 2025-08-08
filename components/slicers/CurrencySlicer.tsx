'use client'

import React, { useState, useEffect } from 'react'
import { getSlicerData } from '@/lib/KPILogic'

interface CurrencySlicerProps {
  value: string
  onChange: (value: string) => void
  className?: string
  currencies?: string[]
}

export default function CurrencySlicer({ value, onChange, className = '', currencies: propCurrencies }: CurrencySlicerProps) {
  const [currencies, setCurrencies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (propCurrencies) {
      setCurrencies(propCurrencies)
      setLoading(false)
    } else {
      const fetchCurrencies = async () => {
        try {
          setLoading(true)
          console.log('💱 [CurrencySlicer] Fetching currencies from Supabase...')
          
          const slicerData = await getSlicerData()
          setCurrencies(slicerData.currencies)
          
          console.log('✅ [CurrencySlicer] Currencies loaded:', slicerData.currencies)
        } catch (error) {
          console.error('❌ [CurrencySlicer] Error:', error)
          setCurrencies([])
        } finally {
          setLoading(false)
        }
      }

      fetchCurrencies()
    }
  }, [propCurrencies])

  if (loading) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`subheader-select ${className}`}
        style={{ 
          padding: '8px 12px',
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          backgroundColor: 'white',
          fontSize: '14px',
          color: '#374151',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease',
          minWidth: '100px', 
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
        }}
        disabled
      >
        <option>Loading...</option>
      </select>
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`subheader-select ${className}`}
      style={{ 
        padding: '8px 12px',
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        backgroundColor: 'white',
        fontSize: '14px',
        color: '#374151',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.2s ease',
        minWidth: '100px', 
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
      }}
    >
      <option value="All">All</option>
      {currencies.map((currency) => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </select>
  )
} 