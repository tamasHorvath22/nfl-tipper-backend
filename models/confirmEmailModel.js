const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');

const Schema = mongoose.Schema;

let confirmEmailSchema = new Schema({
    email: { type: String },
    userId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model(schemas.CONFIRM_EMAIL, confirmEmailSchema);
