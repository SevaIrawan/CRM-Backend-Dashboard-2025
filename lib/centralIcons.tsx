// ========================================
// CENTRALIZED ICON SYSTEM - NEXMAX DASHBOARD
// ========================================
// 
// 📋 PAGES THAT USE ICONS:
// 1. Main Dashboard (/dashboard) - StatCards & Charts
// 2. Strategic Executive (/strategic-executive) - StatCards & LineCharts  
// 3. Business Flow (/business-flow) - StatCards & Charts
// 4. Transaction Deposit (/transaction/deposit) - No icons currently
//
// 🎯 ICON CATEGORIES:
// - KPI Icons: For StatCard components (KPI cards)
// - Chart Icons: For LineChart and BarChart components (chart headers)
// - Comparison Icons: For up/down arrows (MoM indicators)
//
// 🔧 HOW TO USE THIS SYSTEM:
//
// 1. FOR STATCARDS (KPI Cards):
//    - Use prop: icon="kpi-name"
//    - Example: <StatCard title="Net Profit" icon="netProfit" />
//    - Available icons: netProfit, headcount, depositAmount, holdPercentage, 
//      activeMember, conversionRate, churnRate, ggrUser, pureUser
//
// 2. FOR CHARTS (LineChart/BarChart):
//    - Use prop: chartIcon={getChartIcon('CHART TITLE')}
//    - Example: <LineChart chartIcon={getChartIcon('GGR USER TREND')} />
//    - Available charts: 'GGR USER TREND', 'GGR PURE USER TREND', 
//      'CUSTOMER VALUE PER HEADCOUNT', 'HEADCOUNT BY DEPARTMENT'
//
// 3. FOR COMPARISON ARROWS:
//    - Use: <ComparisonIcon isPositive={true} />
//    - Automatically shows up/down arrow based on boolean
//
// 🛠️ HOW TO ADD NEW ICONS:
//
// 1. ADD KPI ICON:
//    - Add SVG to KPI_ICONS object
//    - Add mapping in getKpiIcon function
//    - Use in StatCard with icon="new-icon-name"
//
// 2. ADD CHART ICON:
//    - Add to CHART_ICONS object with chart title as key
//    - Use in LineChart/BarChart with getChartIcon('CHART TITLE')
//
// 3. ADD COMPARISON ICON:
//    - Add to COMPARISON_ICONS object
//    - Use ComparisonIcon component
//
// 📍 LOCATIONS WHERE ICONS ARE USED:
// - app/dashboard/page.tsx: Main dashboard StatCards & Charts
// - app/strategic-executive/page.tsx: Strategic dashboard StatCards & LineCharts
// - app/business-flow/page.tsx: Business flow StatCards & Charts
// - components/StatCard.tsx: KPI card component
// - components/LineChart.tsx: Line chart component  
// - components/BarChart.tsx: Bar chart component
//
// ========================================

