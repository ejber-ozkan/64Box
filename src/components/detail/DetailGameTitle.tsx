"use client";

interface DetailGameTitleProps {
  className?: string;
  title: string;
}

export function DetailGameTitle({ className = '', title }: DetailGameTitleProps) {
  return (
    <h1 className={className}>
      <span aria-hidden="true" className="shrink-0">
        🏆
      </span>
      <span>{title}</span>
      <span aria-hidden="true" className="shrink-0">
        🏆
      </span>
    </h1>
  );
}
