'use client'

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import SubHeader from '../../components/SubHeader';
import { YearSlicer, MonthSlicer, CurrencySlicer } from '../../components/slicers';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import ComparisonIcon from '../../components/ComparisonIcon';
import { formatMoMValue } from '../../lib/KPILogic';
import StatCard from '../../components/StatCard';
import { COMPARISON_TYPES } from '../../lib/centralIcons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// ============================================================================
// DATA CONTAINERS - Siap untuk data real
// ============================================================================

// Interface untuk data real
interface BusinessFlowData {
  // PPC Service Module
  ppcService: {
    conversionRate: {
      value: number;
      comparison: number;
    };
    newCustomers: {
      value: number;
      comparison: number;
    };
    groupJoinVolume: {
      value: number;
      comparison: number;
    };
    charts: {
      conversionRateTrend: Array<{ month: string; value: number }>;
      newCustomersTrend: Array<{ month: string; value: number }>;
      groupJoinTrend: Array<{ month: string; value: number }>;
    };
  };

  // First Depositor Module
  firstDepositor: {
    depositRateInGroup: {
      value: number;
      comparison: number;
    };
    depositsInGroup: {
      value: number;
      comparison: number;
    };
    depositRateNotInGroup: {
      value: number;
      comparison: number;
    };
    depositsNotInGroup: {
      value: number;
      comparison: number;
    };
    charts: {
      depositRateTrend: Array<{ month: string; value: number }>;
      depositComparison: Array<{ category: string; rate: number; count: number }>;
    };
  };

  // Old Member Module
  oldMember: {
    upgradedMembers: {
      value: number;
      comparison: number;
    };
    churnedMembers: {
      value: number;
      comparison: number;
    };
    charts: {
      customerCountByTier: Array<{ tier: string; count: number }>;
      upgradedByTier: Array<{ tier: string; count: number }>;
      churnedByTier: Array<{ tier: string; count: number }>;
      engagementByTier: Array<{ tier: string; rate: number }>;
      npsByTier: Array<{ tier: string; score: number }>;
      upgradeRateByTier: Array<{ tier: string; rate: number }>;
      churnTrendByTier: Array<{ month: string; bronze: number; silver: number; gold: number; platinum: number; diamond: number }>;
    };
  };

  // Traffic Executive Module
  trafficExecutive: {
    transferSuccessRate: {
      value: number;
      comparison: number;
    };
    targetCompletion: {
      value: number;
      comparison: number;
    };
    reactivatedCustomers: {
      value: number;
      comparison: number;
    };
    charts: {
      reactivationRateByTier: Array<{ tier: string; rate: number }>;
      reactivatedByTier: Array<{ tier: string; count: number }>;
      transferSuccessDonut: Array<{ status: string; percentage: number }>;
    };
  };
}

