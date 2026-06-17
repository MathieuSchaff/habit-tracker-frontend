import { BrevoClient } from '@getbrevo/brevo'

import { env } from '../../config/env'
import { logger } from '../../lib/logger'

export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
  const client = new BrevoClient({ apiKey: env.BREVO_API_KEY })

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM_EMAIL },
      to: [{ email: to }],
      subject: 'Confirmez votre adresse email — Aurore',
      htmlContent: `
        <p>Bonjour,</p>
        <p>Cliquez sur le lien ci-dessous pour confirmer votre adresse email :</p>
        <p><a href="${verificationUrl}">Vérifier mon email</a></p>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'avez pas créé de compte sur Aurore, ignorez cet email.</p>
      `,
    })
  } catch (e) {
    logger.error({ err: e }, 'Failed to send verification email')
  }
}

export async function sendAccountLockedEmail(to: string): Promise<void> {
  try {
    const client = new BrevoClient({ apiKey: env.BREVO_API_KEY })
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM_EMAIL },
      to: [{ email: to }],
      subject: 'Activité inhabituelle sur votre compte — Aurore',
      htmlContent: `
        <p>Bonjour,</p>
        <p>Plusieurs tentatives de connexion infructueuses ont été détectées sur votre compte. Par précaution, il est temporairement verrouillé pendant 15 minutes.</p>
        <p>Si c'était vous, réessayez plus tard. Sinon, nous vous conseillons de changer votre mot de passe dès que possible.</p>
      `,
    })
  } catch (e) {
    logger.error({ err: e }, 'Failed to send account-locked email')
  }
}
