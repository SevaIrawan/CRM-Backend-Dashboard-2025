# ============================================================================
# NEXMAX - Daily USC Tier Update (Automated)
# ============================================================================
# Schedule: 2 AM daily via Windows Task Scheduler
# Purpose: Auto-update tier_usc_v1 when blue_whale_usc has new data
# Time: ~10-15 minutes
# ============================================================================

$ErrorActionPreference = "Stop"
$LogFile = "C:\Users\BDC Computer\NexMax-Dashboard\logs\tier-update.log"

# Create logs directory if not exists
$LogDir = Split-Path -Parent $LogFile
if (!(Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Start logging
$StartTime = Get-Date
Add-Content -Path $LogFile -Value "`n=========================================="
Add-Content -Path $LogFile -Value "USC Tier Daily Update"
Add-Content -Path $LogFile -Value "Started: $StartTime"
Add-Content -Path $LogFile -Value "=========================================="

try {
    # ========================================================================
    # STEP 1: Refresh tier_usc_v1 (Aggregate from blue_whale_usc)
    # ========================================================================
    
    Add-Content -Path $LogFile -Value "`nSTEP 1: Refreshing tier_usc_v1..."
    
    # Get current year and month
    $CurrentYear = (Get-Date).Year
    $MonthNames = @('January','February','March','April','May','June',
                    'July','August','September','October','November','December')
    $CurrentMonth = $MonthNames[(Get-Date).Month - 1]
    
    # Call Supabase SQL function via API
    $RefreshUrl = "https://bbuxfnchflhtulainndm.supabase.co/rest/v1/rpc/refresh_tier_usc_v1_data"
    $Headers = @{
        "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc"
        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc"
        "Content-Type" = "application/json"
    }
    $Body = @{
        "p_year" = $CurrentYear
        "p_month" = $CurrentMonth
    } | ConvertTo-Json
    
    $RefreshResult = Invoke-RestMethod -Uri $RefreshUrl -Method POST -Headers $Headers -Body $Body
    Add-Content -Path $LogFile -Value "✅ Refresh completed: $RefreshResult rows"
    
    # ========================================================================
    # STEP 2: Calculate Tiers via API (K-Means)
    # ========================================================================
    
    Add-Content -Path $LogFile -Value "`nSTEP 2: Calculating tiers (incremental)..."
    
    # Start Next.js server if not running (skip if already running)
    $ProcessCheck = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*NexMax-Dashboard*"}
    
    if (!$ProcessCheck) {
        Add-Content -Path $LogFile -Value "Starting Next.js server..."
        Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory "C:\Users\BDC Computer\NexMax-Dashboard" -WindowStyle Hidden
        Start-Sleep -Seconds 10
    }
    
    # Call calculate tiers API
    $TodayDate = Get-Date -Format "yyyy-MM-dd"
    $CalcUrl = "http://localhost:3000/api/admin/tier-management/calculate-tiers?currency=USC&mode=incremental&date=$TodayDate"
    
    $CalcResult = Invoke-RestMethod -Uri $CalcUrl -Method POST -TimeoutSec 1800
    
    if ($CalcResult.success) {
        Add-Content -Path $LogFile -Value "✅ Tier calculation completed"
        Add-Content -Path $LogFile -Value "   Total processed: $($CalcResult.data.totalProcessed)"
        Add-Content -Path $LogFile -Value "   Total updated: $($CalcResult.data.totalUpdated)"
    } else {
        throw "Tier calculation failed: $($CalcResult.error)"
    }
    
    # ========================================================================
    # STEP 3: Sync to Master Table (blue_whale_usc)
    # ========================================================================
    
    Add-Content -Path $LogFile -Value "`nSTEP 3: Syncing to blue_whale_usc..."
    
    $SyncUrl = "https://bbuxfnchflhtulainndm.supabase.co/rest/v1/rpc/sync_tier_to_blue_whale_usc"
    $SyncBody = @{
        "p_year" = $CurrentYear
        "p_month" = $CurrentMonth
    } | ConvertTo-Json
    
    $SyncResult = Invoke-RestMethod -Uri $SyncUrl -Method POST -Headers $Headers -Body $SyncBody
    Add-Content -Path $LogFile -Value "✅ Sync completed: $SyncResult rows"
    
    # ========================================================================
    # SUCCESS
    # ========================================================================
    
    $EndTime = Get-Date
    $Duration = ($EndTime - $StartTime).TotalMinutes
    
    Add-Content -Path $LogFile -Value "`n=========================================="
    Add-Content -Path $LogFile -Value "✅ SUCCESS!"
    Add-Content -Path $LogFile -Value "Completed: $EndTime"
    Add-Content -Path $LogFile -Value "Duration: $([Math]::Round($Duration, 2)) minutes"
    Add-Content -Path $LogFile -Value "=========================================="
    
} catch {
    # ========================================================================
    # ERROR HANDLING
    # ========================================================================
    
    $ErrorTime = Get-Date
    Add-Content -Path $LogFile -Value "`n=========================================="
    Add-Content -Path $LogFile -Value "❌ ERROR!"
    Add-Content -Path $LogFile -Value "Time: $ErrorTime"
    Add-Content -Path $LogFile -Value "Error: $_"
    Add-Content -Path $LogFile -Value "=========================================="
    
    # Send alert email (optional)
    # Send-MailMessage -To "admin@nexmax.com" -Subject "Tier Update Failed" -Body $_
    
    exit 1
}

