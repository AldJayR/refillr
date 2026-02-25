import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('merges class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('handles empty strings', () => {
    const result = cn('', 'bar', '')
    expect(result).toBe('bar')
  })

  it('handles undefined and null', () => {
    const result = cn('foo', undefined, 'bar', null)
    expect(result).toBe('foo bar')
  })

  it('handles arrays', () => {
    const result = cn(['foo', 'bar'], 'baz')
    expect(result).toBe('foo bar baz')
  })

  it('handles objects', () => {
    const result = cn({ foo: true, bar: false, baz: true })
    expect(result).toBe('foo baz')
  })

  it('handles mixed inputs', () => {
    const result = cn('foo', { bar: true, qux: false }, ['a', 'b'], undefined, 'c')
    expect(result).toBe('foo bar a b c')
  })

  it('resolves tailwind conflicts - later class wins', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const isDisabled = false
    const result = cn('base-class', isActive && 'active', isDisabled && 'disabled')
    expect(result).toBe('base-class active')
  })

  it('handles numbers', () => {
    const result = cn('foo', 1, 'bar', 2)
    expect(result).toBe('foo 1 bar 2')
  })

  it('handles nested arrays', () => {
    const result = cn(['foo', ['bar', 'baz']], 'qux')
    expect(result).toBe('foo bar baz qux')
  })
})
