import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FMCG SaaS — Learning Tracker',
  description: 'Track your progress building a real-world FMCG Sales Tracking SaaS step by step.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
