const mongoose = require('mongoose');
const WeekTracker = require('../models/weekTracker');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');
const WeekTrackerModel = require('../models/weekTracker');
const regOrPst = require('../common/constants/regular-or-postseason');

let trackerId = null;

module.exports = {
  getTracker: getTracker,
  initWeekTracker: initWeekTracker
}

async function initWeekTracker() {
  const trackers = await getAllTracker();

  if (!trackers || !trackers.length) {
    const currentYear = new Date().getFullYear() - 1;
    let weekTracker = WeekTrackerModel({
      year: currentYear,
      week: 1,
      regOrPst: regOrPst.REGULAR
    })

    const transaction = new Transaction(true);
    transaction.insert(schemas.WEEK_TRACKER, weekTracker);

    try {
      await transaction.run();
      trackerId = weekTracker._id;
    } catch (err) {
      console.log(err);
      transaction.rollback();
    }
  } else {
    console.log('we have a tracker already')
  }
}

async function getTracker() {
  console.log(trackerId);
  try {
    const tracker = await WeekTracker.findById(trackerId).exec();
    if (tracker) {
      return tracker;
    }
    return null;
  } catch (err) {
    console.log(err);
    console.log('week tracker loading error');
    return null;
  }
}

async function getAllTracker() {
  try {
    const trackers = await WeekTracker.find().exec();
    if (trackers) {
      return trackers;
    }
    return null;
  } catch (err) {
    console.log(err);
    console.log('finding all week trackers error');
    return null;
  }
}
