# STANDARD SUB MENU RULES

## Overview
Aturan standard untuk semua sub menu di aplikasi NEXMAX. Aturan ini memastikan konsistensi behavior untuk semua sub menu termasuk Transaction dan USC.

## Aturan Standard

### 1. Auto Show Sub Menu
- Ketika user berada di halaman sub menu, sub menu parent akan otomatis terbuka
- Contoh: User di `/transaction/deposit` → Sub menu "Transaction" terbuka
- Contoh: User di `/usc/overview` → Sub menu "USC" terbuka

### 2. Toggle Sub Menu
- Ketika user klik menu yang sama, sub menu akan toggle (buka/tutup)
- Contoh: User klik "Transaction" → Sub menu Transaction terbuka
- User klik "Transaction" lagi → Sub menu Transaction tertutup

### 3. Auto Hide Sub Menu
- Ketika user klik menu lain (bukan sub menu), sub menu akan otomatis tertutup
- Contoh: User di sub menu Transaction, lalu klik "Dashboard" → Sub menu Transaction tertutup

### 4. Highlight Icon
- Icon menu parent akan terang (biru) ketika sub menu aktif
- Contoh: User di halaman Transaction → Icon Transaction berwarna biru

### 5. Scroll Hanya untuk Sub Menu
- Sub menu memiliki scrollbar sendiri dengan styling konsisten
- Main menu tidak memiliki scrollbar

## Implementasi di Sidebar.tsx

### Helper Functions
```typescript
// Deteksi apakah path adalah sub menu
const isSubmenuPath = (path: string) => {
  return path.startsWith('/transaction/') || path.startsWith('/usc/')
}

// Dapatkan parent menu dari path
const getParentMenuFromPath = (path: string) => {
  if (path.startsWith('/transaction/')) return 'Transaction'
  if (path.startsWith('/usc/')) return 'USC'
  return null
}
```

### Auto Show Logic
```typescript
useEffect(() => {
  if (pathname.startsWith('/transaction/')) {
    setOpenSubmenu('Transaction')
  } else if (pathname.startsWith('/usc/')) {
    setOpenSubmenu('USC')
  }
}, [pathname])
```

### Click Handler
```typescript
const handleMenuClick = (path: string) => {
  const parentMenu = getParentMenuFromPath(path)
  
  if (parentMenu) {
    // Jika user klik sub menu, tetap buka sub menu parent
    setOpenSubmenu(parentMenu)
  } else {
    // Jika user klik menu lain (bukan sub menu), tutup sub menu
    setOpenSubmenu(null)
  }
  
  router.push(path)
}
```

## Menambah Sub Menu Baru

Untuk menambah sub menu baru, update helper functions:

1. **Update `isSubmenuPath`**:
```typescript
const isSubmenuPath = (path: string) => {
  return path.startsWith('/transaction/') || 
         path.startsWith('/usc/') || 
         path.startsWith('/new-menu/')  // Tambahkan path baru
}
```

2. **Update `getParentMenuFromPath`**:
```typescript
const getParentMenuFromPath = (path: string) => {
  if (path.startsWith('/transaction/')) return 'Transaction'
  if (path.startsWith('/usc/')) return 'USC'
  if (path.startsWith('/new-menu/')) return 'New Menu'  // Tambahkan mapping baru
  return null
}
```

3. **Update Auto Show Logic**:
```typescript
useEffect(() => {
  if (pathname.startsWith('/transaction/')) {
    setOpenSubmenu('Transaction')
  } else if (pathname.startsWith('/usc/')) {
    setOpenSubmenu('USC')
  } else if (pathname.startsWith('/new-menu/')) {  // Tambahkan kondisi baru
    setOpenSubmenu('New Menu')
  }
}, [pathname])
```

## Styling Konsisten

Semua sub menu menggunakan styling yang sama:
- Background: `#1f2937` (Dark blue)
- Max height: `200px`
- Scroll: `overflowY: 'auto'`
- Scrollbar: `scrollbarWidth: 'thin'`, `scrollbarColor: '#4a5568 #1f2937'`

## Status Implementasi

✅ **Transaction Sub Menu** - Fully implemented
✅ **USC Sub Menu** - Fully implemented
⏳ **Future Sub Menus** - Ready for implementation using standard rules 