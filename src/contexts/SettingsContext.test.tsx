import { expect, test, describe } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';
import React from 'react';

// Wrapper component to consume and test the Context hooks natively
function SettingsTestComponent() {
  const { settings, updateSettings, resolveMediaPath } = useSettings();
  
  return (
    <div>
      <div data-testid="screenshot-path">{resolveMediaPath('screenshot', 'commando_1.png')}</div>
      <div data-testid="sound-path">{resolveMediaPath('sound', 'commando.sid')}</div>
      
      <button 
        data-testid="update-btn" 
        onClick={() => updateSettings({ screenshotsPath: 'D:/C64/Screens' })}
      >
        Change Screenshots
      </button>
    </div>
  );
}

describe('SettingsContext', () => {
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
});
