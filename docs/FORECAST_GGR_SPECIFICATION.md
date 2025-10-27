# 📊 FORECAST GGR - COMPLETE SPECIFICATION

**Last Updated:** October 27, 2025  
**Status:** ✅ Production Ready  
**Location:** Business Performance MYR Page

---

## 🎯 OVERVIEW

Forecast GGR adalah fitur prediksi **Gross Gaming Revenue** untuk membantu business planning dan target monitoring. Formula ini menggunakan **Run-Rate Extrapolation Method** yang reliable dan industry-standard.

---

## 📐 FORMULA

### **Core Formula:**
```javascript
Forecast GGR = Current Realized GGR + (Avg Daily GGR × Remaining Days)
```

### **Breakdown:**
```javascript
WHERE:
  Current Realized GGR = SUM(daily_ggr) dari awal periode sampai hari ini
  Avg Daily GGR = Current Realized GGR / Days Elapsed
  Remaining Days = Total Days in Period - Days Elapsed
```

---

## 📊 IMPLEMENTATION

### **File Location:**
- **API Logic:** `app/api/myr-business-performance/chart-helpers.ts`
- **Chart Display:** `app/myr/business-performance/page.tsx`
- **Function:** `generateForecastQ4GGRChart()`

### **Code Implementation:**

```typescript
// Line 110-334 in chart-helpers.ts

// FORMULA: Forecast GGR = Current Realized GGR + (Avg Daily GGR × Remaining Days)
export async function generateForecastQ4GGRChart(params: ChartParams) {
  
  // 1. Calculate days elapsed (from start of quarter to max data date)
  const qStart = new Date(quarterStartDate)
  const maxDate = new Date(maxDataDate)
  const daysElapsed = Math.ceil((maxDate.getTime() - qStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  // 2. Calculate remaining days (from max data date to end of quarter)
  const qEnd = new Date(quarterEndDate)
  const remainingDays = Math.max(0, Math.ceil((qEnd.getTime() - maxDate.getTime()) / (1000 * 60 * 60 * 24)))
  
  // 3. Calculate Average Daily GGR
  const avgDailyGGR = actualGGR / daysElapsed
  
  // 4. FORECAST FORMULA
  const forecastGGR = actualGGR + (avgDailyGGR * remainingDays)
  
  return forecastGGR
}
```

---

## 📈 CHART VISUALIZATION

### **Chart Title:** 
`FORECAST - GROSS GAMING REVENUE`

### **Chart Type:** 
Line Chart with 3 series

