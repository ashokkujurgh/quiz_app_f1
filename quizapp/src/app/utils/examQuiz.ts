// Govt-exam practice quizzes are made by the jobs agent (agentic/post-creator/jobs_agent.py) and
// always carry this fixed title suffix, e.g. "BPSC TRE 4.0 Daily Practice Quiz".
export const EXAM_QUIZ_SUFFIX = 'Daily Practice Quiz';

export const isExamQuiz = (q: { title?: string | null }): boolean =>
  (q.title ?? '').trim().endsWith(EXAM_QUIZ_SUFFIX);

// Where the "Exam Practice" buttons lead: the Quizzes page, Exam Practice tab
export const EXAM_QUIZZES_PATH = '/quizzes?tab=exam';
