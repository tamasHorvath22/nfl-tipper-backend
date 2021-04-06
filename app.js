const express = require('express');
const app = express();
const api = require('./api/api');
const config = require('./config');
const initModule = require('./modules/initModule');
const cors = require('cors')
const dbConnection = require('./persistence/database.connection');

app.use(cors())
dbConnection.connectToDatabase(config.getDbConnectionString());

api(app, express.Router());
initModule();

app.listen(config.getServerDetails().PORT || 3000);
