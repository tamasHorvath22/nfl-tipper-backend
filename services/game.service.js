const axios = require('axios');
const LeagueDoc = require('../persistence/league.doc');
const GameModel = require('../models/game.model');
const WeekModel = require('../models/week.model');
const SeasonModel = require('../models/season.model');
const TeamStandingsModel = require('../models/teams.standing.model');
const gameStatus = require('../common/constants/game-status');
const winnerTeam = require('../common/constants/team');
const WeekTrackerDoc = require('../persistence/weektracker.doc');
const TeamStandingsDoc = require('../persistence/team.standings.doc');
const regOrPst = require('../common/constants/regular-or-postseason');
const DbTransactions = require('../persistence/game.transactions');
const responseMessage = require('../common/constants/api-response-messages');
const sleep = require('util').promisify(setTimeout);
const BetTypes = require('../common/constants/bet.types');


module.exports = {
  createNewWeekForLeague: createNewWeekForLeague,
  createNewWeekAndGames: createNewWeekAndGames,
  evaluateWeek: evaluateWeek,
  stepWeekTracker: stepWeekTracker,
  createNewSeason: createNewSeason,
  evaluate: evaluate,
  setTeamStandings: setTeamStandings,
  getTeamStandings: getTeamStandings
}

async function getWeekData() {
  const baseApiUrl = 'https://api.sportradar.us/nfl/official/trial/v5/en/games/';
  const apiKeyPart = '/schedule.json?api_key='
  const weekTracker = await WeekTrackerDoc.getTracker();
  if (!weekTracker) {
    return null;
  }
  const path = `${baseApiUrl}${weekTracker.year}/${weekTracker.regOrPst}/${weekTracker.week}${apiKeyPart}${process.env.SPORTRADAR_KEY}`
  try {
    const weekData = await axios.get(path);
    return weekData.data;
  } catch(err) {
    console.error(err);
    return null;
  }
}

