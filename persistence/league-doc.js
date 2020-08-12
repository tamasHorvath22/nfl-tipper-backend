const League = require('../models/leagueModel');
const LeagueInvitation = require('../models/leagueInvitationModel');
const mongoose = require('mongoose');

module.exports = {
  getLeagueNames: getLeagueNames,
  getLeagueById: getLeagueById,
  getAllLeagues: getAllLeagues,
  getLeague: getLeague,
  getLeaguesByIds: getLeaguesByIds,
  getAllLeagueInvitations: getAllLeagueInvitations
}

async function getLeagueNames(idList) {
  const leagues = await findLeaguesByIds(idList);
  const leagueNames = []
  leagues.forEach(league => {
    leagueNames.push({ _id: league._id, name: league.name })
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

async function getAllLeagueInvitations() {
  return await LeagueInvitation.find({});
}
