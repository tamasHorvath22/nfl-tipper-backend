const League = require('../models/leagueModel');
const mongoose = require('mongoose');

module.exports = {
  getLeagueNames: getLeagueNames,
  getLeagueById: getLeagueById,
  getAllLeagues: getAllLeagues,
  getLeague: getLeague
}

async function getLeagueNames(idList) {
  let idArray = []
  idList.forEach(league => {
    idArray.push(mongoose.Types.ObjectId(league))
  })

  await League.find({ _id: { $in: idArray } }, (err, leagues) => {
    if (err) {
      return responseMessage.LEAGUE.LEAGUES_NOT_FOUND;
    }
    const leagueNames = []
    leagues.forEach(league => {
      leagueNames.push({ _id: league._id, name: league.name })
    })
    return leagueNames;
  });
}

async function getLeagueById(id) {
  return await League.findById(id).exec();
}

async function getAllLeagues() {
  return await League.find({});
}

async function getLeague(leagueId) {
  return await League.findById(leagueId);
}
