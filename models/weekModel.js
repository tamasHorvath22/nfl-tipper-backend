import { Schema as _Schema, model } from 'mongoose';
const Schema = _Schema;

let weekSchema = new Schema({
    number: Number,
    games: []
}, { timestamps: true });

export default model('Week', weekSchema);
