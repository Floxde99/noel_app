import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/providers/auth-provider'
import { SocketProvider } from '@/components/providers/socket-provider'
import { FontSizeProvider } from '@/components/providers/font-size-provider'
import { Snowfall } from '@/components/ui/snowfall'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#0C764C',
}

export const metadata: Metadata = {
  title: 'Noël en Famille 🎄',
  description: 'Organisez vos fêtes de Noël en famille - Réveillon, déjeuner, cadeaux et plus encore !',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon/favicon-64.png', sizes: '64x64', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Noël en Famille 🎄',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Noël en Famille 🎄',
    description: 'Organisez vos fêtes de Noël en famille',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <FontSizeProvider>
          <AuthProvider>
            <SocketProvider>
              <Snowfall />
              <main className="min-h-screen bg-gradient-to-br from-red-600 via-green-700 to-red-800 text-white">
                {children}
              </main>
              <Toaster />
            </SocketProvider>
          </AuthProvider>
        </FontSizeProvider>
      </body>
    </html>
  )
}
