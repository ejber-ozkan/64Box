import type { EditableSettings, ContentNavProps } from './types';

interface AppearanceSettingsTabProps extends ContentNavProps {
  draft: EditableSettings;
  setField: <K extends keyof EditableSettings>(key: K, value: EditableSettings[K]) => void;
}

export function AppearanceSettingsTab({
  draft,
  setField,
  isMouseMode,
  onMouseFocus,
  isFocused,
}: AppearanceSettingsTabProps) {
  return (
    <>
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Detail View Theme
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'cia', label: 'CIA-6526', desc: 'Structured tabs' },
            { value: 'vic', label: 'VIC-II', desc: 'Console hero' },
            { value: 'sx64', label: 'SX-64', desc: 'Power-user' },
          ] as const).map((opt, idx) => (
            <button
              key={opt.value}
              onClick={() => setField('detailViewTheme', opt.value)}
              onMouseEnter={() => isMouseMode && onMouseFocus(idx)}
              className={`focus-idx-${idx} flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition ${
                (draft.detailViewTheme === opt.value && ![0, 1, 2].some(isFocused)) || isFocused(idx)
                  ? 'border-blue-500 bg-blue-900/40 text-white shadow-lg shadow-blue-900/20'
                  : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <span className="text-sm font-bold">{opt.label}</span>
              <span className="text-[10px] text-gray-500">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <div className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
          Screenshot & Media Gallery
        </div>

        <div className="flex flex-col gap-6 rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <label className="group flex cursor-pointer items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">🔄 Cycle Multiple Images</div>
              <div className="mt-1 max-w-sm text-[10px] text-gray-400">
                Automatically cycle through gameplay screenshots and variants (every 3.5 seconds).
              </div>
            </div>
            <button
              onClick={() => setField('imageCycling', !draft.imageCycling)}
              onMouseEnter={() => isMouseMode && onMouseFocus(3)}
              className={`focus-idx-3 relative ml-6 h-6 w-12 shrink-0 rounded-full transition-colors ${
                (draft.imageCycling && !isFocused(3)) || isFocused(3) ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  draft.imageCycling ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </label>

          <div className={`transition-opacity ${!draft.imageCycling ? 'pointer-events-none opacity-40' : ''}`}>
            <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Transition Effect
            </label>
            <div className="w-fit rounded-lg border border-gray-700 bg-gray-950 p-1">
              {(['none', 'slide'] as const).map((anim, idx) => (
                <button
                  key={anim}
                  onClick={() => setField('imageAnimation', anim)}
                  onMouseEnter={() => isMouseMode && onMouseFocus(idx + 4)}
                  className={`focus-idx-${idx + 4} rounded-md px-6 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    (draft.imageAnimation === anim && ![4, 5].some(isFocused)) || isFocused(idx + 4)
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {anim === 'none' ? 'Instant/Fade' : 'Graceful Slide'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">Display & Window</div>
        <div className="space-y-6 rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          <label className="group flex cursor-pointer items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">🖥️ Fullscreen Mode (BigBox)</div>
              <div className="mt-1 max-w-sm text-[10px] text-gray-400">
                Runs the application in immersive fullscreen mode. Toggle with Alt+Enter.
              </div>
            </div>
            <button
              onClick={() => setField('isFullscreen', !draft.isFullscreen)}
              onMouseEnter={() => isMouseMode && onMouseFocus(6)}
              className={`focus-idx-6 relative ml-6 h-6 w-12 shrink-0 rounded-full transition-colors ${
                (draft.isFullscreen && !isFocused(6)) || isFocused(6) ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  draft.isFullscreen ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </label>

          <div className={`transition-opacity ${draft.isFullscreen ? 'pointer-events-none opacity-40' : ''}`}>
            <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Window Resolution
            </label>
            <div className="flex flex-wrap gap-1 rounded-lg border border-gray-700 bg-gray-950 p-1">
              {[
                { value: 'default', label: 'Default' },
                { value: '1280x720', label: '720p' },
                { value: '1920x1080', label: '1080p' },
                { value: '2560x1440', label: '1440p' },
                { value: '3840x2160', label: '4K' },
              ].map((resolution, idx) => (
                <button
                  key={resolution.value}
                  onClick={() => setField('displayResolution', resolution.value)}
                  onMouseEnter={() => isMouseMode && onMouseFocus(idx + 7)}
                  className={`focus-idx-${idx + 7} rounded-md px-4 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                    (draft.displayResolution === resolution.value && ![7, 8, 9, 10, 11].some(isFocused)) || isFocused(idx + 7)
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {resolution.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[9px] italic text-gray-500">
              Note: These only apply in windowed mode. Fullscreen uses your primary monitor resolution.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">Mouse & Interaction</div>
        <div className="space-y-6 rounded-xl border border-gray-700 bg-gray-800/50 p-5">
          {[
            {
              key: 'mouseHoverSelection' as const,
              index: 12,
              title: '🖱️ Mouse Hover Selection',
              description:
                'Automatically focus items when the mouse pointer moves over them. Turn off if your mouse is too sensitive.',
            },
            {
              key: 'scrollNavigation' as const,
              index: 13,
              title: '💎 Scroll Wheel Navigation',
              description: 'Use the mouse scroll button (wheel) to move up and down through menu items.',
            },
            {
              key: 'bigBoxAnimateVertical' as const,
              index: 14,
              title: '↕️ BigBox Vertical Animation',
              description: 'Enable smooth sliding animations when swapping between game rails in BigBox mode.',
              withBorder: true,
            },
          ].map((item) => (
            <label
              key={item.key}
              className={`group flex cursor-pointer items-center justify-between ${item.withBorder ? 'border-t border-gray-800 pt-6' : ''}`}
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">{item.title}</div>
                <div className="mt-1 max-w-sm text-[10px] text-gray-400">{item.description}</div>
              </div>
              <button
                onClick={() => setField(item.key, !draft[item.key])}
                onMouseEnter={() => isMouseMode && onMouseFocus(item.index)}
                className={`focus-idx-${item.index} relative ml-6 h-6 w-12 shrink-0 rounded-full transition-colors ${
                  (draft[item.key] && !isFocused(item.index)) || isFocused(item.index)
                    ? 'bg-blue-600 ring-2 ring-blue-400'
                    : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    draft[item.key] ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>
    </>
  );
}
