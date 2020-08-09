const League = require('../models/leagueModel');
const Season = require('../models/seasonModel');
const responseMessage = require('../common/constants/api-response-messages');
const MailService = require('../services/mailService');
const Transaction = require('mongoose-transactions');
const UserDoc = require('../persistence/user-doc');
const LeagueDoc = require('../persistence/league-doc');
const schemas = require('../common/constants/schemas');
const GameService = require('../services/game-service');
const mongoose = require('mongoose');
const ScheduleService = require('../services/schedule-service');

module.exports = {
  createLeague: createLeague,
  getLeagueNames: getLeagueNames,
  getLeague: getLeague,
  sendInvitation: sendInvitation,
  acceptInvitaion: acceptInvitaion,
  getSeasonData: getSeasonData,
  saveWeekBets: saveWeekBets,
  triggerManually: triggerManually
}

async function createLeague(creator, leagueData) {
  const currentYear = new Date().getFullYear();
  let user;
  try {
    user = await UserDoc.getUserById(creator.userId);
    if (!user) {
      return responseMessage.USER.NOT_FOUND;
    }
  } catch (err) {
    return responseMessage.USER.NOT_FOUND;
  }

  let league = League({
    name: leagueData.name,
    creator: creator.userId,
    invitations: [],
    players: [{ id: user._id, name: user.username }],
    seasons: [
      Season({
        // TODO remove previous year (-1)
        year: currentYear - 1,
        // TODO remove previous year (-1)
        numberOfSeason: currentYear - 1 - 1919,
        // TODO remove previous year (-1)
        numberOfSuperBowl: currentYear - 1 - 1965,
        weeks: [],
        standings: [{ id: user._id, name: user.username, score: 0 }],
        isOver: false,
        isCurrent: true
      })
    ],
    leagueAvatarUrl: leagueData.leagueAvatarUrl || null
  });

  user.leagues.push({ leagueId: league._id, name: league.name });

  const transaction = new Transaction(true);
  transaction.insert(schemas.LEAGUE, league);
  transaction.insert(schemas.USER, user);

  try {
    await transaction.run();
    console.log('league save success')
  } catch (err)  {
    transaction.rollback();
    console.log('league save fail')
    return responseMessage.LEAGUE.CREATE_FAIL;
  };
  await GameService.createNewWeekForLeague(league._id);
  return user;
}

async function getLeagueNames(idList) {
  return await LeagueDoc.getLeagueNames(idList);
}

async function getLeague(id) {
  let league;
  try {
    league = await LeagueDoc.getLeagueById(id);
  } catch (err) {
    return responseMessage.LEAGUE.NOT_FOUND;
  }
  if (!league) {
    return responseMessage.LEAGUE.NOT_FOUND;
  } else {
    return league;
  }
}

async function sendInvitation(invitorId, inviteData) {
  let league;
  let invitedUser;
  try {
    league = await LeagueDoc.getLeagueById(inviteData.leagueId);
    if (!league) {
      return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
    }
  } catch (err) {
    return responseMessage.COMMON.ERROR;
  }

  try {
    invitedUser = await UserDoc.getUserByEmail(inviteData.invitedEmail);
    if (!invitedUser) {
      return responseMessage.USER.NO_EMAIL_FOUND;
    }
  } catch (err) {
    return responseMessage.COMMON.ERROR;
  }

  // TODO strange, id did not work, find out why
  if (league.players.find(user => user.name === invitedUser.username)) {
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
    const transaction = new Transaction(true);
    transaction.insert(schemas.LEAGUE, league);
    transaction.insert(schemas.USER, invitedUser);
    try {
      await transaction.run();
      // MailService.send()
      return responseMessage.LEAGUE.INVITATION_SUCCESS;
    } catch (err)  {
      transaction.rollback();
      return responseMessage.LEAGUE.INVITATION_FAIL;
    };
  }
}

