'use client'

import { useState } from 'react';
import Layout from '../../components/Layout';
import SubHeader from '../../components/SubHeader';
import { YearSlicer, MonthSlicer, CurrencySlicer } from '../../components/slicers';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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

export default function BusinessFlow() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [year, setYear] = useState('2025');
  const [month, setMonth] = useState('July');
  const [currency, setCurrency] = useState('MYR');

  // Mock user data - akan diganti dengan Supabase auth
  const user = {
    username: 'admin',
    email: 'admin@nexmax.com'
  };

  const handleLogout = () => {
    // Implement logout logic with Supabase
    console.log('Logout clicked');
  };

  // Chart data configurations
  const ppcLineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Conversion Rate (%)',
        data: [4.2, 3.8, 2.1, 3.9, 6.2, 6.5, 4.8],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const ppcBarData1 = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'New Customers',
        data: [40, 35, 25, 30, 150, 140, 65],
        backgroundColor: '#f093fb',
      },
    ],
  };

  const ppcBarData2 = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Group Join Volume',
        data: [1100, 1050, 1000, 1200, 2300, 2200, 1350],
        backgroundColor: '#4facfe',
      },
    ],
  };

  const firstDepositorLineData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Deposit Rate (%)',
        data: [25, 28, 30, 32, 35, 33, 24],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const firstDepositorBarData1 = {
    labels: ['In Group', 'Not In Group'],
    datasets: [
      {
        label: 'Deposit Rate (%)',
        data: [24.22, 11.80],
        backgroundColor: ['#667eea', '#f093fb'],
      },
    ],
  };

  const firstDepositorBarData2 = {
    labels: ['In Group', 'Not In Group'],
    datasets: [
      {
        label: 'Customer Count',
        data: [78, 65],
        backgroundColor: ['#4facfe', '#10b981'],
      },
    ],
  };

  const oldMemberBarData1 = {
    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    datasets: [
      {
        label: 'Customer Count',
        data: [900, 800, 600, 400, 1400],
        backgroundColor: '#667eea',
      },
    ],
  };

  const oldMemberBarData2 = {
    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    datasets: [
      {
        label: 'Upgraded Members',
        data: [110, 80, 50, 30, 10],
        backgroundColor: '#f093fb',
      },
    ],
  };

  const oldMemberBarData3 = {
    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    datasets: [
      {
        label: 'Churned Members',
        data: [70, 30, 20, 15, 5],
        backgroundColor: '#ef4444',
      },
    ],
  };

  const oldMemberLineData1 = {
    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    datasets: [
      {
        label: 'Engagement Rate',
        data: [0.75, 0.82, 0.88, 0.92, 0.95],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const oldMemberLineData2 = {
    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    datasets: [
      {
        label: 'NPS Score',
        data: [65, 72, 78, 85, 92],
        borderColor: '#f093fb',
        backgroundColor: 'rgba(240, 147, 251, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const oldMemberBarData4 = {
    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    datasets: [
      {
        label: 'Upgrade Rate (%)',
        data: [12, 8, 6, 4, 1],
        backgroundColor: '#4facfe',
      },
    ],
  };

  const oldMemberLineData3 = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [
      {
        label: 'Bronze',
        data: [8, 7, 6, 5, 4, 3, 2],
        borderColor: '#ef4444',
        tension: 0.4,
      },
      {
        label: 'Silver',
        data: [6, 5, 4, 3, 2, 1, 0.5],
        borderColor: '#f97316',
        tension: 0.4,
      },
      {
        label: 'Gold',
        data: [4, 3, 2, 1, 0.5, 0.3, 0.1],
        borderColor: '#eab308',
        tension: 0.4,
      },
      {
        label: 'Platinum',
        data: [3, 2, 1, 0.5, 0.3, 0.1, 0.05],
        borderColor: '#10b981',
        tension: 0.4,
      },
      {
        label: 'Diamond',
        data: [1, 0.5, 0.3, 0.1, 0.05, 0.02, 0.01],
        borderColor: '#3b82f6',
        tension: 0.4,
      },
    ],
  };

  const trafficBarData1 = {
    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    datasets: [
      {
        label: 'Reactivation Rate',
        data: [0.65, 0.75, 0.85, 0.92, 0.98],
        backgroundColor: '#667eea',
      },
    ],
  };

  const trafficBarData2 = {
    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    datasets: [
      {
        label: 'Reactivated Customers',
        data: [65, 95, 105, 315, 395],
        backgroundColor: '#f093fb',
      },
    ],
  };

  const trafficDonutData = {
    labels: ['Successful', 'Failed'],
    datasets: [
      {
        data: [80.49, 19.51],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

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
      <MonthSlicer value={month} onChange={setMonth} />
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
            {/* KPI Section */}
            <div className="kpi-section">
              <div className="kpi-grid">
                <div className="kpi-card">
                  <h4 className="kpi-title">NEW CUSTOMER CONVERSION RATE</h4>
                  <div className="kpi-value">4.83%</div>
                  <div className="kpi-change negative">↘️ -28.23% vs Last Month</div>
                </div>
                
                <div className="kpi-card">
                  <h4 className="kpi-title">TOTAL NEW CUSTOMERS</h4>
                  <div className="kpi-value">65</div>
                  <div className="kpi-change negative">↘️ -47.58% vs Last Month</div>
                </div>
                
                <div className="kpi-card">
                  <h4 className="kpi-title">CUSTOMER GROUP JOIN VOLUME</h4>
                  <div className="kpi-value">1,357</div>
                  <div className="kpi-change negative">↘️ -26.73% vs Last Month</div>
                </div>
              </div>
            </div>
            
            {/* Charts Section */}
            <div className="charts-section">
              <div className="charts-grid">
                <div className="chart-card">
                  <Line data={ppcLineData} options={chartOptions} />
                </div>
                
                <div className="chart-card">
                  <Bar data={ppcBarData1} options={chartOptions} />
                </div>
                
                <div className="chart-card">
                  <Bar data={ppcBarData2} options={chartOptions} />
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
            {/* KPI Section */}
            <div className="kpi-section">
              <div className="kpi-grid">
                <div className="kpi-card">
                  <h4 className="kpi-title">2ND DEPOSIT RATE (IN GROUP)</h4>
                  <div className="kpi-value">24.22%</div>
                  <div className="kpi-change negative">↘️ -15.31% vs Last Month</div>
                </div>
                
                <div className="kpi-card">
                  <h4 className="kpi-title">2ND DEPOSITS (IN GROUP)</h4>
                  <div className="kpi-value">78</div>
                  <div className="kpi-change negative">↘️ -51.25% vs Last Month</div>
                </div>
                
                <div className="kpi-card">
                  <h4 className="kpi-title">2ND DEPOSIT RATE (NOT IN GROUP)</h4>
                  <div className="kpi-value">11.80%</div>
                  <div className="kpi-change negative">↘️ -28.53% vs Last Month</div>
                </div>
                
                <div className="kpi-card">
                  <h4 className="kpi-title">2ND DEPOSITS (NOT IN GROUP)</h4>
                  <div className="kpi-value">65</div>
                  <div className="kpi-change negative">↘️ -47.58% vs Last Month</div>
                </div>
              </div>
            </div>
            
            {/* Charts Section */}
            <div className="charts-section">
              <div className="charts-grid">
                <div className="chart-card">
                  <Line data={firstDepositorLineData} options={chartOptions} />
                </div>
                
                <div className="chart-card">
                  <Bar data={firstDepositorBarData1} options={chartOptions} />
                </div>
                
                <div className="chart-card">
                  <Bar data={firstDepositorBarData2} options={chartOptions} />
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
                <div className="kpi-card">
                  <h4 className="kpi-title">TOTAL UPGRADED MEMBERS</h4>
                  <div className="kpi-value">188</div>
                  <div className="kpi-change negative">↘️ -16.27% vs Last Month</div>
                </div>
                
                <div className="kpi-card">
                  <h4 className="kpi-title">TOTAL CHURNED MEMBERS</h4>
                  <div className="kpi-value">128</div>
                  <div className="kpi-change negative">↘️ -12.91% vs Last Month</div>
                </div>
              </div>
            </div>
            
            {/* Row 2: 3 Bar Chart */}
            <div className="charts-section">
              <div className="charts-grid three-columns">
                <div className="chart-card">
                  <Bar data={oldMemberBarData1} options={chartOptions} />
                </div>
                
                <div className="chart-card">
                  <Bar data={oldMemberBarData2} options={chartOptions} />
                </div>
                
                <div className="chart-card">
                  <Bar data={oldMemberBarData3} options={chartOptions} />
                </div>
              </div>
            </div>
            
            {/* Row 3: 2 Line Chart */}
            <div className="charts-section">
              <div className="charts-grid two-columns">
                <div className="chart-card">
                  <Line data={oldMemberLineData1} options={chartOptions} />
                </div>
                
                <div className="chart-card">
                  <Line data={oldMemberLineData2} options={chartOptions} />
                </div>
              </div>
            </div>
            
            {/* Row 4: 1 Bar Chart + 1 Line Chart */}
            <div className="charts-section">
              <div className="charts-grid two-columns">
                <div className="chart-card">
                  <Bar data={oldMemberBarData4} options={chartOptions} />
                </div>
                
                <div className="chart-card">
                  <Line data={oldMemberLineData3} options={chartOptions} />
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
            {/* KPI Section */}
            <div className="kpi-section">
              <div className="kpi-grid">
                <div className="kpi-card">
                  <h4 className="kpi-title">CUSTOMER TRANSFER SUCCESS RATE</h4>
                  <div className="kpi-value">80.49%</div>
                  <div className="kpi-change negative">↘️ -7.27% vs Last Month</div>
                </div>
                
                <div className="kpi-card">
                  <h4 className="kpi-title">TARGET COMPLETION</h4>
                  <div className="kpi-value">94.70%</div>
                  <div className="kpi-change negative">↘️ -5.30% vs Last Month</div>
                </div>
                
                <div className="kpi-card">
                  <h4 className="kpi-title">TOTAL REACTIVATED CUSTOMERS</h4>
                  <div className="kpi-value">978</div>
                  <div className="kpi-change negative">↘️ -23.65% vs Last Month</div>
                </div>
              </div>
            </div>
            
            {/* Charts Section */}
            <div className="charts-section">
              <div className="charts-grid">
                <div className="chart-card">
                  <Bar data={trafficBarData1} options={chartOptions} />
                </div>
                
                <div className="chart-card">
                  <Bar data={trafficBarData2} options={chartOptions} />
                </div>
                
                <div className="chart-card">
                  <Doughnut data={trafficDonutData} options={donutOptions} />
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
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .kpi-grid.two-columns {
          grid-template-columns: repeat(2, 1fr);
        }

        .kpi-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .kpi-title {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .kpi-value {
          font-size: 28px;
          font-weight: 800;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .kpi-change {
          font-size: 12px;
          font-weight: 600;
        }

        .kpi-change.negative {
          color: #ef4444;
        }

        .kpi-change.positive {
          color: #10b981;
        }

        .charts-section {
          margin-bottom: 32px;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        .charts-grid.two-columns {
          grid-template-columns: repeat(2, 1fr);
        }

        .charts-grid.three-columns {
          grid-template-columns: repeat(3, 1fr);
        }

        .chart-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          height: 320px;
          transition: all 0.2s ease;
        }

        .chart-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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
