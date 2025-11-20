# POPUP MODAL STANDARD

File standard ini WAJIB diikuti oleh semua popup modal di project NEXMAX.

## 1. STANDARD POSITION WINDOW

### Wrapper Container
```typescript
style={{
  position: 'fixed',
  top: '150px',        // Header (90px) + Subheader (60px)
  left: '280px',       // Sidebar width
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  padding: 0,
  margin: 0
}}
```

**Penjelasan:**
- `top: '150px'` - Offset dari top untuk header + subheader
- `left: '280px'` - Offset dari left untuk sidebar
- `right: 0, bottom: 0` - Extend ke edge kanan dan bawah
- `zIndex: 10000` - Pastikan di atas semua element lain
- `padding: 0, margin: 0` - Tidak ada padding/margin di wrapper

---

## 2. STANDARD STYLING WINDOW

### Modal Container
```typescript
style={{
  backgroundColor: 'white',
  borderRadius: '8px',
  width: '100%',
  maxWidth: '95vw',
  maxHeight: '75vh',
  margin: 'auto',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
}}
```

**Penjelasan:**
- `borderRadius: '8px'` - Rounded corners
- `maxWidth: '95vw'` - Maximum 95% viewport width
- `maxHeight: '75vh'` - Maximum 75% viewport height
- `boxShadow` - Standard shadow untuk elevation

---

## 3. STANDARD PADDING

### Header Padding
```typescript
style={{
  padding: '24px',  // Semua sisi sama (p-6 equivalent)
  borderBottom: '1px solid #E5E7EB',
  backgroundColor: '#F9FAFB'
}}
```

### Content Padding
```typescript
style={{
  padding: '20px 24px',  // Top/Bottom: 20px, Left/Right: 24px
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  overflow: 'hidden',
  minHeight: 0
}}
```

### Footer/Pagination Padding
```typescript
style={{
  padding: '12px 24px',
  borderTop: '1px solid #e5e7eb',
  flexShrink: 0
}}
```

---

## 4. STANDARD MAX HEIGHT

### Table Container Max Height
**Perhitungan:**
- Tinggi 1 row = 38px (padding 10px top + 10px bottom = 20px + border 1px + content ~17px)
- 11 rows (1 header + 10 data rows) × 38px = **418px**

```typescript
style={{
  maxHeight: totalItems >= 100 ? 'none' : '418px',  // Exact calculation untuk 10 rows visible
  overflowY: totalItems >= 100 ? 'visible' : 'auto'
}}
```

**Logic:**
- Jika data < 100: Gunakan scroll dengan `maxHeight: 418px` (10 rows visible)
- Jika data >= 100: Gunakan pagination, `maxHeight: 'none'`, `overflowY: 'visible'`

---

## 5. STANDARD MAX WIDTH

```typescript
maxWidth: '95vw'  // Maximum 95% viewport width
```

---

## 6. STANDARD SHOWING AND POSITION

### Showing Caption (untuk data < 100 dengan scroll)
```typescript
<p style={{
  fontSize: '12px',
  color: '#6B7280',
  margin: 0,
  padding: '12px 24px',
  borderTop: '1px solid #e5e7eb'
}}>
  Showing {startIndex + 1} - {endIndex} of {totalRecords} records
</p>
```

**Position:** Bottom left of table, di dalam footer area

### Pagination Info (untuk data >= 100)
```typescript
<span className="pagination-info">
  Showing {startIndex + 1} - {endIndex} of {totalRecords} records
</span>
```

**Position:** Bottom left, next to pagination controls

---

## 7. STANDARD DROPDOWN ROW (20, 50, 100)

```typescript
<select
  value={limit}
  onChange={(e) => {
    setLimit(Number(e.target.value))
    setPage(1)  // Reset to page 1 when limit changes
  }}
  style={{
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    backgroundColor: 'white',
    cursor: 'pointer'
  }}
>
  <option value={20}>20</option>
  <option value={50}>50</option>
  <option value={100}>100</option>
</select>
```

