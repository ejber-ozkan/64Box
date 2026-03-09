export interface Developer {
  id: number;
  name: string;
}

export interface Publisher {
  id: number;
  name: string;
}

export interface Musician {
  id: number;
  name: string;
  photoPath: string | null;
  group: string | null;
  nick: string | null;
}

export interface Game {
  id: number;
  name: string;
  filename: string;
  gameFilename: string | null;   // ROM file (.d64, .t64 etc) for launch via VICE
  screenshotFilename: string | null;
  boxFrontFilename: string | null;
  titlescreenFilename: string | null;
  videoSnapFilename: string | null;
  sidFilename: string | null;
  crc: string;
  year: number | null;
  isPal: boolean;
  isNtsc: boolean;
  trueDriveEmu: boolean;
  isClassic: boolean;
  
  parentGenre: string;
  subGenre: string;
  
  developer: Developer | null;
  publisher: Publisher | null;
  musician: Musician | null;
  
  control: string | null;
  playersFrom: string | null;
  playersTo: string | null;
  playersSim: string | null;
  comment: string | null;
  reviewRating: string | null;
  
  languages: string[];
  
  // New detailed metadata
  coderName: string | null;
  graphicsName: string | null;
  versionBy: string | null;
  vTrainers: string | null;
  vLength: string | null;
  vLoadingScreen: boolean | null;
  vHighScoreSaver: boolean | null;
  vIncludedDocs: boolean | null;
  vTrueDriveEmu: boolean | null;
  vPalNtsc: string | null;
  memo: string | null;
}
