'use client'

import { useState } from 'react';
import Layout from '../../components/Layout';
import YearSlicer from '../../components/slicers/YearSlicer';
import MonthSlicer from '../../components/slicers/MonthSlicer';
import CurrencySlicer from '../../components/slicers/CurrencySlicer';

import { Line, Bar, Doughnut } from 'react-chartjs-2';
import StatCard from '../../components/StatCard';
import { COMPARISON_TYPES } from '../../lib/CentralIcon';
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

  return (
    <Layout
      pageTitle="Business Flow"

      customSubHeader={
        <div className="dashboard-subheader">
          <div className="subheader-title">
            
          </div>
          
          <div className="subheader-controls">
            <div className="slicer-group">
              <label className="slicer-label">YEAR:</label>
              <YearSlicer 
                value={year} 
                onChange={setYear}
              />
            </div>
            
            <div className="slicer-group">
              <label className="slicer-label">CURRENCY:</label>
              <CurrencySlicer 
                value={currency} 
                onChange={setCurrency}
              />
            </div>
            
            <div className="slicer-group">
              <label className="slicer-label">MONTH:</label>
              <MonthSlicer 
                value={month} 
                onChange={setMonth}
                selectedYear={year}
                selectedCurrency={currency}
              />
            </div>
          </div>
        </div>
      }
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
                  value="4.83%"
                  icon="conversion-rate"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-28.23)}
                />
                <StatCard 
                  title="TOTAL NEW CUSTOMERS"
                  value="65"
                  icon="new-customers"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-47.58)}
                />
                <StatCard 
                  title="CUSTOMER GROUP JOIN VOLUME"
                  value="1,357"
                  icon="group-join"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-26.73)}
                />
              </div>
            </div>
            
            {/* Charts Section - 3 Charts */}
            <div className="charts-section">
              <div className="charts-grid">
                <div className="chart-card">
                  <Line data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                    datasets: [{
                      label: 'Conversion Rate (%)',
                      data: [4.2, 3.8, 2.1, 3.9, 6.2, 6.5, 4.8],
                      borderColor: '#667eea',
                      backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      tension: 0.4,
                    }],
                  }} options={chartOptions} />
                </div>
                <div className="chart-card">
                  <Bar data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                    datasets: [{
                      label: 'New Customers',
                      data: [40, 35, 25, 30, 150, 140, 65],
                      backgroundColor: '#f093fb',
                    }],
                  }} options={chartOptions} />
                </div>
                <div className="chart-card">
                  <Bar data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                    datasets: [{
                      label: 'Group Join Volume',
                      data: [1100, 1050, 1000, 1200, 2300, 2200, 1350],
                      backgroundColor: '#4facfe',
                    }],
                  }} options={chartOptions} />
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
                  value="24.22%"
                  icon="deposit-rate"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-15.31)}
                />
                <StatCard 
                  title="2ND DEPOSITS (IN GROUP)"
                  value="78"
                  icon="deposits"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-51.25)}
                />
                <StatCard 
                  title="2ND DEPOSIT RATE (NOT IN GROUP)"
                  value="11.80%"
                  icon="deposit-rate"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-28.53)}
                />
                <StatCard 
                  title="2ND DEPOSITS (NOT IN GROUP)"
                  value="65"
                  icon="deposits"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-47.58)}
                />
              </div>
            </div>
            
            {/* Charts Section - 3 Charts */}
            <div className="charts-section">
              <div className="charts-grid">
                <div className="chart-card">
                  <Line data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                    datasets: [{
                      label: 'Deposit Rate (%)',
                      data: [25, 28, 30, 32, 35, 33, 24],
                      borderColor: '#667eea',
                      backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      tension: 0.4,
                    }],
                  }} options={chartOptions} />
                </div>
                <div className="chart-card">
                  <Bar data={{
                    labels: ['In Group', 'Not In Group'],
                    datasets: [{
                      label: 'Deposit Rate (%)',
                      data: [24.22, 11.80],
                      backgroundColor: ['#667eea', '#f093fb'],
                    }],
                  }} options={chartOptions} />
                </div>
                <div className="chart-card">
                  <Bar data={{
                    labels: ['In Group', 'Not In Group'],
                    datasets: [{
                      label: 'Customer Count',
                      data: [78, 65],
                      backgroundColor: ['#4facfe', '#10b981'],
                    }],
                  }} options={chartOptions} />
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
                  value="188"
                  icon="upgraded-members"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-16.27)}
                />
                <StatCard 
                  title="TOTAL CHURNED MEMBERS"
                  value="128"
                  icon="churned-members"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-12.91)}
                />
              </div>
            </div>
            
            {/* Row 2: 3 Bar Chart */}
            <div className="charts-section">
              <div className="charts-grid three-columns">
                <div className="chart-card">
                  <Bar data={{
                    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
                    datasets: [{
                      label: 'Customer Count',
                      data: [900, 800, 600, 400, 1400],
                      backgroundColor: '#667eea',
                    }],
                  }} options={chartOptions} />
                </div>
                <div className="chart-card">
                  <Bar data={{
                    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
                    datasets: [{
                      label: 'Upgraded Members',
                      data: [110, 80, 50, 30, 10],
                      backgroundColor: '#f093fb',
                    }],
                  }} options={chartOptions} />
                </div>
                <div className="chart-card">
                  <Bar data={{
                    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
                    datasets: [{
                      label: 'Churned Members',
                      data: [70, 30, 20, 15, 5],
                      backgroundColor: '#ef4444',
                    }],
                  }} options={chartOptions} />
                </div>
              </div>
            </div>
            
            {/* Row 3: 2 Line Chart */}
            <div className="charts-section">
              <div className="charts-grid two-columns">
                <div className="chart-card">
                  <Line data={{
                    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
                    datasets: [{
                      label: 'Engagement Rate',
                      data: [0.75, 0.82, 0.88, 0.92, 0.95],
                      borderColor: '#667eea',
                      backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      tension: 0.4,
                    }],
                  }} options={chartOptions} />
                </div>
                <div className="chart-card">
                  <Line data={{
                    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
                    datasets: [{
                      label: 'NPS Score',
                      data: [65, 72, 78, 85, 92],
                      borderColor: '#f093fb',
                      backgroundColor: 'rgba(240, 147, 251, 0.1)',
                      tension: 0.4,
                    }],
                  }} options={chartOptions} />
                </div>
              </div>
            </div>
            
            {/* Row 4: 1 Bar Chart + 1 Line Chart */}
            <div className="charts-section">
              <div className="charts-grid two-columns">
                <div className="chart-card">
                  <Bar data={{
                    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
                    datasets: [{
                      label: 'Upgrade Rate (%)',
                      data: [12, 8, 6, 4, 1],
                      backgroundColor: '#4facfe',
                    }],
                  }} options={chartOptions} />
                </div>
                <div className="chart-card">
                  <Line data={{
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
                  }} options={chartOptions} />
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
                  value="80.49%"
                  icon="transfer-success"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-7.27)}
                />
                <StatCard 
                  title="TARGET COMPLETION"
                  value="94.70%"
                  icon="target-completion"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-5.30)}
                />
                <StatCard 
                  title="TOTAL REACTIVATED CUSTOMERS"
                  value="978"
                  icon="reactivated-customers"
                  comparison={COMPARISON_TYPES.MOM_NEGATIVE(-23.65)}
                />
              </div>
            </div>
            
            {/* Charts Section - 3 Charts */}
            <div className="charts-section">
              <div className="charts-grid">
                <div className="chart-card">
                  <Bar data={{
                    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
                    datasets: [{
                      label: 'Reactivation Rate',
                      data: [0.65, 0.75, 0.85, 0.92, 0.98],
                      backgroundColor: '#667eea',
                    }],
                  }} options={chartOptions} />
                </div>
                <div className="chart-card">
                  <Bar data={{
                    labels: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
                    datasets: [{
                      label: 'Reactivated Customers',
                      data: [65, 95, 105, 315, 395],
                      backgroundColor: '#f093fb',
                    }],
                  }} options={chartOptions} />
                </div>
                <div className="chart-card">
                  <Doughnut data={{
                    labels: ['Successful', 'Failed'],
                    datasets: [{
                      data: [80.49, 19.51],
                      backgroundColor: ['#10b981', '#ef4444'],
                      borderWidth: 0,
                    }],
                  }} options={donutOptions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`

        .business-flow-container {
          padding: 24px;
          height: calc(100vh - 130px);
          overflow-y: auto;
          overflow-x: hidden;
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
