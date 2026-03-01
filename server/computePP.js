const mongoose = require("mongoose");
const { resolvePayPeriod } = require('./src/controllers/guardController');
const PayPeriod = require('./src/models/PayPeriod');

// this script can be used to experiment with pay period boundaries or
// pre-populate the database with known half-month periods.  it runs with
// a live mongo connection so you'll need to set MONGO_URI as in your
// normal server startup.

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const d1 = new Date('2026-02-01T08:00:00Z');
  const pp1 = resolvePayPeriod(d1);
  console.log('shift date', d1.toISOString(), 'pp1', pp1);

  const prevDate = new Date(pp1.start.getTime() - 1);
  const ppPrev = resolvePayPeriod(prevDate);
  console.log('prevDate', prevDate.toISOString(), 'ppPrev', ppPrev);

  const d2 = new Date('2026-02-01T04:59:59.999Z');
  console.log('d2->', d2.toISOString(), 'pp2', resolvePayPeriod(d2));

  // example: seed the db with the current + next two pay periods
  const today = new Date();
  const { start: curStart, end: curEnd } = resolvePayPeriod(today);
  const seeds = [
    { start: curStart, end: curEnd },
    resolvePayPeriod(new Date(curEnd.getTime() + 1)),
    resolvePayPeriod(new Date(curEnd.getTime() + 1)).start && resolvePayPeriod(new Date(curEnd.getTime() + 1 + 16 * 24*60*60*1000))
  ];
  for (const p of seeds) {
    if (!p) continue;
    try {
      await PayPeriod.create({ start: p.start, end: p.end });
      console.log('created period', p.start, p.end);
    } catch (e) {
      if (e.code === 11000) console.log('period already exists', p.start);
      else console.error(e);
    }
  }

  mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
