const mongoose = require('mongoose');

module.exports = {
  connectToDatabase: connectToDatabase
}

function connectToDatabase(connectionString) {
  mongoose.set('useCreateIndex', true);
  mongoose.connect(connectionString, { useUnifiedTopology: true, useNewUrlParser: true });
}
