import { describe, expect, it } from 'bun:test'

import {
  hasDangerousHtmlContent,
  hasSuspiciousHtml,
  isHttpUrl,
  isMaliciousUrl,
  preview,
  stripHtml,
} from './audit-security-helpers'

describe('stripHtml', () => {
  it('returns plain text unchanged', () => {
    expect(stripHtml('hello world')).toBe('hello world')
  })

  it('strips a script tag but keeps inner text', () => {
    expect(stripHtml('<script>alert(1)</script>text')).toBe('alert(1)text')
  })

  it('removes anchor tags and keeps the link label', () => {
    expect(stripHtml('<a href="x">y</a>')).toBe('y')
  })

  it('removes HTML comments', () => {
    expect(stripHtml('<!-- comment -->keep')).toBe('keep')
  })

  it('strips leftover bare angle brackets from malformed input', () => {
    expect(stripHtml('<<>>foo')).toBe('foo')
  })

  it('collapses whitespace and trims', () => {
    expect(stripHtml('  multi\n  whitespace\t\there  ')).toBe('multi whitespace here')
  })

  it('handles multi-line tags (no s flag needed: [^>] matches newlines)', () => {
    expect(stripHtml('<script\nsrc=x.js>code</script>')).toBe('code')
  })

  it('does NOT decode HTML entities (safe in JSX text)', () => {
    expect(stripHtml('&lt;script&gt;x&lt;/script&gt;')).toBe('&lt;script&gt;x&lt;/script&gt;')
  })

  it('strips javascript: payload via anchor removal', () => {
    expect(stripHtml('<a href="javascript:alert(1)">x</a>')).toBe('x')
  })

  it('returns empty string for input that is only tags + whitespace', () => {
    expect(stripHtml('<p></p>   <br/>')).toBe('')
  })
})

describe('hasDangerousHtmlContent', () => {
  it('flags a script tag', () => {
    expect(hasDangerousHtmlContent('<script>x</script>')).toBe(true)
  })

  it('flags an inline event handler (onclick, onload, ...)', () => {
    expect(hasDangerousHtmlContent('<div onclick="evil()">y</div>')).toBe(true)
  })

  it('flags javascript: in href', () => {
    expect(hasDangerousHtmlContent('<a href="javascript:alert(1)">x</a>')).toBe(true)
  })

  it('flags data: in src (HTML smuggling vector)', () => {
    expect(hasDangerousHtmlContent('<img src="data:text/html,<script>x</script>">')).toBe(true)
  })

  it('does NOT flag encoded variants (entities not decoded server-side)', () => {
    expect(hasDangerousHtmlContent('&lt;script&gt;x&lt;/script&gt;')).toBe(false)
  })

  it('does NOT flag chemistry notation false positives (<1%, <5°C)', () => {
    expect(hasDangerousHtmlContent('contains <1% sodium and <5°C storage')).toBe(false)
  })

  it('returns false for null and undefined', () => {
    expect(hasDangerousHtmlContent(null)).toBe(false)
    expect(hasDangerousHtmlContent(undefined)).toBe(false)
  })
})

describe('isMaliciousUrl', () => {
  it('flags javascript: URLs', () => {
    expect(isMaliciousUrl('javascript:alert(1)')).toBe(true)
  })

  it('flags vbscript: URLs', () => {
    expect(isMaliciousUrl('vbscript:msgbox(1)')).toBe(true)
  })

  it('flags data:text/html URLs', () => {
    expect(isMaliciousUrl('data:text/html,<script>x</script>')).toBe(true)
  })

  it('does NOT flag a normal https URL', () => {
    expect(isMaliciousUrl('https://example.com/path')).toBe(false)
  })

  it('does NOT flag a plain http URL (separate check via isHttpUrl)', () => {
    expect(isMaliciousUrl('http://example.com')).toBe(false)
  })

  it('returns false for null and undefined', () => {
    expect(isMaliciousUrl(null)).toBe(false)
    expect(isMaliciousUrl(undefined)).toBe(false)
  })
})

describe('isHttpUrl', () => {
  it('matches http:// (case-insensitive)', () => {
    expect(isHttpUrl('http://example.com')).toBe(true)
    expect(isHttpUrl('HTTP://example.com')).toBe(true)
  })

  it('does NOT match https://', () => {
    expect(isHttpUrl('https://example.com')).toBe(false)
  })

  it('returns false for null and undefined', () => {
    expect(isHttpUrl(null)).toBe(false)
    expect(isHttpUrl(undefined)).toBe(false)
  })
})

describe('hasSuspiciousHtml', () => {
  it('flags an HTML tag', () => {
    expect(hasSuspiciousHtml('<div>x</div>')).toBe(true)
  })

  it('does NOT flag chemistry notation (no letter after <)', () => {
    expect(hasSuspiciousHtml('contains <1% sodium')).toBe(false)
  })

  it('does NOT flag HTML entities (encoded variants)', () => {
    expect(hasSuspiciousHtml('&lt;script&gt;x&lt;/script&gt;')).toBe(false)
  })

  it('returns false for null and undefined', () => {
    expect(hasSuspiciousHtml(null)).toBe(false)
    expect(hasSuspiciousHtml(undefined)).toBe(false)
  })
})

describe('preview', () => {
  it('returns short text unchanged', () => {
    expect(preview('short text')).toBe('short text')
  })

  it('truncates at max with ellipsis', () => {
    expect(preview('a'.repeat(100), 10)).toBe(`${'a'.repeat(10)}…`)
  })
})
