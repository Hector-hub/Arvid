import { Sprite } from '../design/components';

/** Guía de instalación en iPhone (ONB-03, offline-strategy §4). */
export function InstallGuide() {
  return (
    <div className="stack">
      <h2>Instala ARVID en tu iPhone</h2>
      <p>
        Instalada en la pantalla de inicio, ARVID funciona sin conexión y tus datos están protegidos. Sin instalar,
        Safari puede borrarlos si pasas unos días sin abrirla.
      </p>
      <ol className="stack" style={{ paddingLeft: 'var(--s5)', margin: 0 }}>
        <li>Abre esta página en Safari.</li>
        <li>
          Toca el botón <strong>Compartir</strong> (el cuadrado con una flecha hacia arriba).
        </li>
        <li>
          Elige <strong>Añadir a pantalla de inicio</strong> y confirma.
        </li>
        <li>Abre ARVID desde su icono, no desde Safari.</li>
      </ol>
      <p className="row muted small">
        <Sprite name="info" color="var(--text-muted)" />
        Los datos de Safari y los de la app instalada están separados: empieza a usarla desde el icono.
      </p>
    </div>
  );
}
