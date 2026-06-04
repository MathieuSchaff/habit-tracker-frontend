// CHECK mode: validate per-category hit rates against TAG_HIT_RATE_BUDGET and
// return the FAIL count. Tags absent from the budget table FAIL (explicit budget
// required for every emitter; hardened 2026-05-13 after A3 baseline).

import { AUTO_TAG_ELIGIBLE_CATEGORIES } from '../../orchestrator'
import { type BudgetCategory, TAG_HIT_RATE_BUDGET } from '../../passes/tag-budgets'
import { pad, rpad } from '../fmt'
import type { AuditState } from './stats'

interface CheckRow {
  slug: string
  category: string
  hitRate: number
  budget: string
  status: 'OK' | 'FAIL' | 'WARN'
  reason?: string
}

function checkCategoryTags(cat: BudgetCategory, state: AuditState, rows: CheckRow[]): number {
  const bucket = state.tagFreqByCategory.get(cat)
  const inciCount = state.withInciByCategory.get(cat) ?? 0
  if (!bucket || inciCount === 0) return 0
  const catBudget = TAG_HIT_RATE_BUDGET[cat] ?? {}
  let fails = 0
  for (const [slug, s] of bucket.entries()) {
    const rate = s.hit / inciCount
    const budget = catBudget[slug as keyof typeof catBudget]
    if (!budget) {
      rows.push({
        slug,
        category: cat,
        hitRate: rate,
        budget: '—',
        status: 'FAIL',
        reason: `no budget entry (add to TAG_HIT_RATE_BUDGET.${cat})`,
      })
      fails++
      continue
    }
    const budgetStr =
      budget.min !== undefined
        ? `${(budget.min * 100).toFixed(0)}–${(budget.max * 100).toFixed(0)}%`
        : `≤${(budget.max * 100).toFixed(0)}%`
    if (rate > budget.max) {
      rows.push({
        slug,
        category: cat,
        hitRate: rate,
        budget: budgetStr,
        status: 'FAIL',
        reason: `${(rate * 100).toFixed(1)}% > ${(budget.max * 100).toFixed(0)}%`,
      })
      fails++
    } else if (budget.min !== undefined && rate < budget.min) {
      rows.push({
        slug,
        category: cat,
        hitRate: rate,
        budget: budgetStr,
        status: 'FAIL',
        reason: `${(rate * 100).toFixed(1)}% < ${(budget.min * 100).toFixed(0)}%`,
      })
      fails++
    } else {
      rows.push({ slug, category: cat, hitRate: rate, budget: budgetStr, status: 'OK' })
    }
  }
  // Required tags (min set) that fired zero times.
  for (const slug of Object.keys(catBudget)) {
    const b = catBudget[slug as keyof typeof catBudget]
    if (b?.min !== undefined && !bucket.has(slug)) {
      rows.push({
        slug,
        category: cat,
        hitRate: 0,
        budget: `${(b.min * 100).toFixed(0)}–${(b.max * 100).toFixed(0)}%`,
        status: 'FAIL',
        reason: `0% < ${(b.min * 100).toFixed(0)}% (silent required tag)`,
      })
      fails++
    }
  }
  return fails
}

export function runCheck(state: AuditState): number {
  console.log(`\n🛂 CHECK · validate hit rates vs TAG_HIT_RATE_BUDGET`)
  const rows: CheckRow[] = []
  let failCount = 0
  for (const cat of AUTO_TAG_ELIGIBLE_CATEGORIES) {
    failCount += checkCategoryTags(cat as BudgetCategory, state, rows)
  }
  rows.sort((a, b) => {
    const order = { FAIL: 0, WARN: 1, OK: 2 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    return b.hitRate - a.hitRate
  })
  console.log(
    `\n   ${pad('tag_slug', 28)} ${pad('category', 10)} ${rpad('rate', 7)} ${rpad('budget', 10)} status`
  )
  console.log(
    `   ${'─'.repeat(28)} ${'─'.repeat(10)} ${'─'.repeat(7)} ${'─'.repeat(10)} ${'─'.repeat(6)}`
  )
  for (const r of rows) {
    const icon = r.status === 'FAIL' ? '❌' : r.status === 'WARN' ? '⚠️ ' : '✅'
    const reason = r.reason ? ` · ${r.reason}` : ''
    console.log(
      `   ${pad(r.slug, 28)} ${pad(r.category, 10)} ${rpad(`${(r.hitRate * 100).toFixed(1)}%`, 7)} ${rpad(r.budget, 10)} ${icon} ${r.status}${reason}`
    )
  }
  const fails = rows.filter((r) => r.status === 'FAIL').length
  const warns = rows.filter((r) => r.status === 'WARN').length
  const oks = rows.filter((r) => r.status === 'OK').length
  console.log(`\n   Summary: ${oks} OK · ${warns} WARN · ${fails} FAIL`)
  return failCount
}
