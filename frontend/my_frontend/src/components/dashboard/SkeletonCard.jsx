function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 bg-gray-200 dark:bg-slate-800 animate-pulse h-36">
      <div className="flex justify-between items-start mb-4">
        <div className="w-9 h-9 rounded-xl bg-gray-300 dark:bg-slate-700" />
        <div className="w-14 h-4 rounded-full bg-gray-300 dark:bg-slate-700" />
      </div>
      <div className="w-24 h-7 rounded-lg bg-gray-300 dark:bg-slate-700 mb-2" />
      <div className="w-20 h-3 rounded bg-gray-300 dark:bg-slate-700 mb-4" />
      <div className="flex gap-3 pt-3 border-t border-gray-300 dark:border-slate-700">
        <div className="w-12 h-3 rounded bg-gray-300 dark:bg-slate-700" />
        <div className="w-12 h-3 rounded bg-gray-300 dark:bg-slate-700" />
      </div>
    </div>
  );
}

export default SkeletonCard;