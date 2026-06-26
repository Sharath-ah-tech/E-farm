import { useEffect, useState } from "react";

function AnimatedCounter({ target }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof target !== "number") return;
    let frame = 0;
    const totalFrames = 45;
    const timer = setInterval(() => {
      frame++;
      // Ease-out cubic
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
      setValue(Math.floor(progress * target));
      if (frame >= totalFrames) {
        setValue(target);
        clearInterval(timer);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [target]);

  return <>{value.toLocaleString("en-IN")}</>;
}

function StatCard({ title, value, icon, gradient, subStats = [] }) {
  const isNumeric = typeof value === "number";

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-4 text-white cursor-default
        bg-gradient-to-br ${gradient}
        hover:scale-[1.03] hover:shadow-2xl
        transition-all duration-300 shadow-lg
      `}
    >
      {/* decorative circles */}
      <div className="absolute -right-5 -top-5 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative z-10">
        {/* icon */}
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-xl text-white">
            {icon}
          </span>
        </div>

        {/* value */}
        <div className="text-2xl font-bold leading-none mb-1">
          {isNumeric ? <AnimatedCounter target={value} /> : value}
        </div>

        {/* title */}
        <div className="text-xs text-white/75 font-medium uppercase tracking-wide">
          {title}
        </div>

        {/* sub-stats */}
        {subStats.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20 flex gap-4">
            {subStats.map((s, i) => (
              <div key={i} className="flex-1 min-w-0">
                <div className="text-[10px] text-white/55 truncate">{s.label}</div>
                <div className="text-xs font-semibold text-white truncate">{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatCard;