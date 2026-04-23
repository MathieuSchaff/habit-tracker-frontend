/**
 * Validateur complet et correcteur de markdown pour les seeds d'ingrédients
 *
 * Gère :
 * - Suppression de l'indentation
 * - Validation des listes (✅/⛔ sans marqueur)
 * - Validation des tableaux
 * - Détection des formules LaTeX
 * - Validation des longueurs (description max 5000, content max 100000)
 * - Rapport détaillé des problèmes
 *
 * Utilisation :
 *
 * import { validateAllIngredients, printValidationReport } from './validators/markdown-validator'
 *
 * const validation = validateAllIngredients(ingredientData)
 * printValidationReport(validation)
 * const correctedData = validation.fixed
 */

// TYPES

export interface IngredientSeed {
  name: string
  slug: string
  type: string
  category: string
  description: string
  content: string
}

export interface ValidationResult {
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

// CORE VALIDATION FUNCTIONS

/**
 * Corrige l'indentation du markdown
 * Détecte le minimum d'espaces au début de chaque ligne et les supprime
 */
function fixMarkdownIndentation(markdown: string): {
  fixed: string
  issues: string[]
} {
  const issues: string[] = []
  let fixed = markdown

  // Divise en lignes
  const lines = fixed.split('\n')
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)

  if (nonEmptyLines.length === 0) {
    return { fixed, issues }
  }

  // Trouve le nombre minimum d'espaces au début des lignes non-vides
  const leadingSpaces = nonEmptyLines.map((line) => {
    const match = line.match(/^(\s*)/)
    return match ? match[1].length : 0
  })

  const minIndent = Math.min(...leadingSpaces)

  // Si tout a au moins N espaces, on les retire
  if (minIndent > 0) {
    fixed = lines.map((line) => (line.length > 0 ? line.substring(minIndent) : line)).join('\n')

    issues.push(`Indentation détectée et corrigée (${minIndent} espaces)`)
  }

  return { fixed, issues }
}

/**
 * Valide les listes markdown
 * Détecte les lignes avec ✅ ou ⛔ qui n'ont pas de marqueur de liste (- ou *)
 */