async function createNewSeason(isAdmin) {
  const weekTracker = await WeekTrackerDoc.getTracker();
  if (
    !isAdmin ||
    !weekTracker ||
    weekTracker.regOrPst === regOrPst.REGULAR ||
    weekTracker.week !== 4
  ) {
    return responseMessage.DATABASE.ERROR;
  }

  const resetWeekTrackerResult = await resetWeekTrackerForNextYear();
  if (!resetWeekTrackerResult) {
    console.log('Before new season creation, week tracker reset failed.');
    return responseMessage.SEASON.CREATE_FAIL;
  }
  const leagues = await LeagueDoc.getAllLeagues();
  if (!leagues || leagues === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  const currentYear = new Date().getFullYear();
  leagues.forEach(league => {
    if (league.seasons.find(season => season.year === currentYear)) {
      return;
    }
    const prevSeason = league.seasons.find(season => season.year === currentYear - 1);
    if (prevSeason) {
      prevSeason.isOpen = false;
    }
    const finalWinnerObj = {};
    league.players.forEach(player => {
      finalWinnerObj[player.id] = null;
    });

    const newSeason = SeasonModel({
      year: currentYear,
      numberOfSeason: currentYear - 1919,
      numberOfSuperBowl: currentYear - 1965,
      weeks: [],
      standings: league.players.map(player => {
        return { id: player.id, name: player.name, score: 0 }
      }),
      finalWinner: finalWinnerObj,
      isOpen: true
    })
    league.seasons.push(newSeason);
  })
  if (await DbTransactions.saveNewSeasonAndWeektracker(leagues, resetWeekTrackerResult)) {
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
  if (!weekData) {
    return responseMessage.DATABASE.ERROR;
  }

  leagues.forEach(league => {
    const currentSeason = league.seasons.find(season => season.year === weekData.year);
    if (currentSeason.weeks.find(week => week.weekId === weekData.week.id)) {
      return;
    }
    currentSeason.weeks.push(initNewWeek(weekData, league));
  })
  return await DbTransactions.saveSeasonModifications(leagues);
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
  if (!weekData) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }

  const currentSeason = league.seasons.find(season => season.year === weekData.year);
  if (currentSeason.weeks.find(week => week.weekId === weekData.week.id)) {
    return;
  }
  currentSeason.weeks.push(initNewWeek(weekData, league));
  await DbTransactions.saveSeasonModifications([league]);
}

function initNewWeek(weekData, league) {
  const weekNum = weekData.type === regOrPst.POSTSEASON ? 18 + weekData.week.sequence : weekData.week.sequence
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
      winnerValue: null,
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
  // await randomiseBets();

  const leagues = await LeagueDoc.getAllLeagues();
  if (!leagues) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  if (leagues === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  const weekResults = await getWeekData();
  if (!weekResults) {
    return responseMessage.LEAGUE.UPDATE_FAIL;
  }
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

      const pointDiff = gameToEvaluate.homeScore - gameToEvaluate.awayScore;

      if (pointDiff === 0) {
        gameToEvaluate.winner = winnerTeam.TIE;
        gameToEvaluate.winnerValue = BetTypes.TIE;
      } else if (pointDiff <= -15) {
        gameToEvaluate.winnerValue = BetTypes.AWAY_15_PLUS;
      } else if (pointDiff <= -8) {
        gameToEvaluate.winnerValue = BetTypes.AWAY_8_14;
      } else if (pointDiff <= -4) {
        gameToEvaluate.winnerValue = BetTypes.AWAY_4_7;
      } else if (pointDiff <= -1) {
        gameToEvaluate.winnerValue = BetTypes.AWAY_0_3;
      } else if (pointDiff <= 3) {
        gameToEvaluate.winnerValue = BetTypes.HOME_0_3;
      } else if (pointDiff <= 7) {
        gameToEvaluate.winnerValue = BetTypes.HOME_4_7;
      } else if (pointDiff <= 14) {
        gameToEvaluate.winnerValue = BetTypes.HOME_8_14;
      } else if (pointDiff >= 15) {
        gameToEvaluate.winnerValue = BetTypes.HOME_15_PLUS;
      }

      if (pointDiff > 0) {
        gameToEvaluate.winner = winnerTeam.HOME;
        gameToEvaluate.winnerTeamAlias = gameToEvaluate.homeTeamAlias;
      } else if (pointDiff < 0) {
        gameToEvaluate.winner = winnerTeam.AWAY;
        gameToEvaluate.winnerTeamAlias = gameToEvaluate.awayTeamAlias;
      }
      gameToEvaluate.bets.forEach(bet => {
        if (!bet.bet) {
          return;
        }
        if (gameToEvaluate.winnerValue === BetTypes.TIE) {
          if (bet.bet === BetTypes.HOME_0_3 || bet.bet === BetTypes.AWAY_0_3) {
            resultObject[bet.id] += 5;
          }
        } else {
          if (bet.bet === gameToEvaluate.winnerValue) {
            resultObject[bet.id] += 5;
          } else if (bet.bet.startsWith(gameToEvaluate.winnerValue.subString(0, 4))) {
            resultObject[bet.id] += 1;
          }
        }
      })

    })
    currentSeason.standings.forEach(standing => {
      standing.score += resultObject[standing.id];
    })
    // if (isThisSuperBowlWeek) {
    //   currentSeason.isOpen = false;
    // }
  })

  if (await DbTransactions.saveSeasonModifications(leagues)) {
    return isThisSuperBowlWeek;
  } else {
    return responseMessage.LEAGUE.UPDATE_FAIL;
  }
}

