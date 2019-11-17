const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let betSchema = new Schema({
    gameId: { type : String, required: true },
    userId: { type : String, required: true },
    LeagueId: { type : String, required: true },
    teamToWin: { type : String }
}, { timestamps: true });

module.exports = mongoose.model('Bet', betSchema);
