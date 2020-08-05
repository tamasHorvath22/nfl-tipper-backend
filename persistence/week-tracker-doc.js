const mongoose = require('mongoose');
const WeekTracker = require('../models/weekTracker');

module.exports = {
  getTracker: getTracker
}

const trackerId = '5f2a93d66b6d2f4db011b702'

async function getTracker() {
  return await WeekTracker.findById(trackerId).exec();
}