// KPI ICONS - For StatCard components
export const KPI_ICONS = {
  // Financial KPIs
  netProfit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M128 288C128 182 214 96 320 96C426 96 512 182 512 288C512 394 426 480 320 480C214 480 128 394 128 288zM304 196L304 200C275.2 200.3 252 223.7 252 252.5C252 278.2 270.5 300.1 295.9 304.3L337.6 311.3C343.6 312.3 348 317.5 348 323.6C348 330.5 342.4 336.1 335.5 336.1L280 336C269 336 260 345 260 356C260 367 269 376 280 376L304 376L304 380C304 391 313 400 324 400C335 400 344 391 344 380L344 375.3C369 371.2 388 349.6 388 323.5C388 297.8 369.5 275.9 344.1 271.7L302.4 264.7C296.4 263.7 292 258.5 292 252.4C292 245.5 297.6 239.9 304.5 239.9L352 239.9C363 239.9 372 230.9 372 219.9C372 208.9 363 199.9 352 199.9L344 199.9L344 195.9C344 184.9 335 175.9 324 175.9C313 175.9 304 184.9 304 195.9zM80 408L80 512C80 520.8 87.2 528 96 528L544 528C552.8 528 560 520.8 560 512L560 408C560 394.7 570.7 384 584 384C597.3 384 608 394.7 608 408L608 512C608 547.3 579.3 576 544 576L96 576C60.7 576 32 547.3 32 512L32 408C32 394.7 42.7 384 56 384C69.3 384 80 394.7 80 408z"/></svg>`,
  
  headcount: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M96 192C96 130.1 146.1 80 208 80C269.9 80 320 130.1 320 192C320 253.9 269.9 304 208 304C146.1 304 96 253.9 96 192zM32 528C32 430.8 110.8 352 208 352C305.2 352 384 430.8 384 528L384 534C384 557.2 365.2 576 342 576L74 576C50.8 576 32 557.2 32 534L32 528zM464 128C517 128 560 171 560 224C560 277 517 320 464 320C411 320 368 277 368 224C368 171 411 128 464 128zM464 368C543.5 368 608 432.5 608 512L608 534.4C608 557.4 589.4 576 566.4 576L421.6 576C428.2 563.5 432 549.2 432 534L432 528C432 476.5 414.6 429.1 385.5 391.3C408.1 376.6 435.1 368 464 368z"/></svg>`,
  
  depositAmount: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M416 160L480 160C497.7 160 512 174.3 512 192L512 448C512 465.7 497.7 480 480 480L416 480C398.3 480 384 494.3 384 512C384 529.7 398.3 544 416 544L480 544C533 544 576 501 576 448L576 192C576 139 533 96 480 96L416 96C398.3 96 384 110.3 384 128C384 145.7 398.3 160 416 160zM406.6 342.6C419.1 330.1 419.1 309.8 406.6 297.3L278.6 169.3C266.1 156.8 245.8 156.8 233.3 169.3C220.8 181.8 220.8 202.1 233.3 214.6L306.7 288L96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L306.7 352L233.3 425.4C220.8 437.9 220.8 458.2 233.3 470.7C245.8 483.2 266.1 483.2 278.6 470.7L406.6 342.7z"/></svg>`,
  
  holdPercentage: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M192 160L192 144C192 99.8 278 64 384 64C490 64 576 99.8 576 144L576 160C576 190.6 534.7 217.2 474 230.7C471.6 227.9 469.1 225.2 466.6 222.7C451.1 207.4 431.1 195.8 410.2 187.2C368.3 169.7 313.7 160.1 256 160.1C234.1 160.1 212.7 161.5 192.2 164.2C192 162.9 192 161.5 192 160.1zM496 417L496 370.8C511.1 366.9 525.3 362.3 538.2 356.9C551.4 351.4 564.3 344.7 576 336.6L576 352C576 378.8 544.5 402.5 496 417zM496 321L496 288C496 283.5 495.6 279.2 495 275C510.5 271.1 525 266.4 538.2 260.8C551.4 255.2 564.3 248.6 576 240.5L576 255.9C576 282.7 544.5 306.4 496 320.9zM64 304L64 288C64 243.8 150 208 256 208C362 208 448 243.8 448 288L448 304C448 348.2 362 384 256 384C150 384 64 348.2 64 304zM448 400C448 444.2 362 480 256 480C150 480 64 444.2 64 400L64 384.6C75.6 392.7 88.5 399.3 101.8 404.9C143.7 422.4 198.3 432 256 432C313.7 432 368.3 422.3 410.2 404.9C423.4 399.4 436.3 392.7 448 384.6L448 400zM448 480.6L448 496C448 540.2 362 576 256 576C150 576 64 540.2 64 496L64 480.6C75.6 488.7 88.5 495.3 101.8 500.9C143.7 518.4 198.3 528 256 528C313.7 528 368.3 518.3 410.2 500.9C423.4 495.4 436.3 488.7 448 480.6z"/></svg>`,
  
  activeMember: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M136 192C136 125.7 189.7 72 256 72C322.3 72 376 125.7 376 192C376 258.3 322.3 312 256 312C189.7 312 136 258.3 136 192zM48 546.3C48 447.8 127.8 368 226.3 368L285.7 368C384.2 368 464 447.8 464 546.3C464 562.7 450.7 576 434.3 576L77.7 576C61.3 576 48 562.7 48 546.3zM612.4 196.7L532.4 324.7C528.2 331.4 521 335.6 513.1 336C505.2 336.4 497.6 332.8 492.9 326.4L444.9 262.4C436.9 251.8 439.1 236.8 449.7 228.8C460.3 220.8 475.3 223 483.3 233.6L510.3 269.6L571.7 171.3C578.7 160.1 593.5 156.6 604.8 163.7C616.1 170.8 619.5 185.5 612.4 196.8z"/></svg>`,
  
  conversionRate: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M256.5 72C322.8 72 376.5 125.7 376.5 192C376.5 258.3 322.8 312 256.5 312C190.2 312 136.5 258.3 136.5 192C136.5 125.7 190.2 72 256.5 72zM226.7 368L286.1 368L287.6 368C274.7 394.8 279.8 426.2 299.1 447.5C278.9 469.8 274.3 503.3 289.7 530.9L312.2 571.3C313.1 572.9 314.1 574.5 315.1 576L78.1 576C61.7 576 48.4 562.7 48.4 546.3C48.4 447.8 128.2 368 226.7 368zM432.6 311.6C432.6 298.3 443.3 287.6 456.6 287.6L504.6 287.6C517.9 287.6 528.6 298.3 528.6 311.6L528.6 317.7C528.6 336.6 552.7 350.5 569.1 341.1L574.1 338.2C585.7 331.5 600.6 335.6 607.1 347.3L629.5 387.5C635.7 398.7 632.1 412.7 621.3 419.5L616.6 422.4C600.4 432.5 600.4 462.3 616.6 472.5L621.2 475.4C632 482.2 635.7 496.2 629.5 507.4L607 547.8C600.5 559.5 585.6 563.7 574 556.9L569.1 554C552.7 544.5 528.6 558.5 528.6 577.4L528.6 583.5C528.6 596.8 517.9 607.5 504.6 607.5L456.6 607.5C443.3 607.5 432.6 596.8 432.6 583.5L432.6 577.6C432.6 558.6 408.4 544.6 391.9 554.1L387.1 556.9C375.5 563.6 360.7 559.5 354.1 547.8L331.5 507.4C325.3 496.2 328.9 482.1 339.8 475.3L344.2 472.6C360.5 462.5 360.5 432.5 344.2 422.4L339.7 419.6C328.8 412.8 325.2 398.7 331.4 387.5L353.9 347.2C360.4 335.5 375.3 331.4 386.8 338.1L391.6 340.9C408.1 350.4 432.3 336.4 432.3 317.4L432.3 311.5zM532.5 447.8C532.5 419.1 509.2 395.8 480.5 395.8C451.8 395.8 428.5 419.1 428.5 447.8C428.5 476.5 451.8 499.8 480.5 499.8C509.2 499.8 532.5 476.5 532.5 447.8z"/></svg>`,
  
  churnRate: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M136 192C136 125.7 189.7 72 256 72C322.3 72 376 125.7 376 192C376 258.3 322.3 312 256 312C189.7 312 136 258.3 136 192zM48 546.3C48 447.8 127.8 368 226.3 368L285.7 368C384.2 368 464 447.8 464 546.3C464 562.7 450.7 576 434.3 576L77.7 576C61.3 576 48 562.7 48 546.3zM472 232L616 232C629.3 232 640 242.7 640 256C640 269.3 629.3 280 616 280L472 280C458.7 280 448 269.3 448 256C448 242.7 458.7 232 472 232z"/></svg>`,
  
  ggrUser: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M320 48C306.7 48 296 58.7 296 72L296 84L294.2 84C257.6 84 228 113.7 228 150.2C228 183.6 252.9 211.8 286 215.9L347 223.5C352.1 224.1 356 228.5 356 233.7C356 239.4 351.4 243.9 345.8 243.9L272 244C256.5 244 244 256.5 244 272C244 287.5 256.5 300 272 300L296 300L296 312C296 325.3 306.7 336 320 336C333.3 336 344 325.3 344 312L344 300L345.8 300C382.4 300 412 270.3 412 233.8C412 200.4 387.1 172.2 354 168.1L293 160.5C287.9 159.9 284 155.5 284 150.3C284 144.6 288.6 140.1 294.2 140.1L360 140C375.5 140 388 127.5 388 112C388 96.5 375.5 84 360 84L344 84L344 72C344 58.7 333.3 48 320 48zM141.3 405.5L98.7 448L64 448C46.3 448 32 462.3 32 480L32 544C32 561.7 46.3 576 64 576L384.5 576C413.5 576 441.8 566.7 465.2 549.5L591.8 456.2C609.6 443.1 613.4 418.1 600.3 400.3C587.2 382.5 562.2 378.7 544.4 391.8L424.6 480L312 480C298.7 480 288 469.3 288 456C288 442.7 298.7 432 312 432L384 432C401.7 432 416 417.7 416 400C416 382.3 401.7 368 384 368L231.8 368C197.9 368 165.3 381.5 141.3 405.5z"/></svg>`,
  
  pureUser: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M256.1 72C322.4 72 376.1 125.7 376.1 192C376.1 258.3 322.4 312 256.1 312C189.8 312 136.1 258.3 136.1 192C136.1 125.7 189.8 72 256.1 72zM226.4 368L285.8 368C292.5 368 299 368.4 305.5 369.1C304.6 374 304.1 379 304.1 384.1L304.1 476.2C304.1 501.7 314.2 526.1 332.2 544.1L364.1 576L77.8 576C61.4 576 48.1 562.7 48.1 546.3C48.1 447.8 127.9 368 226.4 368zM352.1 476.2L352.1 384.1C352.1 366.4 366.4 352.1 384.1 352.1L476.2 352.1C488.9 352.1 501.1 357.2 510.1 366.2L606.1 462.2C624.8 480.9 624.8 511.3 606.1 530.1L530 606.2C511.3 624.9 480.9 624.9 462.1 606.2L366.1 510.2C357.1 501.2 352 489 352 476.3zM456.1 432C456.1 418.7 445.4 408 432.1 408C418.8 408 408.1 418.7 408.1 432C408.1 445.3 418.8 456 432.1 456C445.4 456 456.1 445.3 456.1 432z"/></svg>`,
  
  // Additional icons for other KPIs
  withdrawAmount: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M569 337C578.4 327.6 578.4 312.4 569 303.1L425 159C418.1 152.1 407.8 150.1 398.8 153.8C389.8 157.5 384 166.3 384 176L384 256L272 256C245.5 256 224 277.5 224 304L224 336C224 362.5 245.5 384 272 384L384 384L384 464C384 473.7 389.8 482.5 398.8 486.2C407.8 489.9 418.1 487.9 425 481L569 337zM224 160C241.7 160 256 145.7 256 128C256 110.3 241.7 96 224 96L160 96C107 96 64 139 64 192L64 448C64 501 107 544 160 544L224 544C241.7 544 256 529.7 256 512C256 494.3 241.7 480 224 480L160 480C142.3 480 128 465.7 128 448L128 192C128 174.3 142.3 160 160 160L224 160z"/></svg>`,
  
  grossProfit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M329.4 169.4L425.4 73.4C437.9 60.9 458.2 60.9 470.7 73.4L566.7 169.4C579.2 181.9 579.2 202.2 566.7 214.7C554.2 227.2 533.9 227.2 521.4 214.7L480 173.3L480 288L544 288C561.7 288 576 302.3 576 320C576 337.7 561.7 352 544 352L224 352L224 466.7L265.4 425.3C277.9 412.8 298.2 412.8 310.7 425.3C323.2 437.8 323.2 458.1 310.7 470.6L214.7 566.6C202.2 579.1 181.9 579.1 169.4 566.6L73.4 470.6C60.9 458.1 60.9 437.8 73.4 425.3C85.9 412.8 106.2 412.8 118.7 425.3L160 466.7L160 352L96 352C78.3 352 64 337.7 64 320C64 302.3 78.3 288 96 288L416 288L416 173.3L374.6 214.7C362.1 227.2 341.8 227.2 329.3 214.7C316.8 202.2 316.8 181.9 329.3 169.4zM480 400L480 544C480 561.7 465.7 576 448 576C430.3 576 416 561.7 416 544L416 400L480 400zM160 240L160 96C160 78.3 174.3 64 192 64C209.7 64 224 78.3 224 96L224 240L160 240z"/></svg>`,
  
  newDepositor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M136 192C136 125.7 189.7 72 256 72C322.3 72 376 125.7 376 192C376 258.3 322.3 312 256 312C189.7 312 136 258.3 136 192zM48 546.3C48 447.8 127.8 368 226.3 368L285.7 368C384.2 368 464 447.8 464 546.3C464 562.7 450.7 576 434.3 576L77.7 576C61.3 576 48 562.7 48 546.3zM612.4 196.7L532.4 324.7C528.2 331.4 521 335.6 513.1 336C505.2 336.4 497.6 332.8 492.9 326.4L444.9 262.4C436.9 251.8 439.1 236.8 449.7 228.8C460.3 220.8 475.3 223 483.3 233.6L510.3 269.6L571.7 171.3C578.7 160.1 593.5 156.6 604.8 163.7C616.1 170.8 619.5 185.5 612.4 196.8z"/></svg>`,
  
  // Business Flow Icons
  'conversion-rate': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M256.5 72C322.8 72 376.5 125.7 376.5 192C376.5 258.3 322.8 312 256.5 312C190.2 312 136.5 258.3 136.5 192C136.5 125.7 190.2 72 256.5 72zM226.7 368L286.1 368L287.6 368C274.7 394.8 279.8 426.2 299.1 447.5C278.9 469.8 274.3 503.3 289.7 530.9L312.2 571.3C313.1 572.9 314.1 574.5 315.1 576L78.1 576C61.7 576 48.4 562.7 48.4 546.3C48.4 447.8 128.2 368 226.7 368zM432.6 311.6C432.6 298.3 443.3 287.6 456.6 287.6L504.6 287.6C517.9 287.6 528.6 298.3 528.6 311.6L528.6 317.7C528.6 336.6 552.7 350.5 569.1 341.1L574.1 338.2C585.7 331.5 600.6 335.6 607.1 347.3L629.5 387.5C635.7 398.7 632.1 412.7 621.3 419.5L616.6 422.4C600.4 432.5 600.4 462.3 616.6 472.5L621.2 475.4C632 482.2 635.7 496.2 629.5 507.4L607 547.8C600.5 559.5 585.6 563.7 574 556.9L569.1 554C552.7 544.5 528.6 558.5 528.6 577.4L528.6 583.5C528.6 596.8 517.9 607.5 504.6 607.5L456.6 607.5C443.3 607.5 432.6 596.8 432.6 583.5L432.6 577.6C432.6 558.6 408.4 544.6 391.9 554.1L387.1 556.9C375.5 563.6 360.7 559.5 354.1 547.8L331.5 507.4C325.3 496.2 328.9 482.1 339.8 475.3L344.2 472.6C360.5 462.5 360.5 432.5 344.2 422.4L339.7 419.6C328.8 412.8 325.2 398.7 331.4 387.5L353.9 347.2C360.4 335.5 375.3 331.4 386.8 338.1L391.6 340.9C408.1 350.4 432.3 336.4 432.3 317.4L432.3 311.5zM532.5 447.8C532.5 419.1 509.2 395.8 480.5 395.8C451.8 395.8 428.5 419.1 428.5 447.8C428.5 476.5 451.8 499.8 480.5 499.8C509.2 499.8 532.5 476.5 532.5 447.8z"/></svg>`,
  
  'new-customers': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M136 192C136 125.7 189.7 72 256 72C322.3 72 376 125.7 376 192C376 258.3 322.3 312 256 312C189.7 312 136 258.3 136 192zM48 546.3C48 447.8 127.8 368 226.3 368L285.7 368C384.2 368 464 447.8 464 546.3C464 562.7 450.7 576 434.3 576L77.7 576C61.3 576 48 562.7 48 546.3zM612.4 196.7L532.4 324.7C528.2 331.4 521 335.6 513.1 336C505.2 336.4 497.6 332.8 492.9 326.4L444.9 262.4C436.9 251.8 439.1 236.8 449.7 228.8C460.3 220.8 475.3 223 483.3 233.6L510.3 269.6L571.7 171.3C578.7 160.1 593.5 156.6 604.8 163.7C616.1 170.8 619.5 185.5 612.4 196.8z"/></svg>`,
  
  'group-join': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M352.1 476.2L352.1 384.1C352.1 366.4 366.4 352.1 384.1 352.1L476.2 352.1C488.9 352.1 501.1 357.2 510.1 366.2L606.1 462.2C624.8 480.9 624.8 511.3 606.1 530.1L530 606.2C511.3 624.9 480.9 624.9 462.1 606.2L366.1 510.2C357.1 501.2 352 489 352 476.3zM456.1 432C456.1 418.7 445.4 408 432.1 408C418.8 408 408.1 418.7 408.1 432C408.1 445.3 418.8 456 432.1 456C445.4 456 456.1 445.3 456.1 432z"/></svg>`,
  
  'deposit-rate': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M296 88C296 74.7 306.7 64 320 64C333.3 64 344 74.7 344 88L344 128L400 128C417.7 128 432 142.3 432 160C432 177.7 417.7 192 400 192L285.1 192C260.2 192 240 212.2 240 237.1C240 259.6 256.5 278.6 278.7 281.8L370.3 294.9C424.1 302.6 464 348.6 464 402.9C464 463.2 415.1 512 354.9 512L344 512L344 552C344 565.3 333.3 576 320 576C306.7 576 296 565.3 296 552L296 512L224 512C206.3 512 192 497.7 192 480C192 462.3 206.3 448 224 448L354.9 448C379.8 448 400 427.8 400 402.9C400 380.4 383.5 361.4 361.3 358.2L269.7 345.1C215.9 337.5 176 291.4 176 237.1C176 176.9 224.9 128 285.1 128L296 128L296 88z"/></svg>`,
  
  'deposits': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M296 88C296 74.7 306.7 64 320 64C333.3 64 344 74.7 344 88L344 128L400 128C417.7 128 432 142.3 432 160C432 177.7 417.7 192 400 192L285.1 192C260.2 192 240 212.2 240 237.1C240 259.6 256.5 278.6 278.7 281.8L370.3 294.9C424.1 302.6 464 348.6 464 402.9C464 463.2 415.1 512 354.9 512L344 512L344 552C344 565.3 333.3 576 320 576C306.7 576 296 565.3 296 552L296 512L224 512C206.3 512 192 497.7 192 480C192 462.3 206.3 448 224 448L354.9 448C379.8 448 400 427.8 400 402.9C400 380.4 383.5 361.4 361.3 358.2L269.7 345.1C215.9 337.5 176 291.4 176 237.1C176 176.9 224.9 128 285.1 128L296 128L296 88z"/></svg>`
}

