const dotenv = require('dotenv');
const OpenAI = require('openai');
const axios = require('axios');
const FormData = require('form-data');
const { samplePost1 } = require('./sampleContent');

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
      'Web3',
      'Blockchain',
      'Metaverse',
      'Spatial Compute',
      'Advanced Intelligence',
      'Mixed Reality',
      'Augmented Reality',
      'Extended Reality',
      'Quantum Computing',
      'Virtual Reality',
      'Augmented Reality',
      'Internet of Things'
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

async function changeArticleTitle(originalTitle) {
  try {
    const response = await openai.chat.completions.create({
      model: chatGptModel,
      messages: [
        {
          role: 'user',
          content: `Rewrite the following article title to be similar but not the same:\n${originalTitle}\nNew Title:`
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
  const samplePostExcerpt = `${samplePost1}`; // note: the sample post here is a sample of article style
  const instructions = `Using the style and structure of the above sample posts, create a blog article that first summarizes the content of the following article and then discusses how its themes relate to the jobs of the future. The blog post should be engaging and thought-provoking, aiming to retain the reader's interest throughout. It should provide not only a summary but also insightful elaboration on key points. Include relevant analogies, examples, and personal insights to make the content more relatable and share-worthy. The blog should encourage the reader to think deeply about the subject and feel compelled to share it for its value. The article should be less than 1500 words with minimal sub-headings. note: don't include Blog Title, Summary or Blog Content at start of summary or body of summary, i only need the content.`;

  const articleInfo = `${article.title}. ${article.description}. ${article.content}`;

  const prompt = `${samplePostExcerpt}\n\n${instructions}\n\nArticle Information:\n${articleInfo}`;

  const completion = await openai.chat.completions.create({
    model: chatGptModel,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 1,
    max_tokens: 6000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  const summary = completion.choices[0].message.content;

  const newTitle = await changeArticleTitle(article.title);

  return {
    title: newTitle,
    content: summary,
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

  return summarizedArticles;
}

async function test() {
  const articles = await getNewsArticles();
  console.log('articles', articles);
  const summaries = await summarizeArticlesWithIntervals(articles);
  console.log('summaries', summaries);
}

// test();

module.exports = {
  generateNewsFeed,
  getNewsArticles
};
