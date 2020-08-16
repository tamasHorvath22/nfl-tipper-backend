const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');
let Schema = mongoose.Schema;

let backupSchema = new Schema({
    confirmEmails: Object,
    forgotPassword: Object,
    leagueInvitations: Object,
    leagues: Object,
    users: Object,
    weeekTracker: Object
}, { timestamps: true });

module.exports = mongoose.model(schemas.BACKUP, backupSchema);
