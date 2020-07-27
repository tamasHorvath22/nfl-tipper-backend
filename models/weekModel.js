const mongoose = require('mongoose');
const schemas = require('../common/constants/schemas');
let Schema = mongoose.Schema;

let weekSchema = new Schema({
  weekId: String,
  number: Number,
  isOpen: Boolean,
  games: []
}, { timestamps: true });

module.exports = mongoose.model(schemas.WEEK, weekSchema);

