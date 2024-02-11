const express = require('express');
const dotenv = require('dotenv');
const { generateNewsFeed } = require('./server');

dotenv.config();

const app = express();

app.get('/ping', async (req, res) => {
  try {
    return res.status(200).send({
      success: true,
      message: 'pong',
      data: new Date()
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send({
      success: false,
      message: 'Error Occurred'
    });
  }
});

app.get('/gen-xx-site', async (req, res) => {
  try {
    // Increase timeout for this request to 10 minutes
    req.setTimeout(600000);

    await generateNewsFeed();

    return res.status(200).json({
      success: true,
      message: 'Success'
    });
  } catch (e) {
    console.error(e);

    return res.status(500).json({
      success: false,
      message: 'Error Occurred'
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
