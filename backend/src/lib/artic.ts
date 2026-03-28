import { Google } from 'arctic'

function getEnvVar(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

let googleInstance: Google | null = null

export function getGoogleInstance(): Google {
  if (!googleInstance) {
    googleInstance = new Google(
      getEnvVar('GOOGLE_CLIENT_ID'),
      getEnvVar('GOOGLE_CLIENT_SECRET'),
      getEnvVar('GOOGLE_REDIRECT_URI')
    )
  }
  return googleInstance
}
