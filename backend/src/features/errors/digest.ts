import { BrevoClient } from '@getbrevo/brevo'

import { env } from '../../config/env'
import type { DB } from '../../db/index'
import { logger } from '../../lib/logger'
import { getNewErrorGroupsSince, type NewErrorGroup } from './service'

const WINDOW_HOURS = 24
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000

export interface DigestResult {
  sent: boolean
  count: number
  reason?: 'no-recipient' | 'no-new-errors'
}

export type DigestSender = (msg: { to: string; subject: string; html: string }) => Promise<void>

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function buildDigestEmail(groups: NewErrorGroup[]): { subject: string; html: string } {
  const n = groups.length
  const plural = n > 1 ? 'x' : ''
  const subject = `Aurore — ${n} nouveau${plural} groupe${n > 1 ? 's' : ''} d'erreurs (${WINDOW_HOURS} h)`

  const rows = groups
    .map((g) => {
      const users =
        g.affectedUsers > 0
          ? ` · ${g.affectedUsers} utilisateur${g.affectedUsers > 1 ? 's' : ''}`
          : ''
      return `<li><strong>[${g.source}]</strong> ${escapeHtml(g.message)} — ${g.count} occurrence${g.count > 1 ? 's' : ''}${users}</li>`
    })
    .join('')

  const html = `
    <p>${n} nouveau${plural} groupe${n > 1 ? 's' : ''} d'erreurs sur les dernières ${WINDOW_HOURS} h :</p>
    <ul>${rows}</ul>
    <p><a href="${env.FRONTEND_URL}/admin/errors">Voir le détail dans l'admin</a></p>
  `
  return { subject, html }
}

async function brevoSend(msg: { to: string; subject: string; html: string }): Promise<void> {
  const client = new BrevoClient({ apiKey: env.BREVO_API_KEY })
  await client.transactionalEmails.sendTransacEmail({
    sender: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM_EMAIL },
    to: [{ email: msg.to }],
    subject: msg.subject,
    htmlContent: msg.html,
  })
}

// Failure NOT swallowed (unlike auth/email.service.ts) so the cron entrypoint exits non-zero.
export async function sendErrorDigest(
  db: DB,
  opts: { now?: Date; recipient?: string; send?: DigestSender } = {}
): Promise<DigestResult> {
  const recipient = opts.recipient ?? env.ADMIN_EMAIL
  if (!recipient) {
    logger.warn('error digest skipped: no recipient (ADMIN_EMAIL unset)')
    return { sent: false, count: 0, reason: 'no-recipient' }
  }

  const now = opts.now ?? new Date()
  const sinceISO = new Date(now.getTime() - WINDOW_MS).toISOString()
  const groups = await getNewErrorGroupsSince(db, sinceISO)
  if (groups.length === 0) return { sent: false, count: 0, reason: 'no-new-errors' }

  const { subject, html } = buildDigestEmail(groups)
  await (opts.send ?? brevoSend)({ to: recipient, subject, html })
  return { sent: true, count: groups.length }
}
