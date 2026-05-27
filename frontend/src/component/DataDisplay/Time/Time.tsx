import type { ComponentProps } from 'react'

import { formatInstant, formatRelative } from '../../../lib/dates'

type FormatStyle = 'short' | 'medium' | 'long' | 'monthYear'

type AbsoluteProps = {
  iso: string | null | undefined
  style?: FormatStyle
  relative?: false
} & Omit<ComponentProps<'time'>, 'dateTime' | 'children' | 'title'>

type RelativeProps = {
  iso: string | null | undefined
  style?: FormatStyle
  relative: true
  title?: string
} & Omit<ComponentProps<'time'>, 'dateTime' | 'children' | 'title'>

type TimeProps = AbsoluteProps | RelativeProps

// Single entry point for displaying wire dates - wraps the time tag with the
// FR-locale helpers. Bypassing this and formatting dates inline in components
// is a convention drift.
export function Time(props: TimeProps) {
  const {
    iso,
    style = 'medium',
    relative,
    ...rest
  } = props as TimeProps & {
    relative?: boolean
  }

  if (!iso) return null

  if (relative) {
    const absolute = formatInstant(iso, style === 'medium' ? 'long' : style)
    const titleOverride = 'title' in props ? props.title : undefined
    return (
      <time dateTime={iso} title={titleOverride ?? absolute} {...rest}>
        {formatRelative(iso)}
      </time>
    )
  }

  return (
    <time dateTime={iso} {...rest}>
      {formatInstant(iso, style)}
    </time>
  )
}
