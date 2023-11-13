const express = require('express');
const dotenv = require('dotenv');
const { generateNewsFeed } = require('./server');
const cron = require('node-cron');

dotenv.config();

const app = express();

app.get('/ping', async (req, res) => {
  return res.status(200).send({
    message: 'pong',
    data: new Date()
  });
});

app.get('/gen-xx-site', async (req, res) => {
  await generateNewsFeed();
  return res.send('Hello World');
});

// job to run every second
// cron.schedule('* * * * * *', async () => {
//   console.log('sample job')
// })

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
