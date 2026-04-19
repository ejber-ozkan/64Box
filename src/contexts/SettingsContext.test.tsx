import { expect, test, describe, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';
import React from 'react';

// Wrapper component to consume and test the Context hooks natively
function SettingsTestComponent() {
  const { settings, updateSettings, resolveMediaPath, markAsPlayed } = useSettings();
  
  return (
    <div>
      <div data-testid="screenshot-path">{resolveMediaPath('screenshot', 'commando_1.png')}</div>
      <div data-testid="sound-path">{resolveMediaPath('sound', 'commando.sid')}</div>
      <div data-testid="recently-played">{settings.recentlyPlayedIds.join(',')}</div>
      
      <button 
        data-testid="update-btn" 
        onClick={() => updateSettings({ screenshotsPath: 'D:/C64/Screens' })}
      >
        Change Screenshots
      </button>
      <button
        data-testid="mark-eleven-btn"
        onClick={() => {
          for (let index = 1; index <= 11; index += 1) {
            markAsPlayed(index.toString());
          }
        }}
      >
        Mark Eleven
      </button>
    </div>
  );
}

describe('SettingsContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('provides default settings correctly upon init', () => {
    render(
      <SettingsProvider>
        <SettingsTestComponent />
      </SettingsProvider>
    );
    
    expect(screen.getByTestId('screenshot-path').textContent).toBe('/media/screenshots/commando_1.png');
    expect(screen.getByTestId('sound-path').textContent).toBe('/media/sounds/commando.sid');
  });

  test('successfully merges settings upon calling updateSettings update', () => {
    render(
      <SettingsProvider>
        <SettingsTestComponent />
      </SettingsProvider>
    );

    // Initial Path
    expect(screen.getByTestId('screenshot-path').textContent).toBe('/media/screenshots/commando_1.png');

    // Perform Update
    fireEvent.click(screen.getByTestId('update-btn'));

    // Re-verify merged path hook reaction
    expect(screen.getByTestId('screenshot-path').textContent).toBe('D:/C64/Screens/commando_1.png');
    
    // Ensure others were preserved (not overwritten by the partial update)
    expect(screen.getByTestId('sound-path').textContent).toBe('/media/sounds/commando.sid');
  });

  test('keeps only the 10 most recently played games', () => {
    render(
      <SettingsProvider>
        <SettingsTestComponent />
      </SettingsProvider>
    );

    fireEvent.click(screen.getByTestId('mark-eleven-btn'));

    expect(screen.getByTestId('recently-played').textContent).toBe('11,10,9,8,7,6,5,4,3,2');
  });
});
