# NexMax Dashboard - Next.js Setup

## Overview
This is the Next.js version of the NexMax Dashboard with Supabase integration using your existing database tables.

## Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account and project

## Environment Variables
The `.env.local` file has been created with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://bbuxfnchflhtulainndm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzg0NjMyNiwiZXhwIjoyMDY5NDIyMzI2fQ.A773GJpWIj7bowBvDckFtl_agYY4Oi_IZSwwsqNP2bQ
```

## Database Tables Used
The dashboard uses your existing Supabase tables:

### Authentication
- `public.users` - User authentication (admin, manager, user, executive)

### Dashboard Data Sources
- `member_report_monthly` - Member statistics and growth data
- `deposit_monthly` - Monthly deposit revenue data
- `withdraw_monthly` - Monthly withdrawal data
- `exchange_rate` - Currency exchange rates
- `new_depositor_daily` - Daily new depositor data
- `withdraw_daily` - Daily withdrawal data

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Access the Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### Authentication
- Username/password login using existing `users` table
- Session management with localStorage
- User registration
- Logout functionality

### Dashboard Components
- **Stat Cards**: Display KPI metrics from existing tables
- **Interactive Charts**: Line charts using Chart.js with real data
- **Activity Feed**: System activity monitoring
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Mobile-friendly interface

### Data Sources
All dashboard data comes from your existing Supabase tables:
- `member_report_monthly` → Member statistics
- `deposit_monthly` → Revenue data
- `withdraw_monthly` → Withdrawal data
- `users` → Authentication

## File Structure

```
├── app/
│   ├── dashboard/page.tsx      # Main dashboard
│   ├── login/page.tsx          # Login/register page
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home redirect
├── components/
│   ├── StatCard.tsx            # KPI cards
│   ├── ChartComponent.tsx      # Chart visualization
│   ├── ActivityFeed.tsx        # Activity feed
│   ├── Header.tsx              # Top navigation
│   └── Sidebar.tsx             # Side navigation
├── lib/
│   └── supabase.ts             # Supabase client & types
└── .env.local                  # Environment variables
```

## Login Credentials
Using your existing users table:
- **Username**: admin, manager, user, executive
- **Password**: (hashed passwords in database)

## Dashboard Metrics

### Stat Cards
- **Total Members**: From `member_report_monthly.total_members`
- **Active Members**: Estimated from total members
- **Net Revenue**: `deposit_monthly.total_amount - withdraw_monthly.total_amount`
- **Monthly Growth**: Calculated growth rate

### Charts
- **Total Members Trend**: Monthly member growth from `member_report_monthly`
- **Monthly Revenue**: Revenue data from `deposit_monthly`

## Deployment

### Vercel Deployment
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production
Make sure to add these in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Troubleshooting

### Database Connection Issues
1. Verify Supabase URL and keys in `.env.local`
2. Check RLS policies in Supabase
3. Ensure tables exist and have data

### Chart.js Issues
1. Clear browser cache
2. Check console for Chart.js errors
3. Verify data format from Supabase

### Authentication Issues
1. Check `users` table exists
2. Verify user credentials
3. Check localStorage for session data

## Next Steps
1. Add more dashboard pages (Analytics, Users, Reports)
2. Implement real-time updates with Supabase subscriptions
3. Add data export functionality
4. Implement user management features
5. Add more chart types and visualizations
6. Integrate with other existing tables (exchange_rate, new_depositor_daily, etc.) 