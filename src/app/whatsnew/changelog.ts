// Novedades por versión (2.1.0): MAYOR.MEDIA.MENOR. La mayor trae lo grande, la media funciones nuevas y la menor
// correcciones, descritas de forma general (sin detallar el fallo). Se añade una entrada en cada versión.
import type { Locale } from '../../i18n';

export type ChangeKind = 'major' | 'feature' | 'fix';

export interface Release {
  version: string;
  kind: ChangeKind;
  items: Record<Locale, string[]>;
}

/** De la más nueva a la más antigua. */
export const RELEASES: Release[] = [
  {
    version: '2.1.0',
    kind: 'feature',
    items: {
      es: ['Toca la versión en Ajustes para ver las novedades de ARVID.'],
      en: ["Tap the version in Settings to see what's new in ARVID."],
    },
  },
  {
    version: '2.0.3',
    kind: 'fix',
    items: {
      es: ['Mejoras en la página Sonido.', 'Mejoras en Ajustes.'],
      en: ['Improvements to the Sound page.', 'Improvements to Settings.'],
    },
  },
  {
    version: '2.0.2',
    kind: 'fix',
    items: {
      es: ['Mejoras en el reproductor de música.'],
      en: ['Improvements to the music player.'],
    },
  },
  {
    version: '2.0.1',
    kind: 'fix',
    items: {
      es: ['Mejoras en el chat con ARVID.', 'Mejoras en el reproductor de música.'],
      en: ['Improvements to the chat with ARVID.', 'Improvements to the music player.'],
    },
  },
  {
    version: '2.0.0',
    kind: 'major',
    items: {
      es: [
        'Cuenta sin email ni contraseña, con Face ID, huella o una clave de recuperación, y copia en la nube cifrada.',
        'Amigos: invítalos con un enlace; tu código les ayuda a reconocerte.',
        'Retos en equipo: crea un reto, invita a tus amigos y avanzad juntos con un marcador compartido.',
        'Avisos de invitaciones y del progreso de tus retos.',
        'Nueva página Sonido, con la lista de canciones y sus portadas.',
        'Ajustes, Perfil, Categorías, Amigos y el inicio, rediseñados.',
      ],
      en: [
        'An account with no email or password, using Face ID, fingerprint or a recovery key, with an encrypted cloud backup.',
        'Friends: invite them with a link; your code helps them recognise you.',
        'Team challenges: create one, invite your friends and move forward together on a shared scoreboard.',
        'Notifications for invites and your challenges’ progress.',
        'A new Sound page, with the track list and their covers.',
        'Settings, Profile, Categories, Friends and onboarding, redesigned.',
      ],
    },
  },
];
