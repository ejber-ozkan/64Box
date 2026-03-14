import type { EditableSettings, ContentNavProps } from './types';

type DirectoryField =
  | 'romsPath'
  | 'screenshotsPath'
  | 'soundsPath'
  | 'musicianPhotosPath'
  | 'extrasPath'
  | 'scrapedMediaPath';

type FileField = 'emulatorPath' | 'retroarchPath' | 'retroarchCorePath';

interface PathsSettingsTabProps extends ContentNavProps {
  draft: EditableSettings;
  setField: <K extends keyof EditableSettings>(key: K, value: EditableSettings[K]) => void;
  onBrowseDirectory: (field: DirectoryField) => Promise<void>;
  onBrowseFile: (field: FileField) => Promise<void>;
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
  onBrowseDirectory,
  onBrowseFile,
  isMouseMode,
  onMouseFocus,
  isFocused,
}: PathsSettingsTabProps) {
  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="mt-2 border-b border-[#2a475e] pb-1.5 text-xs font-bold uppercase tracking-widest text-[#66c0f4]">
          -------- Gamebase64 Folders --------
        </div>
        <PathRow
          label="Games folder"
          value={draft.romsPath}
          onChange={(value) => setField('romsPath', value)}
          placeholder="e.g. D:/GB64/Games"
          inputIndex={0}
          browseIndex={1}
          onBrowse={() => void onBrowseDirectory('romsPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
        <PathRow
          label="Screenshots folder"
          value={draft.screenshotsPath}
          onChange={(value) => setField('screenshotsPath', value)}
          placeholder="e.g. D:/GB64/Screenshots"
          inputIndex={2}
          browseIndex={3}
          onBrowse={() => void onBrowseDirectory('screenshotsPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
        <PathRow
          label="C64Music folder"
          value={draft.soundsPath}
          onChange={(value) => setField('soundsPath', value)}
          placeholder="e.g. D:/GB64/C64Music"
          inputIndex={4}
          browseIndex={5}
          onBrowse={() => void onBrowseDirectory('soundsPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
        <PathRow
          label="Photos (Musicians) folder"
          value={draft.musicianPhotosPath}
          onChange={(value) => setField('musicianPhotosPath', value)}
          placeholder="e.g. D:/GB64/Photos"
          inputIndex={6}
          browseIndex={7}
          onBrowse={() => void onBrowseDirectory('musicianPhotosPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
        <PathRow
          label="Extras folder"
          value={draft.extrasPath}
          onChange={(value) => setField('extrasPath', value)}
          placeholder="e.g. D:/GB64/Extras"
          inputIndex={8}
          browseIndex={9}
          onBrowse={() => void onBrowseDirectory('extrasPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
        <div className="mb-2 border-t border-[#2a475e] pt-1.5 text-xs font-bold uppercase tracking-widest text-[#66c0f4]">
          -------- Emulator Paths --------
        </div>

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
                  onClick={() => setField('preferredEmulator', emu)}
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
              value={draft.emulatorPath}
              onChange={(value) => setField('emulatorPath', value)}
              placeholder="e.g. C:/VICE/x64sc.exe"
              inputIndex={12}
              isMouseMode={isMouseMode}
              onMouseFocus={onMouseFocus}
              isFocused={isFocused}
            />
            <button
              onClick={() => void onBrowseFile('emulatorPath')}
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
              value={draft.retroarchPath}
              onChange={(value) => setField('retroarchPath', value)}
              placeholder="e.g. C:/RetroArch/retroarch.exe"
              inputIndex={14}
              isMouseMode={isMouseMode}
              onMouseFocus={onMouseFocus}
              isFocused={isFocused}
            />
            <button
              onClick={() => void onBrowseFile('retroarchPath')}
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
              value={draft.retroarchCorePath}
              onChange={(value) => setField('retroarchCorePath', value)}
              placeholder="e.g. C:/RetroArch/cores/vice_x64sc_libretro.dll"
              inputIndex={16}
              isMouseMode={isMouseMode}
              onMouseFocus={onMouseFocus}
              isFocused={isFocused}
            />
            <button
              onClick={() => void onBrowseFile('retroarchCorePath')}
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

        <hr className="mb-1 mt-2 border-gray-700" />
        <PathRow
          label="Scraped Media Folder"
          value={draft.scrapedMediaPath}
          onChange={(value) => setField('scrapedMediaPath', value)}
          placeholder="e.g. D:/MYSOURCE/VIC40GameBase64/64BoxMedia"
          inputIndex={18}
          browseIndex={19}
          onBrowse={() => void onBrowseDirectory('scrapedMediaPath')}
          isMouseMode={isMouseMode}
          onMouseFocus={onMouseFocus}
          isFocused={isFocused}
        />
      </div>
      <p className="text-[10px] text-emerald-600">✅ &quot;Browse…&quot; opens the native OS folder picker in Tauri desktop mode.</p>
    </>
  );
}
