import { Suspense } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ClerkProvider } from '@clerk/tanstack-react-start'

import Header from '../components/Header'
import { Toaster } from '../components/ui/sonner'

import appCss from '../styles.css?url'
import { ThemeProvider } from '@/components/ThemeProvider'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Refillr - LPG Delivery in the Philippines',
      },
      {
        name: 'description',
        content: 'Fast, reliable, and secure LPG delivery service in the Philippines. Order Gasul, Solane, and Petron refills from trusted nearby dealers.',
      },
      {
        property: 'og:title',
        content: 'Refillr - LPG Delivery',
      },
      {
        property: 'og:description',
        content: 'Order LPG refills in minutes from verified local dealers.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap',
      },
    ],
    scripts: [
      {
        children: `(function(){try{var t=localStorage.getItem("vite-ui-theme");if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})()`,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <ClerkProvider>
            <Header />
            <main>
              <Suspense fallback={
                <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">Loading...</p>
                  </div>
                </div>
              }>
                {children}
              </Suspense>
            </main>
            <Toaster position="top-right" />
          </ClerkProvider>
        </ThemeProvider>
        {import.meta.env.DEV && (
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
          )}
        <Scripts />
      </body>
    </html>
  )
}