async function evaluate(isAdmin) {
  const leagues = await LeagueDoc.getAllLeagues();
  if (
    !leagues ||
    leagues === responseMessage.DATABASE.ERROR ||
    !isAdmin
  ) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  const weekResults = await getWeekData();
  if (!weekResults) {
    return responseMessage.LEAGUE.UPDATE_FAIL;
  }
  const isThisSuperBowlWeek = isSuperBowlWeek(weekResults);
  let isWeekOver = false;
  
  leagues.forEach(league => {
    const resultObject = { isWeekOver: true };
    league.players.forEach(player => {
      resultObject[player.id] = 0;
    })
    const currentSeason = league.seasons.find(season => season.year === weekResults.year);
    const currWeek = currentSeason.weeks.find(week => week.weekId === weekResults.week.id);
    const doWeekResults = doWeek(currWeek.games, weekResults.week.games, resultObject);
    currentSeason.standings.forEach(standing => {
      standing.score += doWeekResults[standing.id];
    })

    isWeekOver = !currWeek.games.some(game => game.isOpen);
    if (isWeekOver) {
      currWeek.isOpen = false;
      if (isThisSuperBowlWeek) {
        checkFinalWinnerBets(currentSeason, getSuperbowlWinner(weekResults.week.games[0]));
      }
    }
  });

  const isSaveSuccess = await DbTransactions.saveSeasonModifications(leagues);
  if (!isSaveSuccess) {
    return responseMessage.LEAGUE.UPDATE_FAIL;
  }
  await sleep(2000);
  await setTeamStandings();

  if (!isWeekOver) {
    return responseMessage.WEEK.EVALUATION_SUCCESS;
  }
  const isStepTrackerSuccess = await stepWeekTracker();
  if (isStepTrackerSuccess) {
    await sleep(2000);
    const isCreateSuccess = await createNewWeekAndGames();
    return isCreateSuccess ? responseMessage.WEEK.EVALUATION_SUCCESS : responseMessage.WEEK.EVALUATION_FAIL;
  }
}

function getSuperbowlWinner (game) {
  const winner = game.scoring.home_points > game.scoring.away_points ? 'home' : 'away';
  return game[winner].alias;
}

function checkFinalWinnerBets(season, winner) {
  Object.keys(season.finalWinner).forEach(userId => {
    if (season.finalWinner[userId] === winner) {
      season.standings.find(s => s.id === userId).score += 30;
    }
  })
}

function doWeek(leagueGames, gamesResults, resultObject) {
  gamesResults.forEach(gameResult => {
    if (!(gameResult.status === gameStatus.CLOSED || gameResult.status === gameStatus.POSTPONED)) {
      resultObject.isWeekOver = false;
      return;
    }
    const gameToEvaluate = leagueGames.find(game => game.gameId === gameResult.id);
    if (!gameToEvaluate) {
      return;
    }
    if (!gameToEvaluate.isOpen) {
      return;
    }
    const scoring = gameResult.scoring;
    gameToEvaluate.status = gameResult.status;
    gameToEvaluate.homeScore = scoring.home_points;
    gameToEvaluate.awayScore = scoring.away_points;
    
    const pointDiff = gameToEvaluate.homeScore - gameToEvaluate.awayScore;

    if (pointDiff === 0) {
      gameToEvaluate.winner = winnerTeam.TIE;
      gameToEvaluate.winnerValue = BetTypes.TIE;
    } else if (pointDiff <= -15) {
      gameToEvaluate.winnerValue = BetTypes.AWAY_15_PLUS;
    } else if (pointDiff <= -8) {
      gameToEvaluate.winnerValue = BetTypes.AWAY_8_14;
    } else if (pointDiff <= -4) {
      gameToEvaluate.winnerValue = BetTypes.AWAY_4_7;
    } else if (pointDiff <= -1) {
      gameToEvaluate.winnerValue = BetTypes.AWAY_0_3;
    } else if (pointDiff <= 3) {
      gameToEvaluate.winnerValue = BetTypes.HOME_0_3;
    } else if (pointDiff <= 7) {
      gameToEvaluate.winnerValue = BetTypes.HOME_4_7;
    } else if (pointDiff <= 14) {
      gameToEvaluate.winnerValue = BetTypes.HOME_8_14;
    } else if (pointDiff >= 15) {
      gameToEvaluate.winnerValue = BetTypes.HOME_15_PLUS;
    }

    if (pointDiff > 0) {
      gameToEvaluate.winner = winnerTeam.HOME;
      gameToEvaluate.winnerTeamAlias = gameToEvaluate.homeTeamAlias;
    } else if (pointDiff < 0) {
      gameToEvaluate.winner = winnerTeam.AWAY;
      gameToEvaluate.winnerTeamAlias = gameToEvaluate.awayTeamAlias;
    }
    gameToEvaluate.bets.forEach(bet => {
      if (!bet.bet) {
        return;
      }
      if (gameToEvaluate.winnerValue === BetTypes.TIE) {
        if (bet.bet === BetTypes.HOME_0_3 || bet.bet === BetTypes.AWAY_0_3) {
          resultObject[bet.id] += 4;
        }
      } else {
        if (bet.bet === gameToEvaluate.winnerValue) {
          resultObject[bet.id] += 4;
        } else if (bet.bet.startsWith(gameToEvaluate.winnerValue.substring(0, 4))) {
          resultObject[bet.id] += 1;
        }
      }
    })

    gameToEvaluate.isOpen = false;
  })
  return resultObject;
}

