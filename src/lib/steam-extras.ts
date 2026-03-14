import { Extra } from '../types/game';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mkv', 'mp4', 'avi', 'mov', 'webm']);
const LAUNCHABLE_ROOTS = ['tapes', 'disks', 'carts', 'coverdisks', 'covertapes', 'pd-disks', 'type-ins'];

export function buildExtraAbsolutePath(extrasPath: string | undefined, extraPath: string) {
  const cleanExtrasPath = (extrasPath || '').replace(/\\/g, '/').replace(/\/+$/, '');
  const cleanExtraPath = extraPath.replace(/\\/g, '/').replace(/^\/+/, '');
  return [cleanExtrasPath, cleanExtraPath].filter(Boolean).join('/');
}

export function getExtraExtension(extra: Extra) {
  return extra.path.split('.').pop()?.toLowerCase() || '';
}

export function isImageExtra(extra: Extra) {
  return IMAGE_EXTENSIONS.has(getExtraExtension(extra));
}

export function isVideoExtra(extra: Extra) {
  return VIDEO_EXTENSIONS.has(getExtraExtension(extra));
}

export function getExtraSourceLabel(extra: Extra) {
  return extra.path.split(/[\\/]/)[0] || 'Extras';
}

export function getExtraLaunchLabel(extra: Extra) {
  const root = getExtraSourceLabel(extra).toLowerCase();
  if (root.includes('tape')) return 'Launch Tape';
  if (root.includes('disk')) return 'Launch Disk';
  if (root.includes('cart')) return 'Launch Cart';
  return 'Launch Variant';
}

export function isLaunchableExtra(extra: Extra) {
  const root = getExtraSourceLabel(extra).toLowerCase();
  return LAUNCHABLE_ROOTS.some((candidate) => root.includes(candidate));
}
