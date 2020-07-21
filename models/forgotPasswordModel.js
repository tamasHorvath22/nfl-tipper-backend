const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');

const Schema = mongoose.Schema;

let forgotPasswordSchema = new Schema({
    email: { type: String },
    hash: { type: String }
}, { timestamps: true });

module.exports = mongoose.model(schemas.FORGOT_PASSWORD, forgotPasswordSchema);
