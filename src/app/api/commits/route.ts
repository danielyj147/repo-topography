import { NextRequest, NextResponse } from "next/server";

const GITHUB_API = "https://api.github.com";

interface CommitActivity {
  path: string;
  commits: number;
  lastCommit: string;
}

// Fetch recent commit activity for files in a repo
// Uses the commits API with path filter (more rate-limit friendly than per-file)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const token = searchParams.get("token") || process.env.GITHUB_TOKEN;

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Missing owner or repo parameter" },
      { status: 400 }
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    // Fetch recent commits (last 100) to build activity heatmap
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=100`,
      { headers }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `GitHub API error: ${res.status}` },
        { status: res.status }
      );
    }

    const commits = await res.json();

    // Count file touches from commit messages isn't possible without
    // fetching each commit's files. Instead, we'll use the stats from
    // a smaller set.
    // For rate-limit efficiency, fetch details for top 20 commits
    const fileActivity: Record<string, { commits: number; lastCommit: string }> = {};

    const detailPromises = commits.slice(0, 20).map(async (commit: any) => {
      try {
        const detailRes = await fetch(commit.url, { headers });
        if (!detailRes.ok) return null;
        const detail = await detailRes.json();
        return detail.files || [];
      } catch {
        return null;
      }
    });

    const allFiles = await Promise.all(detailPromises);

    for (let i = 0; i < allFiles.length; i++) {
      const files = allFiles[i];
      if (!files) continue;
      const commitDate = commits[i]?.commit?.author?.date || "";

      for (const file of files) {
        if (!fileActivity[file.filename]) {
          fileActivity[file.filename] = { commits: 0, lastCommit: commitDate };
        }
        fileActivity[file.filename].commits++;
        // Keep the most recent commit date
        if (commitDate > fileActivity[file.filename].lastCommit) {
          fileActivity[file.filename].lastCommit = commitDate;
        }
      }
    }

    const activity: CommitActivity[] = Object.entries(fileActivity).map(
      ([path, data]) => ({
        path,
        commits: data.commits,
        lastCommit: data.lastCommit,
      })
    );

    return NextResponse.json({ activity });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
