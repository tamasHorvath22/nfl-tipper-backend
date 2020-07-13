const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');
let Schema = mongoose.Schema;

let weekSchema = new Schema({
    number: Number,
    games: []
}, { timestamps: true });

module.exports = mongoose.model(schemas.WEEK, weekSchema);

