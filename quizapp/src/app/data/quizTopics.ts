// Public quiz-topic landing pages (/quizzes/:slug). Each one maps to a subtopic in the
// topic-service by name. Keep slugs, titles and descriptions in sync with QUIZ_TOPIC_PAGES
// in backend/post-service/src/controllers/seoController.ts, which serves the same tags to crawlers.

export interface QuizTopic {
  slug:         string;
  name:         string;   // short label for chips and links
  heading:      string;   // page <h1>
  title:        string;   // <title>, without the " — Meenzo" suffix
  description:  string;   // meta description
  topicName:    string;   // topic-service topic
  subTopicName: string;   // topic-service subtopic
  intro:        string[];
  covers:       string[];
}

export const QUIZ_TOPICS: QuizTopic[] = [
  {
    slug: 'rajasthan-gk',
    name: 'Rajasthan GK',
    heading: 'Rajasthan GK Quiz',
    title: 'Rajasthan GK Quiz — Free Practice Questions with Answers',
    description: 'Free Rajasthan GK quiz with answers and explanations: history, forts, geography, rivers, districts, art and culture of Rajasthan for RPSC, RSMSSB, Patwari and Rajasthan Police exams.',
    topicName: 'General Studies',
    subTopicName: 'Rajasthan GK',
    intro: [
      'Rajasthan GK is a scoring section in RPSC, RSMSSB, Rajasthan Patwari, Gram Sevak and Rajasthan Police exams, and the questions come back year after year in new forms.',
      'Practise multiple-choice questions on Rajasthan’s rulers, forts, rivers, districts, festivals and folk culture. Every question comes with the correct answer and a short explanation.',
    ],
    covers: ['History and rulers of Rajasthan', 'Forts, palaces and monuments', 'Geography, rivers and lakes', 'Districts and divisions', 'Art, culture, fairs and festivals', 'Folk music and dance'],
  },
  {
    slug: 'gk-in-hindi',
    name: 'GK in Hindi',
    heading: 'GK Quiz in Hindi — सामान्य ज्ञान प्रश्नोत्तरी',
    title: 'GK Quiz in Hindi — सामान्य ज्ञान प्रश्न और उत्तर',
    description: 'हिंदी में सामान्य ज्ञान क्विज़: इतिहास, भूगोल, राजव्यवस्था और विज्ञान के प्रश्न, सही उत्तर और व्याख्या के साथ। SSC, Railway, Police और राज्य परीक्षाओं की तैयारी के लिए मुफ़्त।',
    topicName: 'General Studies',
    subTopicName: 'GK in Hindi',
    intro: [
      'हिंदी माध्यम के विद्यार्थियों के लिए सामान्य ज्ञान के बहुविकल्पीय प्रश्न — SSC, Railway, Police और राज्य स्तरीय परीक्षाओं के पैटर्न पर।',
      'हर प्रश्न के साथ सही उत्तर और छोटी व्याख्या दी गई है, ताकि आप अभ्यास के साथ-साथ विषय को समझ भी सकें।',
    ],
    covers: ['भारतीय इतिहास', 'भारत का भूगोल', 'भारतीय राजव्यवस्था', 'सामान्य विज्ञान', 'महत्वपूर्ण तथ्य'],
  },
  {
    slug: 'science',
    name: 'Science',
    heading: 'General Science Quiz',
    title: 'General Science Quiz — Physics, Chemistry and Biology Questions',
    description: 'Free general science quiz with answers: physics, chemistry and biology questions with explanations, at the level asked in SSC, Railway, Banking, Police and State exams.',
    topicName: 'General Studies',
    subTopicName: 'General Science',
    intro: [
      'General science questions test the basics of physics, chemistry and biology — the kind of school-level facts that are easy to forget and easy to score once revised.',
      'Practise multiple-choice science questions with the correct answer and a short explanation for each, so you learn the concept and not just the option.',
    ],
    covers: ['Physics: motion, light, sound, electricity', 'Chemistry: elements, acids and bases, everyday chemistry', 'Biology: human body, diseases, plants and animals', 'Science in daily life'],
  },
  {
    slug: 'maths',
    name: 'Maths',
    heading: 'Maths Quiz — Quantitative Aptitude',
    title: 'Maths Quiz — Quantitative Aptitude Questions with Solutions',
    description: 'Free maths quiz with step-by-step solutions: percentages, profit and loss, ratio, time and work, speed and distance and more, as asked in SSC, Banking and Police exams.',
    topicName: 'Aptitude & Reasoning',
    subTopicName: 'Quantitative Aptitude',
    intro: [
      'Quantitative aptitude rewards speed and accuracy. These maths questions use clean numbers so you can solve them in under a minute without a calculator.',
      'Every answer comes with the short working, and each one is checked by solving it independently before it is published.',
    ],
    covers: ['Percentages', 'Profit, loss and discount', 'Ratio and proportion', 'Time and work', 'Speed, time and distance', 'Simple and compound interest', 'Averages and number system'],
  },
  {
    slug: 'english',
    name: 'English',
    heading: 'English Quiz',
    title: 'English Quiz — Grammar and Vocabulary Questions with Answers',
    description: 'Free English quiz with answers: synonyms, antonyms, idioms, one-word substitution, error spotting and sentence improvement for SSC and Banking exams.',
    topicName: 'Aptitude & Reasoning',
    subTopicName: 'English Language',
    intro: [
      'The English section checks vocabulary and grammar more than anything else. Short, regular practice is the fastest way to improve it.',
      'Practise multiple-choice questions on synonyms, antonyms, idioms, one-word substitution and error spotting, each with the correct answer and a short explanation.',
    ],
    covers: ['Synonyms and antonyms', 'Idioms and phrases', 'One-word substitution', 'Spotting the error', 'Fill in the blanks', 'Sentence improvement'],
  },
];

export function findQuizTopic(slug: string | undefined): QuizTopic | undefined {
  return QUIZ_TOPICS.find((t) => t.slug === slug);
}
