import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '../styles/table-styles.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NexMax Dashboard',
  description: 'Interactive Dashboard with Username-based Authentication',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/lightning-favicon.svg', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        {/* FontAwesome CDN */}
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer" 
        />
      </head>
      <body className={inter.className}>
        <div style={{ 
          display: 'flex', 
          minHeight: '100vh', 
          backgroundColor: '#f8f9fa' 
        }}>
          {children}
        </div>
      </body>
    </html>
  )
} 