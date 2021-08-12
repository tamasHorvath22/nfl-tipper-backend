const League = require('../models/league.model');
const Season = require('../models/season.model');
const responseMessage = require('../common/constants/api-response-messages');
const UserDoc = require('../persistence/user.doc');
const LeagueDoc = require('../persistence/league.doc');
const GameService = require('./game.service');
const mongoose = require('mongoose');
const ScheduleService = require('./schedule.service');
const DbTransactions = require('../persistence/league.transactions');
const environment = require('../common/constants/environments');
const WeekTrackerDoc = require('../persistence/weektracker.doc');

module.exports = {
  createLeague: createLeague,
  getLeagueNames: getLeagueNames,
  getLeague: getLeague,
  sendInvitation: sendInvitation,
  acceptInvitaion: acceptInvitaion,
  saveWeekBets: saveWeekBets,
  triggerManually: triggerManually,
  createNewSeason: createNewSeason,
  modifyLeague: modifyLeague,
  saveFinalWinner: saveFinalWinner
}

async function createLeague(creator, leagueData) {
  if (!creator || !leagueData) {
    return;
  }
  const user = await UserDoc.getUserById(creator.userId);
  if (!user) {
    return responseMessage.USER.NOT_FOUND;
  }
  if (user === responseMessage.DATABASE.ERROR) {
    return responseMessage.USER.NOT_FOUND;
  }

  const league = await buildLeague(user, leagueData);
  if (league === responseMessage.LEAGUE.CREATE_FAIL) {
    return responseMessage.LEAGUE.CREATE_FAIL;
  }
  user.leagues.push({ leagueId: league._id, name: league.name });

  let isLeagueSaveSuccess = await DbTransactions.saveLeagueAndUser(user, league);
  if (!isLeagueSaveSuccess) {
    return responseMessage.LEAGUE.CREATE_FAIL;
  }
  await GameService.createNewWeekForLeague(league._id);
  return user;
}

async function buildLeague(user, leagueData) {
  const weekTracker = await WeekTrackerDoc.getTracker();
  if (!weekTracker) {
    return responseMessage.LEAGUE.CREATE_FAIL;
  }
  let currentYear = weekTracker.year;
  // if (process.env.ENVIRONMENT === environment.DEVELOP) {
  //   currentYear--;
  // }

  return League({
    name: leagueData.name,
    creator: user._id,
    invitations: [],
    players: [{ id: user._id, name: user.username, avatar: user.avatarUrl }],
    seasons: [
      Season({
        year: currentYear,
        numberOfSeason: currentYear - 1919,
        numberOfSuperBowl: currentYear - 1965,
        weeks: [],
        standings: [{ id: user._id, name: user.username, score: 0 }],
        finalWinner: {
          [user._id]: null
        },
        isOpen: true
      })
    ],
    leagueAvatarUrl: leagueData.leagueAvatarUrl || null
  });
}

async function getLeagueNames(idList) {
  // TODO set frontend to error message
  return await LeagueDoc.getLeagueNames(idList);
}

async function getLeague(id) {
  const league = await LeagueDoc.getLeagueById(id);
  if (!league) {
    return responseMessage.LEAGUE.NOT_FOUND;
  }
  // TODO set frontend for return value
  if (league === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.NOT_FOUND;
  }
  return league;
}

async function sendInvitation(invitorId, inviteData) {
  const league = await LeagueDoc.getLeagueById(inviteData.leagueId);
  if (!league) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  // TODO set frontend for return value
  if (league === responseMessage.DATABASE.ERROR) {
    return responseMessage.COMMON.ERROR;
  }
  const invitedUser = await UserDoc.getUserByEmail(inviteData.invitedEmail);
  if (!invitedUser) {
    return responseMessage.USER.NO_EMAIL_FOUND;
  }
  // TODO set frontend for return value
  if (invitedUser === responseMessage.DATABASE.ERROR) {
    return responseMessage.DATABASE.ERROR;
  }

  if (league.players.find(user => user.id.equals(invitedUser._id))) {
    return responseMessage.LEAGUE.USER_ALREADY_IN_LEAGUE;
  }
  
  if (league.invitations.includes(invitedUser._id) || invitedUser.invitations.includes(league._id)) {
    return responseMessage.LEAGUE.USER_ALREADY_INVITED;
  }

  if (invitorId !== league.creator) {
    return responseMessage.LEAGUE.NO_INVITATION_RIGHT;
  } else {
    league.invitations.push(invitedUser._id);
    invitedUser.invitations.push({ leagueId: league._id, name: league.name });
    const isSaveSuccess = await DbTransactions.saveLeagueAndUser(invitedUser, league);
    return isSaveSuccess ? responseMessage.LEAGUE.INVITATION_SUCCESS : responseMessage.LEAGUE.INVITATION_FAIL
  }
}

