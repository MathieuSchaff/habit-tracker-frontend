import { unsafeEmail, unsafePassword } from './unsafe'

export const TEST_CREDENTIALS = {
  toto: {
    email: unsafeEmail('toto@exemple.fr'),
    rawEmail: 'toto@exemple.fr',
    password: unsafePassword('Toto123!bien'),
    rawPassword: 'Toto123!bien',
  },

  // Toto email variants (for testing normalization)
  totoVariants: {
    majuscules: unsafeEmail('TOTO@EXEMPLE.FR'),
    avecEspaces: unsafeEmail('  toto@exemple.fr  '),
    casseMelangee: unsafeEmail('ToTo@eXeMpLe.Fr'),
    accent: unsafeEmail('tôtô@exemple.fr'),
  },

  // Cases that should fail / common errors
  invalide: {
    emailInconnu: unsafeEmail('tata@introuvable.fr'),
    mauvaisMotDePasse: unsafePassword('Tata456!'),
    motDePasseTropCourt: unsafePassword('To1!'),
    motDePasseFaible: unsafePassword('toto123'),
    sansMajuscule: unsafePassword('toto123!'),
    sansChiffre: unsafePassword('TotoToto!!!'),
    sansCaractereSpecial: unsafePassword('TotoToto123'),
    videEmail: unsafeEmail(''),
    videMotDePasse: unsafePassword(''),
  },

  admin: {
    email: unsafeEmail('admin@exemple.fr'),
    rawEmail: 'admin@exemple.fr',
    password: unsafePassword('Admin123!super'),
    rawPassword: 'Admin123!super',
  },

  contributor: {
    email: unsafeEmail('contributor@exemple.fr'),
    rawEmail: 'contributor@exemple.fr',
    password: unsafePassword('Contrib123!ok'),
    rawPassword: 'Contrib123!ok',
  },

  // Another regular user (for multi-account tests)
  alice: {
    email: unsafeEmail('alice.dupont@gmail.fr'),
    rawEmail: 'alice.dupont@gmail.fr',
    password: unsafePassword('ChatMiaou2025!'),
    rawPassword: 'ChatMiaou2025!',
  },

  // Bonus: a user with a hyphenated name
  jeanmichel: {
    email: unsafeEmail('jean-michel.durand@free.fr'),
    rawEmail: 'jean-michel.durand@free.fr',
    password: unsafePassword('Baguette75!'),
    rawPassword: 'Baguette75!',
  },
} as const
