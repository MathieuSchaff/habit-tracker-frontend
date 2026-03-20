import { Resend } from 'resend'

export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
  const resend = new Resend(Bun.env.RESEND_API_KEY)
  try {
    await resend.emails.send({
      from: 'Aurore <noreply@votre-domaine.com>',
      to,
      subject: 'Confirme ton adresse email — Aurore',
      html: `
        <p>Bonjour,</p>
        <p>Clique sur le lien ci-dessous pour confirmer ton adresse email :</p>
        <p><a href="${verificationUrl}">Vérifier mon email</a></p>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si tu n'as pas créé de compte sur Aurore, ignore cet email.</p>
      `,
    })
  } catch (e) {
    console.error('Failed to send verification email:', e)
  }
}