// CHART ICONS - For LineChart and BarChart components
export const CHART_ICONS = {
  // Strategic Executive Charts
  'GGR USER TREND': KPI_ICONS.ggrUser,
  'GGR PURE USER TREND': KPI_ICONS.pureUser,
  'CUSTOMER VALUE PER HEADCOUNT': KPI_ICONS.activeMember,
  'CUSTOMER COUNT VS HEADCOUNT': KPI_ICONS.headcount,
  'HEADCOUNT BY DEPARTMENT': KPI_ICONS.headcount,
  
  // Main Dashboard Charts
  'Retention vs Churn Rate': KPI_ICONS.churnRate,
  'CLV vs Purchase Frequency': KPI_ICONS.activeMember,
  'Growth vs Profitability': KPI_ICONS.grossProfit,
  'Operational Efficiency': KPI_ICONS.netProfit
}

// COMPARISON ICONS - For up/down arrows
export const COMPARISON_ICONS = {
  arrowUp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M342.6 105.4C330.1 92.9 309.8 92.9 297.3 105.4L137.3 265.4C124.8 277.9 124.8 298.2 137.3 310.7C149.8 323.2 170.1 323.2 182.6 310.7L320 173.3L457.4 310.6C469.9 323.1 490.2 323.1 502.7 310.6C515.2 298.1 515.2 277.8 502.7 265.3L342.7 105.3zM502.6 457.4L342.6 297.4C330.1 284.9 309.8 284.9 297.3 297.4L137.3 457.4C124.8 469.9 124.8 490.2 137.3 502.7C149.8 515.2 170.1 515.2 182.6 502.7L320 365.3L457.4 502.6C469.9 515.1 490.2 515.1 502.7 502.6C515.2 490.1 515.2 469.8 502.7 457.3z"/></svg>`,
  
  arrowDown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><!--!Font Awesome Free v7.0.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M342.6 534.6C330.1 547.1 309.8 547.1 297.3 534.6L137.3 374.6C124.8 362.1 124.8 341.8 137.3 329.3C149.8 316.8 170.1 316.8 182.6 329.3L320 466.7L457.4 329.4C469.9 316.9 490.2 316.9 502.7 329.4C515.2 341.9 515.2 362.2 502.7 374.7L342.7 534.7zM502.6 182.6L342.6 342.6C330.1 355.1 309.8 355.1 297.3 342.6L137.3 182.6C124.8 170.1 124.8 149.8 137.3 137.3C149.8 124.8 170.1 124.8 182.6 137.3L320 274.7L457.4 137.4C469.9 124.9 490.2 124.9 502.7 137.4C515.2 149.9 515.2 170.2 502.7 182.7z"/></svg>`
}

