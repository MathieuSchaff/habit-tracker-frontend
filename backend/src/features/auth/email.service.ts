import { Resend } from 'resend'

export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
  const resend = new Resend(Bun.env.RESEND_API_KEY)
  try {
    await resend.emails.send({
      from: 'Aurore <noreply@votre-domaine.com>',
      to,
      subject: 'Confirmez votre adresse email — Aurore',
      html: `
        <p>Bonjour,</p>
        <p>Cliquez sur le lien ci-dessous pour confirmer votre adresse email :</p>
        <p><a href="${verificationUrl}">Vérifier mon email</a></p>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'avez pas créé de compte sur Aurore, ignorez cet email.</p>
      `,
    })
  } catch (e) {
    console.error('Failed to send verification email:', e)
  }
}
