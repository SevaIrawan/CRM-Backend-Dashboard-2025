# 2. PAGE HIERARCHY

[← Back to Index](./00-INDEX.md)

---

## 2.1 Standard Page Structure

```
Category Level (Optional)
└── Feature Pages
    ├── Overview
    ├── Reports
    ├── Analytics
    └── Monitoring
```

---

## 2.2 Multi-Category Architecture

### Example: Financial Dashboard

```
app/
├── myr/                      # Malaysian Ringgit category
│   ├── overview/
│   ├── business-performance/
│   └── member-report/
├── sgd/                      # Singapore Dollar category
│   ├── overview/
│   └── business-performance/
└── usc/                      # US Cent category
    ├── overview/
    └── member-analytic/
```

### Generalized Pattern

```
app/
├── [category-a]/             # Category A
│   ├── [feature-1]/
│   ├── [feature-2]/
│   └── page.tsx              # Category landing page
├── [category-b]/             # Category B
│   ├── [feature-1]/
│   └── [feature-3]/
└── dashboard/                # Main dashboard
    └── page.tsx
```

---

## 2.3 Page Types

| **Type** | **Purpose** | **Typical Components** |
|----------|-------------|------------------------|
| **Overview** | High-level summary | 6 KPI cards + 6 charts |
| **Report** | Detailed data tables | 3-4 KPI cards + table + export |
| **Analytics** | Deep-dive analysis | 2 KPI cards + multiple charts |
| **Monitor** | Real-time tracking | 6 KPI cards + status tables |
| **Comparison** | Side-by-side analysis | Comparison cards + charts |

---

## 📋 Examples

### Overview Page Structure
```
├── KPI Row (6 cards)
├── Chart Row 1 (3 charts)
└── Chart Row 2 (3 charts)
```

### Report Page Structure
```
├── KPI Row (3-4 cards)
├── Filter/Slicer Bar
├── Data Table
└── Export Button
```

### Analytics Page Structure
```
├── KPI Row (2 cards)
├── Chart Row 1 (2 charts)
├── Chart Row 2 (2 charts)
└── Chart Row 3 (2 charts)
```

---

## 📌 Key Takeaways

1. **Category-based** routing for multi-tenant/multi-currency apps
2. **Feature-based** subpages under each category
3. **Consistent page types** (Overview, Report, Analytics, Monitor)
4. **Standard layouts** for each page type

---

**Previous:** [← 01 - Project Structure](./01-PROJECT-STRUCTURE.md)  
**Next:** [03 - Component Architecture](./03-COMPONENT-ARCHITECTURE.md) →

