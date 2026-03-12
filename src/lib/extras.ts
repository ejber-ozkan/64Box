import { Extra } from '../types/game';

export interface ExtraGroup {
  category: 'visual' | 'docs' | 'media' | 'games';
  label: string;
  items: Extra[];
}

export const VISUAL_FOLDERS = ["Adverts", "Advert", "Books", "Cover", "Magcover", "Maps", "Missing", "Photos"];
export const DOC_FOLDERS = ["Docs", "Listings", "SceneMags", "Tips"];
export const MEDIA_FOLDERS = ["Trailer", "mkv", "mp3s"];
export const GAME_FOLDERS = ["Carts", "Coverdisks", "Covertapes", "Disks", "PD-Disks", "Tapes", "Type-Ins"];

const IMG_EXT = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
const GAME_EXT = ['d64', 'g64', 't64', 'tap', 'prg', 'crt', 'nib', 'zip'];
const MEDIA_EXT = ['mkv', 'mp4', 'mp3', 'avi', 'mov'];
const DOC_EXT = ['pdf', 'txt', 'doc', 'docx', 'htm', 'html'];

export function groupExtras(extras: Extra[]): ExtraGroup[] {
  const groups: Record<string, Extra[]> = {
    visual: [],
    docs: [],
    media: [],
    games: []
  };

  extras.forEach(extra => {
    const path = extra.path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
    const folder = path.split('/')[0].toLowerCase();
    const ext = path.split('.').pop()?.toLowerCase() || '';

    // Smart categorization: Extension takes precedence for ambiguous folders like "Cover"
    if (GAME_EXT.includes(ext)) {
      groups.games.push(extra);
    } else if (IMG_EXT.includes(ext)) {
      groups.visual.push(extra);
    } else if (MEDIA_EXT.includes(ext)) {
      groups.media.push(extra);
    } else if (DOC_EXT.includes(ext)) {
      groups.docs.push(extra);
    } else {
      // Fallback to folder-based matching if extension is unknown
      if (VISUAL_FOLDERS.some(f => f.toLowerCase() === folder)) {
        groups.visual.push(extra);
      } else if (DOC_FOLDERS.some(f => f.toLowerCase() === folder)) {
        groups.docs.push(extra);
      } else if (MEDIA_FOLDERS.some(f => f.toLowerCase() === folder)) {
        groups.media.push(extra);
      } else if (GAME_FOLDERS.some(f => f.toLowerCase() === folder)) {
        groups.games.push(extra);
      } else {
        groups.docs.push(extra);
      }
    }
  });

  const result: ExtraGroup[] = [];
  if (groups.visual.length > 0) result.push({ category: 'visual', label: 'Gallery & Media', items: groups.visual });
  if (groups.docs.length > 0) result.push({ category: 'docs', label: 'Documents & Manuals', items: groups.docs });
  if (groups.media.length > 0) result.push({ category: 'media', label: 'Media Assets', items: groups.media });
  if (groups.games.length > 0) result.push({ category: 'games', label: 'Alternate Versions', items: groups.games });

  return result;
}