// Helper function untuk mengambil data real dari Supabase
async function fetchBusinessFlowData(year: string, month: string): Promise<BusinessFlowData> {
  // TODO: Implementasi real Supabase query
  // Contoh struktur query:
  /*
  const { data, error } = await supabase
    .from('business_flow_metrics')
    .select('*')
    .eq('year', year)
    .eq('month', month);
  */

  // Untuk sekarang return mock data yang sesuai dengan interface
  return {
    ppcService: {
      conversionRate: { value: 4.83, comparison: -28.23 },
      newCustomers: { value: 65, comparison: -47.58 },
      groupJoinVolume: { value: 1357, comparison: -26.73 },
      charts: {
        conversionRateTrend: [
          { month: 'Jan', value: 4.2 },
          { month: 'Feb', value: 3.8 },
          { month: 'Mar', value: 2.1 },
          { month: 'Apr', value: 3.9 },
          { month: 'May', value: 6.2 },
          { month: 'Jun', value: 6.5 },
          { month: 'Jul', value: 4.8 }
        ],
        newCustomersTrend: [
          { month: 'Jan', value: 40 },
          { month: 'Feb', value: 35 },
          { month: 'Mar', value: 25 },
          { month: 'Apr', value: 30 },
          { month: 'May', value: 150 },
          { month: 'Jun', value: 140 },
          { month: 'Jul', value: 65 }
        ],
        groupJoinTrend: [
          { month: 'Jan', value: 1100 },
          { month: 'Feb', value: 1050 },
          { month: 'Mar', value: 1000 },
          { month: 'Apr', value: 1200 },
          { month: 'May', value: 2300 },
          { month: 'Jun', value: 2200 },
          { month: 'Jul', value: 1350 }
        ]
      }
    },
    firstDepositor: {
      depositRateInGroup: { value: 24.22, comparison: -15.31 },
      depositsInGroup: { value: 78, comparison: -51.25 },
      depositRateNotInGroup: { value: 11.80, comparison: -28.53 },
      depositsNotInGroup: { value: 65, comparison: -47.58 },
      charts: {
        depositRateTrend: [
          { month: 'Jan', value: 25 },
          { month: 'Feb', value: 28 },
          { month: 'Mar', value: 30 },
          { month: 'Apr', value: 32 },
          { month: 'May', value: 35 },
          { month: 'Jun', value: 33 },
          { month: 'Jul', value: 24 }
        ],
        depositComparison: [
          { category: 'In Group', rate: 24.22, count: 78 },
          { category: 'Not In Group', rate: 11.80, count: 65 }
        ]
      }
    },
    oldMember: {
      upgradedMembers: { value: 188, comparison: -16.27 },
      churnedMembers: { value: 128, comparison: -12.91 },
      charts: {
        customerCountByTier: [
          { tier: 'Bronze', count: 900 },
          { tier: 'Silver', count: 800 },
          { tier: 'Gold', count: 600 },
          { tier: 'Platinum', count: 400 },
          { tier: 'Diamond', count: 1400 }
        ],
        upgradedByTier: [
          { tier: 'Bronze', count: 110 },
          { tier: 'Silver', count: 80 },
          { tier: 'Gold', count: 50 },
          { tier: 'Platinum', count: 30 },
          { tier: 'Diamond', count: 10 }
        ],
        churnedByTier: [
          { tier: 'Bronze', count: 70 },
          { tier: 'Silver', count: 30 },
          { tier: 'Gold', count: 20 },
          { tier: 'Platinum', count: 15 },
          { tier: 'Diamond', count: 5 }
        ],
        engagementByTier: [
          { tier: 'Bronze', rate: 0.75 },
          { tier: 'Silver', rate: 0.82 },
          { tier: 'Gold', rate: 0.88 },
          { tier: 'Platinum', rate: 0.92 },
          { tier: 'Diamond', rate: 0.95 }
        ],
        npsByTier: [
          { tier: 'Bronze', score: 65 },
          { tier: 'Silver', score: 72 },
          { tier: 'Gold', score: 78 },
          { tier: 'Platinum', score: 85 },
          { tier: 'Diamond', score: 92 }
        ],
        upgradeRateByTier: [
          { tier: 'Bronze', rate: 12 },
          { tier: 'Silver', rate: 8 },
          { tier: 'Gold', rate: 6 },
          { tier: 'Platinum', rate: 4 },
          { tier: 'Diamond', rate: 1 }
        ],
        churnTrendByTier: [
          { month: 'Jan', bronze: 8, silver: 6, gold: 4, platinum: 3, diamond: 1 },
          { month: 'Feb', bronze: 7, silver: 5, gold: 3, platinum: 2, diamond: 0.5 },
          { month: 'Mar', bronze: 6, silver: 4, gold: 2, platinum: 1, diamond: 0.3 },
          { month: 'Apr', bronze: 5, silver: 3, gold: 1, platinum: 0.5, diamond: 0.1 },
          { month: 'May', bronze: 4, silver: 2, gold: 0.5, platinum: 0.3, diamond: 0.05 },
          { month: 'Jun', bronze: 3, silver: 1, gold: 0.3, platinum: 0.1, diamond: 0.02 },
          { month: 'Jul', bronze: 2, silver: 0.5, gold: 0.1, platinum: 0.05, diamond: 0.01 }
        ]
      }
    },
    trafficExecutive: {
      transferSuccessRate: { value: 80.49, comparison: -7.27 },
      targetCompletion: { value: 94.70, comparison: -5.30 },
      reactivatedCustomers: { value: 978, comparison: -23.65 },
      charts: {
        reactivationRateByTier: [
          { tier: 'Bronze', rate: 0.65 },
          { tier: 'Silver', rate: 0.75 },
          { tier: 'Gold', rate: 0.85 },
          { tier: 'Platinum', rate: 0.92 },
          { tier: 'Diamond', rate: 0.98 }
        ],
        reactivatedByTier: [
          { tier: 'Bronze', count: 65 },
          { tier: 'Silver', count: 95 },
          { tier: 'Gold', count: 105 },
          { tier: 'Platinum', count: 315 },
          { tier: 'Diamond', count: 395 }
        ],
        transferSuccessDonut: [
          { status: 'Successful', percentage: 80.49 },
          { status: 'Failed', percentage: 19.51 }
        ]
      }
    }
  };
}

