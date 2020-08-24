const express = require('express');
const app = express();
const api = require('./api/api');
const config = require('./config');
const initModule = require('./modules/initModule');
const cors = require('cors')
const Transactions = require('./persistence/user.transactions');

app.use(cors())
Transactions.connectToDatabase(config.getDbConnectionString());

api(app, express.Router());
initModule();

app.listen(config.getServerDetails().PORT || 3000);
