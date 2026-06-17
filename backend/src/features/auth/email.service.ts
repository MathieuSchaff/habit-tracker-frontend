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

// Sent on the existing-email signup branch so the truth (an account already
// exists) reaches the owner by email instead of the HTTP response; the response
// stays identical to the new-email branch. See ADR 0009.
export async function sendAlreadyRegisteredEmail(to: string): Promise<void> {
  try {
    const client = new BrevoClient({ apiKey: env.BREVO_API_KEY })
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM_EMAIL },
      to: [{ email: to }],
      subject: 'Tentative de création de compte — Aurore',
      htmlContent: `
        <p>Bonjour,</p>
        <p>Une inscription vient d'être tentée avec cette adresse, mais un compte Aurore existe déjà.</p>
        <p>Si c'était vous, connectez-vous directement. En cas de mot de passe oublié, réinitialisez-le depuis la page de connexion.</p>
        <p>Si ce n'était pas vous, ignorez cet email : aucun nouveau compte n'a été créé.</p>
      `,
    })
  } catch (e) {
    logger.error({ err: e }, 'Failed to send already-registered email')
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  try {
    const client = new BrevoClient({ apiKey: env.BREVO_API_KEY })
    await client.transactionalEmails.sendTransacEmail({
      sender: { name: env.MAIL_FROM_NAME, email: env.MAIL_FROM_EMAIL },
      to: [{ email: to }],
      subject: 'Réinitialisation de votre mot de passe — Aurore',
      htmlContent: `
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :</p>
        <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.</p>
      `,
    })
  } catch (e) {
    logger.error({ err: e }, 'Failed to send password-reset email')
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
