import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Navigate } from 'react-router';
import { t } from '../../i18n';
import { SoundScreen } from '../screens/SoundScreen';
import { SoundSheetCtx, useOpenSound } from './soundSheetContext';

/**
 * Sonido como hoja que sube desde abajo (2.0.2): deja ver arriba la pantalla de la que viene y se cierra deslizándola
 * hacia abajo, tocando fuera o con Escape. La abren la bocina de la escena y Ajustes → Sonido.
 */
export function SoundSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSound = useCallback(() => setOpen(true), []);
  return (
    <SoundSheetCtx.Provider value={openSound}>
      {children}
      {open && <SoundSheet onClose={() => setOpen(false)} />}
    </SoundSheetCtx.Provider>
  );
}

/** `/sonido` (enlaces guardados de la 2.0.0): abre la hoja sobre Hoy. */
export function SoundRoute() {
  const openSound = useOpenSound();
  useEffect(() => openSound(), [openSound]);
  return <Navigate to="/hoy" replace />;
}

/** Cuánto hay que arrastrar hacia abajo (px) para cerrarla. */
const CLOSE_DRAG = 110;

function SoundSheet({ onClose }: { onClose: () => void }) {
  const [drag, setDrag] = useState(0);
  const [closing, setClosing] = useState(false);
  const start = useRef<number | undefined>(undefined);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Se va hacia abajo y luego se desmonta
  const close = () => {
    setClosing(true);
    window.setTimeout(onClose, 260);
  };

  useEffect(() => {
    closeButton.current?.focus();
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', escape);
    // La página de detrás no se desplaza mientras está abierta
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', escape);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className={`sound-sheet-backdrop${closing ? ' closing' : ''}`} onClick={close}>
      <div
        className={`sound-sheet${closing ? ' closing' : ''}${drag ? ' dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.sound')}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* El asa: se arrastra hacia abajo para cerrar */}
        <div
          className="sound-sheet-grip"
          onPointerDown={(e) => {
            // El botón de cerrar es un toque, no un arrastre: capturar el puntero se comería su clic
            if ((e.target as Element).closest('button')) return;
            start.current = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => start.current !== undefined && setDrag(Math.max(0, e.clientY - start.current))}
          onPointerUp={() => {
            if (start.current === undefined) return;
            start.current = undefined;
            if (drag > CLOSE_DRAG) close();
            else setDrag(0);
          }}
          onPointerCancel={() => {
            start.current = undefined;
            setDrag(0);
          }}
        >
          <span className="sound-sheet-handle" aria-hidden="true" />
          {/* Sin título ni flecha: se cierra deslizando, tocando fuera o con Escape; el botón queda para el teclado */}
          <button ref={closeButton} type="button" className="sr-only" aria-label={t('common.close')} onClick={close} />
        </div>
        <div className="sound-sheet-body">
          <SoundScreen onClose={close} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
