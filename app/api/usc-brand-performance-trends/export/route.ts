import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const periodAStart = searchParams.get('periodAStart')
    const periodAEnd = searchParams.get('periodAEnd')
    const periodBStart = searchParams.get('periodBStart')
    const periodBEnd = searchParams.get('periodBEnd')

    if (!periodAStart || !periodAEnd || !periodBStart || !periodBEnd) {
      return new Response('Missing required parameters', { status: 400 })
    }

    const params = new URLSearchParams({
      periodAStart,
      periodAEnd,
      periodBStart,
      periodBEnd,
    })

    // ✅ NEW: Pass user's allowed brands to data API
    const userAllowedBrandsHeader = request.headers.get('x-user-allowed-brands')
    
    const dataRes = await fetch(`${origin}/api/usc-brand-performance-trends/data?${params.toString()}`, { 
      cache: 'no-store',
      headers: {
        'x-user-allowed-brands': userAllowedBrandsHeader || 'null'
      }
    })
    const dataJson = await dataRes.json()
    if (!dataJson?.success) {
      return new Response('Failed to build export data', { status: 500 })
    }

    const rows: any[] = dataJson.data?.rows || []

    const header = [
      'Brand/Line',
      'A Count','A ATV','A PF','A DC','A DA','A GGR','A Winrate','A GGR User','A DA User',
      'B Count','B ATV','B PF','B DC','B DA','B GGR','B Winrate','B GGR User','B DA User',
      'Diff Count','Diff ATV','Diff PF','Diff DC','Diff DA','Diff GGR','Diff Winrate','Diff GGR User','Diff DA User',
      '% Count','% ATV','% PF','% DC','% DA','% GGR','% Winrate','% GGR User','% DA User'
    ]

    const csvLines = [header.join(',')]

    for (const r of rows) {
      const line = [
        r.brand,
        r.periodA?.activeMember ?? 0,
        r.periodA?.avgTransactionValue ?? 0,
        r.periodA?.purchaseFrequency ?? 0,
        r.periodA?.depositCases ?? 0,
        r.periodA?.depositAmount ?? 0,
        r.periodA?.ggr ?? 0,
        r.periodA?.winrate ?? 0,
        r.periodA?.ggrPerUser ?? 0,
        r.periodA?.depositAmountPerUser ?? 0,

        r.periodB?.activeMember ?? 0,
        r.periodB?.avgTransactionValue ?? 0,
        r.periodB?.purchaseFrequency ?? 0,
        r.periodB?.depositCases ?? 0,
        r.periodB?.depositAmount ?? 0,
        r.periodB?.ggr ?? 0,
        r.periodB?.winrate ?? 0,
        r.periodB?.ggrPerUser ?? 0,
        r.periodB?.depositAmountPerUser ?? 0,

        r.diff?.activeMember ?? 0,
        r.diff?.avgTransactionValue ?? 0,
        r.diff?.purchaseFrequency ?? 0,
        r.diff?.depositCases ?? 0,
        r.diff?.depositAmount ?? 0,
        r.diff?.ggr ?? 0,
        r.diff?.winrate ?? 0,
        r.diff?.ggrPerUser ?? 0,
        r.diff?.depositAmountPerUser ?? 0,

        r.percent?.activeMember ?? 0,
        r.percent?.avgTransactionValue ?? 0,
        r.percent?.purchaseFrequency ?? 0,
        r.percent?.depositCases ?? 0,
        r.percent?.depositAmount ?? 0,
        r.percent?.ggr ?? 0,
        r.percent?.winrate ?? 0,
        r.percent?.ggrPerUser ?? 0,
        r.percent?.depositAmountPerUser ?? 0,
      ]
      csvLines.push(line.join(','))
    }

    const csvContent = csvLines.join('\n')
    const fileName = `brand_performance_trends_usc_${periodBEnd}.csv`
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      }
    })
  } catch (error) {
    console.error('❌ [USC Brand Export] Error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}


