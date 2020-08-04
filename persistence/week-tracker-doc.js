const mongoose = require('mongoose');
const WeekTracker = require('../models/weekTracker');

module.exports = {
  getTracker: getTracker
}

const trackerId = '5f29ba1a11f27159d41e8aea'

async function getTracker() {
  return await WeekTracker.findById(trackerId).exec();
}
