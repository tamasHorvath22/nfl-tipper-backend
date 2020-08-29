const League = require('../models/league.model');
const mongoose = require('mongoose');
const responseMessage = require('../common/constants/api-response-messages');

module.exports = {
  getLeagueNames: getLeagueNames,
  getLeagueById: getLeagueById,
  getAllLeagues: getAllLeagues,
  getLeaguesByIds: getLeaguesByIds
}

async function getLeagueNames(idList) {
  try {
    const leagues = await findLeaguesByIds(idList);
    if (leagues === responseMessage.DATABASE.ERROR) {
      return responseMessage.DATABASE.ERROR;
    }
    const leagueNames = []
    leagues.forEach(league => {
      leagueNames.push({ id: league._id, name: league.name, avatar: league.leagueAvatarUrl })
    })
    return leagueNames;
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}

async function getLeagueById(id) {
  try {
    return await League.findById(id).exec();
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}

async function getLeaguesByIds(idList) {
  return await findLeaguesByIds(idList);
}

async function findLeaguesByIds(idList) {
  const mongooseIdArray = [];
  idList.forEach(league => {
    mongooseIdArray.push(mongoose.Types.ObjectId(league))
  });
  try {
    return await League.find({ _id: { $in: mongooseIdArray } });
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}

async function getAllLeagues() {
  try {
    return await League.find({});
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}
