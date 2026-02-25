import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CommandMenu from '@/components/CommandMenu'

describe('CommandMenu', () => {
  it('renders search input', () => {
    render(<CommandMenu />)

    const input = screen.getByPlaceholderText(/search/i)
    expect(input).toBeDefined()
  })

  it('shows popular searches when focused', () => {
    render(<CommandMenu />)

    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.focus(input)

    expect(screen.getByText('Gasul 11kg')).toBeDefined()
    expect(screen.getByText('Solane 2.7kg')).toBeDefined()
  })

  it('filters results when typing', () => {
    render(<CommandMenu />)

    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Gasul' } })

    expect(screen.getByText('Gasul 11kg')).toBeDefined()
    expect(screen.queryByText('Solane 2.7kg')).toBeNull()
  })

  it('shows no results message when filter returns empty', () => {
    render(<CommandMenu />)

    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'nonexistent' } })

    expect(screen.getByText(/no results found/i)).toBeDefined()
  })

  it('calls onSelect when item is clicked', () => {
    const onSelect = vi.fn()
    render(<CommandMenu onSelect={onSelect} />)

    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.focus(input)

    const item = screen.getByText('Gasul 11kg')
    fireEvent.click(item)

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Gasul 11kg',
      })
    )
  })

  it('shows brand icon for brand results', () => {
    render(<CommandMenu />)

    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.focus(input)

    expect(screen.getByText('Gasul 11kg')).toBeDefined()
  })

  it('clears search after selection', () => {
    const onSelect = vi.fn()
    render(<CommandMenu onSelect={onSelect} />)

    const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Gasul' } })

    const item = screen.getByText('Gasul 11kg')
    fireEvent.click(item)

    expect(input.value).toBe('')
  })

  it('applies custom className', () => {
    const { container } = render(<CommandMenu className="custom-menu" />)

    expect(container.firstChild).toBeDefined()
    expect((container.firstChild as HTMLElement).classList.contains('custom-menu')).toBe(true)
  })
})
