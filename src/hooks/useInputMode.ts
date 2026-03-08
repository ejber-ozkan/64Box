"use client";

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Tracks whether the user is currently using mouse or controller/keyboard.
 * Mouse hover events are suppressed while in controller/keyboard mode.
 */
export function useInputMode() {
  const [isMouseMode, setIsMouseMode] = useState(true);
  const isMouseModeRef = useRef(true);

  const setMode = useCallback((mode: boolean) => {
    isMouseModeRef.current = mode;
    setIsMouseMode(mode);
  }, []);

  useEffect(() => {
    const onMouseMove = () => {
      if (!isMouseModeRef.current) setMode(true);
    };
    const onKeyDown = () => {
      if (isMouseModeRef.current) setMode(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [setMode]);

  // Also flip mode when gamepad button fires (gamepads don't trigger keydown)
  const onGamepadInput = useCallback(() => {
    if (isMouseModeRef.current) setMode(false);
  }, [setMode]);

  return { isMouseMode, isMouseModeRef, onGamepadInput };
}
