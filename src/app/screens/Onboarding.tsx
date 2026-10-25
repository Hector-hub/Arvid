import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { saveSetting, setCategoryActive, type Settings } from '../../data/repository';
import { castOrder, validateAlias, ALIAS_MAX, type ArvidColor, type Gender } from '../../domain/arvid/arvid';
import type { Avatar } from '../../domain/avatar/catalog';
import type { Category } from '../../domain/categories';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import { getLocale, setLocale, t, type Locale } from '../../i18n';
import { needsInstallForSafety, requestPersistentStorage } from '../../pwa/platform';
import { DialogueBox } from '../arvid/DialogueBox';
import { lines } from '../arvid/lines';
import { useCategories, useData, useSettings } from '../data';
import { CategoryIcon } from '../design/components';
import { AiCodeField, AliasField, CharacterCarousel, CompanionColorPicker, CompanionPicker, GenderPicker, LanguagePicker } from '../profile/pickers';
import { Scene } from '../scene/Scene';
import { categoryName, errorText } from '../text';
import { useCompanionSync } from '../companion';
import { InstallGuide } from './InstallGuide';
import { enablePush, pushSupport } from '../notifications/push';

type Step = 'language' | 'companion' | 'welcome' | 'alias' | 'gender' | 'character' | 'arvidColor' | 'ai' | 'notifications' | 'categories' | 'install' | 'done';

/** Pasos del onboarding (ON-02); el de instalar, solo en iPhone sin instalar; el compañero, tras el idioma (CO-02). */
function onboardingSteps(): Step[] {
  return ['language', 'companion', 'welcome', 'alias', 'gender', 'character', 'arvidColor', 'ai', 'notifications', 'categories', ...(needsInstallForSafety() ? (['install'] as const) : []), 'done'];
}

/** Lo que el usuario va eligiendo; se guarda paso a paso para que la escena lo refleje al momento. */
function useDraft(settings: Settings | undefined) {
  const [alias, setAlias] = useState(settings?.profile?.alias ?? '');
  const [gender, setGender] = useState<Gender | undefined>(settings?.profile?.gender);
  return { alias, setAlias, gender, setGender };
}

/**
 * Asistente con ARVID: en cada paso, la escena arriba, la caja de diálogo de ARVID y el control del paso, que se
 * habilita al terminar el diálogo (ON-01, ON-04). "Atrás" conserva lo elegido (ON-05).
 */
function Wizard({
  steps,
  renderControl,
  onLater,
  banner,
  scene = true,
}: {
  steps: Step[];
  /** La presentación se abre sobre Hoy, que ya muestra la escena. */
  scene?: boolean;
  renderControl: (step: Step, next: () => void, ready: boolean) => ReactNode;
  onLater?: () => void;
  banner?: ReactNode;
}) {
  const settings = useSettings();
  // El compañero elegido narra desde el paso siguiente (CO-02)
  useCompanionSync(settings?.companion);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const step = steps[index]!;
  const gender = settings?.profile?.gender;
  const alias = settings?.profile?.alias ?? '';
  const group = step === 'welcome' && onLater ? 'onboarding.intro' : `onboarding.${step}`;

  const go = (delta: number) => {
    setReady(false);
    setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + delta)));
  };

  // Sin los ajustes cargados la caja de diálogo se montaría dos veces (cambia su `key`)
  if (!settings) return null;

  return (
    <main className="main stack" style={{ gap: 'var(--s4)' }}>
      {banner}
      {scene && <Scene controls={false} />}
      <DialogueBox key={`${step}:${settings?.locale ?? ''}`} lines={lines(group as `onboarding.${string}`, gender, { alias })} onDone={() => setReady(true)} />
      <fieldset className="stack onboarding-step" disabled={!ready} style={{ opacity: ready ? 1 : 0.5 }}>
        {renderControl(step, () => go(1), ready)}
      </fieldset>
      <div className="row">
        {index > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => go(-1)}>
            ‹ {t('common.back')}
          </button>
        )}
        {onLater && (
          <button type="button" className="btn btn-ghost" style={{ marginLeft: 'auto' }} onClick={onLater}>
            {t('common.later')}
          </button>
        )}
      </div>
    </main>
  );
}

