const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');

const Schema = mongoose.Schema;

let leagueSchema = new Schema({
    name: { type: String, required: true },
    creator: { type: String },
    players: { type: Array },
    invitations: { type: Array },
    leagueAvatarUrl: { type: String },
    seasons: []
}, { timestamps: true });

module.exports = mongoose.model(schemas.LEAGUE, leagueSchema);