// ========================================
// HELPER FUNCTIONS
// ========================================

// Get KPI icon by name (for StatCard components)
export function getKpiIcon(kpiName: string): string {
  const iconMap: { [key: string]: string } = {
    // Main Dashboard KPIs
    'Net Profit': KPI_ICONS.netProfit,
    'Headcount': KPI_ICONS.headcount,
    'Deposit Amount': KPI_ICONS.depositAmount,
    'Hold Percentage': KPI_ICONS.holdPercentage,
    'Active Member': KPI_ICONS.activeMember,
    'Conversion Rate': KPI_ICONS.conversionRate,
    'Churn Rate': KPI_ICONS.churnRate,
    
         // Strategic Executive KPIs
     'GGR USER': KPI_ICONS.ggrUser,
     'PURE USER': KPI_ICONS.pureUser,
     
     // Alternative names
     'NET PROFIT': KPI_ICONS.netProfit,
     'HEADCOUNT': KPI_ICONS.headcount,
     'DEPOSIT AMOUNT': KPI_ICONS.depositAmount,
     'HOLD PERCENTAGE': KPI_ICONS.holdPercentage,
     'ACTIVE MEMBER': KPI_ICONS.activeMember,
     'CONVERSION RATE': KPI_ICONS.conversionRate,
     'CHURN RATE': KPI_ICONS.churnRate,
     
     // Business Flow Icons
     'conversion-rate': KPI_ICONS['conversion-rate'],
     'new-customers': KPI_ICONS['new-customers'],
     'group-join': KPI_ICONS['group-join'],
     'deposit-rate': KPI_ICONS['deposit-rate'],
     'deposits': KPI_ICONS['deposits'],
    
    // Fallback
    'default': KPI_ICONS.netProfit
  }
  
  return iconMap[kpiName] || iconMap['default']
}

