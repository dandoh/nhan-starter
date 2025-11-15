import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { scan } from 'react-scan'

import { AppLayout } from '../components/AppLayout'

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
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Always initialize scan, but check localStorage for toolbar visibility
      const reactScanShowToolbar = localStorage.getItem('react-scan-show-toolbar')
      // Default to showing toolbar if not set (backward compatibility)
      const showToolbar = reactScanShowToolbar !== 'false'
      scan({ showToolbar })
    }
  }, [])

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                const html = document.documentElement;
                if (theme === 'dark') {
                  html.classList.add('dark');
                } else {
                  html.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <AppLayout>
          {children}
        </AppLayout>
        {/* <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },

            TanStackQueryDevtools,
            StoreDevtools,
          ]}
        /> */}
        <Scripts />
      </body>
    </html>
  )
}
