import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SentimentIcon } from '../sentiment-icons'

describe('SentimentIcon', () => {
  afterEach(() => cleanup())

  it('uses simplified expressions without cheeks at compact sizes', () => {
    const { container } = render(<SentimentIcon value={4} size={18} />)
    const icon = container.querySelector('svg')

    expect(icon).toHaveAttribute('stroke-width', '2.3')
    expect(container.querySelectorAll('.snt-cheek')).toHaveLength(0)
    expect(container.querySelector('.snt-mouth')).toHaveAttribute('stroke', 'var(--sentiment-ink)')
  })

  it('keeps the detailed expression at regular size', () => {
    const { container } = render(<SentimentIcon value={4} size={24} />)
    const icon = container.querySelector('svg')
    const cheeks = container.querySelectorAll('.snt-cheek')

    expect(icon).toHaveAttribute('stroke-width', '2')
    expect(cheeks).toHaveLength(2)
    expect(cheeks[0]).toHaveAttribute('cx', '6.7')
    expect(cheeks[1]).toHaveAttribute('cx', '17.3')
    expect(cheeks[0]?.getAttribute('fill')).toMatch(/^url\(#.+\)$/)
    expect(
      container.querySelectorAll('radialGradient')[1]?.querySelector('stop:last-child')
    ).toHaveAttribute('stop-opacity', '0')
  })

  it('uses a shaded circular head without a hard outline', () => {
    const { container } = render(<SentimentIcon value={3} size={24} />)
    const face = container.querySelector('.snt-face')
    const faceGradient = container.querySelector('defs radialGradient:first-child')

    expect(face?.tagName.toLowerCase()).toBe('circle')
    expect(face).toHaveAttribute('r', '8.75')
    expect(face).toHaveAttribute('stroke', 'none')
    expect(face?.getAttribute('fill')).toMatch(/^url\(#.+\)$/)
    expect(faceGradient?.querySelectorAll('stop')).toHaveLength(3)
    expect(faceGradient?.querySelector('stop:last-child')).toHaveAttribute(
      'stop-color',
      'color-mix(in oklch, var(--sentiment-3-fill) 68%, var(--sentiment-3))'
    )
  })

  it('gives each compact face a distinct mouth shape', () => {
    const mouthShapes = [1, 2, 3, 4, 5].map((value) => {
      const { container, unmount } = render(<SentimentIcon value={value} size={16} />)
      const shape = container.querySelector('.snt-mouth')?.getAttribute('d')
      unmount()
      return shape
    })

    expect(new Set(mouthShapes).size).toBe(5)
  })

  it('uses dark ink for regular-size facial traits', () => {
    const { container } = render(<SentimentIcon value={5} size={24} />)

    for (const feature of container.querySelectorAll('.snt-eye, .snt-mouth')) {
      expect(feature).toHaveAttribute('stroke', 'var(--sentiment-ink)')
    }
  })
})
