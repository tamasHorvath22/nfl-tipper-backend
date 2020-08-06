const mongoose = require('mongoose');
const WeekTracker = require('../models/weekTracker');

module.exports = {
  getTracker: getTracker
}

const trackerId = '5f2c17b2d288ed24a1986476'

async function getTracker() {
  return await WeekTracker.findById(trackerId).exec();
}
