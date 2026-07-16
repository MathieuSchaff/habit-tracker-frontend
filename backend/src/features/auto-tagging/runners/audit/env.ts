// Parsed audit env flags. Single source so main.ts (header + dispatch) and
// stats.ts (state builders) read identical values. Per-flag semantics: see the
// header comment in main.ts.
import { parseIntEnv } from '../cli-args'

export const CONF_OVERRIDE = process.env.CONF_OVERRIDE ? Number(process.env.CONF_OVERRIDE) : null
export const CSV_OUT = process.env.CSV_OUT
export const LIMIT = parseIntEnv('LIMIT')
export const INCLUDE_DROPPED = process.env.INCLUDE_DROPPED === '1'
export const DUMP_BUDGETS = process.env.DUMP_BUDGETS === '1'
export const CHECK = process.env.CHECK === '1'
export const DUMP_BENEFITS = process.env.DUMP_BENEFITS === '1'
export const BENEFITS_OUT = process.env.BENEFITS_OUT
export const DISABLE_FLOORS = process.env.DISABLE_FLOORS === '1'
