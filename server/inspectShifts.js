const mongoose = require('mongoose');
const GuardShiftEntry = require('./src/models/GuardShiftEntry');
require('dotenv').config();

async function main(){
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/security');
  const entries = await GuardShiftEntry.find({}).lean();
  console.log('all shifts:', entries.map(e=>({date:e.startDateTime.toISOString(),ppStart:e.payPeriodStart.toISOString(),ppEnd:e.payPeriodEnd.toISOString()})));
  process.exit(0);
}
main();
