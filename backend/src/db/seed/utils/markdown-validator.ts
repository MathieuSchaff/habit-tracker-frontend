import type { IngredientType } from '@aurore/shared'

export interface IngredientSeed {
  name: string
  slug: string
  type: IngredientType
  category: string
  description: string
  content: string
}

interface ValidationResult {
  name: string
  slug: string
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface AllValidationResults {
  summary: {
    total: number
    valid: number
    warnings: number
  }
  results: ValidationResult[]
  fixed: IngredientSeed[]
}

function fixMarkdownIndentation(markdown: string): {
  fixed: string
  issues: string[]
} {
  const issues: string[] = []
  let fixed = markdown

  const lines = fixed.split('\n')
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)

  if (nonEmptyLines.length === 0) {
    return { fixed, issues }
  }

  const leadingSpaces = nonEmptyLines.map((line) => {
    const match = line.match(/^(\s*)/)
    return match ? match[1].length : 0
  })

  const minIndent = Math.min(...leadingSpaces)

  if (minIndent > 0) {
    fixed = lines.map((line) => (line.length > 0 ? line.substring(minIndent) : line)).join('\n')

    issues.push(`Indentation détectée et corrigée (${minIndent} espaces)`)
  }

  return { fixed, issues }
}

function validateLists(markdown: string): string[] {
  const issues: string[] = []
  const lines = markdown.split('\n')

  const badListLines = lines.filter((line) => {
    const trimmed = line.trim()
    return (
      trimmed.match(/^[✅⛔]/) &&
      !trimmed.startsWith('-') &&
      !trimmed.startsWith('*') &&
      !trimmed.startsWith('+')
    )
  })

  if (badListLines.length > 0) {
    issues.push(
      `⚠️  ${badListLines.length} ligne(s) de liste détectée(s) (✅/⛔) sans marqueur "-":`
    )
    badListLines.slice(0, 3).forEach((line) => {
      issues.push(`   "${line.trim().substring(0, 60)}..."`)
    })
  }

  return issues
}

function validateTables(markdown: string): string[] {
  const issues: string[] = []
  const lines = markdown.split('\n')

  const tableLineIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|')) {
      tableLineIndices.push(i)
    }
  }

  if (tableLineIndices.length === 0) {
    return issues
  }

  for (let i = 0; i < tableLineIndices.length - 1; i++) {
    const headerIdx = tableLineIndices[i]
    const nextIdx = tableLineIndices[i + 1]

    if (nextIdx === headerIdx + 1) {
      const separatorLine = lines[nextIdx].trim()
      if (!separatorLine.match(/^\|[\s\-|]*\|$/)) {
        issues.push(`⚠️  Tableau à ligne ${headerIdx + 1}: ligne de séparation invalide`)
        issues.push(`   Reçu: "${separatorLine.substring(0, 60)}..."`)
        issues.push(`   Attendu: |---|---|---|`)
      }
    }
  }

  return issues
}

function detectLatex(markdown: string): string[] {
  const issues: string[] = []

  const latexPatterns = [
    { pattern: /\\frac/g, name: '\\frac' },
    { pattern: /\\alpha/g, name: '\\alpha' },
    { pattern: /\\beta/g, name: '\\beta' },
    { pattern: /\\gamma/g, name: '\\gamma' },
    { pattern: /\\sqrt/g, name: '\\sqrt' },
    { pattern: /\\sum/g, name: '\\sum' },
    { pattern: /\\int/g, name: '\\int' },
  ]

  const foundPatterns = latexPatterns.filter((p) => p.pattern.test(markdown))

  if (foundPatterns.length > 0) {
    const patternNames = foundPatterns.map((p) => p.name).join(', ')
    issues.push(`⚠️  Formules LaTeX détectées (${patternNames})`)
    issues.push(`   Tu dois ajouter KaTeX au frontend ou utiliser Unicode (α, β, γ, etc.)`)
  }

  return issues
}

