export type WorstMatchFix =
  | { slug: string; action: 'null'; expected: RegExp }
  | { slug: string; action: 'set'; expected: RegExp; value: string }
  | { slug: string; action: 'strip-after'; marker: RegExp }
  | { slug: string; action: 'strip-html'; marker: RegExp }

export type WorstMatchFixPlan =
  | { kind: 'apply'; next: string | null }
  | { kind: 'noop'; reason: 'already-applied' | 'marker-absent' }
  | {
      kind: 'reject'
      reason: 'empty-extraction' | 'markup-residue' | 'unexpected-source'
    }

const MARKUP_RESIDUE_RX =
  /[<>]|&(?:#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]+)(?:;|,)?|(?:^|[\s,])\/(?:p|span|div)\b/i
const TRAILING_TAG_RESIDUE_RX = /\s*\/(?:p|span|div)\s*$/i

function sliceAfterLastMarker(text: string, marker: RegExp): string | null {
  const flags = marker.flags.includes('g') ? marker.flags : `${marker.flags}g`
  const matches = [...text.matchAll(new RegExp(marker.source, flags))]
  if (matches.length === 0) return null
  const last = matches[matches.length - 1]
  return text.slice((last.index ?? 0) + last[0].length)
}

function stripMarkup(text: string): string {
  return text
    .replace(/&lt(?:;|,\s*)?/gi, '<')
    .replace(/&gt(?:;|,\s*)?/gi, '>')
    .replace(/&nbsp(?:;|,\s*)?/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u200B\u00A0]/g, ' ')
}

function matches(pattern: RegExp, text: string): boolean {
  return new RegExp(pattern.source, pattern.flags).test(text)
}

export function planWorstMatchFix(fix: WorstMatchFix, current: string | null): WorstMatchFixPlan {
  if (fix.action === 'null') {
    if (current === null) return { kind: 'noop', reason: 'already-applied' }
    if (!matches(fix.expected, current)) return { kind: 'reject', reason: 'unexpected-source' }
    return { kind: 'apply', next: null }
  }

  if (fix.action === 'set') {
    if (current === fix.value) return { kind: 'noop', reason: 'already-applied' }
    if (current === null || !matches(fix.expected, current)) {
      return { kind: 'reject', reason: 'unexpected-source' }
    }
    return { kind: 'apply', next: fix.value }
  }

  if (current === null) return { kind: 'noop', reason: 'already-applied' }

  const source = fix.action === 'strip-html' ? stripMarkup(current) : current
  const after = sliceAfterLastMarker(source, fix.marker)
  if (after === null) {
    if (fix.action === 'strip-html' && TRAILING_TAG_RESIDUE_RX.test(current)) {
      const repaired = current.replace(TRAILING_TAG_RESIDUE_RX, '').replace(/[\s,.]+$/g, '')
      if (repaired.length === 0) return { kind: 'reject', reason: 'empty-extraction' }
      if (MARKUP_RESIDUE_RX.test(repaired)) return { kind: 'reject', reason: 'markup-residue' }
      return { kind: 'apply', next: repaired }
    }
    return { kind: 'noop', reason: 'marker-absent' }
  }
  const next =
    fix.action === 'strip-html'
      ? after.replace(/\s+/g, ' ').replace(/^[\s,]+|[\s,.]+$/g, '')
      : after.trimStart()
  if (next.length === 0) return { kind: 'reject', reason: 'empty-extraction' }
  if (fix.action === 'strip-html' && MARKUP_RESIDUE_RX.test(next)) {
    return { kind: 'reject', reason: 'markup-residue' }
  }
  return { kind: 'apply', next }
}
