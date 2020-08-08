const schedule = require('node-schedule');
const LeagueDoc = require('../persistence/league-doc');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');
const GameService = require('../services/game-service');

module.exports = {
  scheduleAll: scheduleAll
}

// production times
// const times = {
//   week: '10 10 * * 2',
//   evaluateGames: '11 10 * * 2',
//   stepWeek: '12 10 * * 2',
//   createNewWeek: '13 10 * * 2'
// }

// TODO remove, for testing
let minute = 03;

const times = {
  week: `${minute + 0} * * * *`,
  evaluateGames: `${minute + 1} * * * *`,
  stepWeek: `${minute + 2} * * * *`,
  createNewWeek: `${minute + 3} * * * *`
}

function scheduleCloseWeek() {

  schedule.scheduleJob(times.week, async function() {
    console.log('close week scheduled process called');

    const allLeagues = await LeagueDoc.getAllLeagues();
    console.log(allLeagues);
    if (!allLeagues.length) {
      console.log('no leagues found');
      return;
    }

    const transaction = new Transaction(true);

    for (let i = 0; i < this.length; i++) {
      const league = this[i];
      // TODO remove previous year (-1)
      const currentYear = new Date().getFullYear() - 1;
      const currentSeason = league.seasons.find(season => season.year === currentYear);
      const currentWeek = currentSeason.weeks[currentSeason.weeks.length - 1];
      currentWeek.isOpen = false;

      league.markModified('seasons');
      transaction.update(schemas.LEAGUE, league._id, league, { new: true });
    }

    try {
      console.log(await transaction.run());
      console.log('week index: ' + i + ' close success');
    } catch (err)  {
      await transaction.rollback();
      console.log(err);
      console.log('week index: ' + i + ' close fail');
    };


    // this.forEach(league => {
    //   // TODO remove previous year (-1)
    //   const currentYear = new Date().getFullYear() - 1;
    //   const currentSeason = league.seasons.find(season => season.year === currentYear);
    //   const currentWeek = currentSeason.weeks[currentSeason.weeks.length - 1];
    //   currentWeek.isOpen = false;

    //   league.markModified('seasons');
    //   // transaction.insert(schemas.LEAGUE, league);
    //   transaction.update(schemas.LEAGUE, league._id, league, { new: true });
    // })

    // try {
    //   console.log(await transaction.run());
    //   console.log('week close success');
    // } catch (err)  {
    //   await transaction.rollback();
    //   console.log(err);
    //   console.log('week close fail');
    // };
  });
}

function scheduleEvaluateGames() {
  schedule.scheduleJob(times.evaluateGames, async function() {
    try {
      await GameService.evaluateWeek();
      console.log('week evaluation success');
    } catch (err) {
      console.log(err);
      console.log('week evaluation fail');
    }
  })
}

function scheduleStepWeek() {
  schedule.scheduleJob(times.stepWeek, async function() {
    try {
      await GameService.stepWeekTracker();
      console.log('week tracker step success');
    } catch (err) {
      console.log(err);
      console.log('week tracker step fail');
    }
  })
}

function scheduleCreateNewWeek() {
  schedule.scheduleJob(times.createNewWeek, async function() {
    try {
      await GameService.createNewWeekAndGames();
      console.log('new week creation success');
    } catch (err) {
      console.log(err);
      console.log('new week creation fail');
    }
  })
}

function scheduleAll() {
  scheduleCloseWeek();
  scheduleEvaluateGames();
  scheduleStepWeek();
  scheduleCreateNewWeek();
  console.log('all process scheduled');
}

async function setBetEndings() {
  const leagues = await LeagueDoc.getAllLeagues();
  // TODO remove previous year (-1)
  const currentYear = new Date().getFullYear() - 1;
  const currentSeason = leagues[0].seasons.find(season => season.year === currentYear);
  const startTimes = new Set()
  currentSeason.weeks[currentSeason.weeks.length - 1].games.forEach(game => {
    startTimes.add(new Date(game.startTime).getTime());
  })

  for (let time of startTimes) {
    const date = new Date(time);
    const scheduleTime = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
    schedule.scheduleJob(scheduleTime, async function(innerTime) {

      const transaction = new Transaction(true);

      this.forEach(league => {
        const currentYear = new Date().getFullYear();
        const currentSeason = league.seasons.find(season => season.year === currentYear);
        const currentWeek = currentSeason.weeks[currentSeason.weeks.length - 1];

        for (let i = 0; i < currentWeek.games.length; i++) {
          const game = currentWeek.games[i];
          const currentGameTime = new Date(game.startTime).getTime();
          const calledTime = new Date(innerTime).getTime();

          // const tempTime = new Date('2020-09-13T20:05:00.000+00:00').getTime();

          if (currentGameTime === calledTime) {
            game.isOpen = false;
          }
        }
        
        league.markModified('seasons')
        transaction.update(schemas.LEAGUE, league._id, league, { new: true });
      })

      try {
        await transaction.run();
      } catch (err)  {
        console.log(err);
        transaction.rollback();
      };
    }.bind(await LeagueDoc.getAllLeagues())); 
  }
}
