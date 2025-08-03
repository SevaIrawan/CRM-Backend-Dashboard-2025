'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import SubHeader from '@/components/SubHeader'

export default function USCSales() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  // Custom SubHeader dengan pesan slicer
  const customSubHeader = (
    <SubHeader title="">
      <div className="slicer-message">
        Slicers will be configured when page is developed
      </div>
    </SubHeader>
  )

  return (
    <Layout
      pageTitle="USC Sales"
      subHeaderTitle=""
      customSubHeader={customSubHeader}
      darkMode={darkMode}
      sidebarExpanded={sidebarExpanded}
      onToggleDarkMode={() => setDarkMode(!darkMode)}
      onLogout={handleLogout}
    >
      <div className="coming-soon-container">
        <div className="coming-soon-frame">
          <div className="coming-soon-content">
            <div className="coming-soon-icon">
              💎
            </div>
            <h1 className="coming-soon-title">
              USC Sales
            </h1>
            <p className="coming-soon-description">
              This page is under development and will be available soon.
            </p>
            <div className="coming-soon-features">
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span className="feature-text">Advanced Analytics</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📈</span>
                <span className="feature-text">Real-time Data</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎯</span>
                <span className="feature-text">Smart Insights</span>
              </div>
            </div>
            <button className="coming-soon-button">
              Coming Soon
            </button>
            <p className="coming-soon-note">
              Slicers and filters will be configured when this page is fully developed
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .coming-soon-container {
          padding: 24px;
          height: 100%;
          background-color: #f8f9fa;
        }

        .coming-soon-frame {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          height: calc(100vh - 200px);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .coming-soon-content {
          text-align: center;
          padding: 48px;
          max-width: 600px;
        }

        .coming-soon-icon {
          font-size: 64px;
          margin-bottom: 24px;
          animation: pulse 2s infinite;
        }

        .coming-soon-title {
          font-size: 32px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 16px 0;
        }

        .coming-soon-description {
          font-size: 18px;
          color: #6b7280;
          margin: 0 0 32px 0;
          line-height: 1.6;
        }

        .coming-soon-features {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        .feature-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .feature-icon {
          font-size: 24px;
        }

        .feature-text {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .coming-soon-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 16px;
        }

        .coming-soon-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
        }

        .coming-soon-note {
          font-size: 14px;
          color: #9ca3af;
          font-style: italic;
          margin: 0;
        }

        .slicer-message {
          font-size: 14px;
          color: #6b7280;
          font-style: italic;
          background: #f3f4f6;
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        @keyframes pulse {
          0%, 100% { 
            transform: scale(1); 
          }
          50% { 
            transform: scale(1.1); 
          }
        }

        @media (max-width: 768px) {
          .coming-soon-container {
            padding: 16px;
          }
          
          .coming-soon-content {
            padding: 32px 24px;
          }
          
          .coming-soon-title {
            font-size: 24px;
          }
          
          .coming-soon-description {
            font-size: 16px;
          }
          
          .coming-soon-features {
            gap: 24px;
          }
        }
      `}</style>
    </Layout>
  )
} 