// Helper function untuk mengkonversi data real ke format chart
function convertToChartData(data: BusinessFlowData) {
  return {
    // PPC Service Charts
    ppcLineData: {
      labels: data.ppcService.charts.conversionRateTrend.map(item => item.month),
      datasets: [{
        label: 'Conversion Rate (%)',
        data: data.ppcService.charts.conversionRateTrend.map(item => item.value),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
      }],
    },
    ppcBarData1: {
      labels: data.ppcService.charts.newCustomersTrend.map(item => item.month),
      datasets: [{
        label: 'New Customers',
        data: data.ppcService.charts.newCustomersTrend.map(item => item.value),
        backgroundColor: '#f093fb',
      }],
    },
    ppcBarData2: {
      labels: data.ppcService.charts.groupJoinTrend.map(item => item.month),
      datasets: [{
        label: 'Group Join Volume',
        data: data.ppcService.charts.groupJoinTrend.map(item => item.value),
        backgroundColor: '#4facfe',
      }],
    },

    // First Depositor Charts
    firstDepositorLineData: {
      labels: data.firstDepositor.charts.depositRateTrend.map(item => item.month),
      datasets: [{
        label: 'Deposit Rate (%)',
        data: data.firstDepositor.charts.depositRateTrend.map(item => item.value),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
      }],
    },
    firstDepositorBarData1: {
      labels: data.firstDepositor.charts.depositComparison.map(item => item.category),
      datasets: [{
        label: 'Deposit Rate (%)',
        data: data.firstDepositor.charts.depositComparison.map(item => item.rate),
        backgroundColor: ['#667eea', '#f093fb'],
      }],
    },
    firstDepositorBarData2: {
      labels: data.firstDepositor.charts.depositComparison.map(item => item.category),
      datasets: [{
        label: 'Customer Count',
        data: data.firstDepositor.charts.depositComparison.map(item => item.count),
        backgroundColor: ['#4facfe', '#10b981'],
      }],
    },

    // Old Member Charts
    oldMemberBarData1: {
      labels: data.oldMember.charts.customerCountByTier.map(item => item.tier),
      datasets: [{
        label: 'Customer Count',
        data: data.oldMember.charts.customerCountByTier.map(item => item.count),
        backgroundColor: '#667eea',
      }],
    },
    oldMemberBarData2: {
      labels: data.oldMember.charts.upgradedByTier.map(item => item.tier),
      datasets: [{
        label: 'Upgraded Members',
        data: data.oldMember.charts.upgradedByTier.map(item => item.count),
        backgroundColor: '#f093fb',
      }],
    },
    oldMemberBarData3: {
      labels: data.oldMember.charts.churnedByTier.map(item => item.tier),
      datasets: [{
        label: 'Churned Members',
        data: data.oldMember.charts.churnedByTier.map(item => item.count),
        backgroundColor: '#ef4444',
      }],
    },
    oldMemberLineData1: {
      labels: data.oldMember.charts.engagementByTier.map(item => item.tier),
      datasets: [{
        label: 'Engagement Rate',
        data: data.oldMember.charts.engagementByTier.map(item => item.rate),
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
      }],
    },
    oldMemberLineData2: {
      labels: data.oldMember.charts.npsByTier.map(item => item.tier),
      datasets: [{
        label: 'NPS Score',
        data: data.oldMember.charts.npsByTier.map(item => item.score),
        borderColor: '#f093fb',
        backgroundColor: 'rgba(240, 147, 251, 0.1)',
        tension: 0.4,
      }],
    },
    oldMemberBarData4: {
      labels: data.oldMember.charts.upgradeRateByTier.map(item => item.tier),
      datasets: [{
        label: 'Upgrade Rate (%)',
        data: data.oldMember.charts.upgradeRateByTier.map(item => item.rate),
        backgroundColor: '#4facfe',
      }],
    },
    oldMemberLineData3: {
      labels: data.oldMember.charts.churnTrendByTier.map(item => item.month),
      datasets: [
        {
          label: 'Bronze',
          data: data.oldMember.charts.churnTrendByTier.map(item => item.bronze),
          borderColor: '#ef4444',
          tension: 0.4,
        },
        {
          label: 'Silver',
          data: data.oldMember.charts.churnTrendByTier.map(item => item.silver),
          borderColor: '#f97316',
          tension: 0.4,
        },
        {
          label: 'Gold',
          data: data.oldMember.charts.churnTrendByTier.map(item => item.gold),
          borderColor: '#eab308',
          tension: 0.4,
        },
        {
          label: 'Platinum',
          data: data.oldMember.charts.churnTrendByTier.map(item => item.platinum),
          borderColor: '#10b981',
          tension: 0.4,
        },
        {
          label: 'Diamond',
          data: data.oldMember.charts.churnTrendByTier.map(item => item.diamond),
          borderColor: '#3b82f6',
          tension: 0.4,
        },
      ],
    },

    // Traffic Executive Charts
    trafficBarData1: {
      labels: data.trafficExecutive.charts.reactivationRateByTier.map(item => item.tier),
      datasets: [{
        label: 'Reactivation Rate',
        data: data.trafficExecutive.charts.reactivationRateByTier.map(item => item.rate),
        backgroundColor: '#667eea',
      }],
    },
    trafficBarData2: {
      labels: data.trafficExecutive.charts.reactivatedByTier.map(item => item.tier),
      datasets: [{
        label: 'Reactivated Customers',
        data: data.trafficExecutive.charts.reactivatedByTier.map(item => item.count),
        backgroundColor: '#f093fb',
      }],
    },
    trafficDonutData: {
      labels: data.trafficExecutive.charts.transferSuccessDonut.map(item => item.status),
      datasets: [{
        data: data.trafficExecutive.charts.transferSuccessDonut.map(item => item.percentage),
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 0,
      }],
    },
  };
}

