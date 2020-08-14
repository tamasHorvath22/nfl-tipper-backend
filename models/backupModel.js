const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');
let Schema = mongoose.Schema;

let backupSchema = new Schema({
    confirmEmails: Array,
    forgotPassword: Array,
    leagueInvitations: Array,
    leagues: Array,
    users: Array,
    weeekTracker: Array,
    week: Object
}, { timestamps: true });

module.exports = mongoose.model(schemas.BACKUP, backupSchema);
