const TeamStandings = require('../models/teams.standing.model');
const mongoose = require('mongoose');
const responseMessage = require('../common/constants/api-response-messages');
const Transaction = require('mongoose-transactions');
const schemas = require('../common/constants/schemas');

module.exports = {
  save: save,
  findByYear: findByYear
}

async function save(teamStandings) {
  const transaction = new Transaction(true);
  teamStandings.markModified('teams')
  transaction.insert(schemas.TEAM_STANDINGS, teamStandings);

  try {
    await transaction.run();
    return true;
  } catch (err)  {
    transaction.rollback();
    console.error(err);
    return false;
  };
}

async function findByYear(year) {
  try {
    return await TeamStandings.find({ year: year });
  } catch(err) {
    console.error(err);
    return responseMessage.DATABASE.ERROR;
  }
}
