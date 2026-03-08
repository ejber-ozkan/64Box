"use client";

import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
}

export function ImageWithFallback({ src, alt, className = '', fallbackText = 'No Image' }: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-800 text-gray-500 rounded border border-gray-700 ${className}`}
        data-testid="image-fallback"
      >
        <span className="text-xs">{fallbackText}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setHasError(true)}
      loading="lazy"
      data-testid="image-element"
    />
  );
}
