# 1. PROJECT STRUCTURE

[← Back to Index](./00-INDEX.md)

---

## 1.1 Standard Next.js App Router Structure

```
project-root/
├── app/                      # Next.js App Router (pages & API routes)
│   ├── api/                  # API routes
│   ├── [category]/           # Category-based pages (multi-level)
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
├── components/               # Reusable UI components
│   ├── Layout.tsx
│   ├── Frame.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── SubHeader.tsx
│   ├── StatCard.tsx
│   ├── LineChart.tsx
│   ├── BarChart.tsx
│   └── slicers/              # Slicer components
├── lib/                      # Business logic & helpers
│   ├── CentralIcon.tsx
│   ├── formatHelpers.ts
│   ├── kpiHelpers.ts
│   └── [category]Logic.ts
├── utils/                    # Generic utilities
│   ├── centralLogic.ts
│   ├── rolePermissions.ts
│   └── sessionCleanup.ts
├── styles/                   # Additional stylesheets
├── public/                   # Static assets
├── docs/                     # Documentation
└── package.json
```

---

## 1.2 Key Principles

### ✅ Separation of Concerns

| Directory | Purpose | What Goes Here |
|-----------|---------|----------------|
| `app/` | Pages & routing | Page components, layouts, route handlers |
| `components/` | UI components only | Reusable React components (pure UI) |
| `lib/` | Business logic & calculations | KPI calculations, data processing, domain logic |
| `utils/` | Generic helper functions | Framework-agnostic utilities, helpers |

### ✅ Colocation

- **API routes** colocated with pages (`app/api/`)
- **Component-specific styles** inline or in component file
- **Page-specific layouts** in page folder

### ✅ Clear Boundaries

**DO:**
```typescript
// ✅ lib/kpiHelpers.ts - Business logic
export function calculateChurnRate(active: number, churn: number): number {
  return (churn / active) * 100
}

// ✅ components/StatCard.tsx - Pure UI component
export function StatCard({ title, value }: Props) {
  return <div>{title}: {value}</div>
}
```

**DON'T:**
```typescript
// ❌ components/StatCard.tsx - Don't mix business logic with UI
export function StatCard({ data }: Props) {
  const churnRate = (data.churn / data.active) * 100  // Business logic in UI!
  return <div>Churn Rate: {churnRate}</div>
}
```

---

## 📌 Key Takeaways

1. **Strict separation** between UI (`components/`) and logic (`lib/`)
2. **App directory** for routing and pages only
3. **Utils** for generic, reusable, framework-agnostic functions
4. **Colocate** related files (API with features)

---

**Next:** [02 - Page Hierarchy](./02-PAGE-HIERARCHY.md) →

