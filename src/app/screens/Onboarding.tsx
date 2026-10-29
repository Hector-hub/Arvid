import { useEffect, useState, type ReactNode } from 'react';
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
import { setCity } from '../scene/engine';
import { categoryName, errorText } from '../text';
import { useCompanionSync } from '../companion';
import { InstallGuide } from './InstallGuide';
import { enablePush, pushSupport } from '../notifications/push';
import { accountsEnabled, createAccount, passkeysAvailable } from '../account/account';
import { takePendingLink } from '../friends/friends';
import { RecoveryKeySheet, SignInSheet, errorText as accountErrorText } from '../account/AccountPanel';

type Step = 'language' | 'companion' | 'welcome' | 'alias' | 'gender' | 'character' | 'arvidColor' | 'ai' | 'account' | 'notifications' | 'categories' | 'install' | 'done';

/**
 * Pasos del onboarding (ON-02); el de instalar, solo en iPhone sin instalar; el compañero, tras el idioma (CO-02); el
 * de guardar el progreso, tras el permiso de la IA y mientras la cuenta esté activa (spec 14, CU-01).
 */
function onboardingSteps(): Step[] {
  return [
    'language', 'companion', 'welcome', 'alias',
    // Tras elegir el nombre: «Guarda tu progreso» (CU-10)
    ...(accountsEnabled() ? (['account'] as const) : []),
    'gender', 'character', 'arvidColor', 'ai',
    'notifications', 'categories', ...(needsInstallForSafety() ? (['install'] as const) : []), 'done',
  ];
}

/** «Guarda tu progreso» (CU-01): crear la cuenta ahora o seguir; con la clave mostrada una vez (CU-02). */
function AccountStep({ next }: { next: () => void }) {
  const ctx = useData();
  const settings = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [key, setKey] = useState<string>();
  const alias = settings?.profile?.alias ?? 'ARVID';
  const passkeys = passkeysAvailable();
  const skip = () => void saveSetting(ctx.db, 'accountOffered', true).then(next);
  async function create(withPasskey: boolean) {
    setBusy(true);
    setError(undefined);
    try {
      setKey((await createAccount(ctx, alias, withPasskey)).recoveryKey);
      await saveSetting(ctx.db, 'accountOffered', true);
    } catch (e) {
      setError(accountErrorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {/* Las tres ventajas de tener cuenta (CU-10) */}
      <ul className="panel stack account-benefits">
        {(['restore', 'friends', 'passkey'] as const).map((k) => (
          <li key={k}>
            <span aria-hidden="true" className="benefit-dot" />
            <span>
              <strong>{t(`account.benefits.${k}.title`)}</strong>
              <span className="small muted" style={{ display: 'block' }}>
                {t(`account.benefits.${k}.text`)}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <ContinueButton label={passkeys ? t('account.create') : t('account.createRecovery')} onClick={() => !busy && void create(passkeys)} />
      {passkeys && (
        <button type="button" className="btn btn-block" disabled={busy} onClick={() => void create(false)}>
          {t('account.createRecovery')}
        </button>
      )}
      <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={skip}>
        {t('account.notNow')}
      </button>
      {error && (
        <p role="alert" className="small field-error">
          {error}
        </p>
      )}
      <p className="small muted">{t('account.privacy')}</p>
      {key && <RecoveryKeySheet recoveryKey={key} alias={alias} onDone={next} />}
    </>
  );
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
        // Permiso explícito: la IA envía datos a un servicio externo (IA-06)
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
  // Quien empieza está en el nivel 1: la escena ya muestra su calle (spec 11, CV-01), no la ciudad completa
  useEffect(() => setCity(1), []);
  const navigate = useNavigate();
  const categories = useCategories();
  const { control } = useProfileControls();
  const [steps] = useState(onboardingSteps);
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>();
  // «Ya tengo cuenta» en la primera pantalla (spec 14, RC-01)
  const [signIn, setSignIn] = useState(false);

  const isSelected = (c: Category) => selection[c.id] ?? c.active;

  async function finish() {
    const persist = await requestPersistentStorage();
    await saveSetting(ctx.db, 'persistGranted', persist === 'granted');
    await saveSetting(ctx.db, 'onboardingCompletedAt', ctx.now().toISOString());
    // Llegó con un enlace de amistad y eligió «Registrarme» (EN-10): al terminar, la invitación
    navigate(takePendingLink() ?? '/hoy', { replace: true });
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
          case 'language':
            return (
              <>
                {control(step, next)}
                {accountsEnabled() && (
                  <button type="button" className="btn btn-ghost" onClick={() => setSignIn(true)}>
                    {t('account.haveAccount')}
                  </button>
                )}
                {signIn && <SignInSheet onClose={() => setSignIn(false)} onRestored={() => navigate('/hoy', { replace: true })} />}
              </>
            );
          case 'account':
            return <AccountStep next={next} />;
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
