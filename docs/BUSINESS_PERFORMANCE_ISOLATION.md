# BUSINESS PERFORMANCE USC PAGE - ISOLATION STANDARD

## ✅ STATUS: 100% TERPISAH DARI STANDARD GLOBAL

Dokumen ini menjelaskan bagaimana Business Performance USC page diisolasi sepenuhnya dari standard global project, sehingga optimasi di Business Performance tidak akan mempengaruhi page lain.

---

## 1. WRAPPER & SCOPE

### Page Wrapper
- **Class**: `.bp-subheader-wrapper`
- **Location**: `app/usc/business-performance/page.tsx`
- **Function**: Semua styling dan CSS override di-scope ke wrapper ini

```tsx
<div className="bp-subheader-wrapper">
  <Layout customSubHeader={customSubHeader}>
    {/* Content */}
  </Layout>
</div>
```

---

## 2. SUB HEADER

### Standard Business Performance
- **Height**: 120px (bukan 60px seperti standard global)
- **Scope**: `.bp-subheader-wrapper .subheader`
- **Location**: `app/usc/business-performance/page.tsx`

```css
:global(.bp-subheader-wrapper .subheader) {
  height: 120px !important;
  min-height: 120px !important;
}
```

### Custom Subheader
- **Component**: Custom JSX (bukan global component)
- **Height**: 120px (BP Standard)
- **Padding**: 12px 24px (BP Standard)
- **Tidak menggunakan**: Global Subheader component

**✅ ISOLATION**: Sub header di Business Performance menggunakan standard sendiri dan di-scope dengan `.bp-subheader-wrapper`, tidak akan mempengaruhi page lain.

---

## 3. CHART COMPONENTS

### A. PieChart & BarChart
- **Source**: Global component (`@/components/PieChart`, `@/components/BarChart`)
- **Usage**: Digunakan di `TierMetricsComparison.tsx`
- **Wrapper Class**: `usc-business-performance-chart-wrapper`
- **CSS Override**: Di-scope dengan `.bp-subheader-wrapper .usc-business-performance-chart-wrapper`

**Implementation**:
```tsx
<div className="usc-business-performance-chart-wrapper">
  <PieChart data={...} />
</div>
```

**CSS Override** (di-scope ke BP page saja):
```css
.bp-subheader-wrapper .usc-business-performance-chart-wrapper > div[role="img"] {
  background-color: transparent !important;
}
```

**✅ ISOLATION**: 
- Chart menggunakan global component, TAPI
- Semua CSS override di-scope dengan `.bp-subheader-wrapper`
- CSS di-inject ke head dengan ID unik dan cleanup function
- Styling tidak akan mempengaruhi chart di page lain

### B. CustomerTierLineChart
- **Type**: Custom component (BUKAN global component)
- **Location**: `app/usc/business-performance/components/CustomerTierLineChart.tsx`
- **Usage**: Hanya digunakan di Business Performance page

**✅ ISOLATION**: Custom component, tidak ada hubungan dengan global LineChart component.

---

## 4. KPI CARD / STAT CARD

### Status: TIDAK ADA
- **Business Performance tidak menggunakan**:
  - StatCard component
  - KPI Card component
  - ProgressBarStatCard component
  
- **Yang digunakan**: Custom div dengan inline styling untuk display KPI numbers

**Example**:
```tsx
<div style={{ fontSize: '22px', fontWeight: 600, color: '#111827' }}>
  {formatCurrencyKPI(periodA.totalDepositAmount, 'USC')}
</div>
```

**✅ ISOLATION**: Tidak menggunakan global KPI/StatCard component, jadi tidak ada keterkaitan.

---

## 5. CSS OVERRIDE SYSTEM

### Chart Background Override
- **Location**: `app/usc/business-performance/components/TierMetricsComparison.tsx`
- **Style ID**: `usc-business-performance-chart-style`
- **Scope**: `.bp-subheader-wrapper .usc-business-performance-chart-wrapper`
- **Cleanup**: Auto-removed saat component unmount

### Chart Border Override
- **Location**: `app/usc/business-performance/components/CustomerTierTrends.tsx`
- **Style ID**: Inline `<style>` tag
- **Scope**: `.bp-subheader-wrapper .customer-tier-trends-chart-wrapper`

