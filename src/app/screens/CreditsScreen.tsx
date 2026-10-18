import { t, type TKey } from '../../i18n';
import { BackLink, Panel } from '../design/components';

type Credit = { what: string; who: string; license: string };

/** Recursos de terceros y propios incluidos en la app (spec 05, LIC-02; detalle en asset-licenses.md). */
function credits(): { group: TKey; items: Credit[] }[] {
  return [
    {
      group: 'credits.scene',
      items: [
        { what: t('credits.warped'), who: 'Luis Zuno (Ansimuz)', license: t('credits.publicDomain') },
        { what: t('credits.streets'), who: 'Luis Zuno (Ansimuz)', license: 'CC0' },
        { what: t('credits.townspeople'), who: 'CraftPix.net', license: t('credits.craftpix') },
        { what: t('credits.drones'), who: 'CraftPix.net', license: t('credits.craftpix') },
        { what: t('credits.ownCharacters'), who: t('credits.ownCharactersBy'), license: t('credits.own_m') },
      ],
    },
    {
      group: 'credits.music',
      items: [{ what: t('credits.tracks'), who: t('credits.tracksBy'), license: t('credits.own_f') }],
    },
    {
      group: 'credits.interface',
      items: [
        { what: t('credits.icons'), who: 'Kenney', license: 'CC0' },
        { what: 'Pixelify Sans', who: 'Stefie Justprince', license: 'OFL 1.1' },
        { what: 'Atkinson Hyperlegible Next', who: 'Braille Institute', license: 'OFL 1.1' },
        { what: 'Sweetie 16', who: 'GrafxKid', license: t('credits.freeUse') },
      ],
    },
  ];
}

export function CreditsScreen() {
  return (
    <div className="stack" style={{ gap: 'var(--s5)' }}>
      <BackLink to="/ajustes" label={t('nav.settings')} />
      <h1>{t('credits.title')}</h1>
      {credits().map((section) => (
        <Panel key={section.group} className="stack">
          <h2>{t(section.group)}</h2>
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
