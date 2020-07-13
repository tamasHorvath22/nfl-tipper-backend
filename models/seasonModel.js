import { Schema as _Schema, model } from 'mongoose';
const Schema = _Schema;

let seasonSchema = new Schema({
    year: Number,
    numberOfSeason: Number,
    weeks: [],
    isOver: Boolean
}, { timestamps: true });

export default model('Season', seasonSchema);
