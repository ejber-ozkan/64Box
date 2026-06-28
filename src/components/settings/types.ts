import type { Settings } from '../../contexts/SettingsContext';

export type SettingsTabId =
  | 'appearance'
  | 'content'
  | 'paths'
  | 'scrapers'
  | 'maintenance'
  | 'about';

export interface SettingsTabOption {
  id: SettingsTabId;
  label: string;
}

export const SETTINGS_TABS: SettingsTabOption[] = [
  { id: 'appearance', label: '🎨 Appearance' },
  { id: 'content', label: '🔞 Content' },
  { id: 'paths', label: '📁 Local Paths' },
  { id: 'scrapers', label: '🖼️ Scrapers (Coming Soon)' },
  { id: 'maintenance', label: '🛠️ Maintenance' },
  { id: 'about', label: 'ℹ️ About & Credits' },
];

export const SETTINGS_ITEM_COUNTS: Record<SettingsTabId, number> = {
  appearance: 17,
  content: 1,
  paths: 20,
  scrapers: 10,
  maintenance: 1,
  about: 3,
};

export type EditableSettings = Pick<
  Settings,
  | 'screenshotsPath'
  | 'soundsPath'
  | 'musicianPhotosPath'
  | 'romsPath'
  | 'emulatorPath'
  | 'emuMoviesUsername'
  | 'emuMoviesPassword'
  | 'scrapedMediaPath'
  | 'extrasPath'
  | 'hideAdultContent'
  | 'activeScraper'
  | 'screenScraperUsername'
  | 'screenScraperPassword'
  | 'screenScraperDevId'
  | 'screenScraperDevPassword'
  | 'theGamesDbApiKey'
  | 'retroarchPath'
  | 'retroarchCorePath'
  | 'preferredEmulator'
  | 'imageAnimation'
  | 'imageCycling'
  | 'isFullscreen'
  | 'fullscreenDensity'
  | 'displayResolution'
  | 'mouseHoverSelection'
  | 'scrollNavigation'
  | 'menuSoundEffects'
  | 'bigBoxAnimateVertical'
  | 'activePlatformId'
  | 'platformSettings'
>;

export function getEditableSettings(settings: Settings): EditableSettings {
  return {
    screenshotsPath: settings.screenshotsPath,
    soundsPath: settings.soundsPath,
    musicianPhotosPath: settings.musicianPhotosPath,
    romsPath: settings.romsPath,
    emulatorPath: settings.emulatorPath,
    emuMoviesUsername: settings.emuMoviesUsername,
    emuMoviesPassword: settings.emuMoviesPassword,
    scrapedMediaPath: settings.scrapedMediaPath,
    extrasPath: settings.extrasPath,
    hideAdultContent: settings.hideAdultContent,
    activeScraper: settings.activeScraper,
    screenScraperUsername: settings.screenScraperUsername,
    screenScraperPassword: settings.screenScraperPassword,
    screenScraperDevId: settings.screenScraperDevId,
    screenScraperDevPassword: settings.screenScraperDevPassword,
    theGamesDbApiKey: settings.theGamesDbApiKey,
    retroarchPath: settings.retroarchPath,
    retroarchCorePath: settings.retroarchCorePath,
    preferredEmulator: settings.preferredEmulator,
    imageAnimation: settings.imageAnimation,
    imageCycling: settings.imageCycling,
    isFullscreen: settings.isFullscreen,
    fullscreenDensity: settings.fullscreenDensity,
    displayResolution: settings.displayResolution,
    mouseHoverSelection: settings.mouseHoverSelection,
    scrollNavigation: settings.scrollNavigation,
    menuSoundEffects: settings.menuSoundEffects,
    bigBoxAnimateVertical: settings.bigBoxAnimateVertical,
    activePlatformId: settings.activePlatformId,
    platformSettings: settings.platformSettings,
  };
}

export interface ContentNavProps {
  isMouseMode: boolean;
  onMouseFocus: (index: number) => void;
  isFocused: (index: number) => boolean;
}
