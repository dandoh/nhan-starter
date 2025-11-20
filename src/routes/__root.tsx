import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { scan } from 'react-scan'

import { RightSidebarLayout } from '../components/app-layout'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
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
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  // Set initial theme from localStorage
  useEffect(() => {
    const theme = localStorage.getItem('theme')
    const html = document.documentElement

    if (theme === 'light') {
      html.classList.remove('dark')
    } else {
      // Default to dark if no theme is set or if theme is 'dark'
      html.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    if (import.meta.env.DEV) {
      // Always initialize scan, but check localStorage for toolbar visibility
      const reactScanShowToolbar = localStorage.getItem(
        'react-scan-show-toolbar',
      )
      // Default to showing toolbar if not set (backward compatibility)
      const showToolbar = reactScanShowToolbar !== 'false'
      scan({ showToolbar })
    }
  }, [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
