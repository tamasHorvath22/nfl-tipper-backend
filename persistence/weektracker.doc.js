const WeekTracker = require('../models/weektracker.model');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');
const regOrPst = require('../common/constants/regular-or-postseason');

module.exports = {
  getTracker: getTracker,
  initWeekTracker: initWeekTracker
}

async function initWeekTracker() {
  const trackers = await getAllTracker();

  if (!trackers || !trackers.length) {
    // TODO remove -1 for production
    const currentYear = new Date().getFullYear() - 1;
    let weekTracker = WeekTracker({
      year: currentYear,
      week: 1,
      regOrPst: regOrPst.REGULAR
    })

    const transaction = new Transaction(true);
    transaction.insert(schemas.WEEK_TRACKER, weekTracker);

    try {
      await transaction.run();
    } catch (err) {
      console.error(err);
      transaction.rollback();
    }
  } else {
    console.log('we have a tracker already')
  }
}

async function getTracker() {
  try {
    const tracker = await WeekTracker.find({}).exec();
    if (tracker && tracker.length) {
      return tracker[0];
    }
    return null;
  } catch (err) {
    console.error(err);
    console.log('week tracker loading error');
    return null;
  }
}

async function getAllTracker() {
  try {
    const trackers = await WeekTracker.find({}).exec();
    if (trackers) {
      return trackers;
    }
    return null;
  } catch (err) {
    console.error(err);
    console.log('finding all week trackers error');
    return null;
  }
}
