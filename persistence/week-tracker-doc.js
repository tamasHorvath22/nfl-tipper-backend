const mongoose = require('mongoose');
const WeekTracker = require('../models/weekTracker');

module.exports = {
  getTracker: getTracker
}

const trackerId = '5f2be9ae931c640164c4d918'

async function getTracker() {
  return await WeekTracker.findById(trackerId).exec();
}
