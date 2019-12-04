const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let leagueSchema = new Schema({
    name: { type : String, required: true, unique: true, dropDups: true },
    creator: { type : String },
    players: { type: Array },
    invitations: { type: Array },
    leagueAvatarUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('League', leagueSchema);
