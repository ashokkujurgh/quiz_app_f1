export default function Quiz() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quiz</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage quizzes</p>
      </div>

      <div className="rounded-2xl border bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex flex-col items-center justify-center py-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-600/15 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Coming Soon</h2>
        <p className="text-sm text-gray-400 max-w-xs">Quiz management features will be added here.</p>
      </div>
    </div>
  );
}
