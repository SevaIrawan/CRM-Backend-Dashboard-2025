'use client';

import { useState, useEffect } from 'react';

const RealtimeTimestamp = () => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
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
