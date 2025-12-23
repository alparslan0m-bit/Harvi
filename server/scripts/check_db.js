#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  const uri = process.env.MONGODB_URI ? process.env.MONGODB_URI : 'mongodb://localhost:27017/mcq_app';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('DB connectivity: OK');
  } catch (e) {
    console.error('DB connectivity: FAIL');
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();
