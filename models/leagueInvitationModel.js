const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let leagueInvitationSchema = new Schema({
    leagueId: { type : String, required: true },
    invitorId: {type : String},
    invitedEmail: { type : String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('LeagueInvitation', leagueInvitationSchema);
