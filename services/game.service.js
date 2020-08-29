const axios = require('axios');
const LeagueDoc = require('../persistence/league.doc');
const GameModel = require('../models/game.model');
const WeekModel = require('../models/week.model');
const SeasonModel = require('../models/season.model');
const gameStatus = require('../common/constants/game-status');
const winnerTeam = require('../common/constants/team');
const WeekTrackerDoc = require('../persistence/weektracker.doc');
const regOrPst = require('../common/constants/regular-or-postseason');
const DbTransactions = require('../persistence/game.transactions');
const responseMessage = require('../common/constants/api-response-messages');

module.exports = {
  createNewWeekForLeague: createNewWeekForLeague,
  createNewWeekAndGames: createNewWeekAndGames,
  evaluateWeek: evaluateWeek,
  stepWeekTracker: stepWeekTracker,
  createNewSeason: createNewSeason
}

async function getWeekData() {
  const baseApiUrl = 'https://api.sportradar.us/nfl/official/trial/v5/en/games/';
  const apiKeyPart = '/schedule.json?api_key='
  const weekTracker = await WeekTrackerDoc.getTracker();

  const path = `${baseApiUrl}${weekTracker.year}/${weekTracker.regOrPst}/${weekTracker.week}${apiKeyPart}${process.env.SPORTRADAR_KEY}`
  const weekData = await axios.get(path);
  return weekData.data;
}

async function createNewSeason() {
  try {
    await resetWeekTrackerForNextYear();
  } catch (err) {
    console.error(err);
    console.log('Before new season creation, week tracker reset failed.');
    return responseMessage.SEASON.CREATE_FAIL;
  }
  const leagues = await LeagueDoc.getAllLeagues();
  if (!leagues) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  if (leagues === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  const currentYear = new Date().getFullYear();
  leagues.forEach(league => {
    if (league.seasons.find(season => season.year === currentYear)) {
      return;
    }
    standingsInit = [];
    league.players.forEach(player => {
      standingsInit.push({ id: player.id, name: player.name, score: 0 })
    })
    const newSeason = SeasonModel({
      year: currentYear,
      numberOfSeason: currentYear - 1919,
      numberOfSuperBowl: currentYear - 1965,
      weeks: [],
      standings: standingsInit,
      isOpen: true,
      isCurrent: true
    })
    league.seasons[league.seasons.length - 1].isCurrent = false;
    league.seasons.push(newSeason);
  })
  if (await DbTransactions.saveNewSeason(leagues)) {
    await createNewWeekAndGames();
    return responseMessage.SEASON.CREATE_SUCCESS;
  }
  return responseMessage.SEASON.CREATE_FAIL;
}

async function createNewWeekAndGames() {
  const leagues = await LeagueDoc.getAllLeagues();
  if (!leagues) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  if (leagues === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  const weekData = await getWeekData();

  leagues.forEach(league => {
    const currentSeason = league.seasons.find(season => season.year === weekData.year);
    if (currentSeason.weeks.find(week => week.weekId === weekData.week.id)) {
      return;
    }
    currentSeason.weeks.push(initNewWeek(weekData, league));
  })
  await DbTransactions.saveSeasonModifications(leagues);
}

async function createNewWeekForLeague(leagueId) {
  const league = await LeagueDoc.getLeagueById(leagueId);
  if (!league) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  if (league === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  const weekData = await getWeekData();

  const currentSeason = league.seasons.find(season => season.year === weekData.year);
  if (currentSeason.weeks.find(week => week.weekId === weekData.week.id)) {
    return;
  }
  currentSeason.weeks.push(initNewWeek(weekData, league));
  await DbTransactions.saveSeasonModifications([league]);
}

function initNewWeek(weekData, league) {
  const weekNum = weekData.type === regOrPst.POSTSEASON ? 17 + weekData.week.sequence : weekData.week.sequence
  let week = WeekModel({
    weekId: weekData.week.id,
    number: weekNum,
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
  return week;
}

async function randomiseBets() {
  // TODO this fuction is for testing
  const leagues = await LeagueDoc.getAllLeagues();
  if (!leagues) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  if (leagues === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }

  leagues.forEach(league => {
    const currentSeason = league.seasons.find(season => season.year === 2019);
    const currWeek = currentSeason.weeks[currentSeason.weeks.length - 1];
    currWeek.games.forEach(game => {
      game.bets.forEach(bet => {
        bet.bet = Math.random() > 0.5 ? winnerTeam.HOME : winnerTeam.AWAY
      })
    })
  })
  await DbTransactions.saveSeasonModifications(leagues);
}

async function evaluateWeek() {
  // TODO this fuction is for testing, remove calling it in production
  await randomiseBets();

  const leagues = await LeagueDoc.getAllLeagues();
  if (!leagues) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  if (leagues === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  const weekResults = await getWeekData();
  const isThisSuperBowlWeek = isSuperBowlWeek(weekResults);

  if (!leagues[0].seasons.find(season => season.year === weekResults.year).isOpen) {
    return;
  }

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
    if (isThisSuperBowlWeek) {
      currentSeason.isOpen = false;
    }
  })

  if (await DbTransactions.saveSeasonModifications(leagues)) {
    return isThisSuperBowlWeek;
  } else {
    return responseMessage.LEAGUE.UPDATE_FAIL;
  }
}

function isSuperBowlWeek(week) {
  return week.type === regOrPst.POSTSEASON && week.week.sequence === 4;
}

async function stepWeekTracker() {
  const weekTracker = await WeekTrackerDoc.getTracker();
  if (weekTracker.regOrPst === regOrPst.POSTSEASON && weekTracker.week === 4) {
    // after super bowl, when evaluating the week, not changing the week tracker
    return;
  }

  if (weekTracker.regOrPst === regOrPst.REGULAR && weekTracker.week === 17) {
    weekTracker.week = 1;
    weekTracker.regOrPst = regOrPst.POSTSEASON;
  } else {
    weekTracker.week++;
  }
  await DbTransactions.saveWeekTrackerModifications(weekTracker);
}

async function resetWeekTrackerForNextYear() {
  const weekTracker = await WeekTrackerDoc.getTracker();
  weekTracker.year = new Date().getFullYear();
  weekTracker.regOrPst = regOrPst.REGULAR;
  weekTracker.week = 1;

  await DbTransactions.saveWeekTrackerModifications(weekTracker);
}
