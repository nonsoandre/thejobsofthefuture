const dotenv = require('dotenv');
const OpenAI = require('openai');
const axios = require('axios');
const FormData = require('form-data');
const { samplePost1 } = require('./sampleContent');

dotenv.config();

const coolDownDelay = 2000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// const chatGptModel = 'text-davinci-003';
const chatGptModel = 'gpt-3.5-turbo-16k';

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

    // Process the retrieved articles
    return articles.flat();
  } catch (error) {
    console.error('Error retrieving news articles:', error);
  }
}

async function changeArticleTitle(originalTitle) {
  try {
    const response = await openai.completions.create({
      model: 'text-davinci-003',
      prompt: `Rewrite the following article title to be similar but not the same:\n${originalTitle}\nNew Title:`,
      max_tokens: 1000,
      temperature: 0
    });

    const newTitle = response.choices[0].text.trim();
    return newTitle;
  } catch (error) {
    console.error('Error in changing article title:', error);
    return originalTitle;
  }
}

async function summarizeNewsArticles(articles) {
  try {
    return await Promise.all(
      articles.map(async (article) => {
        const samplePostExcerpt = `${samplePost1}`; // note: the sample post here is a sample of article style
        const instructions = `Using the style and structure of the above sample posts, create a blog article that first summarizes the content of the following article and then discusses how its themes relate to the jobs of the future. The blog post should be engaging and thought-provoking, aiming to retain the reader's interest throughout. It should provide not only a summary but also insightful elaboration on key points. Include relevant analogies, examples, and personal insights to make the content more relatable and share-worthy. The blog should encourage the reader to think deeply about the subject and feel compelled to share it for its value. The article should be less than 1500 words with minimal sub-headings. note: don't include Blog Title : or Blog Content, i only need the content.`;

        const articleInfo = `${article.title}. ${article.description}. ${article.content}`;

        const prompt = `${samplePostExcerpt}\n\n${instructions}\n\nArticle Information:\n${articleInfo}`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
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

        const summary = completion.choices[0].message;

        const newTitle = await changeArticleTitle(article.title);

        return {
          title: newTitle,
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

async function summarizeArticle(article) {
  const samplePostExcerpt = `${samplePost1}`; // note: the sample post here is a sample of article style
  const instructions = `Using the style and structure of the above sample posts, create a blog article that first summarizes the content of the following article and then discusses how its themes relate to the jobs of the future. The blog post should be engaging and thought-provoking, aiming to retain the reader's interest throughout. It should provide not only a summary but also insightful elaboration on key points. Include relevant analogies, examples, and personal insights to make the content more relatable and share-worthy. The blog should encourage the reader to think deeply about the subject and feel compelled to share it for its value. The article should be less than 1500 words with minimal sub-headings. note: don't include Blog Title : or Blog Content, i only need the content.`;

  const articleInfo = `${article.title}. ${article.description}. ${article.content}`;

  const prompt = `${samplePostExcerpt}\n\n${instructions}\n\nArticle Information:\n${articleInfo}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
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
  try {
    const newsArticles = await getNewsArticles();

    // const summaries = await summarizeNewsArticles(newsArticles);
    const summaries = await summarizeArticlesWithIntervals(newsArticles);

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function summarizeArticlesWithIntervals(articles) {
  const summarizedArticles = [];

  console.log('summarizeArticlesWithIntervals started ===== ');

  for (const article of articles) {
    try {
      const summary = await summarizeArticle(article);

      summarizedArticles.push(summary);

      // delay next summary
      await sleep(coolDownDelay);
    } catch (error) {
      console.error('Error summarizing article : ', error);
    }
  }

  console.log('summarizeArticlesWithIntervals completed ===== ');

  return summarizedArticles;
}

// async function test() {
//   const articles = await getNewsArticles();
//   console.log('articles', articles);

//   const summaries = await summarizeArticlesWithIntervals(articles);
//   console.log('summaries', summaries);
// }

// test();

module.exports = {
  generateNewsFeed
};