function validateIngredient(ing: IngredientSeed): {
  valid: boolean
  errors: string[]
  warnings: string[]
  fixed: IngredientSeed
} {
  const errors: string[] = []
  const warnings: string[] = []
  let fixedContent = ing.content

  if (!ing.name?.trim()) {
    errors.push('❌ name est obligatoire')
  }

  if (!ing.slug?.trim()) {
    errors.push('❌ slug est obligatoire')
  }

  if (!ing.category?.trim()) {
    errors.push('❌ category est obligatoire')
  }

  // Stubs (dental/haircare placeholders) have empty description+content intentionally.
  // Skip content validation to avoid noisy errors during seeding.
  const isStub = !ing.description?.trim() && !ing.content?.trim()
  if (isStub) {
    return { valid: true, errors: [], warnings: [], fixed: ing }
  }

  if (!ing.description?.trim()) {
    errors.push('❌ description est obligatoire')
  }

  if (!ing.content?.trim()) {
    errors.push('❌ content est obligatoire')
  }

  const MAX_DESCRIPTION = 5000
  const MAX_CONTENT = 100000

  if (ing.description.length > MAX_DESCRIPTION) {
    errors.push(`❌ description trop long: ${ing.description.length}/${MAX_DESCRIPTION} caractères`)
  }

  if (ing.content.length > MAX_CONTENT) {
    errors.push(`❌ content trop long: ${ing.content.length}/${MAX_CONTENT} caractères`)
  }

  const { fixed, issues: indentationIssues } = fixMarkdownIndentation(ing.content)
  fixedContent = fixed
  warnings.push(...indentationIssues)

  warnings.push(...validateLists(fixedContent))
  warnings.push(...validateTables(fixedContent))
  warnings.push(...detectLatex(fixedContent))

  const valid = errors.length === 0
  const fixedIng = { ...ing, content: fixedContent }

  return {
    valid,
    errors,
    warnings,
    fixed: fixedIng,
  }
}

export function validateAllIngredients(ingredients: IngredientSeed[]): AllValidationResults {
  const results: ValidationResult[] = []
  const fixed: IngredientSeed[] = []
  let validCount = 0
  let warningCount = 0

  for (const ing of ingredients) {
    const validation = validateIngredient(ing)

    results.push({
      name: ing.name,
      slug: ing.slug,
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    })

    fixed.push(validation.fixed)

    if (validation.valid) {
      validCount++
    }
    if (validation.warnings.length > 0) {
      warningCount++
    }
  }

  return {
    summary: {
      total: ingredients.length,
      valid: validCount,
      warnings: warningCount,
    },
    results,
    fixed,
  }
}

export function printValidationReport(results: AllValidationResults): void {
  console.log(`\n${'='.repeat(70)}`)
  console.log('📊 RAPPORT DE VALIDATION DES INGRÉDIENTS')
  console.log(`${'='.repeat(70)}\n`)

  console.log('📈 Résumé:')
  console.log(`   Total         : ${results.summary.total}`)
  console.log(`   ✅ Valides    : ${results.summary.valid}/${results.summary.total}`)
  console.log(`   ⚠️  Warnings  : ${results.summary.warnings}`)
  console.log()

  let errorCount = 0
  let warningCount = 0

  for (const result of results.results) {
    const statusIcon = result.valid ? '✅' : '❌'
    console.log(`${statusIcon} ${result.name} (${result.slug})`)

    if (result.errors.length > 0) {
      console.log('   Erreurs:')
      result.errors.forEach((e) => {
        console.log(`      ${e}`)
        errorCount++
      })
    }

    if (result.warnings.length > 0) {
      console.log('   Warnings:')
      result.warnings.forEach((w) => {
        console.log(`      ${w}`)
        warningCount++
      })
    }

    if (result.errors.length > 0 || result.warnings.length > 0) {
      console.log()
    }
  }

  console.log('='.repeat(70))
  if (errorCount === 0) {
    console.log(`✨ Aucune erreur critique - Tous les ingrédients sont valides`)
  } else {
    console.log(`⚠️  ${errorCount} erreur(s) détectée(s)`)
  }
  if (warningCount > 0) {
    console.log(`📝 ${warningCount} warning(s) à vérifier`)
  }
  console.log(`${'='.repeat(70)}\n`)
}
