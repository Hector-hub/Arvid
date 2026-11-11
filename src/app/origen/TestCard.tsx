// La prueba aceptada, en Hoy (spec 17, PR-07): su objetivo, su avance y los días que quedan, con la marca de la señal.
// Se comprueba sola con tus registros; la que escribió la IA sin apoyarse en una actividad se marca con «Hecho hoy».
import { Link } from 'react-router';
import { saveSetting } from '../../data/repository';
import { storyOn } from '../../domain/origen/origen';
import { markedByHand, openTest, testProgress, toggleMark } from '../../domain/origen/programTests';
import { diffDays, toLocalDate } from '../../domain/time/localDate';
import { t } from '../../i18n';
import { useAnalysis } from '../analysis';
import { useData, useRecords, useSettings } from '../data';
import { testNumber, testObjective, useTestNames } from './testText';

export function TestCard() {
  const { db } = useData();
  const settings = useSettings();
  const analysis = useAnalysis();
  const records = useRecords();
  const names = useTestNames();
  const origen = settings?.origen;
  const test = openTest(origen?.tests);
  if (!storyOn(origen) || !test?.acceptedOn || !test.deadline || !analysis || !records) return null;
  const today = toLocalDate(new Date());
  const { done, of } = testProgress(test, records, analysis, today);
  const left = diffDays(today, test.deadline) + 1;
  const marked = test.marks?.includes(today) ?? false;
  return (
    <div className="signal-card signal-test stack">
      <Link to="/mensajes/senal" className="row" style={{ justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}>
        <span className="signal-tag">
          <i />
          {t('origen.test.title', { n: testNumber(test.n) })}
        </span>
        <span className="small muted">{left <= 1 ? t('origen.test.lastDay') : t('origen.test.daysLeft', { count: left })}</span>
      </Link>
      <span>{testObjective(test, names)}</span>
      <span className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="pixel">{t('origen.test.progress', { done, of })}</span>
        {markedByHand(test) && (
          <button
            type="button"
            className={marked ? 'btn' : 'btn btn-primary'}
            aria-pressed={marked}
            onClick={() => void saveSetting(db, 'origen', { ...origen, tests: (origen?.tests ?? []).map((x) => (x.n === test.n ? toggleMark(x, today) : x)) })}
          >
            {marked ? t('origen.test.unmarkToday') : t('origen.test.markToday')}
          </button>
        )}
      </span>
    </div>
  );
}
