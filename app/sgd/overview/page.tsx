'use client'

import React from 'react';
import Layout from '@/components/Layout';
import Frame from '@/components/Frame';

export default function SGDOverviewPage() {
  return (
    <Layout>
      <Frame variant="standard">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 200px)',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '2rem',
            color: '#6b7280'
          }}>
            🚧
          </div>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            color: '#1f2937',
            fontWeight: '600'
          }}>
            Coming Soon
          </h1>
          <p style={{
            fontSize: '1.2rem',
            color: '#6b7280',
            maxWidth: '500px',
            lineHeight: '1.6'
          }}>
            SGD Overview page sedang dalam pengembangan. 
            Halaman ini akan segera tersedia dengan fitur lengkap.
          </p>
        </div>
      </Frame>
    </Layout>
  );
} 