function isSuperBowlWeek(week) {
  return week.type === regOrPst.POSTSEASON && week.week.sequence === 4;
}

async function stepWeekTracker() {
  const weekTracker = await WeekTrackerDoc.getTracker();
  if (!weekTracker) {
    return null;
  }
  if (weekTracker.regOrPst === regOrPst.POSTSEASON && weekTracker.week === 4) {
    // after super bowl, when evaluating the week, not changing the week tracker
    return;
  }

  if (weekTracker.regOrPst === regOrPst.REGULAR && weekTracker.week === 18) {
    weekTracker.week = 1;
    weekTracker.regOrPst = regOrPst.POSTSEASON;
  } else {
    weekTracker.week++;
  }
  return await DbTransactions.saveWeekTrackerModifications(weekTracker);
}

async function setTeamStandings() {
  const path = `https://api.sportradar.us/nfl/official/trial/v6/en/seasons/2021/REG/standings/season.json?api_key=${process.env.SPORTRADAR_KEY}`
  let data;
  try {
    data = await axios.get(path);
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
  const savedStandings = await TeamStandingsDoc.findByYear(data.data.season.year);
  if (savedStandings === responseMessage.DATABASE.ERROR) {
    return responseMessage.DATABASE.ERROR;
  }
  let newStandings;
  if (!savedStandings.length) {
    newStandings = TeamStandingsModel({
      year: data.data.season.year,
      teams: {}
    });
  } else {
    newStandings = savedStandings[0];
    newStandings.teams = {};
  }

  data.data.conferences.forEach(conf => {
    conf.divisions.forEach(div => {
      div.teams.forEach(team => {
        newStandings.teams[team.alias] = {
          win: team.wins,
          loss: team.losses,
          tie: team.ties
        }
      })
    })
  })
  return await TeamStandingsDoc.save(newStandings);
}

async function getTeamStandings() {
  const weekTracker = await WeekTrackerDoc.getTracker();
  if (!weekTracker) {
    return responseMessage.DATABASE.ERROR;
  }
  const teasmStandings = await TeamStandingsDoc.findByYear(weekTracker.year);
  if (teasmStandings === responseMessage.DATABASE.ERROR) {
    return responseMessage.DATABASE.ERROR;
  }
  return teasmStandings[0];
}

async function resetWeekTrackerForNextYear() {
  const weekTracker = await WeekTrackerDoc.getTracker();
  if (!weekTracker) {
    return null;
  }
  weekTracker.year = new Date().getFullYear();
  weekTracker.regOrPst = regOrPst.REGULAR;
  weekTracker.week = 1;

  return weekTracker;
}