function validateLists(markdown: string): string[] {
  const issues: string[] = []
  const lines = markdown.split('\n')

  const badListLines = lines.filter((line) => {
    const trimmed = line.trim()
    // Détecte ✅ ou ⛔ au début, mais pas de - ou *
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

/**
 * Valide les tableaux markdown
 * Vérifie que la deuxième ligne est bien une ligne de séparation |---|---|
 */
function validateTables(markdown: string): string[] {
  const issues: string[] = []
  const lines = markdown.split('\n')

  // Trouve toutes les lignes qui commencent par |
  const tableLineIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|')) {
      tableLineIndices.push(i)
    }
  }

  if (tableLineIndices.length === 0) {
    return issues
  }

  // Vérifie les tableaux (première ligne est header, deuxième est séparation)
  for (let i = 0; i < tableLineIndices.length - 1; i++) {
    const headerIdx = tableLineIndices[i]
    const nextIdx = tableLineIndices[i + 1]

    // Si la prochaine ligne de tableau est directement après, c'est la séparation
    if (nextIdx === headerIdx + 1) {
      const separatorLine = lines[nextIdx].trim()
      // Doit être comme |---|---|---|
      if (!separatorLine.match(/^\|[\s\-|]*\|$/)) {
        issues.push(`⚠️  Tableau à ligne ${headerIdx + 1}: ligne de séparation invalide`)
        issues.push(`   Reçu: "${separatorLine.substring(0, 60)}..."`)
        issues.push(`   Attendu: |---|---|---|`)
      }
    }
  }

  return issues
}

/**
 * Détecte les formules LaTeX brutes
 */
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

/**
 * Valide un seul ingrédient
 */
function validateIngredient(ing: IngredientSeed): {
  valid: boolean
  errors: string[]
  warnings: string[]
  fixed: IngredientSeed
} {
  const errors: string[] = []
  const warnings: string[] = []
  let fixedContent = ing.content

  // Validation des champs obligatoires

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

  // Validation des longueurs

  const MAX_DESCRIPTION = 5000
  const MAX_CONTENT = 100000

  if (ing.description.length > MAX_DESCRIPTION) {
    errors.push(`❌ description trop long: ${ing.description.length}/${MAX_DESCRIPTION} caractères`)
  }

  if (ing.content.length > MAX_CONTENT) {
    errors.push(`❌ content trop long: ${ing.content.length}/${MAX_CONTENT} caractères`)
  }

  // Correction du markdown

  const { fixed, issues: indentationIssues } = fixMarkdownIndentation(ing.content)
  fixedContent = fixed
  indentationIssues.forEach((issue) => warnings.push(issue))

  // Validation des listes

  const listIssues = validateLists(fixedContent)
  listIssues.forEach((issue) => warnings.push(issue))

  // Validation des tableaux

  const tableIssues = validateTables(fixedContent)
  tableIssues.forEach((issue) => warnings.push(issue))

  // Détection LaTeX

  const latexIssues = detectLatex(fixedContent)
  latexIssues.forEach((issue) => warnings.push(issue))

  // Résultat final

  const valid = errors.length === 0
  const fixedIng = { ...ing, content: fixedContent }

  return {
    valid,
    errors,
    warnings,
    fixed: fixedIng,
  }
}

// PUBLIC API

/**
 * Valide TOUS les ingrédients et retourne les versions corrigées
 *
 * @param ingredients - Array d'ingrédients à valider
 * @returns Objet avec summary, results détaillés, et fixed (ingrédients corrigés)
 */
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

/**
 * Affiche un rapport formaté et lisible de la validation
 *
 * @param results - Résultats de validateAllIngredients()
 */
export function printValidationReport(results: AllValidationResults): void {
  console.log(`\n${'='.repeat(70)}`)
  console.log('📊 RAPPORT DE VALIDATION DES INGRÉDIENTS')
  console.log(`${'='.repeat(70)}\n`)

  // Résumé

  console.log('📈 Résumé:')
  console.log(`   Total         : ${results.summary.total}`)
  console.log(`   ✅ Valides    : ${results.summary.valid}/${results.summary.total}`)
  console.log(`   ⚠️  Warnings  : ${results.summary.warnings}`)
  console.log()

  // Détails par ingrédient

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

  // Résumé final

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

/**
 * Affiche un rapport court (résumé uniquement)
 *
 * @param results - Résultats de validateAllIngredients()
 */
export function printValidationSummary(results: AllValidationResults): void {
  const errorCount = results.results.reduce((acc, r) => acc + r.errors.length, 0)
  const warningCount = results.results.reduce((acc, r) => acc + r.warnings.length, 0)

  console.log('\n📊 Validation Summary:')
  console.log(`   Total   : ${results.summary.total}`)
  console.log(`   Valid   : ${results.summary.valid}`)
  console.log(`   Errors  : ${errorCount}`)
  console.log(`   Warnings: ${warningCount}\n`)
}

// EXEMPLE D'UTILISATION

/**
 * EXEMPLE :
 *
 * import { validateAllIngredients, printValidationReport } from './markdown-validator'
 * import { ingredientData } from './ingredients/ingredient-data'
 *
 * const validation = validateAllIngredients(ingredientData)
 * printValidationReport(validation)
 *
 * // Utilise les ingrédients corrigés
 * const correctedIngredients = validation.fixed
 *
 * // Ou juste le résumé
 * printValidationSummary(validation)
 *
 * // Accès aux détails
 * validation.results.forEach(result => {
 *   if (!result.valid) {
 *     console.error(`${result.name}: ${result.errors.join(', ')}`)
 *   }
 * })
 */
