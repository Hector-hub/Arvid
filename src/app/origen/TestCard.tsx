// La prueba aceptada, en Hoy (spec 17, PR-07): su objetivo, su avance y los días que quedan, con la marca de la señal.
// No se edita ni se marca a mano: se comprueba sola con tus registros.
import { Link } from 'react-router';
import { storyOn } from '../../domain/origen/origen';
import { openTest, testProgress } from '../../domain/origen/programTests';
import { diffDays, toLocalDate } from '../../domain/time/localDate';
import { t } from '../../i18n';
import { useAnalysis } from '../analysis';
import { useRecords, useSettings } from '../data';
import { testNumber, testObjective, useTestNames } from './testText';

export function TestCard() {
  const settings = useSettings();
  const analysis = useAnalysis();
  const records = useRecords();
  const names = useTestNames();
  const test = openTest(settings?.origen?.tests);
  if (!storyOn(settings?.origen) || !test?.acceptedOn || !test.deadline || !analysis || !records) return null;
  const today = toLocalDate(new Date());
  const { done, of } = testProgress(test, records, analysis, today);
  const left = diffDays(today, test.deadline) + 1;
  return (
    <Link to="/mensajes/senal" className="signal-card signal-test stack" style={{ textDecoration: 'none' }}>
      <span className="row" style={{ justifyContent: 'space-between' }}>
        <span className="signal-tag">
          <i />
          {t('origen.test.title', { n: testNumber(test.n) })}
        </span>
        <span className="small muted">{left <= 1 ? t('origen.test.lastDay') : t('origen.test.daysLeft', { count: left })}</span>
      </span>
      <span>{testObjective(test, names)}</span>
      <span className="pixel">{t('origen.test.progress', { done, of })}</span>
    </Link>
  );
}
