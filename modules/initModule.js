const WeekTrackerModel = require('../models/weektracker.model');
const regOrPst = require('../common/constants/regular-or-postseason')
const ScheduleService = require('../services/schedule.service');
const logger = require('../services/logger.service');
const WeekTrackerDoc = require('../persistence/weektracker.doc');
const BackupService = require('../services/backup.service');
const { exec } = require("child_process");
const axios = require('axios');
const sleep = require('util').promisify(setTimeout);

module.exports = async function () {
  // logger.log({
  //   level: 'info',
  //   message: 'Hello my pretty new logger!!!!!'
  // })
  
  await WeekTrackerDoc.initWeekTracker();

  // const diffs = {};

  // const front = 'https://api.sportradar.us/nfl/official/trial/v5/en/games/';
  // const mid = '/REG/'
  // const end = `/schedule.json?api_key=${process.env.SPORTRADAR_KEY}`;
  
  // for (let j = 2016; j < 2021; j++) {
  //   for (let i = 1; i <= 17; i++) {
  //     const url = `${front}${j}${mid}${i}${end}`;
  //     const result = await axios.get(url);
  //     result.data.week.games.forEach(game => {
  //       if (game.hasOwnProperty('scoring')) {
  //         const diff = Math.abs(game.scoring.home_points - game.scoring.away_points);
  //         const key = diff.toString();
  //         if (diffs.hasOwnProperty(key)) {
  //           diffs[key]++;
  //         } else {
  //           diffs[key] = 1;
  //         }
  //       }
  //     });
  //     console.log(`${j}, week ${i}`);
  //     await sleep(1500);
  //   }
  // }
  // console.log(diffs);

  // let zeroThree = 0;
  // let fourSeven = 0;
  // let eightFourteen = 0;
  // let fifteenPlus = 0;
  // for (let [key, value] of Object.entries(diffs)) {
  //   if (parseInt(key) <= 3) {
  //     zeroThree += value;
  //   } else if (parseInt(key) <= 7) {
  //     fourSeven += value;
  //   } else if (parseInt(key) <= 14) {
  //     eightFourteen += value;
  //   } else {
  //     fifteenPlus += value;
  //   }
  // }
  // console.log(`0 - 3:  ${zeroThree}`);
  // console.log(`4 - 7:  ${fourSeven}`);
  // console.log(`8 - 14: ${eightFourteen}`);
  // console.log(`15+:    ${fifteenPlus}`);

  // await ScheduleService.createNewWeek();

  // const command = `cd ..; mongodump --forceTableScan --uri mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASS}@cluster0-m8z4s.mongodb.net/${process.env.DB_NAME}`
  // exec(command, (error, stdout, stderr) => {
  //   if (error) {
  //       console.log(`error: ${error.message}`);
  //       return;
  //   }
  //   if (stderr) {
  //       console.log(`stderr: ${stderr}`);
  //       return;
  //   }
  //   console.log(`stdout: ${stdout}`);
  // });
  
  // await BackupService.saveBackup();

  // await BackupService.restore();
}
