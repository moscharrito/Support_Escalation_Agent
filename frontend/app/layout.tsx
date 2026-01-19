import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Support Escalation Agent',
  description: 'AI-powered support ticket processing and escalation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
