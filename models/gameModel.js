const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');
const Schema = mongoose.Schema;

let gameSchema = new Schema({
    gameId: String,
    homeTeam: String,
    homeTeamAlias: String,
    awayTeam: String,
    awayTeamAlias: String,
    status: String,
    homeScore: Number,
    awayScore: Number,
    season: Number,
    weekNo: Number,
    startTime: Date,
    isOpen: Boolean,
    bets: []
}, { timestamps: true });

module.exports = mongoose.model(schemas.GAME, gameSchema);
