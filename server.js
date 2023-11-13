const dotenv = require('dotenv');
const OpenAI = require('openai');
const axios = require('axios');
const FormData = require('form-data');

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const chatGptModel = 'text-davinci-003';

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
    name: 'ChatGPT',
    id: 52
  },
  {
    name: 'Bard.google.com',
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
  }
];

async function getNewsArticles() {
  try {
    let categories = [
      'Web3',
      'Blockchain',
      'Metaverse',
      'Spatial Compute',
      'Advanced Intelligence',
      'ChatGPT',
      'Bard.google.com',
      'Mixed Reality',
      'Augmented Reality',
      'Extended Reality'
    ];

    const articles = await Promise.all(
      categories.map(async (category) => {
        const url = `https://newsapi.org/v2/everything?q=${category}&apiKey=${
          process.env.NEWS_API_KEY
        }&pageSize=${process.env.NEWS_SIZE}&from=${getNowDate()}&language=en`;
        const response = await axios.get(url);

        return response.data.articles.map((article) => {
          article.categories = [
            categoriesWithId.find((c) => c.name === category).id
          ];
          return article;
        });
      })
    );

    // Process the retrieved articles
    return articles.flat();
  } catch (error) {
    console.error('Error retrieving news articles:', error);
    throw error;
  }
}

async function summarizeNewsArticles(articles) {
  try {
    return await Promise.all(
      articles.map(async (article) => {
        const prompt = `${article.title}. ${article.description}. ${article.content}. What kind of jobs will this create? The content size is at least 700 words.`;

        const completion = await openai.completions.create({
          model: chatGptModel,
          prompt: prompt,
          max_tokens: 3000,
          temperature: 0
        });

        const summary = completion.choices[0].text.trim();
        return {
          title: article.title,
          content: summary,
          status: 'publish', // Set the status to 'publish' to publish the post immediately
          imageUrl: article.urlToImage,
          categories: article.categories
        };
      })
    );
  } catch (error) {
    console.error('Error summarizing news articles:', error);
    throw error;
  }
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
  try {
    const newsArticles = await getNewsArticles();
    const summaries = await summarizeNewsArticles(newsArticles);

    await Promise.all(
      summaries.map(async (summary) => {
        await pushToWebhook(summary);
      })
    );

    console.log('Blog post successfully pushed to webhook');
  } catch (error) {
    console.error('Error generating news feed:', error);
  }
}

module.exports = {
  generateNewsFeed
};
