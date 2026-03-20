"use client";

interface DetailGameTitleProps {
  className?: string;
  isClassic?: boolean;
  title: string;
}

export function DetailGameTitle({ className = '', isClassic = false, title }: DetailGameTitleProps) {
  return (
    <h1 className={className}>
      {isClassic ? (
        <span aria-hidden="true" className="shrink-0">
          🏆
        </span>
      ) : null}
      <span>{title}</span>
      {isClassic ? (
        <span aria-hidden="true" className="shrink-0">
          🏆
        </span>
      ) : null}
    </h1>
  );
}
