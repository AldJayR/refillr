import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrustBadge from '@/components/TrustBadge'

describe('TrustBadge', () => {
  it('renders verified badge', () => {
    const { container } = render(<TrustBadge isVerified={true} />)

    const svg = container.querySelector('svg')
    expect(svg).toBeDefined()
  })

  it('renders unverified badge', () => {
    const { container } = render(<TrustBadge isVerified={false} />)

    const svg = container.querySelector('svg')
    expect(svg).toBeDefined()
  })

  it('shows label when showLabel is true and verified', () => {
    render(<TrustBadge isVerified={true} showLabel={true} />)

    const label = screen.getByText('DOE Verified')
    expect(label).toBeDefined()
  })

  it('shows label when showLabel is true and not verified', () => {
    render(<TrustBadge isVerified={false} showLabel={true} />)

    const label = screen.getByText('Unverified')
    expect(label).toBeDefined()
  })

  it('does not show label when showLabel is false', () => {
    render(<TrustBadge isVerified={true} showLabel={false} />)

    expect(screen.queryByText('DOE Verified')).toBeNull()
  })

  it('does not show label by default', () => {
    render(<TrustBadge isVerified={true} />)

    expect(screen.queryByText('DOE Verified')).toBeNull()
  })

  it('applies custom className', () => {
    const { container } = render(<TrustBadge isVerified={true} className="custom-class" />)

    expect(container.firstChild).toBeDefined()
    expect((container.firstChild as HTMLElement).classList.contains('custom-class')).toBe(true)
  })
})
