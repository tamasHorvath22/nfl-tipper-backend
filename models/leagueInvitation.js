const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let leagueInvitationSchema = new Schema({
    LeagueId: { type : String, required: true },
    token: { type : String, required: true },
    invitedEmail: { type : String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('LeagueInvitation', leagueInvitationSchema);
