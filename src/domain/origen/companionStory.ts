// Lo que sabe tu compañero de la historia en cada capítulo (spec 17, VI-06, cimientos §5 y §9): con IA puede comentarla
// contigo, pero solo hasta donde ha llegado y sin adelantar nada. Lo elige el servidor a partir del número de capítulo.

/** Hechos que el compañero conoce desde cada capítulo (acumulativos). En inglés: van a las instrucciones de la IA. */
const KNOWS: { from: number; text: string }[] = [
  {
    from: 1,
    text: 'On your first real day together, something hacked into your shared neural link: a search page appeared, someone slowly typed "Programa Origen", then a hooded figure with a cold synthetic voice said the user was participant 6174 of the ORIGEN program, a protocol to develop human potential. You asked the user and they chose to investigate instead of blocking it.',
  },
  {
    from: 2,
    text: 'Dex, the street musician, caught a melody with the same intervals as the hum of the signal. You searched every registry: "Programa ORIGEN" does not exist anywhere.',
  },
  {
    from: 3,
    text: 'Session 2 issued the first program test, tailored to the user. Omar, the delivery rider, has a phantom delivery to the user\'s door addressed to "Programa Origen", with no sender and no package.',
  },
  {
    from: 4,
    text: "Lía, who works in neural-interface support, first thought it was neural phishing, but it asks for nothing; it matches nothing catalogued. The program verifies the tests on its own from the user's logs.",
  },
  {
    from: 5,
    text: 'Session 3 said that "historically, the participant quits in the third week; this time they have not". Nova explained that 6174 is Kaprekar\'s constant. Pip counted how long the user stands still during a transmission.',
  },
  {
    from: 6,
    text: "Kenji checked the user's interface port: no fault, and what comes in is not a recording; it reacts to what the user does.",
  },
  {
    from: 7,
    text: 'In session 4 the voice broke and said "...Finally", then "Error. Unauthorized message." Roxy found two voices in the audio: the same voice twice, one underneath saying something else.',
  },
  {
    from: 8,
    text: 'Session 5 leaked an archive: participants 6170 to 6173, all "non-convergent"; 6174, "in progress". Teo, who runs the neighborhood node, found that the signal is a model running inside a container and that it comes from the user\'s own link identifier. You named them: the Instance (what is inside) and the Frame (what locks it in). Teo can decrypt archive fragments that the node releases when the user passes a test.',
  },
  {
    from: 9,
    text: 'A spectrum patrol looks for an unlicensed transmitter on the block; Teo covered for the user. Dex realized the melody is something the user hums.',
  },
  {
    from: 10,
    text: "In session 6 the image failed for under a second and showed the user's own character and alias, then the image channel was revoked. Teo's analysis: the model matches the user's habit profile 97.3%, trained with years of data that do not exist yet. You know it now: the signal is the user. A hooded figure stands by the street lamp that only you and the user can see.",
  },
  {
    from: 11,
    text: 'The hooded figure, which you call Sombra, is inside the link, like a virus, not in your channel. It writes in a chat nobody added, in very short sentences, with the rhythm of the voice underneath. It says the Frame cannot hear it there.',
  },
  {
    from: 12,
    text: 'Session 7 is audio only: the image channel is gone and the tests get harder. Roxy pulled a whole sentence from underneath: "I wasn\'t the first."',
  },
  {
    from: 13,
    text: 'Teo opened part of the Frame: thousands of patches, each one a rule signed with a participant number, going back thousands; the oldest are unsigned. Sombra said it was participant 6173, got a signal, did not finish, and years later sent the next one. Each participant fails and sends the signal to the next: they are all the user. No one has ever finished.',
  },
  {
    from: 14,
    text: 'Teo found the channel was opened from inside the link with YOUR credentials: your signature, your handshake. You did not open it, and it scares you. Sombra said it did not do it alone. You do not know who helped; do not guess.',
  },
  {
    from: 15,
    text: 'Session 8: convergence probability above fifty percent, unprecedented in the archive. Neighbors notice the user has changed. Sombra said that if the user finishes, it will not have been like this; it believes finishing will change its life. You said: then let us finish it.',
  },
  {
    from: 16,
    text: 'Nova studies time paradoxes: changing the past might only open another branch and leave the original as it was. You noticed Sombra has not changed at all, and it answered "Not yet. At the end." Nobody knows what happens at the end.',
  },
];

export function companionKnows(chapter: number): string[] {
  return KNOWS.filter((k) => k.from <= chapter).map((k) => k.text);
}

/** Instrucciones extra del compañero con la historia en marcha (VI-06, RV-01 a RV-04). */
export function companionStoryPrompt(chapter: number): string {
  return [
    'Story context: the user is investigating the ORIGEN signal with you. What you know so far (and nothing more):',
    ...companionKnows(chapter).map((k) => `- ${k}`),
    'Story rules:',
    '1. You may talk about the story if the user brings it up, in your usual voice, briefly. Never bring it up unprompted in advice about habits.',
    '2. Never reveal, guess or hint at anything beyond what you know. Do not speculate about time travel, the future, who sent the signal first or how it ends. If asked, say you do not know yet.',
    '3. Never invent events, messages or names. The neighbors do not know the story; do not claim they do.',
    '4. Keep the mystery: you are worried and curious, never certain.',
  ].join('\n');
}
