"use client";

import { useSettings } from '../../contexts/SettingsContext';
import { DetailLayoutProps } from '../DetailView';
import { getGameStudios } from '../../lib/game-display';
import { SteamExtrasGalleryPanel } from './steam/SteamExtrasGalleryPanel';
import { SteamFullscreenExtraModal } from './steam/SteamFullscreenExtraModal';
import { SteamGalleryPanel } from './steam/SteamGalleryPanel';
import { SteamHero } from './steam/SteamHero';
import { SteamLaunchableExtrasPanel } from './steam/SteamLaunchableExtrasPanel';
import { SteamSidebar } from './steam/SteamSidebar';
import { SteamTabBar } from './steam/SteamTabBar';
import { SteamTopBar } from './steam/SteamTopBar';
import { useSteamDetailViewModel } from './steam/useSteamDetailViewModel';
import { PlayButton } from './PlayButton';

export function SteamLibraryLayout({
  game,
  onBack,
  nav,
  onFullscreen,
  isFavorite,
  onToggleFavorite,
}: DetailLayoutProps) {
  const { settings, resolveMediaPath } = useSettings();
  const screenshotUrl = game.screenshotFilename ? resolveMediaPath('screenshot', game.screenshotFilename) : '';
  const {
    boxArtUrl,
    extrasSectionRef,
    fullscreenExtra,
    galleryCardRefs,
    galleryExtras,
    gallerySectionRef,
    galleryScrollContainerRef,
    gallerySelectionIndex,
    gameplaySectionRef,
    handleLaunchExtra,
    handleOpenGalleryExtra,
    hasBoxArt,
    hasGalleryExtras,
    hasGameplayMedia,
    hasTitleMedia,
    heroControlsRef,
    launchableCardRefs,
    launchableExtras,
    launchableSelectionIndex,
    imageGalleryIndexes,
    openFullscreenGalleryExtra,
    selectTab,
    setFullscreenExtra,
    setGalleryItemIndex,
    setLaunchableItemIndex,
    statusMessage,
    titleSectionRef,
    visibleTab,
    zoneLabels,
  } = useSteamDetailViewModel({ game, nav, onFullscreen });
  const studios = getGameStudios(game);
  const extrasTabFocused = nav.focusedZone === 'media-extras' && visibleTab === 'extras';
  const extrasGalleryTabFocused = nav.focusedZone === 'media-extras' && visibleTab === 'extras-gallery';

  return (
    <div className="flex flex-col h-full bg-[#1b2838] text-[#c6d4df] font-sans overflow-hidden">
      <SteamTopBar focusedZone={nav.focusedZone} lastAction={nav.lastAction} zoneLabels={zoneLabels} onBack={onBack} />

      <SteamHero
        game={game}
        isFavorite={isFavorite}
        nav={nav}
        onToggleFavorite={onToggleFavorite}
        backgroundArtUrl={boxArtUrl || screenshotUrl}
        studios={studios}
      />

      <div className="no-scrollbar flex-1 overflow-y-auto px-8 pb-8 pt-6 xl:px-10 xl:pb-10 xl:pt-6 w-full flex gap-8 xl:gap-10 transition-all">
        <div className="min-w-0 flex-[1.7]">
          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
            <div ref={heroControlsRef} className="xl:sticky xl:top-6 xl:self-start">
              <PlayButton game={game} nav={nav} />
            </div>

            <div className="flex flex-col gap-8">
              <SteamTabBar
                extrasCount={launchableExtras.length}
                extrasGalleryCount={galleryExtras.length}
                extrasGalleryFocused={extrasGalleryTabFocused}
                extrasFocused={extrasTabFocused}
                hasGalleryExtras={hasGalleryExtras}
                hasLaunchableExtras={launchableExtras.length > 0}
                nav={nav}
                onSelectTab={selectTab}
                visibleTab={visibleTab}
              />

              {visibleTab === 'gallery' && (
                <SteamGalleryPanel
                  boxArtUrl={boxArtUrl}
                  game={game}
                  gameplaySectionRef={gameplaySectionRef}
                  hasBoxArt={hasBoxArt}
                  hasGalleryExtras={hasGalleryExtras}
                  hasGameplayMedia={hasGameplayMedia}
                  hasTitleMedia={hasTitleMedia}
                  nav={nav}
                  onFullscreen={onFullscreen}
                  resolveScreenshotPath={(filename) => resolveMediaPath('screenshot', filename || '')}
                  titleSectionRef={titleSectionRef}
                />
              )}

              {visibleTab === 'extras' && (
                <SteamLaunchableExtrasPanel
                  extrasSectionRef={extrasSectionRef}
                  launchableCardRefs={launchableCardRefs}
                  launchableExtras={launchableExtras}
                  launchableSelectionIndex={launchableSelectionIndex}
                  nav={nav}
                  onHoverCard={(index) => {
                    setLaunchableItemIndex(index);
                    nav.hoverZone('media-extras');
                  }}
                  onLaunchCard={(extra, index) => {
                    setLaunchableItemIndex(index);
                    void handleLaunchExtra(extra);
                  }}
                  visibleTab={visibleTab}
                />
              )}

              {visibleTab === 'extras-gallery' && (
                <SteamExtrasGalleryPanel
                  extrasPath={settings.extrasPath}
                  galleryCardRefs={galleryCardRefs}
                  galleryExtras={galleryExtras}
                  gallerySectionRef={gallerySectionRef}
                  galleryScrollContainerRef={galleryScrollContainerRef}
                  gallerySelectionIndex={gallerySelectionIndex}
                  nav={nav}
                  onHoverCard={(index) => {
                    setGalleryItemIndex(index);
                    nav.hoverZone('media-extras');
                  }}
                  onOpenCard={(extra, index) => {
                    setGalleryItemIndex(index);
                    void handleOpenGalleryExtra(extra);
                  }}
                  visibleTab={visibleTab}
                />
              )}
            </div>
          </div>
        </div>

        <SteamSidebar game={game} nav={nav} />
      </div>

      {statusMessage && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-[110] -translate-x-1/2 rounded-full border border-[#66c0f4]/40 bg-[#0f1922]/95 px-5 py-3 text-sm text-white shadow-2xl shadow-black/40 backdrop-blur-md">
          {statusMessage}
        </div>
      )}

      {fullscreenExtra && (
        <SteamFullscreenExtraModal
          caption={fullscreenExtra.caption}
          onClose={() => setFullscreenExtra(null)}
          onNext={
            imageGalleryIndexes.length > 1
              ? () => {
                  const currentImageListIndex = imageGalleryIndexes.indexOf(fullscreenExtra.index);
                  const safeImageListIndex = currentImageListIndex >= 0 ? currentImageListIndex : 0;
                  const nextImageListIndex = (safeImageListIndex + 1) % imageGalleryIndexes.length;
                  void openFullscreenGalleryExtra(imageGalleryIndexes[nextImageListIndex]);
                }
              : undefined
          }
          onPrevious={
            imageGalleryIndexes.length > 1
              ? () => {
                  const currentImageListIndex = imageGalleryIndexes.indexOf(fullscreenExtra.index);
                  const safeImageListIndex = currentImageListIndex >= 0 ? currentImageListIndex : 0;
                  const previousImageListIndex =
                    (safeImageListIndex - 1 + imageGalleryIndexes.length) % imageGalleryIndexes.length;
                  void openFullscreenGalleryExtra(imageGalleryIndexes[previousImageListIndex]);
                }
              : undefined
          }
          src={fullscreenExtra.src}
          title={fullscreenExtra.title}
        />
      )}
    </div>
  );
}
