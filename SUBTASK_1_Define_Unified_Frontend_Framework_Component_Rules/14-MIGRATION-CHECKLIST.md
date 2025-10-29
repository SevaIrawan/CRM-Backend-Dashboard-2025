# 14. MIGRATION CHECKLIST

[← Back to Index](./00-INDEX.md)

---

## 14.1 New Dashboard Project Setup

### Step 1: Initialize Project

```bash
npx create-next-app@latest project-name --typescript --tailwind --app
cd project-name
```

### Step 2: Install Dependencies

```bash
npm install chart.js react-chartjs-2 recharts
npm install @supabase/supabase-js
npm install date-fns
```

### Step 3: Copy Standard Files

Copy from reference project:

```
- app/globals.css
- lib/CentralIcon.tsx
- lib/formatHelpers.ts
- lib/kpiHelpers.ts
- components/Layout.tsx
- components/Frame.tsx
- components/Header.tsx
- components/Sidebar.tsx
- components/StatCard.tsx
- components/LineChart.tsx
- components/BarChart.tsx
```

### Step 4: Setup Database Connection

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Step 5: Create First Page

- Follow page structure standard
- Use standard components
- Implement API routes
- Test data flow

---

## 14.2 Component Adoption Checklist

### For Each New Page

- [ ] Use Layout component
- [ ] Use Frame component
- [ ] Implement SubHeader with slicers
- [ ] Use StatCard for KPIs
- [ ] Use standard Chart components
- [ ] Follow naming conventions
- [ ] Implement API routes
- [ ] Use format helpers
- [ ] Add loading states
- [ ] Test responsive behavior

---

## 📋 Migration Steps

### Phase 1: Setup (Week 1)

1. **Initialize project** with Next.js 14
2. **Install dependencies** (Chart.js, Supabase, etc.)
3. **Copy standard files** from reference
4. **Setup environment variables**
5. **Configure database connection**

### Phase 2: Core Components (Week 2)

1. **Implement Layout system** (Layout, Frame, Header, Sidebar)
2. **Setup global styles** (globals.css)
3. **Integrate CentralIcon** system
4. **Add format helpers**
5. **Test basic routing**

### Phase 3: Feature Implementation (Week 3-4)

1. **Create first page** following standards
2. **Implement API routes** for data
3. **Add KPI cards** with StatCard
4. **Add charts** with LineChart/BarChart
5. **Implement slicers** for filtering
6. **Test data flow** end-to-end

### Phase 4: Polish & Testing (Week 5)

1. **Add loading states**
2. **Implement error handling**
3. **Test responsive design**
4. **Optimize performance**
5. **Code review & feedback**

---

## 📌 Pre-Migration Checklist

Before starting migration:

- [ ] Review all 16 sections of this documentation
- [ ] Identify project-specific requirements
- [ ] Prepare data source (database/API)
- [ ] Confirm tech stack compatibility (Next.js 14+)
- [ ] Get access to reference project (if needed)
- [ ] Setup development environment
- [ ] Prepare test data
- [ ] Schedule review sessions with team

---

## 📌 Post-Migration Checklist

After completing migration:

- [ ] All pages follow standard structure
- [ ] Components use CentralIcon system
- [ ] All KPIs formatted with format helpers
- [ ] API routes follow naming convention
- [ ] Responsive design tested
- [ ] Performance optimized
- [ ] Code reviewed by senior developer
- [ ] Documentation updated
- [ ] Team trained on new standards

---

**Previous:** [← 13 - Best Practices](./13-BEST-PRACTICES.md)  
**Next:** [15 - Glossary](./15-GLOSSARY.md) →