/** Controles comunes del onboarding y de la presentación (idioma, alias, género, personaje y color de ARVID). */
function useProfileControls() {
  const ctx = useData();
  const settings = useSettings();
  const draft = useDraft(settings);
  const [aliasError, setAliasError] = useState<string>();
  const [aiCode, setAiCode] = useState(settings?.aiCode ?? '');
  // El activo: cambia al momento al elegirlo, antes de que se guarde
  const locale: Locale = getLocale();

  function control(step: Step, next: () => void): ReactNode {
    if (!settings) return null;
    switch (step) {
      case 'language':
        return (
          <>
            <LanguagePicker
              value={locale}
              onChange={(l) => {
                setLocale(l);
                void saveSetting(ctx.db, 'locale', l);
              }}
            />
            <ContinueButton
              onClick={() => {
                // Fija también el idioma detectado si no se tocó
                void saveSetting(ctx.db, 'locale', locale).then(next);
              }}
            />
          </>
        );
      case 'alias':
        return (
          <>
            <AliasField
              value={draft.alias}
              error={aliasError}
              onChange={(v) => {
                draft.setAlias(v);
                setAliasError(undefined);
              }}
            />
            <ContinueButton
              onClick={() => {
                const error = validateAlias(draft.alias);
                if (error) {
                  setAliasError(errorText(error, { max: ALIAS_MAX }));
                  document.getElementById('alias')?.focus();
                  return;
                }
                void saveSetting(ctx.db, 'profile', { alias: draft.alias.trim(), gender: draft.gender ?? 'x' }).then(next);
              }}
            />
          </>
        );
      case 'gender':
        return (
          <>
            <GenderPicker value={draft.gender} onChange={draft.setGender} />
            <ContinueButton
              disabled={!draft.gender}
              onClick={() => {
                const gender = draft.gender ?? 'x';
                // El personaje sugerido cambia con el género (PJ-02), salvo que ya se hubiera elegido otro
                const avatar: Avatar = { cast: castOrder(gender)[0]!, variant: settings.avatar.variant };
                void Promise.all([
                  saveSetting(ctx.db, 'profile', { alias: draft.alias.trim(), gender }),
                  settings.profile?.gender === gender ? undefined : saveSetting(ctx.db, 'avatar', avatar),
                ]).then(next);
              }}
            />
          </>
        );
      case 'character':
        return (
          <>
            <CharacterCarousel
              value={settings.avatar}
              order={castOrder(settings.profile?.gender)}
              onChange={(avatar) => void saveSetting(ctx.db, 'avatar', avatar)}
            />
            <ContinueButton onClick={next} />
          </>
        );
      case 'companion':
        return (
          <>
            <CompanionPicker value={settings.companion} onChange={(c) => void saveSetting(ctx.db, 'companion', c)} />
            <ContinueButton onClick={next} />
          </>
        );
      case 'arvidColor':
        return (
          <>
            <CompanionColorPicker
              companion={settings.companion}
              arvidColor={settings.arvidColor}
              darisColor={settings.darisColor}
              onArvid={(c: ArvidColor) => void saveSetting(ctx.db, 'arvidColor', c)}
              onDaris={(c) => void saveSetting(ctx.db, 'darisColor', c)}
            />
            <ContinueButton onClick={next} />
          </>
        );
      case 'ai':
        // Permiso explícito: la IA envía datos a Mistral AI (IA-06)
        return (
          <>
            <p className="small muted">{t('settings.arvidAiHelp')}</p>
            {/* Sin código la IA no responde (D-100); se puede poner luego en Ajustes → Perfil */}
            <AiCodeField value={aiCode} onChange={setAiCode} />
            <ContinueButton
              label={t('onboarding.aiActivate')}
              onClick={() =>
                void Promise.all([
                  saveSetting(ctx.db, 'arvidAi', true),
                  aiCode.trim() ? saveSetting(ctx.db, 'aiCode', aiCode.trim()) : undefined,
                ]).then(next)
              }
            />
            <button type="button" className="btn btn-block" onClick={() => void saveSetting(ctx.db, 'arvidAi', false).then(next)}>
              {t('onboarding.aiNotNow')}
            </button>
          </>
        );
      default:
        return null;
    }
  }

  return { control };
}

