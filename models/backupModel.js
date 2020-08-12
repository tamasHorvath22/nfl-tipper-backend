const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');
let Schema = mongoose.Schema;

let backupSchema = new Schema({
    confirmEmails: String,
    forgotPassword: String,
    leagueInvitations: String,
    leagues: String,
    users: String,
    weeekTracker: String
}, { timestamps: true });

module.exports = mongoose.model(schemas.BACKUP, backupSchema);
