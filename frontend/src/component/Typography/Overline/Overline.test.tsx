import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Overline } from './Overline'

describe('Overline', () => {
  it('stays accessible unless the caller marks it as decorative', () => {
    render(
      <>
        <Overline>Sur votre étagère</Overline>
        <Overline decorative>Identité</Overline>
      </>
    )

    expect(screen.getByText('Sur votre étagère')).not.toHaveAttribute('aria-hidden')
    expect(screen.getByText('Identité')).toHaveAttribute('aria-hidden', 'true')
  })
})