function ContinueButton({ onClick, disabled, label = t('common.continue') }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" className="btn btn-primary btn-block" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

/** Onboarding con ARVID (spec 06, ON). */
export function Onboarding({ banner }: { banner?: ReactNode }) {
  const ctx = useData();
  const navigate = useNavigate();
  const categories = useCategories();
  const { control } = useProfileControls();
  const [steps] = useState(onboardingSteps);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>();

  const isSelected = (c: Category) => selection[c.id] ?? c.active;

  async function finish() {
    const persist = await requestPersistentStorage();
    await saveSetting(ctx.db, 'persistGranted', persist === 'granted');
    await saveSetting(ctx.db, 'onboardingCompletedAt', ctx.now().toISOString());
    navigate('/hoy', { replace: true });
  }

  async function confirmCategories(next: () => void) {
    if (!categories) return;
    if (!categories.some(isSelected)) {
      setError(t('onboarding.categoriesError'));
      return;
    }
    // Primero activar, después desactivar, para no quedarse nunca sin categorías activas.
    const ordered = [...categories].sort((a, b) => Number(isSelected(b)) - Number(isSelected(a)));
    for (const c of ordered) {
      if (c.active !== isSelected(c)) await setCategoryActive(ctx, c.id, isSelected(c));
    }
    next();
  }

  return (
    <Wizard
      steps={steps}
      banner={banner}
      renderControl={(step, next) => {
        switch (step) {
          case 'welcome':
            return <ContinueButton label={t('onboarding.start')} onClick={next} />;
          case 'categories':
            return (
              <>
                <h1>{t('onboarding.categoriesTitle')}</h1>
                <div className="stack" aria-describedby={error ? 'cat-error' : undefined}>
                  {categories?.map((c) => (
                    <label key={c.id} className="choice">
                      <input
                        type="checkbox"
                        checked={isSelected(c)}
                        onChange={(e) => {
                          setError(undefined);
                          setSelection((s) => ({ ...s, [c.id]: e.target.checked }));
                        }}
                      />
                      <CategoryIcon category={c} />
                      <span className="grow">{categoryName(c)}</span>
                      {isSelected(c) && <span className="chip chip-done">{t('settings.categoryActive')}</span>}
                    </label>
                  ))}
                </div>
                {error && (
                  <p id="cat-error" className="field-error" role="alert">
                    {error}
                  </p>
                )}
                <ContinueButton onClick={() => void confirmCategories(next)} />
              </>
            );
          case 'notifications':
            // Spec 10, NT-02: en iPhone sin instalar o sin soporte, solo se explica (se pueden activar luego en Ajustes)
            return pushSupport() === 'ok' ? (
              <>
                <ContinueButton label={t('onboarding.notificationsActivate')} onClick={() => void enablePush(ctx.db).finally(next)} />
                <button type="button" className="btn btn-block" onClick={next}>
                  {t('onboarding.aiNotNow')}
                </button>
              </>
            ) : (
              <>
                <p className="small muted">{t(pushSupport() === 'install' ? 'settings.notifications.install' : 'settings.notifications.unsupported')}</p>
                <ContinueButton onClick={next} />
              </>
            );
          case 'install':
            return (
              <>
                <InstallGuide />
                <ContinueButton label={t('onboarding.understood')} onClick={next} />
              </>
            );
          case 'done':
            return <ContinueButton label={t('onboarding.goToday')} onClick={() => void finish()} />;
          default:
            return control(step, next);
        }
      }}
    />
  );
}

/**
 * Presentación de ARVID para quien ya hizo el onboarding sin alias (PR-01): idioma, alias, género y color de ARVID.
 * Se puede posponer hasta el día siguiente (PR-02).
 */
export function IntroSheet({ onClose }: { onClose: () => void }) {
  const ctx = useData();
  const { control } = useProfileControls();
  const steps: Step[] = ['language', 'welcome', 'alias', 'gender', 'arvidColor', 'ai'];
  // Se cierra al quedar guardado: una recarga inmediata no debe volver a mostrarla (PR-02)
  const later = () => void saveSetting(ctx.db, 'introSnoozedUntil', addDays(toLocalDate(ctx.now()), 1)).then(onClose);
  return (
    <div className="sheet-backdrop intro" role="dialog" aria-modal="true" aria-label={t('onboarding.introTitle')}>
      <div className="panel sheet">
        <Wizard
          steps={steps}
          scene={false}
          onLater={later}
          renderControl={(step, next) =>
            step === 'welcome' ? <ContinueButton onClick={next} /> : control(step, step === 'ai' ? onClose : next)
          }
        />
      </div>
    </div>
  );
}
