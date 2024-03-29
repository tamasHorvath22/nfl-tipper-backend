const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');
let Schema = mongoose.Schema;

let seasonSchema = new Schema({
    year: Number,
    numberOfSeason: Number,
    numberOfSuperBowl: Number,
    weeks: [],
    isOpen: Boolean,
    standings: [],
    finalWinner: Object
}, { timestamps: true });

module.exports = mongoose.model(schemas.SEASON, seasonSchema);
