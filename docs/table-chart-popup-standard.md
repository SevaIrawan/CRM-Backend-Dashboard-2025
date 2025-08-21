# 📋 Table Chart with Popup Modal - Standard Template

## 🎯 **Overview**
Dokumentasi ini menjelaskan cara implementasi **Table Chart dengan Popup Modal** yang sudah diimplementasikan di USC Overview page. Template ini bisa digunakan sebagai **standard** untuk page lain yang ingin menampilkan table chart dengan detail popup.

---

## 📁 **File Structure**
```
app/
├── [page-name]/
│   └── page.tsx                    # Main page dengan table chart
├── api/
│   └── [page-name]/
│       └── data/route.ts           # API untuk fetch data
└── lib/
    └── [PageName]Logic.tsx         # Logic untuk data processing
```

---

## 🔧 **Implementation Steps**

### **Step 1: State Management**
```typescript
// Modal state untuk detail view
const [showDetailModal, setShowDetailModal] = useState(false)
const [modalTitle, setModalTitle] = useState('')
const [modalMembers, setModalMembers] = useState<DataType[]>([])

// Data state
const [tableData, setTableData] = useState<TableDataType>({
  // Sesuaikan dengan struktur data Anda
})
```

### **Step 2: Handle View Detail Function**
```typescript
const handleViewDetail = (category: string) => {
  console.log('🔍 [Page] View Detail clicked for category:', category)
  
  // Filter data berdasarkan kategori
  let filteredData: DataType[] = []
  let title = ''
  
  // Logic filtering sesuai kebutuhan
  if (category === 'category1') {
    filteredData = data.filter(item => item.category === 'category1')
    title = 'Category 1 Detail'
  } else if (category === 'category2') {
    filteredData = data.filter(item => item.category === 'category2')
    title = 'Category 2 Detail'
  }
  // ... tambahkan logic lainnya
  
  console.log('📊 [Page] Filtered data:', filteredData)
  
  // Set modal data dan show modal
  setModalTitle(title)
  setModalMembers(filteredData)
  setShowDetailModal(true)
}
```

### **Step 3: Export CSV Function**
```typescript
const handleExportToCSV = () => {
  if (modalMembers.length === 0) return

  const headers = [
    'Column 1',
    'Column 2', 
    'Column 3',
    'Column 4',
    'Column 5'
  ]

  const csvData = modalMembers.map(member => [
    member.field1,
    member.field2,
    member.field3,
    member.field4,
    member.field5
  ])

  const csvContent = [
    headers.join(','),
    ...csvData.map(row => row.join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${modalTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
```

### **Step 4: Table Structure**
```typescript
<div className="table-row">
  <div className="table-container">
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      border: '1px solid #e2e8f0',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-3px)';
      e.currentTarget.style.boxShadow = '0 8px 25px 0 rgba(0, 0, 0, 0.12), 0 4px 10px 0 rgba(0, 0, 0, 0.08)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
    }}>
      
      {/* Table Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} dangerouslySetInnerHTML={{ __html: getChartIcon('Table Name') }} />
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          margin: 0
        }}>Table Title</h3>
      </div>

      {/* Table Content */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Column 1</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Column 2</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>%</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Column 3</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>View Detail</th>
            </tr>
          </thead>
          <tbody>
            {/* Table Rows */}
            {data.map((item, index) => (
              <tr 
                key={index}
                style={{ 
                  borderBottom: '1px solid #f3f4f6',
                  transition: 'background-color 0.2s ease',
                  cursor: 'pointer',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                <td style={{ padding: '12px' }}>{item.name}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{item.value}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{calculatePercentage(item.value, total)}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button 
                    style={{ 
                      padding: '4px 8px', 
                      backgroundColor: '#3b82f6', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer' 
                    }}
                    onClick={() => handleViewDetail(item.category)}
                  >
                    View Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
```

### **Step 5: Modal Structure**
```typescript
{showDetailModal && (
  <div 
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}
    onClick={() => setShowDetailModal(false)}
  >
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '95%',
        maxWidth: '1600px',
        maxHeight: '90%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Modal Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
          {modalTitle}
        </h2>
        <button 
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6b7280'
          }}
          onClick={() => setShowDetailModal(false)}
        >
          ×
        </button>
      </div>

      {/* Modal Body - Table */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div className="simple-table-container" style={{ flex: 1, margin: '0' }}>
          <div className="simple-table-wrapper" style={{ maxHeight: '400px' }}>
            <table className="simple-table" style={{ tableLayout: 'auto', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>COLUMN 1</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>COLUMN 2</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>COLUMN 3</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>COLUMN 4</th>
                  <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>COLUMN 5</th>
                </tr>
              </thead>
              <tbody>
                {modalMembers.map((member, index) => (
                  <tr key={`${member.id}-${index}`}>
                    <td style={{ textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {member.field1}
                    </td>
                    <td style={{ textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {member.field2}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                      {member.field3}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                      {formatCurrency(member.field4)}
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                      {member.field5}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {modalMembers.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#6b7280'
              }}>
                No data found for this category.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {modalMembers.length > 0 && (
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e5e7eb',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px'
        }}>
          <div style={{
            backgroundColor: '#eff6ff',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #dbeafe'
          }}>
            <div style={{ fontSize: '14px', color: '#1d4ed8', fontWeight: '500' }}>Total Items</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>{modalMembers.length}</div>
          </div>
          <div style={{
            backgroundColor: '#f0fdf4',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '500' }}>Total Value 1</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534' }}>
              {formatCurrency(modalMembers.reduce((sum, member) => sum + member.field1, 0))}
            </div>
          </div>
          <div style={{
            backgroundColor: '#fef2f2',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}>
            <div style={{ fontSize: '14px', color: '#dc2626', fontWeight: '500' }}>Total Value 2</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#991b1b' }}>
              {formatCurrency(modalMembers.reduce((sum, member) => sum + member.field2, 0))}
            </div>
          </div>
          <div style={{
            backgroundColor: '#faf5ff',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e9d5ff'
          }}>
            <div style={{ fontSize: '14px', color: '#7c3aed', fontWeight: '500' }}>Total Value 3</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#5b21b6' }}>
              {formatCurrency(modalMembers.reduce((sum, member) => sum + member.field3, 0))}
            </div>
          </div>
          <div style={{
            backgroundColor: '#fef3c7',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #fde68a'
          }}>
            <div style={{ fontSize: '14px', color: '#d97706', fontWeight: '500' }}>Total Value 4</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>
              {formatCurrency(modalMembers.reduce((sum, member) => sum + member.field4, 0))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Footer */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button 
          style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          onClick={handleExportToCSV}
        >
          Export to CSV
        </button>
        <button 
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => setShowDetailModal(false)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 🎨 **CSS Classes Required**

### **Global CSS (app/globals.css)**
```css
/* Table Row Layout */
.table-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  margin-bottom: 20px;
}

