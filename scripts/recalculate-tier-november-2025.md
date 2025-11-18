# RECALCULATE TIER NOVEMBER 2025

## Masalah
Setelah update logic `active_days`, function `refresh_tier_usc_v1_data()` menghapus semua tier yang sudah di-calculate.

## Solusi

### 1. Update Function (SUDAH DIPERBAIKI)
Function `refresh_tier_usc_v1_data()` sudah diperbaiki untuk preserve tier yang sudah ada menggunakan UPSERT.

### 2. Re-calculate Tier November 2025

**Via API:**
```bash
POST /api/usc-business-performance/calculate-tiers?year=2025&month=November
```

**Atau via curl:**
```bash
curl -X POST "http://localhost:3000/api/usc-business-performance/calculate-tiers?year=2025&month=November"
```

**Atau via browser/Postman:**
- Method: POST
- URL: `http://localhost:3000/api/usc-business-performance/calculate-tiers?year=2025&month=November`

## Catatan
- Function sudah diperbaiki untuk preserve tier yang sudah ada
- Setelah ini, setiap refresh tidak akan menghapus tier lagi
- Tier hanya akan di-calculate ulang jika memang belum ada (NULL)

