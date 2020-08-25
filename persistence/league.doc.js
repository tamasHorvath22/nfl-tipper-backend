const League = require('../models/league.model');
const mongoose = require('mongoose');

module.exports = {
  getLeagueNames: getLeagueNames,
  getLeagueById: getLeagueById,
  getAllLeagues: getAllLeagues,
  getLeague: getLeague,
  getLeaguesByIds: getLeaguesByIds
}

async function getLeagueNames(idList) {
  const leagues = await findLeaguesByIds(idList);
  const leagueNames = []
  leagues.forEach(league => {
    leagueNames.push({ id: league._id, name: league.name, avatar: league.leagueAvatarUrl })
  })
  return leagueNames;
}

async function getLeagueById(id) {
  return await League.findById(id).exec();
}

async function getLeaguesByIds(idList) {
  return await findLeaguesByIds(idList);
}

async function findLeaguesByIds(idList) {
  const mongooseIdArray = [];
  idList.forEach(league => {
    mongooseIdArray.push(mongoose.Types.ObjectId(league))
  })
  return await League.find({ _id: { $in: mongooseIdArray } });
}

async function getAllLeagues() {
  return await League.find({});
}

async function getLeague(leagueId) {
  return await League.findById(leagueId);
}