**Note:** Dropdown ini HANYA muncul jika data >= 100 (pagination mode)

---

## 8. STANDARD PAGINATION

### Pagination Container
```typescript
<div className="pagination-controls" style={{
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 24px',
  borderTop: '1px solid #e5e7eb',
  flexShrink: 0
}}>
  {/* Pagination buttons */}
</div>
```

### Pagination Buttons
```typescript
<button
  onClick={() => setPage(page - 1)}
  disabled={page === 1}
  className="pagination-btn"
  style={{
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    background: 'transparent',
    color: '#374151',
    cursor: page === 1 ? 'not-allowed' : 'pointer',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  }}
  onMouseEnter={(e) => {
    if (page > 1) e.currentTarget.style.borderColor = '#9ca3af'
  }}
  onMouseLeave={(e) => {
    if (page > 1) e.currentTarget.style.borderColor = '#d1d5db'
  }}
>
  Previous
</button>

<span className="pagination-info">
  Page {page} of {totalPages}
</span>

<button
  onClick={() => setPage(page + 1)}
  disabled={page === totalPages}
  className="pagination-btn"
  style={{
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    background: 'transparent',
    color: '#374151',
    cursor: page === totalPages ? 'not-allowed' : 'pointer',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  }}
  onMouseEnter={(e) => {
    if (page < totalPages) e.currentTarget.style.borderColor = '#9ca3af'
  }}
  onMouseLeave={(e) => {
    if (page < totalPages) e.currentTarget.style.borderColor = '#d1d5db'
  }}
>
  Next
</button>
```

**Conditional Rendering:**
- Pagination HANYA muncul jika `totalItems >= 100`
- Jika `totalItems < 100`, gunakan scroll saja (tidak ada pagination)

---

## 9. STANDARD STYLING AND BACKGROUND BUTTON

### Close Button
```typescript
<button
  onClick={onClose}
  style={{
    padding: '8px 16px',
    backgroundColor: '#6B7280',  // Grey
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = '#4B5563'  // Darker grey on hover
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = '#6B7280'
  }}
>
  Close
</button>
```

### Export Button
```typescript
<button
  onClick={handleExport}
  disabled={exporting || data.length === 0}
  className="export-button"
  style={{
    padding: '6px 12px',
    backgroundColor: exporting || data.length === 0 ? '#f3f4f6' : '#10b981',  // Green
    color: exporting || data.length === 0 ? '#9ca3af' : '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: exporting || data.length === 0 ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease'
  }}
  onMouseEnter={(e) => {
    if (!exporting && data.length > 0) {
      e.currentTarget.style.backgroundColor = '#059669'  // Darker green on hover
    }
  }}
  onMouseLeave={(e) => {
    if (!exporting && data.length > 0) {
      e.currentTarget.style.backgroundColor = '#10b981'
    }
  }}
>
  {exporting ? 'Exporting...' : 'Export'}
</button>
```

### Back Button (jika diperlukan untuk nested modals)
```typescript
<button
  onClick={onBack}
  style={{
    padding: '8px 16px',
    backgroundColor: '#6B7280',  // Same as Close button
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = '#4B5563'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = '#6B7280'
  }}
>
  Back
</button>
```

**Button Colors:**
- **Close/Back**: `#6B7280` (Grey) → `#4B5563` (hover)
- **Export**: `#10b981` (Green) → `#059669` (hover)
- **Disabled**: `#f3f4f6` (Light grey) dengan text `#9ca3af`

---

## 10. STANDARD SLICER (IF NEEDED)

### Brand/Line Slicer Position
Slicer ditempatkan di **header**, sebelah kanan Close button.

