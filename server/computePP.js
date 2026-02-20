const { resolvePayPeriod } = require('./src/controllers/guardController');

const d1 = new Date('2026-02-01T08:00:00Z');
const pp1 = resolvePayPeriod(d1);
console.log('shift date', d1.toISOString(), 'pp1', pp1);

const prevDate = new Date(pp1.start.getTime() - 1);
const ppPrev = resolvePayPeriod(prevDate);
console.log('prevDate', prevDate.toISOString(), 'ppPrev', ppPrev);

const d2 = new Date('2026-02-01T04:59:59.999Z');
console.log('d2->', d2.toISOString(), 'pp2', resolvePayPeriod(d2));
