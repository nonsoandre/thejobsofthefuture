const dotenv = require('dotenv');
const OpenAI = require('openai');
const axios = require('axios');
const FormData = require('form-data');
const { PROMPTS } = require('./prompts');

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const chatGptModel = 'gpt-3.5-turbo-16k';

let tryCount = 0;

function getNowDate() {
  const currentDate = new Date(); // Get the current date
  currentDate.setDate(currentDate.getDate() - 1); // Subtract 1 day from the current date

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // Note: Months are zero-based, so January is 0, February is 1, etc.
  const day = currentDate.getDate();

  return `${year}-${month}-${day}`;
}

const categoriesWithId = [
  {
    name: 'Web3',
    id: 56
  },
  {
    name: 'Blockchain',
    id: 56
  },
  {
    name: 'Metaverse',
    id: 56
  },
  {
    name: 'Spatial Compute',
    id: 52
  },
  {
    name: 'Advanced Intelligence',
    id: 52
  },
  {
    name: 'Mixed Reality',
    id: 32
  },
  {
    name: 'Augmented Reality',
    id: 32
  },
  {
    name: 'Extended Reality',
    id: 32
  },
  {
    name: 'Quantum Computing',
    id: 32
  },
  {
    name: 'Virtual Reality',
    id: 32
  },
  {
    name: 'Augmented Reality',
    id: 32
  },
  {
    name: 'Internet of Things',
    id: 32
  }
];

async function getNewsArticles() {
  try {
    let categories = [
      'Web3'
      // 'Blockchain',
      // 'Metaverse',
      // 'Spatial Compute',
      // 'Advanced Intelligence',
      // 'Mixed Reality',
      // 'Augmented Reality',
      // 'Extended Reality',
      // 'Quantum Computing',
      // 'Virtual Reality',
      // 'Augmented Reality',
      // 'Internet of Things'
    ];

    const articles = await Promise.all(
      categories.map(async (category) => {
        const url = `https://newsapi.org/v2/everything?q=${category} -politics -"political" -"government" -"election"&apiKey=${
          process.env.NEWS_API_KEY
        }&pageSize=${process.env.NEWS_SIZE}&from=${getNowDate()}&language=en`;
        const response = await axios.get(url);

        return response.data.articles.map((article) => {
          article.categories = [
            categoriesWithId.find((c) => c.name === category)?.id
          ];
          return article;
        });
      })
    );

    const flattenedArticles = articles.flat();

    const uniqueTitles = {};

    const uniqueDatas = flattenedArticles.filter((article) => {
      if (!uniqueTitles[article.title]) {
        uniqueTitles[article.title] = true;
        return true;
      }
      return false;
    });

    const trimmedPosts = uniqueDatas.splice(0, 10);

    // Process the retrieved articles
    return trimmedPosts;
  } catch (error) {
    console.error('Error retrieving news articles:', error);
  }
}

