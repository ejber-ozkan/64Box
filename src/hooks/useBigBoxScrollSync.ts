"use client";

import { useCallback, useEffect, useRef } from 'react';
import { exitApp } from '../lib/tauri-bridge';

interface UseBigBoxScrollSyncProps {
  activeRailIndex: number;
  currentFocusedIndex: number;
  currentRailId: string | null;
  currentRailType: string | null;
  onSectionJumpHandled: () => void;
  sectionJumpDirection: 'up' | 'down' | null;
}

const HEADER_HEIGHT_FALLBACK = 320;

export function useBigBoxScrollSync({
  activeRailIndex,
  currentFocusedIndex,
  currentRailId,
  currentRailType,
  onSectionJumpHandled,
  sectionJumpDirection,
}: UseBigBoxScrollSyncProps) {
  const scrollContainerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const lastEscTime = useRef<number>(0);
  const lastRail = useRef(activeRailIndex);

  const getHeaderHeight = useCallback(() => {
    return headerRef.current?.offsetHeight ?? HEADER_HEIGHT_FALLBACK;
  }, []);

  const scrollElementBelowHeader = useCallback((element: HTMLElement, extraOffset = 0) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const headerHeight = getHeaderHeight();
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const targetTop =
      container.scrollTop + elementRect.top - containerRect.top - headerHeight - extraOffset;

    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth',
    });
  }, [getHeaderHeight]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscTime.current < 1000) {
          exitApp();
        }
        lastEscTime.current = now;
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    if (!scrollContainerRef.current) {
      return;
    }

    if (activeRailIndex === -1) {
      onSectionJumpHandled();
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const railElement = scrollContainerRef.current.children[activeRailIndex] as HTMLElement | undefined;
    if (!railElement) {
      return;
    }

    const anchorElement = railElement.querySelector('[data-rail-anchor]') as HTMLElement | null;
    const gridElement = railElement.querySelector('.grid');
    const tile = gridElement?.children[currentFocusedIndex] as HTMLElement | undefined;

    if (sectionJumpDirection === 'up' && tile && currentRailType === 'alphabet') {
      tile.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      scrollElementBelowHeader(anchorElement ?? railElement);
    }

    onSectionJumpHandled();
  }, [
    activeRailIndex,
    currentFocusedIndex,
    currentRailType,
    onSectionJumpHandled,
    scrollElementBelowHeader,
    sectionJumpDirection,
  ]);

  useEffect(() => {
    const isJump = lastRail.current !== activeRailIndex;
    lastRail.current = activeRailIndex;

    if (isJump || activeRailIndex === -1) return;
    if (currentRailType !== 'alphabet' || !scrollContainerRef.current || !currentRailId) return;

    const headerHeight = getHeaderHeight();
    const containerRect = scrollContainerRef.current.getBoundingClientRect();
    const railElement = scrollContainerRef.current.children[activeRailIndex] as HTMLElement | undefined;
    const gridElement = railElement?.querySelector('.grid');
    const tile = gridElement?.children[currentFocusedIndex] as HTMLElement | undefined;

    if (!tile) return;

    const rect = tile.getBoundingClientRect();
    const visibleTop = containerRect.top + headerHeight;
    const footerBuffer = 80;

    if (rect.top < visibleTop) {
      scrollElementBelowHeader(tile, 12);
    } else if (rect.bottom > containerRect.bottom - footerBuffer) {
      tile.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [
    activeRailIndex,
    currentFocusedIndex,
    currentRailId,
    currentRailType,
    getHeaderHeight,
    scrollElementBelowHeader,
  ]);

  return {
    scrollContainerRef,
    headerRef,
  };
}
