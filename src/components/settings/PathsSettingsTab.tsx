import type { EditableSettings, ContentNavProps } from './types';
import { PLATFORM_PROFILES } from '../../lib/platform-capabilities';
import type { PlatformFolderSettings, PlatformId } from '../../types/platform';

interface PathsSettingsTabProps extends ContentNavProps {
  draft: EditableSettings;
  setField: <K extends keyof EditableSettings>(key: K, value: EditableSettings[K]) => void;
  platformId: PlatformId;
  onBrowseDirectory: () => Promise<string | null>;
  onBrowseFile: () => Promise<string | null>;
}

interface PathRowProps extends ContentNavProps {
  label: string;
  value: string;
  placeholder: string;
  inputIndex: number;
  browseIndex?: number;
  onChange: (value: string) => void;
  onBrowse?: () => void;
}

function PathRow({
  label,
  value,
  placeholder,
  inputIndex,
  browseIndex,
  onChange,
  onBrowse,
  isMouseMode,
  onMouseFocus,
  isFocused,
}: PathRowProps) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          className={`focus-idx-${inputIndex} flex-1 rounded border bg-gray-950 px-3 py-2 font-mono text-xs text-white transition-colors focus:outline-none ${
            isFocused(inputIndex) ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-700'
          }`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          onMouseEnter={() => isMouseMode && onMouseFocus(inputIndex)}
        />
        {onBrowse && browseIndex !== undefined && (
          <button
            onClick={onBrowse}
            onMouseEnter={() => isMouseMode && onMouseFocus(browseIndex)}
            className={`focus-idx-${browseIndex} shrink-0 rounded border px-3 py-2 text-xs transition ${
              isFocused(browseIndex)
                ? 'border-blue-400 bg-blue-600 text-white'
                : 'border-gray-700 bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Browse (Desktop mode only)"
          >
            Browse…
          </button>
        )}
      </div>
    </div>
  );
}

export function PathsSettingsTab({
  draft,
  setField,
  platformId,
  onBrowseDirectory,
  onBrowseFile,
  isMouseMode,
  onMouseFocus,
  isFocused,
}: PathsSettingsTabProps) {
  const platformProfile = PLATFORM_PROFILES[platformId];
  const platformSettings = draft.platformSettings[platformId];
  const platformFolders = platformSettings.folders;
  const platformEmulatorSettings = platformSettings.emulator;
  const isC64 = platformId === 'c64';
  const isAtari800 = platformId === 'atari800';

  const setPlatformFolders = (folders: PlatformFolderSettings) => {
    setField('platformSettings', {
      ...draft.platformSettings,
      [platformId]: {
        ...platformSettings,
        folders,
      },
    });

    if (platformId === draft.activePlatformId) {
      setField('romsPath', folders.gamesPath);
      setField('soundsPath', folders.musicPath);
      setField('musicianPhotosPath', folders.photosPath);
      setField('screenshotsPath', folders.screenshotsPath);
      setField('extrasPath', folders.extrasPath);
    }
  };

  const setPlatformFolder = (field: keyof PlatformFolderSettings, value: string) => {
    setPlatformFolders({
      ...platformFolders,
      [field]: value,
    });
  };

  const browsePlatformFolder = async (field: keyof PlatformFolderSettings) => {
    const chosen = await onBrowseDirectory();
    if (chosen) {
      setPlatformFolder(field, chosen);
    }
  };

  const browsePlatformExecutable = async (profileId: string) => {
    const chosen = await onBrowseFile();
    if (chosen) {
      setPlatformExecutablePath(profileId, chosen);
      if (profileId === 'vice-c64' && platformId === draft.activePlatformId) setField('emulatorPath', chosen);
      if (profileId === 'retroarch-c64' && platformId === draft.activePlatformId) setField('retroarchPath', chosen);
    }
  };

  const browsePlatformCore = async (profileId: string) => {
    const chosen = await onBrowseFile();
    if (chosen) {
      setPlatformCorePath(profileId, chosen);
      if (profileId === 'retroarch-c64' && platformId === draft.activePlatformId) setField('retroarchCorePath', chosen);
    }
  };

  const setPlatformExecutablePath = (profileId: string, value: string) => {
    setField('platformSettings', {
      ...draft.platformSettings,
      [platformId]: {
        ...platformSettings,
        emulator: {
          ...platformEmulatorSettings,
          executablePaths: {
            ...platformEmulatorSettings.executablePaths,
            [profileId]: value,
          },
        },
      },
    });
  };

  const setPlatformCorePath = (profileId: string, value: string) => {
    setField('platformSettings', {
      ...draft.platformSettings,
      [platformId]: {
        ...platformSettings,
        emulator: {
          ...platformEmulatorSettings,
          corePaths: {
            ...platformEmulatorSettings.corePaths,
            [profileId]: value,
          },
        },
      },
    });
  };

  const setPreferredC64Emulator = (emulator: 'vice' | 'retroarch') => {
    setField('preferredEmulator', emulator);
    setField('platformSettings', {
      ...draft.platformSettings,
      c64: {
        ...draft.platformSettings.c64,
        emulator: {
          ...draft.platformSettings.c64.emulator,
          preferredEmulatorProfileId: emulator === 'retroarch' ? 'retroarch-c64' : 'vice-c64',
        },
      },
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="mt-2 border-b border-[#2a475e] pb-1.5 text-xs font-bold uppercase tracking-widest text-[#66c0f4]">
          -------- {platformProfile.displayName} Folders --------
        </div>
        <PathRow
          label="Games folder"
          value={platformFolders.gamesPath}
          onChange={(value) => setPlatformFolder('gamesPath', value)}
          placeholder={isC64 ? 'e.g. D:/GB64/Games' : `Select ${platformProfile.displayName} games folder`}
          inputIndex={0}
          browseIndex={1}
          onBrowse={() => void browsePlatformFolder('gamesPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
        <PathRow
          label="Screenshots folder"
          value={platformFolders.screenshotsPath}
          onChange={(value) => setPlatformFolder('screenshotsPath', value)}
          placeholder={isC64 ? 'e.g. D:/GB64/Screenshots' : `Select ${platformProfile.displayName} screenshots folder`}
          inputIndex={2}
          browseIndex={3}
          onBrowse={() => void browsePlatformFolder('screenshotsPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
        <PathRow
          label={isC64 ? 'C64Music folder' : 'Music folder'}
          value={platformFolders.musicPath}
          onChange={(value) => setPlatformFolder('musicPath', value)}
          placeholder={isC64 ? 'e.g. D:/GB64/C64Music' : `Select ${platformProfile.displayName} music folder`}
          inputIndex={4}
          browseIndex={5}
          onBrowse={() => void browsePlatformFolder('musicPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
        <PathRow
          label={isC64 ? 'Photos (Musicians) folder' : 'Photos folder'}
          value={platformFolders.photosPath}
          onChange={(value) => setPlatformFolder('photosPath', value)}
          placeholder={isC64 ? 'e.g. D:/GB64/Photos' : `Select ${platformProfile.displayName} photos folder`}
          inputIndex={6}
          browseIndex={7}
          onBrowse={() => void browsePlatformFolder('photosPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
        <PathRow
          label="Extras folder"
          value={platformFolders.extrasPath}
          onChange={(value) => setPlatformFolder('extrasPath', value)}
          placeholder={isC64 ? 'e.g. D:/GB64/Extras' : `Select ${platformProfile.displayName} extras folder`}
          inputIndex={8}
          browseIndex={9}
          onBrowse={() => void browsePlatformFolder('extrasPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
        <div className="mb-2 border-t border-[#2a475e] pt-1.5 text-xs font-bold uppercase tracking-widest text-[#66c0f4]">
          -------- Emulator Paths --------
        </div>

        {!isAtari800 && (
          <div className="space-y-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
            <div className="mb-4 flex items-center justify-between border-b border-gray-700 pb-4">
              <div>
                <span className="block text-sm font-bold uppercase tracking-wider text-white">Default Desktop Emulator</span>
                <span className="mt-1 block text-[10px] text-gray-500">Which engine to use when clicking &quot;▶ Desktop&quot;</span>
              </div>
              <div className="flex rounded-lg border border-gray-700 bg-gray-950 p-1">
                {(['vice', 'retroarch'] as const).map((emu, idx) => (
                  <button
                    key={emu}
                    onClick={() => setPreferredC64Emulator(emu)}
                    onMouseEnter={() => isMouseMode && onMouseFocus(idx + 10)}
                    className={`focus-idx-${idx + 10} rounded-md px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                      (draft.preferredEmulator === emu && ![10, 11].some(isFocused)) || isFocused(idx + 10)
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {emu}
                  </button>
                ))}
              </div>
            </div>

            <div className={`space-y-3 transition-opacity ${draft.preferredEmulator !== 'vice' ? 'opacity-50' : ''}`}>
              <PathRow
                label="VICE Executable (x64sc.exe)"
                value={platformEmulatorSettings.executablePaths['vice-c64'] ?? draft.emulatorPath}
                onChange={(value) => {
                  setPlatformExecutablePath('vice-c64', value);
                  if (platformId === draft.activePlatformId) setField('emulatorPath', value);
                }}
                placeholder="e.g. C:/VICE/x64sc.exe"
                inputIndex={12}
                isMouseMode={isMouseMode}
                onMouseFocus={onMouseFocus}
                isFocused={isFocused}
              />
              <button
                onClick={() => void browsePlatformExecutable('vice-c64')}
                onMouseEnter={() => isMouseMode && onMouseFocus(13)}
                className={`focus-idx-13 rounded border px-3 py-2 text-xs transition ${
                  isFocused(13)
                    ? 'border-blue-400 bg-blue-600 text-white'
                    : 'border-gray-700 bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Browse for VICE (x64sc)...
              </button>
            </div>

            <div className={`space-y-3 transition-opacity ${draft.preferredEmulator !== 'retroarch' ? 'opacity-50' : ''}`}>
              <PathRow
                label="RetroArch Executable (retroarch.exe)"
                value={platformEmulatorSettings.executablePaths['retroarch-c64'] ?? draft.retroarchPath}
                onChange={(value) => {
                  setPlatformExecutablePath('retroarch-c64', value);
                  if (platformId === draft.activePlatformId) setField('retroarchPath', value);
                }}
                placeholder="e.g. C:/RetroArch/retroarch.exe"
                inputIndex={14}
                isMouseMode={isMouseMode}
                onMouseFocus={onMouseFocus}
                isFocused={isFocused}
              />
              <button
                onClick={() => void browsePlatformExecutable('retroarch-c64')}
                onMouseEnter={() => isMouseMode && onMouseFocus(15)}
                className={`focus-idx-15 rounded border px-3 py-2 text-xs transition ${
                  isFocused(15)
                    ? 'border-blue-400 bg-blue-600 text-white'
                    : 'border-gray-700 bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Browse for RetroArch...
              </button>

              <PathRow
                label="RetroArch Core (e.g. vice_x64sc_libretro.dll)"
                value={platformEmulatorSettings.corePaths['retroarch-c64'] ?? draft.retroarchCorePath}
                onChange={(value) => {
                  setPlatformCorePath('retroarch-c64', value);
                  if (platformId === draft.activePlatformId) setField('retroarchCorePath', value);
                }}
                placeholder="e.g. C:/RetroArch/cores/vice_x64sc_libretro.dll"
                inputIndex={16}
                isMouseMode={isMouseMode}
                onMouseFocus={onMouseFocus}
                isFocused={isFocused}
              />
              <button
                onClick={() => void browsePlatformCore('retroarch-c64')}
                onMouseEnter={() => isMouseMode && onMouseFocus(17)}
                className={`focus-idx-17 rounded border px-3 py-2 text-xs transition ${
                  isFocused(17)
                    ? 'border-blue-400 bg-blue-600 text-white'
                    : 'border-gray-700 bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Browse for Core DLL/SO...
              </button>
            </div>
          </div>
        )}

        {isAtari800 && (
          <div className="space-y-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
            <div className="mb-4 border-b border-gray-700 pb-4">
              <span className="block text-sm font-bold uppercase tracking-wider text-white">Atari 800 Emulators</span>
            </div>
            <div className="space-y-3">
              <PathRow
                label="RetroArch Executable (retroarch.exe)"
                value={platformEmulatorSettings.executablePaths['retroarch-atari800'] ?? ''}
                onChange={(value) => setPlatformExecutablePath('retroarch-atari800', value)}
                placeholder="e.g. C:/RetroArch/retroarch.exe"
                inputIndex={12}
                browseIndex={13}
                onBrowse={() => void browsePlatformExecutable('retroarch-atari800')}
                isMouseMode={isMouseMode}
                onMouseFocus={onMouseFocus}
                isFocused={isFocused}
              />
              <PathRow
                label="RetroArch Atari800 Core"
                value={platformEmulatorSettings.corePaths['retroarch-atari800'] ?? ''}
                onChange={(value) => setPlatformCorePath('retroarch-atari800', value)}
                placeholder="e.g. C:/RetroArch/cores/atari800_libretro.dll"
                inputIndex={14}
                browseIndex={15}
                onBrowse={() => void browsePlatformCore('retroarch-atari800')}
                isMouseMode={isMouseMode}
                onMouseFocus={onMouseFocus}
                isFocused={isFocused}
              />
              <PathRow
                label="Altirra Executable (Altirra64.exe)"
                value={platformEmulatorSettings.executablePaths['altirra-atari800'] ?? ''}
                onChange={(value) => setPlatformExecutablePath('altirra-atari800', value)}
                placeholder="e.g. C:/Altirra/Altirra64.exe"
                inputIndex={16}
                browseIndex={17}
                onBrowse={() => void browsePlatformExecutable('altirra-atari800')}
                isMouseMode={isMouseMode}
                onMouseFocus={onMouseFocus}
                isFocused={isFocused}
              />
            </div>
          </div>
        )}

        <hr className="mb-1 mt-2 border-gray-700" />
        <PathRow
          label="Scraped Media Folder"
          value={draft.scrapedMediaPath}
          onChange={(value) => setField('scrapedMediaPath', value)}
          placeholder="e.g. D:/MYSOURCE/VIC40GameBase64/64BoxMedia"
          inputIndex={18}
          browseIndex={19}
          onBrowse={async () => {
            const chosen = await onBrowseDirectory();
            if (chosen) setField('scrapedMediaPath', chosen);
          }}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
      </div>
      <p className="text-[10px] text-emerald-600">✅ &quot;Browse…&quot; opens the native OS folder picker in Tauri desktop mode.</p>
    </>
  );
}
