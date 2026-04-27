import { BrevoClient } from '@getbrevo/brevo'

import { logger } from '../../lib/logger'

export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
  const client = new BrevoClient({ apiKey: Bun.env.BREVO_API_KEY ?? '' })

  try {
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: 'Aurore', email: 'noreply@votre-domaine.com' },
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