async function changeArticleTitle(originalTitle, summary) {
  try {
    const response = await openai.chat.completions.create({
      model: chatGptModel,
      messages: [
        {
          role: 'user',
          content: `Rewrite the following article title to be similar but not the same:\n${originalTitle} and it should be related to this article: ${summary}\nNew Title:`
        }
      ],
      temperature: 0,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const newTitle = response.choices[0].message.content.trim();

    return newTitle;
  } catch (error) {
    console.error('Error in changing article title:', error);
    return originalTitle;
  }
}

async function summarizeArticle(article) {
  const completion = await openai.chat.completions.create({
    model: chatGptModel,
    messages: [
      {
        role: 'user',
        content: PROMPTS.type_two(article)
      }
    ],
    temperature: 1,
    max_tokens: 6000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  let summary = completion.choices[0].message.content;

  const newTitle = await changeArticleTitle(article.title, summary);

  console.log({ summary, newTitle });

  const audioBuffer = await textToSpeech(summary);
  const uploadedMedia = await uploadAudioToWordPress(
    audioBuffer,
    `${newTitle.replace(/\s/g, '-')}-tts.mp3`
  );

  return {
    title: newTitle,
    content: `<p class="has-text-align-center"><strong>Prefer to listen?</strong>&nbsp;No problem!&nbsp;We've created an audio version for your convenience.&nbsp;Press play and relax while you absorb the information.</p>
    <figure class="wp-block-audio"><audio controls src="${uploadedMedia.url}"></audio></figure>\n\n${summary}`,
    status: 'publish', // Set the status to 'publish' to publish the post immediately
    imageUrl: article.urlToImage,
    categories: article.categories
  };
}

async function pushToWebhook(blogPost) {
  try {
    const apiUrl = process.env.WEB_URL + '/wp-json/wp/v2/posts';

    const authHeader = {
      username: process.env.WEB_SITE_USERNAME,
      password: process.env.WEB_SITE_APPLICATION_KEY
    };

    const mediaId = await setFeaturedImage(blogPost.imageUrl);

    blogPost.featured_media = mediaId;

    const response = await axios.post(apiUrl, blogPost, { auth: authHeader });

    return response.data.id;
  } catch (error) {
    console.error('Error pushing blog post to webhook:', error.data);
    throw error;
  }
}

async function setFeaturedImage(imageUrl) {
  try {
    const authHeader = {
      username: process.env.WEB_SITE_USERNAME,
      password: process.env.WEB_SITE_APPLICATION_KEY
    };

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });

    const imageData = Buffer.from(response.data, 'binary');

    const formData = new FormData();
    formData.append('file', imageData, 'image.jpg');

    const uploadUrl = `${process.env.WEB_URL}/wp-json/wp/v2/media`;

    const uploadResponse = await axios.post(uploadUrl, formData, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`
      },
      auth: authHeader
    });

    return uploadResponse.data.id;
  } catch (error) {
    console.error('Error setting featured image:', error);
  }
}

async function generateNewsFeed() {
  console.log({ tryCount });
  try {
    const newInterval = setInterval(async () => {
      console.log('processing news feed generation');
    }, 30 * 1000);

    const newsArticles = await getNewsArticles();

    const summaries = await summarizeArticlesWithIntervals(newsArticles);

    await Promise.all(
      summaries.map(async (summary) => {
        await pushToWebhook(summary);
      })
    );

    clearInterval(newInterval);

    console.log('Blog post successfully pushed to webhook');
  } catch (error) {
    console.error('Error generating news feed:', error);
    if (tryCount <= 2) {
      generateNewsFeed();
      tryCount++;
    }
  }
}

async function summarizeArticlesWithIntervals(articles) {
  const summarizedArticles = [];

  console.time();
  console.log('summarizeArticlesWithIntervals started ===== ');

  try {
    await Promise.all(
      articles.map(async (article) => {
        const summary = await summarizeArticle(article);
        summarizedArticles.push(summary);
      })
    );
  } catch (error) {
    console.error('error occurred at summarizeArticlesWithIntervals : ', error);
  }

  console.log('summarizeArticlesWithIntervals completed ===== ');
  console.timeEnd();

  console.log({ summarizedArticles });

  return summarizedArticles;
}

async function textToSpeech(text) {
  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text
    });
    console.log('mp3', mp3);

    const buffer = Buffer.from(await mp3.arrayBuffer());
    // await fs.promises.writeFile(speechFile, buffer); // since buffer is being used , no need to save to file storage

    console.log({ buffer });

    return buffer;
  } catch (error) {
    console.error('textToSpeech error :', error);
  }
}

async function uploadAudioToWordPress(audioBuffer, filename) {
  try {
    const formData = new FormData();
    // Assuming `audioBuffer` is already a Buffer instance. If not, you might need to convert it similar to the image upload example
    formData.append('file', audioBuffer, filename);

    const uploadUrl = `${process.env.WEB_URL}/wp-json/wp/v2/media`;

    const response = await axios.post(uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(), // This automatically sets the Content-Type to multipart/form-data with the correct boundary
        Authorization: `Basic ${Buffer.from(
          `${process.env.WEB_SITE_USERNAME}:${process.env.WEB_SITE_APPLICATION_KEY}`
        ).toString('base64')}`
      }
    });

    console.log('Audio upload successful. Media ID:', response.data.id);
    return { id: response.data.id, url: response.data.source_url };
  } catch (error) {
    console.error(
      'Error uploading audio to WordPress:',
      error.response?.data || error.message
    );
  }
}

async function test() {
  // const articles = await getNewsArticles();
  // console.log('articles', articles);
  // const summaries = await summarizeArticlesWithIntervals(articles);
  // console.log('summaries', summaries);

  const articles = await getNewsArticles()
  console.log({articles});
}

test();

module.exports = {
  generateNewsFeed,
  getNewsArticles
};
