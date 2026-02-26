import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CommandMenu from '@/components/CommandMenu'

describe('CommandMenu', () => {
  it('renders search trigger button', () => {
    render(<CommandMenu />)

    const button = screen.getByRole('button', { name: /search/i })
    expect(button).toBeDefined()
  })

  it('opens dialog when trigger is clicked', () => {
    render(<CommandMenu />)

    const button = screen.getByRole('button', { name: /search/i })
    fireEvent.click(button)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(screen.getByPlaceholderText(/search brands, sizes, locations/i)).toBeDefined()
  })

  it('shows popular searches when opened', () => {
    render(<CommandMenu />)

    const button = screen.getByRole('button', { name: /search/i })
    fireEvent.click(button)

    expect(screen.getByText('Gasul 11kg')).toBeDefined()
    expect(screen.getByText('Solane 2.7kg')).toBeDefined()
  })

  it('filters results when typing', () => {
    render(<CommandMenu />)

    const button = screen.getByRole('button', { name: /search/i })
    fireEvent.click(button)

    const input = screen.getByPlaceholderText(/search brands, sizes, locations/i)
    fireEvent.change(input, { target: { value: 'Gasul' } })

    expect(screen.getByText('Gasul 11kg')).toBeDefined()
    expect(screen.queryByText('Solane 2.7kg')).toBeNull()
  })

  it('shows no results message when filter returns empty', () => {
    render(<CommandMenu />)

    const button = screen.getByRole('button', { name: /search/i })
    fireEvent.click(button)

    const input = screen.getByPlaceholderText(/search brands, sizes, locations/i)
    fireEvent.change(input, { target: { value: 'nonexistent' } })

    expect(screen.getByText(/no results found/i)).toBeDefined()
  })

  it('calls onSelect when item is clicked', () => {
    const onSelect = vi.fn()
    render(<CommandMenu onSelect={onSelect} />)

    const button = screen.getByRole('button', { name: /search/i })
    fireEvent.click(button)

    const item = screen.getByText('Gasul 11kg')
    fireEvent.click(item)

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Gasul 11kg',
      })
    )
  })

  it('applies custom className to the wrapper', () => {
    const { container } = render(<CommandMenu className="custom-menu" />)

    expect(container.firstChild).toBeDefined()
    expect((container.firstChild as HTMLElement).classList.contains('custom-menu')).toBe(true)
  })
})
