const League = require('../models/leagueModel');
const mongoose = require('mongoose');

module.exports = {
  getLeagues: getLeagues,
  getLeagueById: getLeagueById
}

async function getLeagues(idList) {
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
