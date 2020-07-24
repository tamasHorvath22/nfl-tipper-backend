const League = require('../models/leagueModel');
const Season = require('../models/seasonModel');
const responseMessage = require('../common/constants/api-response-messages');
const sendEmail = require('../modules/emailModule');
const Transaction = require('mongoose-transactions');
const UserDoc = require('../persistence/user-doc');
const LeagueDoc = require('../persistence/league-doc');
const schemas = require('../common/constants/schemas');

module.exports = {
  createLeague: createLeague,
  getLeagues: getLeagues,
  getLeague: getLeague,
  sendInvitation: sendInvitation,
  acceptInvitaion: acceptInvitaion
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
    creator: user.userId,
    invitations: [],
    players: [{ id: user._id, name: user.username }],
    seasons: [
      Season({
        year: currentYear,
        numberOfSeason: currentYear - 1919,
        numberOfSuperBowl: currentYear - 1965,
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
    return user;
  } catch (err)  {
    transaction.rollback();
    return responseMessage.LEAGUE.CREATE_FAIL;
  };
}

async function getLeagues(idList) {
  return await LeagueDoc.getLeagues(idList);
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
    console.log(league);

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
      // sendEmail();
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
  league.seasons.find(season => season.isCurrent).standings.push({ id: user._id.toString(), name: user.username, score: 0 })
  
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