export default function BusinessFlow() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [year, setYear] = useState('2025');
  const [month, setMonth] = useState('July');
  const [currency, setCurrency] = useState('MYR');
  const [businessFlowData, setBusinessFlowData] = useState<BusinessFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock user data - akan diganti dengan Supabase auth
  const user = {
    username: 'admin',
    email: 'admin@nexmax.com'
  };

  const handleLogout = () => {
    // Implement logout logic with Supabase
    console.log('Logout clicked');
  };

  // Load data when year/month changes
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchBusinessFlowData(year, month);
        setBusinessFlowData(data);
      } catch (error) {
        console.error('Error loading business flow data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [year, month]);

  // Convert data to chart format
  const chartData = businessFlowData ? convertToChartData(businessFlowData) : null;

  // Loading state
  if (loading) {
    return (
      <Layout
        pageTitle="Business Flow"
        subHeaderTitle=""
        darkMode={darkMode}
        sidebarExpanded={sidebarExpanded}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onLogout={handleLogout}
      >
        <div className="business-flow-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading Business Flow Data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (!businessFlowData || !chartData) {
    return (
      <Layout
        pageTitle="Business Flow"
        subHeaderTitle=""
        darkMode={darkMode}
        sidebarExpanded={sidebarExpanded}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onLogout={handleLogout}
      >
        <div className="business-flow-container">
          <div className="error-container">
            <p>Error loading data. Please try again.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  // Custom SubHeader dengan Slicer Controls Standard
  const customSubHeader = (
    <SubHeader title="">
      <YearSlicer value={year} onChange={setYear} />
      <MonthSlicer value={month} onChange={setMonth} selectedYear={year} selectedCurrency={currency} />
      <CurrencySlicer value={currency} onChange={setCurrency} />
    </SubHeader>
  );

  return (
    <Layout
      pageTitle="Business Flow"
      subHeaderTitle=""
      customSubHeader={customSubHeader}
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
      onLogout={handleLogout}
    >
      <div className="business-flow-container">
        {/* MODULE 1: PPC Service */}
        <div className="module-card">
          <div className="module-header">
            <h3 className="module-title">PPC Service Module</h3>
            <p className="module-description">
              New customer acquisition and group join metrics
            </p>
          </div>
          
          <div className="module-content">
            {/* KPI Section - 3 KPI */}
            <div className="kpi-section">
              <div className="kpi-grid">
                                                                   <StatCard 
                    title="NEW CUSTOMER CONVERSION RATE"
                    value={`${businessFlowData.ppcService.conversionRate.value.toFixed(2)}%`}
                    icon="conversion-rate"
                    comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.ppcService.conversionRate.comparison)}
                  />
                 
                                                    <StatCard 
                     title="TOTAL NEW CUSTOMERS"
                     value={businessFlowData.ppcService.newCustomers.value.toString()}
                     icon="new-customers"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.ppcService.newCustomers.comparison)}
                   />
                 
                                                    <StatCard 
                     title="CUSTOMER GROUP JOIN VOLUME"
                     value={businessFlowData.ppcService.groupJoinVolume.value.toLocaleString()}
                     icon="group-join"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.ppcService.groupJoinVolume.comparison)}
                   />
              </div>
            </div>
            
            {/* Charts Section - 3 Charts */}
            <div className="charts-section">
              <div className="charts-grid">
                                 <div className="chart-card">
                   <Line data={chartData.ppcLineData} options={chartOptions} />
                 </div>
                 
                 <div className="chart-card">
                   <Bar data={chartData.ppcBarData1} options={chartOptions} />
                 </div>
                 
                 <div className="chart-card">
                   <Bar data={chartData.ppcBarData2} options={chartOptions} />
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 2: First Depositor */}
        <div className="module-card">
          <div className="module-header">
            <h3 className="module-title">First Depositor Module</h3>
            <p className="module-description">
              2nd deposit rates comparison between group and non-group members
            </p>
          </div>
          
          <div className="module-content">
                         {/* KPI Section - 4 KPI */}
             <div className="kpi-section">
               <div className="kpi-grid four-columns">
                                                                                                       <StatCard 
                     title="2ND DEPOSIT RATE (IN GROUP)"
                     value={`${businessFlowData.firstDepositor.depositRateInGroup.value.toFixed(2)}%`}
                     icon="deposit-rate"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.firstDepositor.depositRateInGroup.comparison)}
                   />
                 
                                                    <StatCard 
                     title="2ND DEPOSITS (IN GROUP)"
                     value={businessFlowData.firstDepositor.depositsInGroup.value.toString()}
                     icon="deposits"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.firstDepositor.depositsInGroup.comparison)}
                   />
                 
                                                    <StatCard 
                     title="2ND DEPOSIT RATE (NOT IN GROUP)"
                     value={`${businessFlowData.firstDepositor.depositRateNotInGroup.value.toFixed(2)}%`}
                     icon="deposit-rate"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.firstDepositor.depositRateNotInGroup.comparison)}
                   />
                 
                                                    <StatCard 
                     title="2ND DEPOSITS (NOT IN GROUP)"
                     value={businessFlowData.firstDepositor.depositsNotInGroup.value.toString()}
                     icon="deposits"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.firstDepositor.depositsNotInGroup.comparison)}
                   />
              </div>
            </div>
            
            {/* Charts Section - 3 Charts */}
            <div className="charts-section">
              <div className="charts-grid">
                                 <div className="chart-card">
                   <Line data={chartData.firstDepositorLineData} options={chartOptions} />
                 </div>
                 
                 <div className="chart-card">
                   <Bar data={chartData.firstDepositorBarData1} options={chartOptions} />
                 </div>
                 
                 <div className="chart-card">
                   <Bar data={chartData.firstDepositorBarData2} options={chartOptions} />
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODULE 3: Old Member */}
        <div className="module-card">
          <div className="module-header">
            <h3 className="module-title">Old Member Module</h3>
            <p className="module-description">
              Engagement, NPS, upgrade and churn metrics by tier
            </p>
          </div>
          
          <div className="module-content">
            {/* Row 1: 2 StatCard */}
            <div className="kpi-section">
              <div className="kpi-grid two-columns">
                                                                                                       <StatCard 
                     title="TOTAL UPGRADED MEMBERS"
                     value={businessFlowData.oldMember.upgradedMembers.value.toString()}
                     icon="upgraded-members"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.oldMember.upgradedMembers.comparison)}
                   />
                 
                                                    <StatCard 
                     title="TOTAL CHURNED MEMBERS"
                     value={businessFlowData.oldMember.churnedMembers.value.toString()}
                     icon="churned-members"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.oldMember.churnedMembers.comparison)}
                   />
              </div>
            </div>
            
            {/* Row 2: 3 Bar Chart */}
            <div className="charts-section">
              <div className="charts-grid three-columns">
                                 <div className="chart-card">
                   <Bar data={chartData.oldMemberBarData1} options={chartOptions} />
                 </div>
                 
                 <div className="chart-card">
                   <Bar data={chartData.oldMemberBarData2} options={chartOptions} />
                 </div>
                 
                 <div className="chart-card">
                   <Bar data={chartData.oldMemberBarData3} options={chartOptions} />
                 </div>
               </div>
             </div>
             
             {/* Row 3: 2 Line Chart */}
             <div className="charts-section">
               <div className="charts-grid two-columns">
                 <div className="chart-card">
                   <Line data={chartData.oldMemberLineData1} options={chartOptions} />
                 </div>
                 
                 <div className="chart-card">
                   <Line data={chartData.oldMemberLineData2} options={chartOptions} />
                 </div>
               </div>
             </div>
             
             {/* Row 4: 1 Bar Chart + 1 Line Chart */}
             <div className="charts-section">
               <div className="charts-grid two-columns">
                 <div className="chart-card">
                   <Bar data={chartData.oldMemberBarData4} options={chartOptions} />
                 </div>
                 
                 <div className="chart-card">
                   <Line data={chartData.oldMemberLineData3} options={chartOptions} />
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* MODULE 4: Traffic Executive */}
        <div className="module-card">
          <div className="module-header">
            <h3 className="module-title">Traffic Executive Module</h3>
            <p className="module-description">
              Customer reactivation and transfer success metrics
            </p>
          </div>
          
          <div className="module-content">
            {/* KPI Section - 3 KPI */}
            <div className="kpi-section">
              <div className="kpi-grid">
                                                                                                       <StatCard 
                     title="CUSTOMER TRANSFER SUCCESS RATE"
                     value={`${businessFlowData.trafficExecutive.transferSuccessRate.value.toFixed(2)}%`}
                     icon="transfer-success"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.trafficExecutive.transferSuccessRate.comparison)}
                   />
                 
                                                    <StatCard 
                     title="TARGET COMPLETION"
                     value={`${businessFlowData.trafficExecutive.targetCompletion.value.toFixed(2)}%`}
                     icon="target-completion"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.trafficExecutive.targetCompletion.comparison)}
                   />
                 
                                                    <StatCard 
                     title="TOTAL REACTIVATED CUSTOMERS"
                     value={businessFlowData.trafficExecutive.reactivatedCustomers.value.toLocaleString()}
                     icon="reactivated-customers"
                     comparison={COMPARISON_TYPES.MOM_NEGATIVE(businessFlowData.trafficExecutive.reactivatedCustomers.comparison)}
                   />
              </div>
            </div>
            
            {/* Charts Section - 3 Charts */}
            <div className="charts-section">
              <div className="charts-grid">
                                 <div className="chart-card">
                   <Bar data={chartData.trafficBarData1} options={chartOptions} />
                 </div>
                 
                 <div className="chart-card">
                   <Bar data={chartData.trafficBarData2} options={chartOptions} />
                 </div>
                 
                 <div className="chart-card">
                   <Doughnut data={chartData.trafficDonutData} options={donutOptions} />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .business-flow-container {
          padding: 24px;
          height: 100%;
          background-color: #f8f9fa;
        }

        .module-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          margin-bottom: 24px;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .module-header {
          padding: 24px 32px;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .module-title {
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .module-description {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .module-content {
          padding: 24px 32px;
        }

        .kpi-section {
          margin-bottom: 32px;
          width: 100%;
        }

        .kpi-section .stat-card {
          width: 100%;
          height: 100%;
          min-width: 0;
        }

        .chart-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          height: 320px;
          transition: all 0.2s ease;
          width: 100%;
          min-width: 0;
        }

        .kpi-grid {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 20px !important;
          width: 100% !important;
          margin-bottom: 32px !important;
          padding: 0 !important;
        }

        .kpi-grid.two-columns {
          grid-template-columns: repeat(2, 1fr) !important;
          width: 100% !important;
        }

        .charts-section {
          margin-bottom: 32px;
        }

        .charts-grid {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 20px !important;
          width: 100% !important;
        }

        .charts-grid.two-columns {
          grid-template-columns: repeat(2, 1fr) !important;
          width: 100% !important;
        }

        .charts-grid.three-columns {
          grid-template-columns: repeat(3, 1fr) !important;
          width: 100% !important;
        }

        /* Special case for 4 KPI modules */
        .kpi-grid.four-columns {
          grid-template-columns: repeat(4, 1fr) !important;
          width: 100% !important;
        }

        /* Business Flow specific styling for consistent comparison */
        .business-flow-container .stat-card-comparison {
          margin-top: 6px;
        }

        .business-flow-container .comparison-label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 4px;
          padding: 3px 8px;
        }

        .chart-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          height: 320px;
          transition: all 0.2s ease;
          width: 100%;
        }

                 .chart-card:hover {
           transform: translateY(-2px);
           box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
         }

         /* Loading and Error States */
         .loading-container,
         .error-container {
           display: flex;
           flex-direction: column;
           align-items: center;
           justify-content: center;
           height: 400px;
           text-align: center;
         }

         .loading-spinner {
           width: 40px;
           height: 40px;
           border: 4px solid #f3f3f3;
           border-top: 4px solid #667eea;
           border-radius: 50%;
           animation: spin 1s linear infinite;
           margin-bottom: 16px;
         }

         @keyframes spin {
           0% { transform: rotate(0deg); }
           100% { transform: rotate(360deg); }
         }

         .loading-container p,
         .error-container p {
           font-size: 16px;
           color: #6b7280;
           margin: 0;
         }

         .error-container p {
           color: #ef4444;
         }

         @media (max-width: 768px) {
          .business-flow-container {
            padding: 16px;
          }
          
          .module-content {
            padding: 16px 20px;
          }
          
          .kpi-grid {
            grid-template-columns: 1fr;
          }
          
          .kpi-grid.two-columns {
            grid-template-columns: 1fr;
          }
          
          .charts-grid {
            grid-template-columns: 1fr;
          }
          
          .charts-grid.two-columns,
          .charts-grid.three-columns {
            grid-template-columns: 1fr;
          }
          
          .chart-card {
            height: 280px;
          }
        }
      `}</style>
    </Layout>
  );
}
