const axios = require('axios');
const LeagueDoc = require('../persistence/league-doc');
const GameModel = require('../models/gameModel');
const WeekModel = require('../models/weekModel');
const gameStatus = require('../common/constants/game-status');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');
const winnerTeam = require('../common/constants/team');
const WeekTrackerDoc = require('../persistence/week-tracker-doc');
const regOrPst = require('../common/constants/regular-or-postseason');

module.exports = {
  createNewWeekForLeague: createNewWeekForLeague,
  createNewWeekAndGames: createNewWeekAndGames,
  evaluateWeek: evaluateWeek,
  stepWeekTracker: stepWeekTracker
}

async function getWeekData() {
  const baseApiUrl = 'https://api.sportradar.us/nfl/official/trial/v5/en/games/';
  const apiKeyPart = '/schedule.json?api_key='
  const weekTracker = await WeekTrackerDoc.getTracker();

  const path = `${baseApiUrl}${weekTracker.year}/${weekTracker.regOrPst}/${weekTracker.week}${apiKeyPart}${process.env.SPORTRADAR_KEY}`
  const weekData = await axios.get(path);
  return weekData.data;
}

async function createNewWeekAndGames() {
  const leagues = await LeagueDoc.getAllLeagues();
  console.log(leagues)
  const weekData = await getWeekData();
  console.log(weekData)
  const transaction = new Transaction(true);

  leagues.forEach(league => {
    console.log(league)
    const currentSeason = league.seasons.find(season => season.year === weekData.year);
    if (currentSeason.weeks.find(week => week.weekId === weekData.week.id)) {
      return;
    }
    let week = WeekModel({
      weekId: weekData.week.id,
      number: weekData.week.sequence,
      isOpen: true,
      games: []
    })
    console.log(week)
    weekData.week.games.forEach(game => {
      console.log(game)
      let newGame = GameModel({
        gameId: game.id,
        homeTeam: game.home.name,
        homeTeamAlias: game.home.alias,
        awayTeam: game.away.name,
        awayTeamAlias: game.away.alias,
        status: gameStatus.SCHEDULED,
        homeScore: null,
        awayScore: null,
        startTime: game.scheduled,
        isOpen: true,
        winner: null,
        winnerTeamAlias: null,
        bets: []
      })
      league.players.forEach(player => {
        newGame.bets.push({ id: player.id, name: player.name, bet: null })
      })
      week.games.push(newGame);
    })

    currentSeason.weeks.push(week);
    league.markModified('seasons')
    transaction.insert(schemas.LEAGUE, league);
  })

  try {
    await transaction.run();
  } catch (err) {
    console.log(err);
    await transaction.rollback();
  }
}

async function createNewWeekForLeague(leagueId) {
  const league = await LeagueDoc.getLeague(leagueId);
  const weekData = await getWeekData();
  const transaction = new Transaction(true);

  const currentSeason = league.seasons.find(season => season.year === weekData.year);
  if (currentSeason.weeks.find(week => week.weekId === weekData.week.id)) {
    return;
  }
  let week = WeekModel({
    weekId: weekData.week.id,
    number: weekData.week.sequence,
    isOpen: true,
    games: []
  })
  weekData.week.games.forEach(game => {
    let newGame = GameModel({
      gameId: game.id,
      homeTeam: game.home.name,
      homeTeamAlias: game.home.alias,
      awayTeam: game.away.name,
      awayTeamAlias: game.away.alias,
      status: gameStatus.SCHEDULED,
      homeScore: null,
      awayScore: null,
      startTime: game.scheduled,
      isOpen: true,
      winner: null,
      winnerTeamAlias: null,
      bets: []
    })
    league.players.forEach(player => {
      newGame.bets.push({ id: player.id, name: player.name, bet: null })
    })
    week.games.push(newGame);
  })

  currentSeason.weeks.push(week);
  league.markModified('seasons')
  transaction.insert(schemas.LEAGUE, league);

  try {
    await transaction.run();
  } catch (err) {
    console.log(err);
    transaction.rollback();
  }
}

async function evaluateWeek() {
  const leagues = await LeagueDoc.getAllLeagues();
  const weekResults = await getWeekData();
  const transaction = new Transaction(true);
  
  leagues.forEach(league => {
    const resultObject = {};
    league.players.forEach(player => {
      resultObject[player.id] = 0;
    })
    const currentSeason = league.seasons.find(season => season.year === weekResults.year);
    const currWeek = currentSeason.weeks.find(week => week.weekId === weekResults.week.id);

    weekResults.week.games.forEach(gameResult => {
      const gameToEvaluate = currWeek.games.find(game => game.gameId === gameResult.id);
      const scoring = gameResult.scoring;
      gameToEvaluate.status = gameResult.status;
      gameToEvaluate.homeScore = scoring.home_points;
      gameToEvaluate.awayScore = scoring.away_points;
      if (gameToEvaluate.homeScore > gameToEvaluate.awayScore) {
        gameToEvaluate.winner = winnerTeam.HOME;
        gameToEvaluate.winnerTeamAlias = gameToEvaluate.homeTeamAlias;
      } else if (gameToEvaluate.homeScore < gameToEvaluate.awayScore) {
        gameToEvaluate.winner = winnerTeam.AWAY;
        gameToEvaluate.winnerTeamAlias = gameToEvaluate.awayTeamAlias;
      } else {
        gameToEvaluate.winner = winnerTeam.TIE;
      }
      gameToEvaluate.bets.forEach(bet => {
        if (bet.bet === gameToEvaluate.winner) {
          resultObject[bet.id]++;
        }
      })
    })
    currentSeason.standings.forEach(standing => {
      standing.score += resultObject[standing.id];
    })

    league.markModified('seasons')
    transaction.insert(schemas.LEAGUE, league);
  })

  try {
    await transaction.run();
  } catch (err) {
    console.log(err);
    await transaction.rollback();
  }
}

async function stepWeekTracker() {
  const weekTracker = await WeekTrackerDoc.getTracker();

  if (weekTracker.regOrPst === regOrPst.REGULAR && weekTracker.week === 17) {
    weekTracker.week = 1;
    weekTracker.regOrPst = regOrPst.POSTSEASON;
  } else if (weekTracker.regOrPst === regOrPst.POSTSEASON && weekTracker.week === 4) {
    weekTracker.year++;
    weekTracker.week = 1;
    weekTracker.regOrPst = regOrPst.REGULAR
  } else {
    weekTracker.week++;
  }

  const transaction = new Transaction(true);
  transaction.insert(schemas.WEEK_TRACKER, weekTracker);

  try {
    await transaction.run();
  } catch (err)  {
    console.log(err);
    await transaction.rollback();
  };
}
