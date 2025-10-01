# USC Daily Average dan MoM Comparison - Contoh Penggunaan

## 1. Import di USC Pages

```typescript
// Di app/usc/overview/page.tsx atau app/usc/member-analytic/page.tsx
import { 
  getAllUSCKPIsWithMoM, 
  formatUSCMoMValue, 
  getUSCComparisonColor,
  formatUSCDailyAverageValue 
} from '@/lib/USCDailyAverageAndMoM'
```

## 2. Penggunaan di useEffect untuk Load Data

```typescript
// Load KPI data dengan Daily Average dan MoM
useEffect(() => {
  if (!selectedYear || !selectedMonth || !selectedLine) return;

  const loadKPIData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      console.log('🔄 [USC Overview] Loading KPI data with Daily Average and MoM...');

      // Get ALL USC KPIs with MoM and Daily Average
      const result = await getAllUSCKPIsWithMoM(selectedYear, selectedMonth, selectedLine);
      
      // Set KPI data
      setKpiData(result.current);
      setMomData(result.mom);
      setDailyAverages(result.dailyAverage);
      
      console.log('✅ [USC Overview] KPI data loaded with MoM and Daily Average');

    } catch (error) {
      console.error('Error loading KPI data:', error);
      setLoadError('Failed to load KPI data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  loadKPIData();
}, [selectedYear, selectedMonth, selectedLine]);
```

## 3. Penggunaan di StatCard Component

```typescript
// Contoh StatCard untuk Deposit Amount
<StatCard
  title="Deposit Amount"
  value={formatCurrencyKPI(kpiData?.depositAmount || 0)}
  dailyAverage={formatUSCDailyAverageValue(
    dailyAverages?.depositAmount || 0, 
    'currency'
  )}
  momChange={formatUSCMoMValue(momData?.depositAmount || 0)}
  momColor={getUSCComparisonColor(momData?.depositAmount || 0)}
  icon={getChartIcon('Deposit Amount')}
/>

// Contoh StatCard untuk Active Member
<StatCard
  title="Active Member"
  value={formatIntegerKPI(kpiData?.activeMember || 0)}
  dailyAverage={formatUSCDailyAverageValue(
    dailyAverages?.activeMember || 0, 
    'count'
  )}
  momChange={formatUSCMoMValue(momData?.activeMember || 0)}
  momColor={getUSCComparisonColor(momData?.activeMember || 0)}
  icon={getChartIcon('Active Member')}
/>

// Contoh StatCard untuk Churn Rate
<StatCard
  title="Churn Rate"
  value={formatPercentageKPI(kpiData?.churnRate || 0)}
  dailyAverage={formatUSCDailyAverageValue(
    dailyAverages?.churnRate || 0, 
    'percentage'
  )}
  momChange={formatUSCMoMValue(momData?.churnRate || 0)}
  momColor={getUSCComparisonColor(momData?.churnRate || 0)}
  icon={getChartIcon('Churn Rate')}
/>
```

## 4. State Management

```typescript
// State untuk USC-specific data
const [kpiData, setKpiData] = useState<USCKPIData | null>(null);
const [momData, setMomData] = useState<USCMoMData | null>(null);
const [dailyAverages, setDailyAverages] = useState<USCKPIData | null>(null);
```

## 5. Data Flow

```
1. User selects Year/Month/Line in slicers
2. getAllUSCKPIsWithMoM() called with parameters
3. Function fetches current month data from blue_whale_usc_summary
4. Function fetches previous month data for MoM comparison
5. Function calculates daily averages using USC-specific logic
6. Returns: { current, mom, dailyAverage }
7. Components display data with proper formatting
```

## 6. Key Features

### Daily Average Logic:
- Menggunakan `blue_whale_usc` table untuk mendapatkan last update date
- Current month: menggunakan database last update date
- Past months: menggunakan total calendar days
- Otomatis handle leap years dan bulan dengan jumlah hari berbeda

### MoM Comparison Logic:
- Menggunakan formula yang sama dengan KPILogic.tsx: `((current - previous) / previous) * 100`
- Handle division by zero dengan fallback ke 100% atau 0%
- Format output dengan `+` untuk positive, `-` untuk negative

### USC-Specific:
- Currency locked ke USD untuk formatting
- Menggunakan `blue_whale_usc` dan `blue_whale_usc_summary` tables
- Mengikuti pattern yang sudah ada di project

## 7. Error Handling

```typescript
try {
  const result = await getAllUSCKPIsWithMoM(selectedYear, selectedMonth, selectedLine);
  // Success handling
} catch (error) {
  console.error('❌ [USC] Error loading data:', error);
  // Error handling - set empty data
  setKpiData(getEmptyUSCKPIData());
  setMomData(getEmptyUSCKPIData());
  setDailyAverages(getEmptyUSCKPIData());
}
```

## 8. Performance Optimization

- Parallel fetching untuk current dan previous month data
- Caching di component level dengan useEffect dependencies
- Error boundaries untuk graceful degradation
- Loading states untuk better UX
