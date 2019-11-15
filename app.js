const express = require('express');
const app = express();
const api = require('./api/api');
const mongoose = require('mongoose');
const config = require('./config');
const initModule = require('./modules/initModule');

mongoose.set('useCreateIndex', true);
mongoose.connect(config.getDbConnectionString(), { useUnifiedTopology: true, useNewUrlParser: true });

api(app, express.Router());
initModule();

app.listen(config.getServerDetails().PORT || 3000);
