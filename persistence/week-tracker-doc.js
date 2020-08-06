const mongoose = require('mongoose');
const WeekTracker = require('../models/weekTracker');

module.exports = {
  getTracker: getTracker
}

const trackerId = '5f2bcee4b5c9b365eaf3c9fe'

async function getTracker() {
  return await WeekTracker.findById(trackerId).exec();
}
