// Core data types for Repo Topography

export interface RepoInput {
  owner: string;
  repo: string;
}

export interface FileNode {
  path: string;
  name: string;
  type: "file" | "directory";
  size: number; // bytes
  language: string | null;
  children?: FileNode[];
  // Enrichment data (loaded progressively)
  commitCount?: number;
  lastCommitDate?: string;
  contributors?: string[];
  churnScore?: number; // additions + deletions over recent history
}

export interface RepoData {
  owner: string;
  repo: string;
  defaultBranch: string;
  totalSize: number;
  totalFiles: number;
  languages: Record<string, number>; // language -> byte count
  tree: FileNode;
  truncated: boolean;
  fetchedAt: number;
}

// Layout types for treemap → terrain mapping
export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TerrainNode {
  path: string;
  name: string;
  type: "file" | "directory";
  rect: LayoutRect;
  depth: number; // nesting depth
  size: number;
  language: string | null;
  elevation: number; // normalized 0-1
  heat: number; // commit activity, normalized 0-1
  children?: TerrainNode[];
}

export interface TerrainData {
  nodes: TerrainNode[];
  flatNodes: TerrainNode[]; // flattened file-only nodes for rendering
  bounds: { width: number; height: number };
  maxDepth: number;
}

// Language → biome color mapping
export interface BiomeConfig {
  base: string; // hex color
  accent: string;
  name: string;
}

// API response types
export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubRepoResponse {
  name: string;
  full_name: string;
  default_branch: string;
  size: number;
  language: string;
  stargazers_count: number;
  description: string | null;
}

// Store types
export interface AppState {
  repoInput: string;
  repoData: RepoData | null;
  terrainData: TerrainData | null;
  loading: boolean;
  loadingPhase: LoadingPhase;
  loadingProgress: number;
  error: string | null;
  hoveredNode: TerrainNode | null;
  selectedNode: TerrainNode | null;
  cameraTarget: [number, number, number] | null;
  showUI: boolean;
  setRepoInput: (input: string) => void;
  setRepoData: (data: RepoData | null) => void;
  setTerrainData: (data: TerrainData | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadingPhase: (phase: LoadingPhase) => void;
  setLoadingProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setHoveredNode: (node: TerrainNode | null) => void;
  setSelectedNode: (node: TerrainNode | null) => void;
  setCameraTarget: (target: [number, number, number] | null) => void;
  setShowUI: (show: boolean) => void;
  reset: () => void;
}

export type LoadingPhase =
  | "idle"
  | "fetching-repo"
  | "fetching-tree"
  | "fetching-languages"
  | "building-layout"
  | "generating-terrain"
  | "enriching"
  | "complete";

export const LOADING_PHASE_LABELS: Record<LoadingPhase, string> = {
  idle: "",
  "fetching-repo": "Surveying repository...",
  "fetching-tree": "Mapping file structure...",
  "fetching-languages": "Identifying biomes...",
  "building-layout": "Computing geography...",
  "generating-terrain": "Raising terrain...",
  enriching: "Reading geological history...",
  complete: "Landscape ready",
};
