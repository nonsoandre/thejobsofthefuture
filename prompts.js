const { samplePost1 } = require('./sampleContent');

const PROMPTS = {
  type_one: (article) => {
    const samplePostExcerpt = `${samplePost1}`; // note: the sample post here is a sample of article style
    const instructions = `Using the style and structure of the above sample posts, create a blog article that first summarizes the content of the following article and then discusses how its themes relate to the jobs of the future. The blog post should be engaging and thought-provoking, aiming to retain the reader's interest throughout. It should provide not only a summary but also insightful elaboration on key points. Include relevant analogies, examples, and personal insights to make the content more relatable and share-worthy. The blog should encourage the reader to think deeply about the subject and feel compelled to share it for its value. The article should be less than 1500 words with minimal sub-headings. note: don't include Blog Title, Summary or Blog Content at start of summary or body of summary, i only need the content.`;

    const articleInfo = `${article.title}. ${article.description}. ${article.content}`;

    return `${samplePostExcerpt}\n\n${instructions}\n\nArticle Information:\n${articleInfo}`;
  },
  type_two: (article) => {
    // added 24-01-2024
    const instruction = `Please rewrite the following article based on the enhanced instructions provided:

The article's topic is "${article.title}". The target audience includes business executives, techpreneurs, AI strategists, emerging technology experts, founders, and thought leaders.

Provide a brief outline of the central theme and main ideas, ensuring alignment with the interests of the target audience.

 Develop an engaging opening paragraph that sets the tone and introduces the subject matter in a compelling way.

Structure the article into at least four coherent paragraphs, incorporating real-life examples, case studies, and research findings. Ensure a seamless flow of ideas.

Infuse the article with insights and personal anecdotes, reflecting extensive experience in the field.

 Conclude the article with a powerful and memorable ending, avoiding cliché phrases like 'in conclusion.' Opt for a creative transition into the final thoughts, which could be a call to action, a provocative question, or a compelling statement.

 Maintain a sophisticated yet accessible tone, suitable for an informed but diverse audience.

Note: the final content should not be structured like , Topic and Audience Understanding:, Logical Body Development: etc. just return the content (it'll be used as the article body) , also don't include a title, only the content is needed `;

    return `Article description: ${article.description}, Article content: ${article.content}. ${instruction}`;
  },
  type_three: (article) => {
    return `The article's topic is "${article.title}". The target audience includes business executives, techpreneurs, AI strategists, emerging technology experts, founders, and thought leaders who are interested in how new technologies are transforming the job market and creating new career opportunities.

The central theme of this article should explore how the featured technology or trend is shaping the future of work. Focus on providing a forward-looking, optimistic perspective on the new and exciting job roles and skills that are emerging as a result of this technology.

Begin with an engaging opening paragraph that highlights the rapid pace of technological change and the significant impact it is having on the job market. Use this as a hook to draw the reader in and set the stage for the article's key insights.

In the body of the article, delve into real-world examples and case studies that illustrate how this technology is already being applied in the workplace. Discuss the new types of jobs and roles that are being created, as well as existing roles that are being transformed or augmented by this technology. Be sure to highlight the unique skills and qualifications that will be in high demand.

Incorporate research findings, expert opinions, and personal anecdotes to add depth and credibility to your analysis. Weave a cohesive narrative that explores both the near-term and long-term implications of this technology for the future workforce.

Conclude the article with a powerful statement that leaves the reader feeling inspired and optimistic about the career possibilities enabled by this emerging technology. Consider ending with a call to action that encourages the audience to start preparing for these new job opportunities.

Maintain a sophisticated yet accessible tone throughout, providing insightful commentary that informs and engages your target audience of business leaders and technology experts.
Do not use words like "In conclusion" or "In summary" in article
`;
  }
};

module.exports = {
  PROMPTS
};
