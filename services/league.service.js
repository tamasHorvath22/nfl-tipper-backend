const League = require('../models/league.model');
const Season = require('../models/season.model');
const responseMessage = require('../common/constants/api-response-messages');
const UserDoc = require('../persistence/user.doc');
const LeagueDoc = require('../persistence/league.doc');
const GameService = require('./game.service');
const mongoose = require('mongoose');
const ScheduleService = require('./schedule.service');
const DbTransactions = require('../persistence/league.transactions');


module.exports = {
  createLeague: createLeague,
  getLeagueNames: getLeagueNames,
  getLeague: getLeague,
  sendInvitation: sendInvitation,
  acceptInvitaion: acceptInvitaion,
  saveWeekBets: saveWeekBets,
  triggerManually: triggerManually,
  createNewSeason: createNewSeason,
  modifyLeague: modifyLeague
}

async function createLeague(creator, leagueData) {
  const user = await UserDoc.getUserById(creator.userId);
  if (!user) {
    return responseMessage.USER.NOT_FOUND;
  }
  // TODO set frontend for return value
  if (user === responseMessage.DATABASE.ERROR) {
    return responseMessage.USER.NOT_FOUND;
  }

  const league = buildLeague(user, leagueData)
  user.leagues.push({ leagueId: league._id, name: league.name });

  let isLeagueSaveSuccess = await DbTransactions.saveNewLeague(user, league);
  if (!isLeagueSaveSuccess) {
    return responseMessage.LEAGUE.CREATE_FAIL;
  }
  await GameService.createNewWeekForLeague(league._id);
  return user;
}

function buildLeague(user, leagueData) {
  // TODO remove previous year (-1)
  const currentYear = new Date().getFullYear() -1;

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
        isOpen: true,
        isCurrent: true
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
    return await DbTransactions.saveInvitation(invitedUser, league);
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
  const currentSeason = league.seasons.find(season => season.isCurrent);
  currentSeason.standings.push({ id: user._id.toString(), name: user.username, score: 0 })
  if (currentSeason.weeks.length) {
    const currentWeek = currentSeason.weeks.find(week => week.isOpen);
    currentWeek.games.forEach(game => {
      game.bets.push({ id: user._id, name: user.username, bet: null });
    })
  }
  return await DbTransactions.acceptInvitation(user, league);
};

async function saveWeekBets(userId, leagueId, incomingWeek) {
  const league = await LeagueDoc.getLeagueById(leagueId);
  if (!league) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  // TODO set frontend for return value
  if (league === responseMessage.DATABASE.ERROR) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  // TODO remove previous year (-1)
  const currentYear = new Date().getFullYear() - 1;
  const currentSeason = league.seasons.find(season => season.year === currentYear);
  const currentWeek = currentSeason.weeks.find(weekToFind => weekToFind._id.equals(incomingWeek._id));
  const currentTime = new Date().getTime();

  currentWeek.games.forEach(game => {
    const betToSave = game.bets.find(bet => bet.id.equals(userId));
    const incomingGame = incomingWeek.games.find(incGame => {
      return mongoose.Types.ObjectId(incGame._id).equals(mongoose.Types.ObjectId(game._id))
    });
    betToSave.bet = incomingGame.bets.find(bet => bet.id === userId).bet;
    // TODO put back the code inside this commented if statement
    // if (new Date(game.startTime).getTime() > currentTime) {
    // }
  })
  return await DbTransactions.saveWeekBets(league);
};

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

  return await DbTransactions.modifyLeague(league);
};

async function triggerManually() {
  return await ScheduleService.triggerManually();
}

async function createNewSeason() {
  return await GameService.createNewSeason();
}
