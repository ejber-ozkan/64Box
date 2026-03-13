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
  const { settings, findAllVariants } = useSettings();
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
    if (!settings.imageCycling || images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 3500); // cycle every 3.5s
    return () => clearInterval(timer);
  }, [images.length, settings.imageCycling]);

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

  const isSlide = settings.imageAnimation === 'slide';

  return (
    <div className={`relative overflow-hidden ${className}`}>
        <div 
            className={`flex w-full h-full transition-all duration-700 ease-in-out ${settings.bigBoxAnimateVertical ? 'flex-col' : ''} ${!isSlide ? 'transition-none' : ''}`}
            style={{ 
                transform: isSlide 
                  ? (settings.bigBoxAnimateVertical ? `translateY(-${currentIndex * 100}%)` : `translateX(-${currentIndex * 100}%)`)
                  : 'none' 
            }}
        >
            {images.map((src, idx) => (
                <div key={`${src}-${idx}`} className="w-full h-full shrink-0">
                    <img
                        src={src}
                        alt={`${alt} ${idx + 1}`}
                        className={`w-full h-full ${className} ${!isSlide && currentIndex !== idx ? 'hidden' : ''} ${!isSlide ? 'animate-in fade-in duration-500' : ''}`}
                        onError={() => {
                            if (images.length === 1) {
                                setHasError(true);
                            } else {
                                setImages(prev => prev.filter((_, i) => i !== idx));
                                setCurrentIndex(prev => prev % (images.length - 1 || 1));
                            }
                        }}
                        loading="lazy"
                    />
                </div>
            ))}
        </div>
    </div>
  );
}
