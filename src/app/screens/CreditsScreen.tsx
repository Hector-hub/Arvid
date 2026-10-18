import { BackLink, Panel } from '../design/components';

/** Recursos de terceros y propios incluidos en la app (spec 05, LIC-02; detalle en asset-licenses.md). */
const CREDITS: { group: string; items: { what: string; who: string; license: string }[] }[] = [
  {
    group: 'Escena y protagonistas',
    items: [
      { what: 'Warped City: ciudad, vehículos y protagonista Ella', who: 'Luis Zuno (Ansimuz)', license: 'Dominio público' },
      { what: 'Streets of Fight: protagonista Ella 2 (Brawler Girl)', who: 'Luis Zuno (Ansimuz)', license: 'CC0' },
      { what: 'Free Townspeople Cyberpunk: peatones', who: 'CraftPix.net', license: 'Licencia gratuita de CraftPix' },
      { what: 'Free Drones Pack: dron', who: 'CraftPix.net', license: 'Licencia gratuita de CraftPix' },
      { what: 'Protagonistas Él y Él 2', who: 'ARVID (creados con sprite-ai.art)', license: 'Propios' },
    ],
  },
  {
    group: 'Música',
    items: [
      { what: 'Midnight Sector Drive y Glass Tower Horizon', who: 'ARVID (creadas con Gemini)', license: 'Propias' },
    ],
  },
  {
    group: 'Interfaz',
    items: [
      { what: '1-Bit Pack: iconos', who: 'Kenney', license: 'CC0' },
      { what: 'Pixelify Sans', who: 'Stefie Justprince', license: 'OFL 1.1' },
      { what: 'Atkinson Hyperlegible Next', who: 'Braille Institute', license: 'OFL 1.1' },
      { what: 'Paleta Sweetie 16', who: 'GrafxKid', license: 'Uso libre' },
    ],
  },
];

export function CreditsScreen() {
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/ajustes" label="Ajustes" />
      <h1>Créditos</h1>
      {CREDITS.map((section) => (
        <Panel key={section.group} className="stack">
          <h2>{section.group}</h2>
          <ul className="stack" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {section.items.map((item) => (
              <li key={item.what}>
                <p>{item.what}</p>
                <p className="small muted">
                  {item.who} · {item.license}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
