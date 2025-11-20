# 📐 MODAL POSITION STANDARD - NEXMAX DASHBOARD

**Last Updated:** Session terakhir  
**Status:** ✅ **STANDARDIZED**

---

## 🎯 STANDARD POSITION

Semua modal/popup/drill-out di project ini **WAJIB** menggunakan posisi berikut:

```typescript
style={{ 
  position: 'fixed',
  top: '150px',    // Header (90px) + Subheader (60px)
  left: '280px',   // Sidebar width
  right: 0,
  bottom: 0,
  zIndex: 10000
}}
```

**Penjelasan:**
- **top: '150px'**: Modal dimulai setelah Header (90px) + Subheader (60px)
- **left: '280px'**: Modal dimulai setelah Sidebar (280px width)
- **right: 0**: Modal memanjang sampai edge kanan viewport
- **bottom: 0**: Modal memanjang sampai edge bawah viewport
- **zIndex: 10000**: Modal berada di atas semua elemen (sidebar: 1000, header: 900)

**Visual Layout:**
```
┌─────────────────────────────────────────────────┐
│ HEADER (90px)                                   │
├─────────────────────────────────────────────────┤
│ SUBHEADER (60px)                                │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ SIDEBAR  │  ┌──────────────────────────────┐   │
│ (280px)  │  │                              │   │
│          │  │   POP UP MODAL               │   │
│          │  │   (Content Area)             │   │
│          │  │                              │   │
│          │  └──────────────────────────────┘   │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

---

## ✅ MODAL YANG SUDAH STANDARD

### 1. **GGrBreakdownModal.tsx**
- ✅ Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- ✅ zIndex: `10000`
- ✅ Usage: Business Performance USC - GGR Breakdown

### 2. **CustomerDetailModal.tsx**
- ✅ Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- ✅ zIndex: `10000`
- ✅ Usage: Brand Performance Trends - Customer drill-down

### 3. **ActiveMemberDetailsModal.tsx**
- ✅ Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- ✅ zIndex: `10000`
- ✅ Usage: Business Performance - Active Member drill-out

### 4. **TargetEditModal.tsx**
- ✅ Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- ✅ zIndex: `10000`
- ✅ Usage: Business Performance - Target input/edit

### 5. **TargetAchieveModal.tsx**
- ✅ Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- ✅ zIndex: `10000`
- ✅ Usage: Business Performance - Target achievement breakdown

### 6. **OverdueDetailsModal.tsx**
- ✅ Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- ✅ zIndex: `10000`
- ✅ Usage: Auto-approval - Overdue details

### 7. **ChartZoomModal.tsx**
- ✅ Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- ✅ zIndex: `10000`
- ✅ Usage: Universal chart zoom

### 8. **TotalTransactionsDetailsModal.tsx**
- ✅ Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- ✅ zIndex: `10000`
- ✅ Usage: Transaction details drill-out

### 9. **UploadTransactionsDetailsModal.tsx**
- ✅ Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- ✅ zIndex: `10000`
- ✅ Usage: Upload transactions details

### 10. **AutomationTransactionsModal.tsx**
- ✅ Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- ✅ zIndex: `10000`
- ✅ Usage: Automation transactions details

---

## 📋 IMPLEMENTATION TEMPLATE

### **Standard Modal Structure:**

```typescript
'use client'

import React from 'react'
import { createPortal } from 'react-dom'

interface YourModalProps {
  isOpen: boolean
  onClose: () => void
  // ... other props
}

export default function YourModal({
  isOpen,
  onClose,
  // ... other props
}: YourModalProps) {
  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ 
        position: 'fixed',
        top: '150px',    // ✅ STANDARD: Header (90px) + Subheader (60px)
        left: '280px',   // ✅ STANDARD: Sidebar width
        right: 0,
        bottom: 0,
        zIndex: 10000,   // ✅ STANDARD: Above all elements
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Optional: backdrop
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          width: '95%',
          maxWidth: '1200px',
          maxHeight: 'calc(100vh - 180px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Content */}
      </div>
    </div>,
    document.body
  )
}
```

---

## 🚫 YANG TIDAK BOLEH

### ❌ **JANGAN GUNAKAN:**
```typescript
// ❌ WRONG: Full screen overlay
style={{ 
  position: 'fixed',
  top: 0,      // ❌ Jangan mulai dari top 0
  left: 0,     // ❌ Jangan mulai dari left 0
  right: 0,
  bottom: 0,
  zIndex: 10000
}}