```typescript
<div style={{ 
  display: 'flex', 
  alignItems: 'center', 
  gap: '12px' 
}}>
  <label style={{ 
    fontSize: '14px', 
    fontWeight: 500, 
    color: '#374151'
  }}>
    Brand/Line:
  </label>
  <select
    value={selectedBrand}
    onChange={(e) => setSelectedBrand(e.target.value)}
    style={{
      padding: '6px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer',
      minWidth: '150px'
    }}
  >
    <option value="">All Brands</option>
    {uniqueBrands.map(brand => (
      <option key={brand} value={brand}>{brand}</option>
    ))}
  </select>
</div>
```

---

## 11. STANDARD TABLE STYLING

### Table Container
```typescript
<div style={{ 
  overflowX: 'auto',
  overflowY: totalItems >= 100 ? 'visible' : 'auto',
  maxHeight: totalItems >= 100 ? 'none' : '418px',
  position: 'relative'
}}>
  <table style={{
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid #e0e0e0',
    fontSize: '14px'
  }}>
    {/* Table content */}
  </table>
</div>
```

### Table Header (Sticky)
```typescript
<thead style={{ 
  position: 'sticky', 
  top: 0, 
  zIndex: 10,
  backgroundColor: '#374151',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}}>
  <tr>
    <th style={{ 
      padding: '10px 14px', 
      textAlign: 'left', 
      fontWeight: 600,
      backgroundColor: '#374151',
      color: 'white',
      border: '1px solid #4b5563',
      borderBottom: '2px solid #4b5563',
      whiteSpace: 'nowrap'
    }}>
      Column Name
    </th>
  </tr>
</thead>
```

### Table Body Rows
```typescript
<tbody>
  {data.map((item, index) => (
    <tr
      key={index}
      style={{
        backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
      }}
    >
      <td style={{ 
        padding: '10px 14px', 
        border: '1px solid #e0e0e0',
        color: '#374151'
      }}>
        {item.value}
      </td>
    </tr>
  ))}
</tbody>
```

---

## 12. COMPLETE MODAL STRUCTURE TEMPLATE

```typescript
import { createPortal } from 'react-dom'

export default function StandardModal({
  isOpen,
  onClose,
  // ... other props
}: StandardModalProps) {
  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        top: '150px',
        left: '280px',
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 0,
        margin: 0
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '95vw',
          maxHeight: '75vh',
          margin: 'auto',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#1F2937',
              margin: 0,
              marginBottom: '4px'
            }}>
              MODAL TITLE
            </h2>
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              Subtitle information
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6B7280',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280'
            }}
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0
        }}>
          {/* Table or other content */}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid #e5e7eb',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* Showing caption (left) */}
          <p style={{
            fontSize: '12px',
            color: '#6B7280',
            margin: 0
          }}>
            Showing X - Y of Z records
          </p>

          {/* Pagination & Export (right) */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Pagination controls */}
            {/* Export button */}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
```

---

## 13. IMPORTANT RULES

1. **WAJIB** menggunakan `createPortal` untuk render modal
2. **WAJIB** menggunakan `zIndex: 10000` untuk wrapper
3. **WAJIB** menggunakan `maxHeight: 418px` untuk table container jika data < 100
4. **WAJIB** menggunakan `padding: '24px'` untuk header
5. **WAJIB** menggunakan `padding: '20px 24px'` untuk content
6. **WAJIB** menggunakan button colors yang sudah ditentukan
7. **WAJIB** menggunakan sticky header untuk table
8. **WAJIB** conditional rendering: scroll untuk < 100, pagination untuk >= 100

---

## 14. REFERENCE FILES

File-file yang sudah mengikuti standard ini:
- `components/TotalTransactionsDetailsModal.tsx`
- `components/UploadTransactionsDetailsModal.tsx`
- `components/AutomationTransactionsModal.tsx`
- `components/GGrBreakdownModal.tsx`
- `components/TierCustomersModal.tsx` (nested dalam GGrBreakdownModal)
- `components/TransactionHistoryModal.tsx` (nested dalam GGrBreakdownModal)

**Semua modal baru WAJIB mengikuti standard ini.**