async function acceptInvitaion(invitedUserId, leagueId) {
  const league = await LeagueDoc.getLeagueById(leagueId);
  if (!league) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  // TODO set frontend for return value
  if (league === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }

  const user = await UserDoc.getUserById(invitedUserId);
  if (!user) {
    return responseMessage.USER.NOT_FOUND;
  }
  // TODO set frontend for return value
  if (user === responseMessage.DATABASE.ERROR) {
    return responseMessage.USER.NOT_FOUND;
  }

  if (!league.invitations.includes(user._id)) {
    return responseMessage.LEAGUE.USER_NOT_INVITED;
  }
  user.invitations.splice(user.invitations.indexOf(league._id), 1);
  user.leagues.push({ leagueId: league._id, name: league.name });
  league.invitations.splice(league.invitations.indexOf(user._id));
  league.players.push({ id: user._id, name: user.username, avatar: user.avatarUrl });
  const currentSeason = league.seasons.find(season => season.isOpen);
  currentSeason.standings.push({ id: user._id.toString(), name: user.username, score: 0 })
  if (currentSeason.weeks.length) {
    const currentWeek = currentSeason.weeks.find(week => week.isOpen);
    currentWeek.games.forEach(game => {
      game.bets.push({ id: user._id, name: user.username, bet: null });
    })
  }
  const isSaveSuccess = await DbTransactions.saveLeagueAndUser(user, league);
  return isSaveSuccess ? user : responseMessage.LEAGUE.JOIN_FAIL;
};

async function saveWeekBets(userId, leagueId, incomingWeek, isForAllLeagues) {
  let leagueList = [];
  if (isForAllLeagues) {
    const user = await UserDoc.getUserById(userId);
    if (!user || user === responseMessage.DATABASE.ERROR) {
      return responseMessage.DATABASE.ERROR;
    }
    const leagueIdList = [];
    user.leagues.forEach(league => {
      leagueIdList.push(league.leagueId);
    });
    leagueList = await LeagueDoc.getLeaguesByIds(leagueIdList);
    if (!leagueList || leagueList === responseMessage.DATABASE.ERROR) {
      return responseMessage.DATABASE.ERROR;
    }
  } else {
    const league = await LeagueDoc.getLeagueById(leagueId);
    if (!league) {
      return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
    }
    // TODO set frontend for return value
    if (league === responseMessage.DATABASE.ERROR) {
      return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
    }
    leagueList = [league];
  }
  const weekTracker = await WeekTrackerDoc.getTracker();
  if (!weekTracker) {
    return responseMessage.LEAGUE.BET_SAVE_FAIL;
  }
  const currentYear = weekTracker.year;
  leagueList.forEach(league => {
    saveBetsForOneLeague(userId, league, incomingWeek, currentYear);
  })
  const isSaveSuccess = await DbTransactions.updateLeagues(leagueList);
  return isSaveSuccess ? responseMessage.LEAGUE.BET_SAVE_SUCCESS : responseMessage.LEAGUE.BET_SAVE_FAIL;
};

function saveBetsForOneLeague(userId, league, incomingWeek, currentYear) {
  // if (process.env.ENVIRONMENT === environment.DEVELOP) {
  //   currentYear--;
  // }
  const currentSeason = league.seasons.find(season => season.year === currentYear);
  const currentWeek = currentSeason.weeks.find(weekToFind => weekToFind.number === incomingWeek.number);
  const currentTime = new Date().getTime();

  currentWeek.games.forEach(game => {
    
    // TODO put saveBets inside this if
    if (new Date(game.startTime).getTime() > currentTime) {
      setBets(userId, game, incomingWeek);
    }
    // TODO remove this in production
    setBets(userId, game, incomingWeek);
    
    // if (process.env.ENVIRONMENT === environment.DEVELOP) {
    //   setBets(userId, game, incomingWeek);
    // } else {
    //   if (new Date(game.startTime).getTime() > currentTime) {
    //     setBets(userId, game, incomingWeek);
    //   }
    // }
  })
}

function setBets(userId, game, incomingWeek) {
  const betToSave = game.bets.find(bet => bet.id.equals(userId));
  const incomingGame = incomingWeek.games.find(incGame => {
    return incGame.gameId === game.gameId
  });
  betToSave.bet = incomingGame.bets.find(bet => bet.id === userId).bet;
}

async function modifyLeague(userId, leagueId, avatarUrl, leagueName) {
  const league = await LeagueDoc.getLeagueById(leagueId);
  if (!league) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  // TODO set frontend for return value
  if (league === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  if (userId !== league.creator) {
    return responseMessage.LEAGUE.NO_MODIFICATION_RIGHTS;
  }
  league.leagueAvatarUrl = avatarUrl;
  league.name = leagueName;

  const isSaveSuccess = await DbTransactions.updateLeagues([league]);
  return isSaveSuccess ? responseMessage.LEAGUE.UPDATE_SUCCESS : responseMessage.LEAGUE.UPDATE_FAIL;
};

async function saveFinalWinner(userId, leagueId, finalWinner) {
  const league = await LeagueDoc.getLeagueById(leagueId);
  if (!league) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  // TODO set frontend for return value
  if (league === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  const currentSeason = league.seasons.find(season => season.isOpen);
  currentSeason.finalWinner[userId] = finalWinner;

  const isSaveSuccess = await DbTransactions.updateLeagues([league]);
  return isSaveSuccess ? responseMessage.LEAGUE.UPDATE_SUCCESS : responseMessage.LEAGUE.UPDATE_FAIL;
};

async function triggerManually() {
  return await ScheduleService.triggerManually();
}

async function createNewSeason(isAdmin) {
  return await GameService.createNewSeason(isAdmin);
}
