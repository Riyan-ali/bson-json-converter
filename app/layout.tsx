import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'BSON ↔ JSON Converter',
  description: 'Convert between BSON and JSON formats with a modern, developer-friendly interface',
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Analytics />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      <footer className='text-center text-sm text-gray-500 dark:text-gray-400 mt-8 py-4 border-t border-gray-200 dark:border-gray-700'>
        Made with ❤️ by <a href="https://www.linkedin.com/in/riyan-ali-1445951b8/">Riyan Ali</a>
      </footer>
      </body>
    </html>
  )
}