### **Series:**
1. **Actual GGR** (Blue #3B82F6)
   - Real performance data
   - Shows cumulative GGR for each period
   
2. **Target GGR** (Green #10b981)
   - Business target/goal
   - Usually the highest line (aspirational)
   
3. **Forecast GGR** (Orange #F97316)
   - Predicted performance
   - Based on current pace

### **Display Modes:**

#### **1. Quarterly Mode:**
- **Categories:** Q1, Q2, Q3, Q4
- **Behavior:**
  - **Past Quarters:** Forecast = Actual (no projection needed)
  - **Current Quarter:** Forecast = Actual + Projected Remaining
  - **Future Quarters:** Forecast = Actual (0 if no data)

#### **2. Daily Mode:**
- **Categories:** Individual dates in selected range
- **Behavior:**
  - **Past Dates:** Forecast = Cumulative Actual
  - **Future Dates:** Forecast = Cumulative Actual + (Avg Daily × Days)

---

## 💡 EXAMPLE CALCULATION

### **Scenario: Q4 2024 (October 27)**

**Input Data:**
```
Current Date: October 27, 2024
Quarter Start: October 1, 2024
Quarter End: December 31, 2024

Current Realized GGR: RM 845,550
Days Elapsed: 27 days (Oct 1-27)
Remaining Days: 65 days (Oct 28 - Dec 31)
```

**Calculation:**
```javascript
// Step 1: Calculate Avg Daily GGR
avgDailyGGR = 845,550 / 27 = RM 31,316.67 per day

// Step 2: Calculate Projected Remaining GGR
projectedRemaining = 31,316.67 × 65 = RM 2,035,583

// Step 3: Calculate Total Forecast
forecastGGR = 845,550 + 2,035,583 = RM 2,881,133

// Rounded: RM 2.88M
```

**Chart Display:**
```
Q4 Data Point:
- Actual GGR: RM 845.55K (current realized)
- Target GGR: RM 3.00M (business goal)
- Forecast GGR: RM 2.88M (predicted final)
```

---

## ✅ ADVANTAGES

1. **Simple & Intuitive**
   - Easy to understand for business users
   - Clear calculation logic

2. **Real-Time Responsive**
   - Updates daily with actual performance
   - No manual intervention needed

3. **Accurate for Stable Trends**
   - Reliable when performance is consistent
   - Works well for quarterly projections

4. **Industry Standard**
   - Widely used in gaming & e-commerce
   - Proven method for run-rate forecasting

---

## ⚠️ LIMITATIONS

### **1. Linear Assumption**
**Issue:** Assumes consistent daily performance
**Impact:** May underestimate if trend is accelerating, or overestimate if decelerating

**Mitigation Options:**
- Add trend factor (growth rate adjustment)
- Use weighted average (recent days have more weight)

### **2. No Seasonality**
**Issue:** Doesn't account for weekend vs weekday differences
**Impact:** Can be inaccurate if remaining days have different composition

**Enhanced Formula:**
```javascript
Forecast GGR = Current Realized GGR + 
               (Avg Weekday GGR × Remaining Weekdays) + 
               (Avg Weekend GGR × Remaining Weekends)
```

### **3. No Event Adjustment**
**Issue:** Doesn't factor in special events, campaigns, holidays
**Impact:** May miss spikes or drops from planned activities

**Solution:**
- Add manual adjustment for known events
- Include campaign impact multiplier

---

## 🎯 VALIDATION

### **Accuracy Check:**
To validate forecast accuracy, compare:
```sql
-- At end of quarter, compare:
SELECT 
  actual_ggr_final,
  forecasted_ggr_mid_quarter,
  (actual_ggr_final - forecasted_ggr_final) / actual_ggr_final * 100 as error_percentage
FROM forecast_validation
```

**Acceptable Error Range:** ±10%
- < 5% = Excellent
- 5-10% = Good
- > 10% = Needs improvement

---

## 🔄 REFRESH FREQUENCY

### **Data Update:**
- **Daily:** Materialized View `bp_daily_summary_myr` refreshes nightly
- **Forecast Recalculation:** Every page load (real-time calculation)
- **No Caching:** Always uses latest data

### **Performance:**
- **Query Time:** ~150-250ms (using MV optimization)
- **Chart Render:** ~100ms
- **Total Load:** < 500ms

---

## 🚀 FUTURE ENHANCEMENTS

### **Phase 1: Seasonality Adjustment**
```javascript
Forecast GGR = Current Realized GGR + 
               (Avg Weekday GGR × Remaining Weekdays × Weekday_Factor) + 
               (Avg Weekend GGR × Remaining Weekends × Weekend_Factor)
```

### **Phase 2: Trend-Based Forecast**
```javascript
// Add growth trend
growthRate = (Week2_Avg - Week1_Avg) / Week1_Avg
trendFactor = 1 + (growthRate × remaining_weeks)
Forecast GGR = (Current + Projected_Linear) × trendFactor
```

### **Phase 3: Confidence Intervals**
```javascript
// Provide range instead of single point
Forecast_Best_Case = forecastGGR × 1.15  // +15%
Forecast_Most_Likely = forecastGGR
Forecast_Worst_Case = forecastGGR × 0.85  // -15%
```

### **Phase 4: Machine Learning**
- Use Prophet (Facebook) for seasonality
- ARIMA for time series prediction
- XGBoost for multi-factor forecast

---

## 📚 RELATED DOCUMENTATION

- **[BUSINESS_PERFORMANCE_STANDARD.md](./BUSINESS_PERFORMANCE_STANDARD.md)** - BP page standards
- **[BP_MV_LOGIC_SUMMARY.md](./BP_MV_LOGIC_SUMMARY.md)** - Materialized Views logic
- **[BP_API_LOGIC_REQUIREMENTS.md](./BP_API_LOGIC_REQUIREMENTS.md)** - API requirements

---

## 📝 CHANGELOG

### **v1.0 - Initial Implementation** (January 2025)
- Basic forecast formula implemented
- Quarterly and Daily mode support
- Triple line chart visualization

### **v1.1 - Dynamic Quarter Calculation** (January 2025)
- Fixed hardcoded 90 days assumption
- Dynamic calculation for each quarter (90, 91, or 92 days)
- Improved accuracy for leap years

### **v1.2 - Daily Mode Enhancement** (January 2025)
- Added cumulative forecast for daily mode
- Projection based on remaining days
- Smooth line continuation for future dates

---

**Status:** ✅ Production Ready | Tested | Validated | Documented

