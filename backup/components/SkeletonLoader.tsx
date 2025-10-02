'use client'

interface SkeletonLoaderProps {
  type?: 'page' | 'card' | 'chart' | 'table'
  count?: number
}

export default function SkeletonLoader({ type = 'page', count = 1 }: SkeletonLoaderProps) {
  if (type === 'card') {
    return (
      <div className="skeleton-container">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-card">
            <div className="skeleton-header"></div>
            <div className="skeleton-content">
              <div className="skeleton-line short"></div>
              <div className="skeleton-line medium"></div>
              <div className="skeleton-line long"></div>
            </div>
          </div>
        ))}
        
        <style jsx>{`
          .skeleton-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            padding: 20px;
          }
          
          .skeleton-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            animation: skeletonPulse 1.5s ease-in-out infinite;
          }
          
          .skeleton-header {
            height: 24px;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s infinite;
            border-radius: 6px;
            margin-bottom: 16px;
          }
          
          .skeleton-content {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          
          .skeleton-line {
            height: 16px;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s infinite;
            border-radius: 4px;
          }
          
          .skeleton-line.short { width: 40%; }
          .skeleton-line.medium { width: 70%; }
          .skeleton-line.long { width: 90%; }
          
          @keyframes skeletonShimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          @keyframes skeletonPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </div>
    )
  }

  if (type === 'chart') {
    return (
      <div className="skeleton-chart-container">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton-chart">
            <div className="skeleton-chart-header"></div>
            <div className="skeleton-chart-body">
              <div className="skeleton-chart-bars">
                <div className="skeleton-bar" style={{ height: '60%' }}></div>
                <div className="skeleton-bar" style={{ height: '80%' }}></div>
                <div className="skeleton-bar" style={{ height: '40%' }}></div>
                <div className="skeleton-bar" style={{ height: '90%' }}></div>
                <div className="skeleton-bar" style={{ height: '70%' }}></div>
              </div>
            </div>
          </div>
        ))}
        
        <style jsx>{`
          .skeleton-chart-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
            padding: 20px;
          }
          
          .skeleton-chart {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            height: 300px;
          }
          
          .skeleton-chart-header {
            height: 20px;
            width: 60%;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s infinite;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          
          .skeleton-chart-body {
            height: 200px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
          }
          
          .skeleton-chart-bars {
            display: flex;
            align-items: flex-end;
            gap: 15px;
            height: 100%;
            width: 80%;
          }
          
          .skeleton-bar {
            flex: 1;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeletonShimmer 1.5s infinite;
            border-radius: 4px 4px 0 0;
            min-height: 30px;
          }
          
          @keyframes skeletonShimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      </div>
    )
  }

  // Default page skeleton
  return (
    <div className="skeleton-page">
      <div className="skeleton-page-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-subtitle"></div>
      </div>
      
      <div className="skeleton-page-content">
        <SkeletonLoader type="card" count={3} />
        <SkeletonLoader type="chart" count={2} />
      </div>
      
      <style jsx>{`
        .skeleton-page {
          padding: 24px;
          animation: fadeIn 0.3s ease-out;
        }
        
        .skeleton-page-header {
          margin-bottom: 24px;
        }
        
        .skeleton-title {
          height: 32px;
          width: 300px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.5s infinite;
          border-radius: 6px;
          margin-bottom: 12px;
        }
        
        .skeleton-subtitle {
          height: 20px;
          width: 200px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeletonShimmer 1.5s infinite;
          border-radius: 4px;
        }
        
        .skeleton-page-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        @keyframes skeletonShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}