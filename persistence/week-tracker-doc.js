const mongoose = require('mongoose');
const WeekTracker = require('../models/weekTracker');

module.exports = {
  getTracker: getTracker
}

const trackerId = '5f2bd8ea2ca8937155072e46'

async function getTracker() {
  return await WeekTracker.findById(trackerId).exec();
}
