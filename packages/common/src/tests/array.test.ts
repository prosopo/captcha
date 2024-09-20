import { describe, it, expect } from 'vitest'
import { arrayJoin, ARRAY_JOINER } from '../array.js'

describe('arrayJoin', () => {
  it('joins array elements with default joiner', () => {
    expect(arrayJoin(['a', 'b', 'c'])).toBe('abc')
  })

  it('joins array elements with custom joiner', () => {
    expect(arrayJoin(['a', 'b', 'c'], '-')).toBe('a-b-c')
  })

  it('returns empty string for empty array', () => {
    expect(arrayJoin([])).toBe('')
  })

  it('works with number array', () => {
    expect(arrayJoin([1, 2, 3])).toBe('123')
  })

  it('uses ARRAY_JOINER constant as default', () => {
    const result = arrayJoin(['a', 'b', 'c'])
    const expected = ['a', 'b', 'c'].join(ARRAY_JOINER)
    expect(result).toBe(expected)
  })
})