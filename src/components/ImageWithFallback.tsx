"use client";

import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  fit?: 'cover' | 'contain';
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackText = 'No Image',
  fit = 'cover',
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';

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
      className={`${fitClass} ${className}`}
      onError={() => setHasError(true)}
      loading="lazy"
      data-testid="image-element"
    />
  );
}
