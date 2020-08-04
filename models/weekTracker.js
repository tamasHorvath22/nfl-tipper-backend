const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');
const Schema = mongoose.Schema;

let weekTrackerSchema = new Schema({
  year: Number,
  week: Number,
  regOrPst: String
}, { timestamps: true });

module.exports = mongoose.model(schemas.WEEK_TRACKER, weekTrackerSchema);
