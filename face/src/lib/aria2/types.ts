export type Aria2DownloadStatus = 
| 'active' 
| 'waiting' 
| 'paused' 
| 'error' 
| 'complete' 
| 'removed';

/// Sub-structures for download info
export interface Aria2Uri {
  uri: string;
  status: 'used' | 'waiting';
}

export interface Aria2File {
  index: string;                            /* Aria2 returns numbers as strings •᷄_•᷅ */
  path: string;
  length: string;                           /* Bytes as string */
  completedLength: string;                  /* Bytes as string */
  selected: string;                         /* 'true' | 'false' */
  uris: Aria2Uri[];
}

export interface Aria2BitTorrentInfo {
  announceList?: string[][];
  comment?: string;
  creationDate?: number;
  mode?: 'single' | 'multi';
  info?: {
    name?: string;
  };
}

export interface Aria2Peer {
  peerId: string;
  ip: string;
  port: string;
  bitfield: string;
  amChoking: string;                          /* 'true' | 'false' */
  peerChoking: string;                        /* 'true'  | 'false' */
  downloadSpeed: string;
  uploadSpeed: string;
  seeder: string;                             /* 'true' | 'false' */
}

export interface Aria2Server {
  index: string;
  servers: {
    uri: string;
    currentUri: string;
    downloadSpeed: string;
  }[];
}

// Result of `tellStatus`
export interface Aria2Download {
  gid: string;
  status: Aria2DownloadStatus;
  totalLength: string;
  completedLength: string;
  uploadLength: string;
  bitfield?: string;
  downloadSpeed: string;
  uploadSpeed: string;
  infoHash?: string;
  numSeeders?: string;
  seeder?: string;                              /* 'true' | 'false' */
  pieceLength: string;
  numPieces: string;
  connections: string;
  errorCode?: string;
  errorMessage?: string;
  followedBy?: string[];
  following?: string;
  belongsTo?: string;
  dir: string;
  files: Aria2File[];
  bittorrent?: Aria2BitTorrentInfo;
  verifiedLength?: string;
  verifyIntegrityPending?: string;              /* 'true' | 'false' */
}

/// Result of `getGlobalStat`
export interface Aria2GlobalStat {
  downloadSpeed: string;
  uploadSpeed: string;
  numActive: string;
  numWaiting: string;
  numStopped: string;
  numStoppedTotal: string;
}

/// Result of `getVersion`
export interface Aria2Version {
  version: string;
  enabledFeatures: string[];
}

/// Result of `getSessionInfo`
export interface Aria2Session {
  sessionId: string;
}

/// Just correctly pass the args
export type Aria2AddUriParams = [
  secret: string, 
  uris: string[], 
  options?: Record<string, string | number>, 
  position?: number
];

export type Aria2TellStatusParams = [
  secret: string, 
  gid: string, 
  keys?: (keyof Aria2Download)[]
];

export type Aria2TellBatchParams = [
  secret: string, 
  offset: number, 
  num: number, 
  keys?: (keyof Aria2Download)[]
];

/// BOOM everthing is string
export type GidStatus = 'error' | 'paused' | 'active' | 'waiting' | 'removed' | 'stopped' | 'complete';

export interface ItemMetaData {
  gid: string;
  name: string | null;
  status: GidStatus;
  dir: string | null;
  files: string | null; /* json string */
  totalLength: string | null;
  completedLength: string | null;
  uploadedLength: string | null;
  sourceUri: string | null;
  infoHash: string | null;
  errorCode: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string;
  downloadSpeed?: string;
  uploadSpeed?: string;
}

export interface HistoryResponse {
  data: ItemMetaData[];
  meta: {
    currentPage: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface GlobalStat {
  downloadSpeed: string;
  uploadSpeed: string;
  numActive: string;
  numWaiting: string;
  numStopped: string;
}

export type WsMessage = 
  | { type: 'tick'; global: GlobalStat; tasks: any[] }
  | { type: 'event'; data: ItemMetaData };
