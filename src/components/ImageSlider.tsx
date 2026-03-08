"use client";

import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface ImageSliderProps {
  filename: string | null;
  type: 'screenshot' | 'sound' | 'musician';
  alt: string;
  className?: string;
  fallbackText?: string;
}

export function ImageSlider({ filename, type, alt, className = '', fallbackText = 'No Image' }: ImageSliderProps) {
  const { findAllVariants } = useSettings();
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function loadVariants() {
      if (!filename) {
        setImages([]);
        return;
      }
      const urls = await findAllVariants(type, filename);
      if (urls.length > 0) {
        setImages(urls);
      } else {
        setImages([]);
      }
      setCurrentIndex(0);
      setHasError(false);
    }
    loadVariants();
  }, [filename, type, findAllVariants]);

  // Support cycling through images
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 3500); // cycle every 3.5s
    return () => clearInterval(timer);
  }, [images.length]);

  if (!filename || images.length === 0 || hasError) {
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
      src={images[currentIndex]}
      alt={`${alt} ${currentIndex + 1}`}
      className={`object-cover ${className} transition-opacity duration-500`}
      onError={() => {
        if (images.length === 1) {
            setHasError(true);
        } else {
            // Remove the broken image and move to next
            setImages(prev => prev.filter((_, i) => i !== currentIndex));
            setCurrentIndex(prev => prev % (images.length - 1 || 1));
        }
      }}
      loading="lazy"
      data-testid="image-element"
    />
  );
}
