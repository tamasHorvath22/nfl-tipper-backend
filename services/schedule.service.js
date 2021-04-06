const schedule = require('node-schedule');
const LeagueDoc = require('../persistence/league.doc');
const GameService = require('./game.service');
const sleep = require('util').promisify(setTimeout);
const responseMessage = require('../common/constants/api-response-messages');
const DbTransactions = require('../persistence/league.transactions');
const WeektrackerDoc = require('../persistence/weektracker.doc');


module.exports = {
  scheduleAll: scheduleAll,
  triggerManually: triggerManually
}

async function triggerManually() {
  const weekCloseResult = await closeWeek();
  if (weekCloseResult === responseMessage.LEAGUE.LEAGUES_NOT_FOUND ||
      weekCloseResult === responseMessage.DATABASE.ERROR ||
      weekCloseResult === responseMessage.WEEK.CLOSE_FAIL) {
        return responseMessage.WEEK.CLOSE_FAIL;
      }
  const isSuperBowlWeek = await evaluateGames();
  if (isSuperBowlWeek === responseMessage.LEAGUE.UPDATE_FAIL) {
    return responseMessage.WEEK.EVALUATION_FAIL;
  }
  if (!isSuperBowlWeek) {
    const isStepWeekSuccess = await stepWeek();
    if (!isStepWeekSuccess) {
      return responseMessage.WEEK.EVALUATION_FAIL;
    }
    console.log('sleep starts')
    await sleep(10000);
    console.log('sleep ends')
    
    await createNewWeek();
  }
  return responseMessage.WEEK.EVALUATION_SUCCESS;
}

async function closeWeek() {
  const allLeagues = await LeagueDoc.getAllLeagues();
  if (!allLeagues) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  if (allLeagues === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  if (!allLeagues.length) {
    console.log('no leagues found');
    return;
  }
  const weekTracker = await WeektrackerDoc.getTracker();
  if (!weekTracker) {
    return responseMessage.DATABASE.ERROR;
  }

  allLeagues.forEach(league => {
    const currentYear = new Date().getFullYear();
    // if (process.env.ENVIRONMENT === environment.DEVELOP) {
    //   currentYear--;
    // }
    const currentSeason = league.seasons.find(season => season.year === weekTracker.year);
    const currentWeek = currentSeason.weeks[currentSeason.weeks.length - 1];
    currentWeek.isOpen = false;
  })
  const isSaveSuccess = await DbTransactions.saveClosedWeeks(allLeagues);
  return isSaveSuccess ? responseMessage.WEEK.CLOSE_SUCCESS : responseMessage.WEEK.CLOSE_FAIL;
}

async function evaluateGames() {
  try {
    const isSuperBowlWeek = await GameService.evaluateWeek();
    console.log('week evaluation success');
    return isSuperBowlWeek;
  } catch (err) {
    console.error(err);
    console.log('week evaluation fail');
    return true;
  }
}

async function stepWeek() {
  const isStepSuccess = await GameService.stepWeekTracker();
  if (!isStepSuccess) {
    console.log('week tracker step fail');
    return false;
  }
  console.log('week tracker step success');
  return true;
}

async function createNewWeek() {
  try {
    await GameService.createNewWeekAndGames();
    console.log('new week creation success');
  } catch (err) {
    console.error(err);
    console.log('new week creation fail');
  }
}

function scheduleAll() {
  scheduleCloseWeek();
  scheduleEvaluateGames();
  scheduleStepWeek();
  scheduleCreateNewWeek();
  console.log('all process scheduled');
}

// production times
// const times = {
//   week: '10 10 * * 2',
//   evaluateGames: '11 10 * * 2',
//   stepWeek: '12 10 * * 2',
//   createNewWeek: '13 10 * * 2'
// }

// TODO remove, for testing
let minute = 49;

const times = {
  week: `${minute + 0} * * * *`,
  evaluateGames: `${minute + 1} * * * *`,
  stepWeek: `${minute + 2} * * * *`,
  createNewWeek: `${minute + 3} * * * *`
}

function scheduleCloseWeek() {
  schedule.scheduleJob(times.week, closeWeek);
}

function scheduleEvaluateGames() {
  schedule.scheduleJob(times.evaluateGames, evaluateGames)
}

function scheduleStepWeek() {
  schedule.scheduleJob(times.stepWeek, stepWeek)
}

function scheduleCreateNewWeek() {
  schedule.scheduleJob(times.createNewWeek, createNewWeek)
}
