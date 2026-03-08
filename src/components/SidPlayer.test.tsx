import { expect, test, describe, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SidPlayer } from './SidPlayer';

describe('SidPlayer Component', () => {

  const originalPlay = window.HTMLMediaElement.prototype.play;
  const originalPause = window.HTMLMediaElement.prototype.pause;

  beforeAll(() => {
    // Mock HTMLMediaElement methods for JSDOM/Node environments
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  afterAll(() => {
    window.HTMLMediaElement.prototype.play = originalPlay;
    window.HTMLMediaElement.prototype.pause = originalPause;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders "No SID track available" when filename is null', () => {
    render(<SidPlayer filename={null} />);
    expect(screen.getByText('No SID track available')).not.toBeNull();
  });

  test('renders player UI correctly when filename exists', () => {
    render(<SidPlayer filename="test.sid" />);
    expect(screen.getByText(/test\.sid/i)).not.toBeNull();
    expect(screen.getByText('STOPPED')).not.toBeNull();
  });

  test('toggles play state properly upon clicking play button', async () => {
    render(<SidPlayer filename="test.sid" audioUrl="/audio/test.mp3" />);
    const playBtn = screen.getByTestId('play-button');

    // Default state
    expect(screen.getByText('STOPPED')).not.toBeNull();

    // Interact
    await act(async () => {
      fireEvent.click(playBtn);
    });
    
    // Validate toggled
    expect(screen.queryByText('STOPPED')).toBeNull();
    expect(screen.getByText('PLAYING')).not.toBeNull();
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);

    // Turn off
    await act(async () => {
      fireEvent.click(playBtn);
    });
    
    // Validate toggled off
    expect(screen.getByText('STOPPED')).not.toBeNull();
    expect(screen.queryByText('PLAYING')).toBeNull();
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });
  
  test('volume slider updates correctly', () => {
    render(<SidPlayer filename="test.sid" audioUrl="/audio/test.mp3" />);
    const slider = screen.getByTestId('volume-slider') as HTMLInputElement;

    // Default slider pos 0.5 (set in component)
    expect(slider.value).toBe('0.5');

    // Simulate changed slide event
    fireEvent.change(slider, { target: { value: '0.8'} });
    expect(slider.value).toBe('0.8');

    // Ensure actual element volume is changed
    const audioEl = screen.getByTestId('audio-element') as HTMLAudioElement;
    expect(audioEl.volume).toBeCloseTo(0.8);
  });
});
