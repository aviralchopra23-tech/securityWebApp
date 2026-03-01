const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
const WeeklyShiftSchedule = require('./server/src/models/WeeklyShiftSchedule');

async function main(){
  await mongoose.connect(process.env.MONGO_URI);
  const all = await WeeklyShiftSchedule.find().lean();
  console.log('found', all.length, 'docs');
  console.dir(all,{depth:null});
  await mongoose.disconnect();
}
main().catch(e=>{console.error(e);process.exit(1)});