"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Tracks whether the user is currently using mouse or controller/keyboard.
 * Mouse hover events are suppressed while in controller/keyboard mode.
 */
export function useInputMode() {
  const [isMouseMode, setIsMouseMode] = useState(false);
  const isMouseModeRef = useRef(false);
  const [showMouse, setShowMouse] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const resetIdleTimer = useCallback(() => {
    setShowMouse(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setShowMouse(false);
    }, 3000);
  }, []);

  const setMode = useCallback((mode: boolean) => {
    isMouseModeRef.current = mode;
    setIsMouseMode(mode);
    if (mode) resetIdleTimer();
    else {
      setShowMouse(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
  }, [resetIdleTimer]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // Ignore first movement if it's identical to last pos (browser jitter or init)
      if (!hasMovedRef.current) {
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
        hasMovedRef.current = true;
        return;
      }

      // Check for real movement (more than 2px) to avoid micro-jitters triggering scroll
      const dist = Math.abs(e.clientX - lastMousePosRef.current.x) + Math.abs(e.clientY - lastMousePosRef.current.y);
      if (dist < 2) return;

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      if (!isMouseModeRef.current) setMode(true);
      else resetIdleTimer();
    };
    const onKeyDown = () => {
      if (isMouseModeRef.current) setMode(false);
    };
    const onMouseDown = () => {
      if (!isMouseModeRef.current) setMode(true);
      resetIdleTimer();
    };
    const onWheel = () => {
      if (!isMouseModeRef.current) setMode(true);
      resetIdleTimer();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('wheel', onWheel, { passive: true });

    // Initial timer
    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('wheel', onWheel);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [setMode, resetIdleTimer]);

  // Also flip mode when gamepad button fires (gamepads don't trigger keydown)
  const onGamepadInput = useCallback(() => {
    if (isMouseModeRef.current) setMode(false);
  }, [setMode]);

  return { isMouseMode, isMouseModeRef, onGamepadInput, showMouse };
}
