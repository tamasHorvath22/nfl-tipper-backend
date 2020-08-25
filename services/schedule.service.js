const schedule = require('node-schedule');
const LeagueDoc = require('../persistence/league.doc');
const GameService = require('./game.service');
const sleep = require('util').promisify(setTimeout);
const responseMessage = require('../common/constants/api-response-messages');
const DbTransactions = require('../persistence/league.transactions');


module.exports = {
  scheduleAll: scheduleAll,
  triggerManually: triggerManually
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

async function closeWeek() {
  const allLeagues = await LeagueDoc.getAllLeagues();
  if (!allLeagues.length) {
    console.log('no leagues found');
    return;
  }

  allLeagues.forEach(league => {
    // TODO remove previous year (-1)
    const currentYear = new Date().getFullYear() - 1;
    const currentSeason = league.seasons.find(season => season.year === currentYear);
    const currentWeek = currentSeason.weeks[currentSeason.weeks.length - 1];
    currentWeek.isOpen = false;
  })
  await DbTransactions.saveClosedWeeks(allLeagues);
}

function scheduleEvaluateGames() {
  schedule.scheduleJob(times.evaluateGames, evaluateGames)
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

function scheduleStepWeek() {
  schedule.scheduleJob(times.stepWeek, stepWeek)
}

async function stepWeek() {
  try {
    await GameService.stepWeekTracker();
    console.log('week tracker step success');
  } catch (err) {
    console.error(err);
    console.log('week tracker step fail');
  }
}

function scheduleCreateNewWeek() {
  schedule.scheduleJob(times.createNewWeek, createNewWeek)
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

async function triggerManually() {
  await closeWeek();
  const isSuperBowlWeek = await evaluateGames();
  if (isSuperBowlWeek === responseMessage.LEAGUE.UPDATE_FAIL) {
    return responseMessage.WEEK.EVALUATION_FAIL;
  }
  if (!isSuperBowlWeek) {
    await stepWeek();
    console.log('sleep starts')
    await sleep(10000);
    console.log('sleep ends')
    await createNewWeek();
  }
  return responseMessage.WEEK.EVALUATION_SUCCESS;
}

function scheduleAll() {
  scheduleCloseWeek();
  scheduleEvaluateGames();
  scheduleStepWeek();
  scheduleCreateNewWeek();
  console.log('all process scheduled');
}
