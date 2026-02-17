import { unsafeEmail, unsafePassword } from './unsafe'

export const TEST_CREDENTIALS = {
  toto: {
    email: unsafeEmail('toto@exemple.fr'),
    rawEmail: 'toto@exemple.fr',
    password: unsafePassword('Toto123!bien'),
    rawPassword: 'Toto123!bien',
  },

  // Variantes de l'email de Toto (pour tester la normalisation)
  totoVariants: {
    majuscules: unsafeEmail('TOTO@EXEMPLE.FR'),
    avecEspaces: unsafeEmail('  toto@exemple.fr  '),
    casseMelangee: unsafeEmail('ToTo@eXeMpLe.Fr'),
    accent: unsafeEmail('tôtô@exemple.fr'),
  },

  // Cas qui ne doivent pas marcher / erreurs fréquentes
  invalide: {
    emailInconnu: unsafeEmail('tata@introuvable.fr'),
    mauvaisMotDePasse: unsafePassword('Tata456!'),
    motDePasseTropCourt: unsafePassword('To1!'),
    motDePasseFaible: unsafePassword('toto123'),
    sansMajuscule: unsafePassword('toto123!'),
    sansChiffre: unsafePassword('TotoToto!!!'),
    videEmail: unsafeEmail(''),
    videMotDePasse: unsafePassword(''),
  },

  // Un autre utilisateur classique (pour les tests avec plusieurs comptes)
  alice: {
    email: unsafeEmail('alice.dupont@gmail.fr'),
    rawEmail: 'alice.dupont@gmail.fr',
    password: unsafePassword('ChatMiaou2025!'),
    rawPassword: 'ChatMiaou2025!',
  },

  // Bonus : un utilisateur avec nom composé
  jeanmichel: {
    email: unsafeEmail('jean-michel.durand@free.fr'),
    rawEmail: 'jean-michel.durand@free.fr',
    password: unsafePassword('Baguette75!'),
    rawPassword: 'Baguette75!',
  },
} as const
