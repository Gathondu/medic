import type { Metadata } from 'next'
import Link from 'next/link'
import { ClerkProvider, Show, SignInButton, UserButton } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import 'react-datepicker/dist/react-datepicker.css';
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Medic AI',
  description: 'Medic Agent is a platform for creating and managing AI agents for the healthcare industry.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider>
          {/* Navigation */}
          <nav className="flex justify-between items-center mb-12">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              MediNotes Pro
            </h1>
            <div>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <div className="flex items-center gap-4">
                  <Link 
                    href="/product" 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                  >
                    Go to App
                  </Link>
                  <UserButton showName={true} />
                </div>
              </Show>
            </div>
          </nav>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}