// ❌ WRONG: Centered in viewport
style={{ 
  position: 'fixed',
  inset: 0,   // ❌ Jangan pakai inset-0
  zIndex: 10000
}}

// ❌ WRONG: Different z-index
zIndex: 9999  // ❌ Harus 10000
```

---

## ✅ YANG HARUS

### ✅ **WAJIB GUNAKAN:**
```typescript
// ✅ CORRECT: Standard position
style={{ 
  position: 'fixed',
  top: '150px',    // ✅ Header + Subheader
  left: '280px',   // ✅ Sidebar width
  right: 0,
  bottom: 0,
  zIndex: 10000    // ✅ Standard z-index
}}
```

---

## 🔍 NESTED MODALS

Untuk nested modals (modal di dalam modal), gunakan z-index yang lebih tinggi:

```typescript
// Main Modal
zIndex: 10000

// Nested Modal (Level 1)
zIndex: 10001

// Nested Modal (Level 2)
zIndex: 10002
```

**Contoh:** GGrBreakdownModal → TierCustomersModal → TransactionHistoryModal
- GGrBreakdownModal: `zIndex: 10000`
- TierCustomersModal: `zIndex: 10001`
- TransactionHistoryModal: `zIndex: 10002`

---

## 📝 CHECKLIST SAAT MEMBUAT MODAL BARU

- [ ] Menggunakan `createPortal` dari `react-dom`
- [ ] Position: `top: '150px', left: '280px', right: 0, bottom: 0`
- [ ] zIndex: `10000` (atau lebih tinggi untuk nested)
- [ ] ESC key handler untuk close
- [ ] `document.body.style.overflow = 'hidden'` saat modal open
- [ ] `onClick={(e) => e.stopPropagation()}` pada modal content
- [ ] `onClick={onClose}` pada overlay/backdrop
- [ ] `if (!isOpen || typeof document === 'undefined') return null`

---

## 🎨 STYLING CONSISTENCY

### **Backdrop/Overlay:**
```typescript
backgroundColor: 'rgba(0, 0, 0, 0.5)'  // Optional: semi-transparent backdrop
```

### **Modal Container:**
```typescript
backgroundColor: '#FFFFFF'
borderRadius: '8px'
width: '95%'
maxWidth: '1200px'  // Adjust sesuai kebutuhan
maxHeight: 'calc(100vh - 180px)'
boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
```

---

## 📊 SUMMARY

| Modal Component | Status | Position | zIndex |
|----------------|--------|----------|--------|
| GGrBreakdownModal | ✅ | Standard | 10000 |
| CustomerDetailModal | ✅ | Standard | 10000 |
| ActiveMemberDetailsModal | ✅ | Standard | 10000 |
| TargetEditModal | ✅ | Standard | 10000 |
| TargetAchieveModal | ✅ | Standard | 10000 |
| OverdueDetailsModal | ✅ | Standard | 10000 |
| ChartZoomModal | ✅ | Standard | 10000 |
| TotalTransactionsDetailsModal | ✅ | Standard | 10000 |
| UploadTransactionsDetailsModal | ✅ | Standard | 10000 |
| AutomationTransactionsModal | ✅ | Standard | 10000 |

**Total:** 10 modal components  
**Status:** ✅ **100% STANDARDIZED**

---

## 🔄 MAINTENANCE

**Rule:** Setiap modal baru yang dibuat **WAJIB** mengikuti standard ini.

**Review:** Check semua modal setiap kali ada perubahan layout (header/subheader/sidebar height/width).

---

**Last Verified:** Session terakhir  
**Verified By:** AI Assistant  
**Status:** ✅ **ALL MODALS COMPLIANT**

