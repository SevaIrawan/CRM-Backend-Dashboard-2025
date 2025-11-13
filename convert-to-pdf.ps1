# ============================================
# NEXMAX DASHBOARD - MARKDOWN TO PDF CONVERTER
# ============================================
# Purpose: Convert Markdown documentation to professional PDF
# Requirements: Pandoc + wkhtmltopdf
# Author: NEXMAX Development Team
# Date: November 7, 2025
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NEXMAX Dashboard - PDF Converter" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Pandoc is installed
Write-Host "Checking Pandoc installation..." -ForegroundColor Yellow
$pandocInstalled = Get-Command pandoc -ErrorAction SilentlyContinue

if (-not $pandocInstalled) {
    Write-Host "ERROR: Pandoc is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Pandoc first:" -ForegroundColor Yellow
    Write-Host "  Option 1: choco install pandoc" -ForegroundColor White
    Write-Host "  Option 2: Download from https://pandoc.org/installing.html" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✓ Pandoc found: $($pandocInstalled.Version)" -ForegroundColor Green

# Check if wkhtmltopdf is installed
Write-Host "Checking wkhtmltopdf installation..." -ForegroundColor Yellow
$wkhtmltopdfInstalled = Get-Command wkhtmltopdf -ErrorAction SilentlyContinue

if (-not $wkhtmltopdfInstalled) {
    Write-Host "WARNING: wkhtmltopdf is not installed!" -ForegroundColor Yellow
    Write-Host "PDF conversion will use default engine (may have limited formatting)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For better results, install wkhtmltopdf:" -ForegroundColor Yellow
    Write-Host "  Download from: https://wkhtmltopdf.org/downloads.html" -ForegroundColor White
    Write-Host ""
    $pdfEngine = ""
} else {
    Write-Host "✓ wkhtmltopdf found" -ForegroundColor Green
    $pdfEngine = "--pdf-engine=wkhtmltopdf"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Select Document to Convert:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. NEXMAX_STANDARDS_COMPLETE_REFERENCE.md" -ForegroundColor White
Write-Host "2. CRM_DASHBOARD_HANDBOOK.md" -ForegroundColor White
Write-Host "3. COMPREHENSIVE_PROJECT_SCAN_REPORT.md" -ForegroundColor White
Write-Host "4. ALL Documentation Files (Batch Convert)" -ForegroundColor White
Write-Host "0. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-4, 0 to exit)"

function Convert-MarkdownToPDF {
    param (
        [string]$InputFile,
        [string]$OutputFile,
        [string]$Title,
        [string]$PdfEngine
    )
    
    Write-Host ""
    Write-Host "Converting: $InputFile" -ForegroundColor Yellow
    Write-Host "Output: $OutputFile" -ForegroundColor Yellow
    
    if (-not (Test-Path $InputFile)) {
        Write-Host "ERROR: File not found: $InputFile" -ForegroundColor Red
        return $false
    }
    
    # Build Pandoc command
    $pandocArgs = @(
        $InputFile,
        "-o", $OutputFile,
        "--toc",
        "--toc-depth=3",
        "--number-sections",
        "-V", "geometry:margin=1in",
        "-V", "fontsize=11pt",
        "-V", "papersize=a4",
        "-V", "documentclass=report",
        "-V", "colorlinks=true",
        "-V", "linkcolor=blue",
        "-V", "urlcolor=blue",
        "--highlight-style=tango",
        "--metadata", "title=$Title",
        "--metadata", "author=NEXMAX Development Team - CBO Department",
        "--metadata", "date=November 7, 2025"
    )
    
    # Add PDF engine if available
    if ($PdfEngine) {
        $pandocArgs += $PdfEngine
    }
    
    try {
        # Execute Pandoc
        & pandoc $pandocArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ SUCCESS: PDF created successfully!" -ForegroundColor Green
            Write-Host "  Location: $(Get-Item $OutputFile | Select-Object -ExpandProperty FullName)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "ERROR: Pandoc conversion failed with exit code $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Process user choice
switch ($choice) {
    "1" {
        $result = Convert-MarkdownToPDF `
            -InputFile "NEXMAX_STANDARDS_COMPLETE_REFERENCE.md" `
            -OutputFile "NEXMAX_STANDARDS_COMPLETE_REFERENCE.pdf" `
            -Title "NEXMAX Dashboard - Complete Standards Reference v2.0" `
            -PdfEngine $pdfEngine
    }
    "2" {
        $result = Convert-MarkdownToPDF `
            -InputFile "CRM_DASHBOARD_HANDBOOK.md" `
            -OutputFile "CRM_DASHBOARD_HANDBOOK.pdf" `
            -Title "CRM Dashboard Handbook" `
            -PdfEngine $pdfEngine
    }
    "3" {
        $result = Convert-MarkdownToPDF `
            -InputFile "COMPREHENSIVE_PROJECT_SCAN_REPORT.md" `
            -OutputFile "COMPREHENSIVE_PROJECT_SCAN_REPORT.pdf" `
            -Title "NEXMAX Dashboard - Comprehensive Project Scan Report" `
            -PdfEngine $pdfEngine
    }
    "4" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Batch Converting ALL Documentation..." -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        
        $documents = @(
            @{
                Input = "NEXMAX_STANDARDS_COMPLETE_REFERENCE.md"
                Output = "NEXMAX_STANDARDS_COMPLETE_REFERENCE.pdf"
                Title = "NEXMAX Dashboard - Complete Standards Reference v2.0"
            },
            @{
                Input = "CRM_DASHBOARD_HANDBOOK.md"
                Output = "CRM_DASHBOARD_HANDBOOK.pdf"
                Title = "CRM Dashboard Handbook"
            },
            @{
                Input = "COMPREHENSIVE_PROJECT_SCAN_REPORT.md"
                Output = "COMPREHENSIVE_PROJECT_SCAN_REPORT.pdf"
                Title = "NEXMAX Dashboard - Comprehensive Project Scan Report"
            },
            @{
                Input = "COMPONENTS_LIBRARY.md"
                Output = "COMPONENTS_LIBRARY.pdf"
                Title = "NEXMAX Dashboard - Components Library"
            },
            @{
                Input = "CBO_VISUALIZATION_STANDARDS.md"
                Output = "CBO_VISUALIZATION_STANDARDS.pdf"
                Title = "CBO Department - Visualization Standards"
            },
            @{
                Input = "CBO_FRONTEND_FRAMEWORK_STANDARD.md"
                Output = "CBO_FRONTEND_FRAMEWORK_STANDARD.pdf"
                Title = "CBO Department - Frontend Framework Standard"
            }
        )
        
        $successCount = 0
        $totalCount = $documents.Count
        
        foreach ($doc in $documents) {
            $result = Convert-MarkdownToPDF `
                -InputFile $doc.Input `
                -OutputFile $doc.Output `
                -Title $doc.Title `
                -PdfEngine $pdfEngine
            
            if ($result) {
                $successCount++
            }
            
            Start-Sleep -Milliseconds 500
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Batch Conversion Complete!" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Success: $successCount / $totalCount files" -ForegroundColor Green
    }
    "0" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Conversion Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