async function acceptInvitaion(invitedUserId, leagueId) {
  let league;
  let user;
  try {
    league = await LeagueDoc.getLeagueById(leagueId);
    if (!league) {
      return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
    }
  } catch (err) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }

  try {
    user = await UserDoc.getUserById(invitedUserId);
    if (!user) {
      return responseMessage.USER.NOT_FOUND;
    }
  } catch (err) {
    return responseMessage.USER.NOT_FOUND;
  }

  if (!league.invitations.includes(user._id)) {
    return responseMessage.LEAGUE.USER_NOT_INVITED;
  }
  user.invitations.splice(user.invitations.indexOf(league._id), 1);
  user.leagues.push({ leagueId: league._id, name: league.name });
  league.invitations.splice(league.invitations.indexOf(user._id));
  league.players.push({ id: user._id, name: user.username });
  const currentSeason = league.seasons.find(season => season.isCurrent);
  currentSeason.standings.push({ id: user._id.toString(), name: user.username, score: 0 })
  if (currentSeason.weeks.length) {
    const currentWeek = currentSeason.weeks.find(week => week.isOpen);
    currentWeek.games.forEach(game => {
      game.bets.push({ id: user._id, name: user.username, bet: null });
    })
  }
  
  const transaction = new Transaction(true);
  league.markModified('seasons')
  transaction.insert(schemas.LEAGUE, league);
  transaction.insert(schemas.USER, user);

  try {
    await transaction.run();
    return user;
  } catch (err)  {
    transaction.rollback();
    return responseMessage.LEAGUE.JOIN_FAIL;
  };
};

async function getSeasonData(userId, leagueId) {
  let league;
  try {
    league = await LeagueDoc.getLeagueById(leagueId);
    if (!league) {
      return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
    }
  } catch (err) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  // TODO remove previous year (-1)
  const currentYear = new Date().getFullYear() - 1;
  const currentSeason = league.seasons.find(season => season.year === currentYear);

  let lastWeek;
  if (currentSeason.weeks.length) {
    lastWeek = currentSeason.weeks[currentSeason.weeks.length - 1];
    if (!lastWeek.isOpen) {
      return currentSeason;
    }
  }

  // const week = currentSeason.weeks.find(week => week.number === data.weekNumber);
  lastWeek.games.forEach(game => {
    const userBet = game.bets.find(bet => bet.id.equals(userId));
    game.bets = [userBet];
  })
  return currentSeason
};

async function saveWeekBets(userId, leagueId, incomingWeek) {
  let league;
  try {
    league = await LeagueDoc.getLeagueById(leagueId);
    if (!league) {
      return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
    }
  } catch (err) {
    return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
  }
  // TODO remove previous year (-1)
  const currentYear = new Date().getFullYear() - 1;
  const currentSeason = league.seasons.find(season => season.year === currentYear);
  const currentWeek = currentSeason.weeks.find(weekToFind => weekToFind._id.equals(incomingWeek._id));
  const currentTime = new Date().getTime();

  currentWeek.games.forEach(game => {
    const betToSave = game.bets.find(bet => bet.id.equals(userId));
    const incomingGame = incomingWeek.games.find(incGame => mongoose.Types.ObjectId(incGame._id).equals(mongoose.Types.ObjectId(game._id)));
    betToSave.bet = incomingGame.bets.find(bet => bet.id === userId).bet;
    // TODO put back the code inside this commented if statement
    // if (new Date(game.startTime).getTime() > currentTime) {
    // }
  })
  
  const transaction = new Transaction(true);
  league.markModified('seasons')
  transaction.insert(schemas.LEAGUE, league);

  try {
    await transaction.run();
    return responseMessage.LEAGUE.BET_SAVE_SUCCESS;
  } catch (err)  {
    transaction.rollback();
    return responseMessage.LEAGUE.BET_SAVE_FAIL;
  };
};

async function triggerManually() {
  return await ScheduleService.triggerManually();
}
