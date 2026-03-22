import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'

vi.mock('@/components/Header', () => ({
  default: function MockHeader() {
    useQuery({
      queryKey: ['root-shell-test'],
      queryFn: async () => 'ok',
    })

    return <div>mock header</div>
  },
}))

vi.mock('@clerk/tanstack-react-start', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignedOut: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
}))

vi.mock('@tanstack/react-devtools', () => ({
  TanStackDevtools: () => null,
}))

vi.mock('@tanstack/react-router-devtools', () => ({
  TanStackRouterDevtoolsPanel: () => null,
}))

const { AppProviders } = await import('@/routes/__root')

describe('root shell', () => {
  it('provides a query client to header children', () => {
    expect(() => {
      render(
        <AppProviders>
          <div />
        </AppProviders>
      )
    }).not.toThrow()
  })
})