.table-container {
  width: 100%;
}

/* Simple Table Styling */
.simple-table-wrapper {
  overflow: auto;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.simple-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.simple-table th {
  background-color: #f9fafb;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 10;
}

.simple-table td {
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.simple-table tbody tr:hover {
  background-color: #f8fafc;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .table-row {
    grid-template-columns: 1fr;
  }
}
```

---

## 📊 **Data Types & Interfaces**

### **TypeScript Interfaces**
```typescript
// Main table data type
interface TableDataType {
  category1: number
  category2: number
  category3: number
  totalMembers: number
  memberDetails: DataType[]
}

// Individual data item type
interface DataType {
  id: string
  field1: string
  field2: string
  field3: number
  field4: number
  field5: number
  category: string
}

// Modal state types
interface ModalState {
  showDetailModal: boolean
  modalTitle: string
  modalMembers: DataType[]
}
```

---

## 🔄 **Integration with Existing Logic**

### **API Route Example**
```typescript
// app/api/[page-name]/data/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPageData } from '@/lib/[PageName]Logic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const currency = searchParams.get('currency')
    const line = searchParams.get('line')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const data = await getPageData(year, month, currency, line, startDate, endDate)

    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error) {
    console.error('❌ [API] Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch data'
    }, { status: 500 })
  }
}
```

### **Logic File Example**
```typescript
// lib/[PageName]Logic.tsx
import { createClient } from '@supabase/supabase-js'

export async function getPageData(year: string, month: string, currency: string, line: string, startDate?: string, endDate?: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Build query based on parameters
  let query = supabase
    .from('your_table_name')
    .select('*')

  // Apply filters
  if (year) query = query.eq('year', year)
  if (month) query = query.eq('month', month)
  if (currency) query = query.eq('currency', currency)
  if (line && line !== 'All') query = query.eq('line', line)
  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data, error } = await query

  if (error) {
    console.error('❌ [Logic] Database error:', error)
    throw error
  }

  // Process data and return
  return {
    tableData: processTableData(data),
    // ... other processed data
  }
}

function processTableData(rawData: any[]) {
  // Process raw data into table format
  // Implement your data processing logic here
  return {
    // ... processed data
  }
}
```

---

## ✅ **Best Practices**

### **1. Performance Optimization**
- Use `useMemo` untuk data yang tidak sering berubah
- Implement proper loading states
- Use pagination untuk data besar

### **2. Error Handling**
- Always wrap API calls in try-catch
- Provide meaningful error messages
- Implement fallback UI for errors

### **3. Accessibility**
- Add proper ARIA labels
- Ensure keyboard navigation works
- Provide screen reader support

### **4. Mobile Responsiveness**
- Test on different screen sizes
- Ensure table is scrollable on mobile
- Optimize modal for touch devices

---

## 🚀 **Quick Start Checklist**

- [ ] Copy state management code
- [ ] Implement `handleViewDetail` function
- [ ] Add `handleExportToCSV` function
- [ ] Copy table structure with hover effects
- [ ] Copy modal structure with styling
- [ ] Add required CSS classes
- [ ] Define TypeScript interfaces
- [ ] Create API route
- [ ] Implement logic file
- [ ] Test functionality
- [ ] Add error handling
- [ ] Test responsive design

---

## 📝 **Notes**

1. **Customization**: Sesuaikan semua field names, column headers, dan data processing logic dengan kebutuhan page Anda
2. **Styling**: Gunakan styling yang konsisten dengan design system project
3. **Icons**: Gunakan `getChartIcon()` dari `CentralIcon.tsx` untuk icons
4. **Formatting**: Gunakan `formatCurrency()` dan `formatNumber()` untuk formatting yang konsisten
5. **Testing**: Test semua functionality termasuk export CSV dan responsive design

---

## 🔗 **Related Files**

- `app/usc/overview/page.tsx` - Contoh implementasi lengkap
- `lib/USCLogic.tsx` - Contoh logic file
- `app/api/usc/data/route.ts` - Contoh API route
- `lib/CentralIcon.tsx` - Icon management
- `app/globals.css` - Global styling

---

**Template ini sudah production-ready dan bisa langsung digunakan sebagai standard untuk semua table chart dengan popup modal di project NEXMAX!** 🎯
