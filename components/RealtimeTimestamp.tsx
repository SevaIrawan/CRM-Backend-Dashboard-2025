'use client';

import { useState, useEffect } from 'react';

const RealtimeTimestamp = () => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      // Create date in GMT+7 (Asia/Jakarta timezone)
      const now = new Date();
      const gmt7Time = new Date(now.getTime() + (7 * 60 * 60 * 1000));
      
      const year = gmt7Time.getUTCFullYear();
      const month = String(gmt7Time.getUTCMonth() + 1).padStart(2, '0');
      const day = String(gmt7Time.getUTCDate()).padStart(2, '0');
      const hours = String(gmt7Time.getUTCHours()).padStart(2, '0');
      const minutes = String(gmt7Time.getUTCMinutes()).padStart(2, '0');
      const seconds = String(gmt7Time.getUTCSeconds()).padStart(2, '0');
      
      setCurrentTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
    };

    // Update time immediately
    updateTime();
    
    // Update time every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      fontSize: '15px', 
      fontWeight: 'normal', 
      color: '#ffffff',
      marginTop: '2px'
    }}>
      {currentTime}
    </div>
  );
};

export default RealtimeTimestamp;
