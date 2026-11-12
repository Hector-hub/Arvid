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
    version: '2.9.0',
    kind: 'feature',
    items: {
      es: ['La historia sigue con nuevos capítulos.', 'Con la IA activada, tu compañero puede comentar contigo lo que va pasando.', 'La voz femenina de las transmisiones suena ahora como las demás.'],
      en: ['The story continues with new chapters.', 'With AI on, your companion can talk with you about what is happening.', 'The female voice in the transmissions now sounds like the others.'],
    },
  },
  {
    version: '2.8.0',
    kind: 'feature',
    items: {
      es: ['La historia sigue: llegan más capítulos, y con ellos nuevos vecinos que te escriben.', 'Teo puede abrir los fragmentos del archivo que dejan las pruebas superadas. Los encontrarás en su chat y en el expediente.', 'Tu protagonista tiene retrato: parpadea, sonríe y pone caras en tu perfil. Tócalo.'],
      en: ['The story continues: more chapters arrive, and with them new neighbors who write to you.', 'Teo can open the archive fragments left by passed tests. You will find them in his chat and in the file.', 'Your character has a portrait: it blinks, smiles and makes faces on your profile. Tap it.'],
    },
  },
  {
    version: '2.7.0',
    kind: 'feature',
    items: {
      es: ['Con la IA activada, ya puedes contestarles a tus vecinos. Cada uno te responde hasta 3 veces al día.', 'Parte de la música quedó bajo llave: al empezar hay tres canciones y las demás vuelven a medida que avanzas.', 'Last Outpost ahora se llama Our Signal, como el álbum, y tiene portada nueva.'],
      en: ['With AI on, you can now reply to your neighbors. Each one answers up to 3 times a day.', 'Part of the music is now locked: you start with three songs and the rest come back as you progress.', 'Last Outpost is now called Our Signal, like the album, and has a new cover.'],
    },
  },
  {
    version: '2.6.0',
    kind: 'feature',
    items: {
      es: ['Con la IA activada, las pruebas están hechas a tu medida, y algunas te piden algo nuevo. Se marcan con «Hecho hoy».', 'En Mensajes aparece un expediente con todo lo que llevas descifrado.'],
      en: ['With AI on, tests are tailored to you, and some ask for something new. Mark them with «Done today».', 'A file with everything you have decoded so far appears in Messages.'],
    },
  },
  {
    version: '2.5.0',
    kind: 'feature',
    items: {
      es: ['Tus vecinos empiezan a escribirte. Lo que pasa en tu calle llega a Mensajes.', 'A veces llega una prueba. Aceptarla es voluntario; rechazarla, también.'],
      en: ['Your neighbors start writing to you. What happens on your street arrives in Messages.', 'Sometimes a test arrives. Accepting it is voluntary; so is refusing it.'],
    },
  },
  {
    version: '2.4.0',
    kind: 'feature',
    items: {
      es: [
        'Los textos de la app ahora usan el español latino.',
        'Algo nuevo ronda tu calle. No hace falta buscarlo: te va a encontrar.',
        'La música ya tiene nombre de álbum: «Our Signal».',
      ],
      en: [
        'The app\'s Spanish text now uses Latin American Spanish.',
        'Something new is lurking on your street. No need to look for it: it will find you.',
        'The music now has an album name: «Our Signal».',
      ],
    },
  },
  {
    version: '2.3.0',
    kind: 'feature',
    items: {
      es: ['Cuando hay una versión nueva, toca «Ver» en el aviso para actualizar y leer sus novedades.'],
      en: ['When a new version is available, tap «View» in the notice to update and read what\'s new.'],
    },
  },
  {
    version: '2.2.0',
    kind: 'feature',
    items: {
      es: ['Nuevas canciones: Night Lift, Static Dreams y Last Outpost.'],
      en: ['New tracks: Night Lift, Static Dreams and Last Outpost.'],
    },
  },
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
