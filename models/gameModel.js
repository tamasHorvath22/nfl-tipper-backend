const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let gameSchema = new Schema({
    gameId: { type : String, required: true },
    homeTeam: { type : String, required: true },
    awayTeam: { type : String, required: true },
    status: { type : String },
    homeScore: { type : Number },
    awayScore: { type : Number },
    season: { type: Number, required: true },
    weekNo: { type: Number, required: true },
    gameStartTime: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Game', gameSchema);
