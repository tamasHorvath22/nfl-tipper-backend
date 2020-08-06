const mongoose = require('mongoose');
const WeekTracker = require('../models/weekTracker');

module.exports = {
  getTracker: getTracker
}

const trackerId = '5f2be0cb6ca74a785b860327'

async function getTracker() {
  return await WeekTracker.findById(trackerId).exec();
}
