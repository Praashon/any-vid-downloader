"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  variant?: "dots" | "ring" | "bar";
  label?: string;
}

export default function LoadingSpinner({
  size = "md",
  variant = "ring",
  label,
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: { ring: "h-5 w-5", dot: "h-1.5 w-1.5", gap: "gap-1", text: "text-xs" },
    md: { ring: "h-8 w-8", dot: "h-2 w-2", gap: "gap-1.5", text: "text-sm" },
    lg: { ring: "h-12 w-12", dot: "h-2.5 w-2.5", gap: "gap-2", text: "text-base" },
  };

  const s = sizeMap[size];

  if (variant === "dots") {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className={`flex items-center ${s.gap}`}>
          <span
            className={`${s.dot} rounded-full bg-accent loading-dot`}
          />
          <span
            className={`${s.dot} rounded-full bg-accent loading-dot`}
          />
          <span
            className={`${s.dot} rounded-full bg-accent loading-dot`}
          />
        </div>
        {label && (
          <p className={`${s.text} text-text-tertiary animate-pulse-soft`}>
            {label}
          </p>
        )}
      </div>
    );
  }

  if (variant === "bar") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 w-full">
        <div className="relative h-1 w-full max-w-xs overflow-hidden rounded-full bg-bg-tertiary">
          <div className="progress-bar-indeterminate absolute inset-0" />
        </div>
        {label && (
          <p className={`${s.text} text-text-tertiary animate-pulse-soft`}>
            {label}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${s.ring} spinner-ring`} />
      {label && (
        <p className={`${s.text} text-text-tertiary animate-pulse-soft`}>
          {label}
        </p>
      )}
    </div>
  );
}
