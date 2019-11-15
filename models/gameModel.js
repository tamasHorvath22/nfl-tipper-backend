const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let gameSchema = new Schema({
    gameId: { type : String, required: true },
    homeTeam: { type : String, required: true },
    homeScore: { type : Number },
    awayScore: { type : Number },
    awayTeam: { type : String, required: true },
    season: { type: Number, required: true },
    weekNo: { type: Number, required: true },
    gameStartTime: { type: Date },
    result: { type : String },
    scores: { type: Object }
}, { timestamps: true });

module.exports = mongoose.model('Game', gameSchema);