### Tooltip Scroll Override
- **Location**: `app/usc/business-performance/components/CustomerTierLineChart.tsx`
- **Style ID**: `customer-tier-tooltip-scroll-bp`
- **Scope**: `.bp-subheader-wrapper canvas ~ div[style*="position: absolute"]`
- **Cleanup**: Auto-removed saat component unmount

**✅ ISOLATION**: Semua CSS override menggunakan:
1. Parent selector `.bp-subheader-wrapper` untuk scope
2. ID unik untuk CSS yang di-inject ke head
3. Cleanup function untuk remove CSS saat unmount
4. Tidak akan mempengaruhi page lain

---

## 6. FRAME & LAYOUT

### Standard Business Performance
- **Height**: `calc(100vh - 210px)` (Header 90px + Subheader 120px)
- **Padding**: 20px all sides
- **Gap**: 32px between metric rows
- **Scope**: `.bp-subheader-wrapper .standard-frame`

```css
:global(.bp-subheader-wrapper .standard-frame) {
  height: calc(100vh - 210px) !important;
  padding: 20px !important;
  gap: 0 !important;
}

:global(.bp-subheader-wrapper .standard-frame > div) {
  gap: 32px !important;
  margin-top: 20px !important;
  margin-bottom: 32px !important;
}
```

**✅ ISOLATION**: Frame styling di-scope dengan `.bp-subheader-wrapper`, tidak akan mempengaruhi page lain.

---

## 7. TABLE CHART

### Status: TIDAK ADA
- Business Performance tidak menggunakan TableChart component

**✅ ISOLATION**: Tidak ada keterkaitan dengan global TableChart component.

---

## 8. KESIMPULAN

### ✅ SEMUA KOMPONEN TERISOLASI

1. **Sub Header**: Custom dengan scope `.bp-subheader-wrapper`
2. **Chart Components**: 
   - PieChart/BarChart: Global component dengan CSS override yang di-scope
   - CustomerTierLineChart: Custom component
3. **KPI Card**: Tidak digunakan (custom div)
4. **CSS Override**: Semua di-scope dengan `.bp-subheader-wrapper`
5. **Frame/Layout**: Standard sendiri dengan scope `.bp-subheader-wrapper`

### ✅ OPTIMASI AMAN

**Jika melakukan optimasi di Business Performance:**
- ✅ Optimasi CSS/styling: Aman (di-scope dengan `.bp-subheader-wrapper`)
- ✅ Optimasi custom component (CustomerTierLineChart): Aman (custom component)
- ⚠️ Optimasi global component (PieChart/BarChart): Hati-hati (bisa mempengaruhi page lain)
- ✅ Optimasi layout/frame: Aman (di-scope dengan `.bp-subheader-wrapper`)

### ✅ CHECKLIST VERIFICATION

- [x] Semua CSS menggunakan parent selector `.bp-subheader-wrapper`
- [x] Semua chart wrapper menggunakan class spesifik (`usc-business-performance-chart-wrapper`)
- [x] CSS yang di-inject ke head menggunakan ID unik
- [x] Cleanup function untuk remove CSS saat unmount
- [x] Tidak ada perubahan di global component yang dibuat khusus untuk BP
- [x] Custom component terpisah dari global component
- [x] Sub header menggunakan standard sendiri
- [x] Frame/layout menggunakan standard sendiri

---

## 9. CATATAN PENTING

### ⚠️ HAL YANG PERLU DIPERHATIKAN

1. **Global Component Usage**:
   - Business Performance menggunakan global PieChart dan BarChart
   - Jika perlu mengubah global component untuk optimasi BP, pertimbangkan:
     - Buat custom component baru
     - Atau tambahkan prop conditional yang tidak mempengaruhi page lain

2. **CSS Override**:
   - Semua CSS override sudah di-scope dengan benar
   - Pastikan semua selector baru juga menggunakan `.bp-subheader-wrapper` sebagai parent

3. **Testing**:
   - Setelah optimasi di Business Performance, test page lain untuk memastikan tidak ada efek samping

---

**Last Updated**: 2024
**Status**: ✅ VERIFIED - 100% ISOLATED

