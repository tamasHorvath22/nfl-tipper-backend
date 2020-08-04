// const initgame = require('./createGamesModule');
const WeekTrackerModel = require('../models/weekTracker');
const regOrPst = require('../common/constants/regular-or-postseason')
const ScheduleService = require('../services/schedule-service');

module.exports = function () {
  console.log('init module')
  ScheduleService.closeWeek();

  // TODO comment back if goes to live

  // initgame();

  // let weekTracker = WeekTrackerModel({
  //   year: 2020,
  //   week: 1,
  //   regOrPst: regOrPst.REGULAR
  // })
  // weekTracker.save()
}
