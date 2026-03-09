import type {
  FileNode,
  RepoData,
  GitHubTreeResponse,
  GitHubRepoResponse,
} from "./types";
import { detectLanguage } from "./languages";

const GITHUB_API = "https://api.github.com";

interface FetchOptions {
  token?: string;
  onPhase?: (phase: string) => void;
  onProgress?: (progress: number) => void;
}

async function ghFetch<T>(
  path: string,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${GITHUB_API}${path}`, { headers });

  if (res.status === 403) {
    const rateLimitReset = res.headers.get("X-RateLimit-Reset");
    if (rateLimitReset) {
      const resetTime = new Date(parseInt(rateLimitReset) * 1000);
      throw new Error(
        `GitHub API rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}. Add a GitHub token to increase limits.`
      );
    }
    throw new Error("GitHub API access forbidden. Check your token permissions.");
  }

  if (res.status === 404) {
    throw new Error("Repository not found. Check the owner/repo and ensure it's public.");
  }

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function buildFileTree(items: GitHubTreeResponse["tree"]): FileNode {
  const root: FileNode = {
    path: "",
    name: "/",
    type: "directory",
    size: 0,
    language: null,
    children: [],
  };

  // Create a map for fast directory lookups
  const dirMap = new Map<string, FileNode>();
  dirMap.set("", root);

  // Sort items so directories come before their children
  const sorted = [...items].sort((a, b) => a.path.localeCompare(b.path));

  for (const item of sorted) {
    const parts = item.path.split("/");
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");

    // Ensure parent directory exists
    let parent = dirMap.get(parentPath);
    if (!parent) {
      // Create intermediate directories
      let currentPath = "";
      for (let i = 0; i < parts.length - 1; i++) {
        const nextPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        if (!dirMap.has(nextPath)) {
          const dir: FileNode = {
            path: nextPath,
            name: parts[i],
            type: "directory",
            size: 0,
            language: null,
            children: [],
          };
          const p = dirMap.get(currentPath);
          p?.children?.push(dir);
          dirMap.set(nextPath, dir);
        }
        currentPath = nextPath;
      }
      parent = dirMap.get(parentPath);
      if (!parent) continue; // Skip items with unresolvable parents
    }

    if (item.type === "blob") {
      const fileNode: FileNode = {
        path: item.path,
        name,
        type: "file",
        size: item.size || 1,
        language: detectLanguage(name),
      };
      parent.children?.push(fileNode);
    } else if (item.type === "tree") {
      if (!dirMap.has(item.path)) {
        const dirNode: FileNode = {
          path: item.path,
          name,
          type: "directory",
          size: 0,
          language: null,
          children: [],
        };
        parent.children?.push(dirNode);
        dirMap.set(item.path, dirNode);
      }
    }
  }

  // Calculate directory sizes bottom-up
  function calcSize(node: FileNode): number {
    if (node.type === "file") return node.size;
    let total = 0;
    for (const child of node.children || []) {
      total += calcSize(child);
    }
    node.size = total;
    return total;
  }
  calcSize(root);

  return root;
}

export async function fetchRepoData(
  owner: string,
  repo: string,
  opts: FetchOptions = {}
): Promise<RepoData> {
  const { token, onPhase, onProgress } = opts;

  // Phase 1: Fetch repo metadata
  onPhase?.("fetching-repo");
  onProgress?.(0.1);
  const repoInfo = await ghFetch<GitHubRepoResponse>(
    `/repos/${owner}/${repo}`,
    token
  );

  // Phase 2: Fetch the full file tree
  onPhase?.("fetching-tree");
  onProgress?.(0.3);
  const treeData = await ghFetch<GitHubTreeResponse>(
    `/repos/${owner}/${repo}/git/trees/${repoInfo.default_branch}?recursive=1`,
    token
  );

  if (treeData.truncated) {
    // For very large repos, the tree API truncates. We still work with what we get.
    console.warn("Repository tree was truncated by GitHub API. Some files may be missing.");
  }

  // Phase 3: Build the file tree
  onPhase?.("building-layout");
  onProgress?.(0.5);
  const tree = buildFileTree(treeData.tree);

  // Phase 4: Compute language distribution
  onPhase?.("fetching-languages");
  onProgress?.(0.6);
  const languages: Record<string, number> = {};
  let totalFiles = 0;

  function countLanguages(node: FileNode) {
    if (node.type === "file") {
      totalFiles++;
      if (node.language) {
        languages[node.language] = (languages[node.language] || 0) + node.size;
      }
    }
    node.children?.forEach(countLanguages);
  }
  countLanguages(tree);

  onProgress?.(1.0);

  return {
    owner,
    repo,
    defaultBranch: repoInfo.default_branch,
    totalSize: tree.size,
    totalFiles,
    languages,
    tree,
    truncated: treeData.truncated,
    fetchedAt: Date.now(),
  };
}

// Parse "owner/repo" or GitHub URL into components
export function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();

  // Try URL format: https://github.com/owner/repo
  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };
  }

  // Try owner/repo format
  const slashMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slashMatch) {
    return { owner: slashMatch[1], repo: slashMatch[2] };
  }

  return null;
}
