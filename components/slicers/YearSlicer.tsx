'use client'

interface YearSlicerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function YearSlicer({ value, onChange, className = '' }: YearSlicerProps) {
  const years = [
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
    { value: '2022', label: '2022' },
    { value: '2021', label: '2021' }
  ]

  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className={`subheader-select ${className}`}
    >
      {years.map((year) => (
        <option key={year.value} value={year.value}>
          {year.label}
        </option>
      ))}
    </select>
  )
} 