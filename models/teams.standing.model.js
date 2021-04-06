const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');
let Schema = mongoose.Schema;

let teamStandingsSchema = new Schema({
    teams: Object,
    year: Number
}, { timestamps: true });

module.exports = mongoose.model(schemas.TEAM_STANDINGS, teamStandingsSchema);
