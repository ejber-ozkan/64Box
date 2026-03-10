"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useGamepad } from './useGamepad';

export type DetailZone =
  | 'play'
  | 'play-web'
  | 'sid'
  | 'screenshot'
  | 'media-gameplay'
  | 'media-titlescreen'
  | 'media-videosna'
  | 'media-boxfront'
  | 'media-extras';

type Direction = 'up' | 'down' | 'left' | 'right';

export type NavigationConfig = Record<DetailZone, Partial<Record<Direction, DetailZone>>>;

export interface DetailNavigationHook {
  focusedZone: DetailZone;
  setFocusedZone: (zone: DetailZone) => void;
  isFocused: (zone: DetailZone) => boolean;
  focusCls: (zone: DetailZone) => string;
  registerAction: (zone: DetailZone, action: () => void) => void;
  hoverZone: (zone: DetailZone) => void;
  isMouseMode: boolean;
  lastAction: string;
}

interface DetailNavProps {
  onBack: () => void;
  initialZone?: DetailZone;
  config: NavigationConfig;
}

export function useDetailNavigation({ onBack, initialZone = 'play', config }: DetailNavProps): DetailNavigationHook {
  const [focusedZone, setFocusedZoneState] = useState<DetailZone>(initialZone);
  const focusedZoneRef = useRef<DetailZone>(initialZone);
  const actionsRef = useRef<Partial<Record<DetailZone, () => void>>>({});
  
  const [lastAction, setLastAction] = useState<string>('Ready');
  const [isMouseMode, setIsMouseMode] = useState(true);
  const isMouseModeRef = useRef(true);

  const debug = (msg: string) => {
    console.log(`[useDetailNavigation] ${msg}`);
    setLastAction(msg);
  };

  useEffect(() => {
    const onMouseMove = () => {
      if (!isMouseModeRef.current) {
        isMouseModeRef.current = true;
        setIsMouseMode(true);
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  const setControllerMode = useCallback(() => {
    if (isMouseModeRef.current) {
      isMouseModeRef.current = false;
      setIsMouseMode(false);
    }
  }, []);

  const setFocusedZone = useCallback((zone: DetailZone) => {
    focusedZoneRef.current = zone;
    setFocusedZoneState(zone);
  }, []);

  const moveZone = useCallback((dir: Direction) => {
    setControllerMode();
    const cur = focusedZoneRef.current;
    const next = config[cur]?.[dir];
    if (next) {
      debug(`Moved ${dir} to ${next}`);
      setFocusedZone(next);
    } else {
      debug(`No exit ${dir} from ${cur}`);
    }
  }, [setFocusedZone, setControllerMode, config]);

  const activateFocused = useCallback(() => {
    setControllerMode();
    const zone = focusedZoneRef.current;
    const action = actionsRef.current[zone];
    if (action) {
      debug(`Activating ${zone}`);
      action();
    } else {
      debug(`No action for ${zone}`);
    }
  }, [setControllerMode]);

  const registerAction = useCallback((zone: DetailZone, action: () => void) => {
    actionsRef.current[zone] = action;
  }, []);

  const hoverZone = useCallback((zone: DetailZone) => {
    if (isMouseModeRef.current) setFocusedZone(zone);
  }, [setFocusedZone]);

  // Combined Controller Handler
  useGamepad({
    onButtonDown: (btn) => {
      setControllerMode();
      if (btn === 'LEFT')  moveZone('left');
      if (btn === 'RIGHT') moveZone('right');
      if (btn === 'UP')    moveZone('up');
      if (btn === 'DOWN')  moveZone('down');
      if (btn === 'A')     activateFocused();
      if (btn === 'B')     { debug('Back Button'); onBack(); }
    }
  });

  // Keyboard fallbacks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'ArrowLeft')  { e.preventDefault(); moveZone('left'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveZone('right'); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); moveZone('up'); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); moveZone('down'); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateFocused(); }
      if (e.key === 'Escape' || e.key === 'Backspace') { debug('Escape/Back'); onBack(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveZone, activateFocused, onBack]);

  const isFocused = useCallback((zone: DetailZone) => focusedZone === zone, [focusedZone]);

  const focusCls = useCallback((zone: DetailZone): string =>
    focusedZone === zone
      ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-900 z-50 relative brightness-125 shadow-[0_0_25px_rgba(250,204,21,0.9)] scale-105'
      : ''
  , [focusedZone]);

  return { focusedZone, setFocusedZone, isFocused, focusCls, registerAction, hoverZone, isMouseMode, lastAction };
}