// Get chart icon by name (for LineChart and BarChart components)
export function getChartIcon(chartName: string): string {
  return (CHART_ICONS as { [key: string]: string })[chartName] || KPI_ICONS.netProfit // Default fallback
}

// Get comparison icon (for up/down arrows)
export function getComparisonIcon(isPositive: boolean): string {
  return isPositive ? COMPARISON_ICONS.arrowUp : COMPARISON_ICONS.arrowDown
}

// ========================================
// REACT COMPONENTS
// ========================================

// Comparison icon component
export function ComparisonIcon({ isPositive, size = '14px', className = '', color }: { 
  isPositive: boolean, 
  size?: string, 
  className?: string,
  color?: string
}) {
  const iconSvg = getComparisonIcon(isPositive)
  
  return (
    <div 
      className={`comparison-icon ${className}`}
      style={{ 
        width: size, 
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color || 'inherit'
      }}
      dangerouslySetInnerHTML={{ __html: iconSvg }}
    />
  )
}

// KPI icon component
export function KpiIcon({ kpiName, size = '20px', className = '' }: { 
  kpiName: string, 
  size?: string, 
  className?: string 
}) {
  const iconSvg = getKpiIcon(kpiName)
  
  return (
    <div 
      className={`kpi-icon ${className}`}
      style={{ 
        width: size, 
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      dangerouslySetInnerHTML={{ __html: iconSvg }}
    />
  )
}

// ========================================
// COMPARISON TYPES - For easy comparison creation
// ========================================

// Standard Comparison Helper Functions
export function createStandardComparison(
  percentage: number, 
  isPositive: boolean = false, 
  text: string = "MoM"
) {
  return {
    percentage: `${isPositive ? '+' : ''}${percentage.toFixed(1)}%`,
    isPositive,
    text
  }
}

// Predefined comparison types for easy use
export const COMPARISON_TYPES = {
  MOM: (percentage: number, isPositive: boolean = false) => 
    createStandardComparison(percentage, isPositive, "MoM"),
  
  MOM_POSITIVE: (percentage: number) => 
    createStandardComparison(percentage, true, "MoM"),
  
  MOM_NEGATIVE: (percentage: number) => 
    createStandardComparison(percentage, false, "MoM"),
  
  YOY: (percentage: number, isPositive: boolean = false) => 
    createStandardComparison(percentage, isPositive, "YoY"),
  
  YOY_POSITIVE: (percentage: number) => 
    createStandardComparison(percentage, true, "YoY"),
  
  YOY_NEGATIVE: (percentage: number) => 
    createStandardComparison(percentage, false, "YoY"),
  
  CUSTOM: (percentage: number, isPositive: boolean, text: string) => 
    createStandardComparison(percentage, isPositive, text)
}
