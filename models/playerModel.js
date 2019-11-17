const mongoose = require('mongoose');

let Schema = mongoose.Schema;

let playerSchema = new Schema({
    username: { type : String },
    userId: { type : String },
    leagueId: { type : String },
    leaguePoints: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Player', playerSchema);
