import { NextRequest, NextResponse } from "next/server";
import { fetchRepoData, parseRepoInput } from "@/lib/github";

// Simple in-memory cache for server-side
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const input = searchParams.get("repo");
  const token = process.env.GITHUB_TOKEN;

  if (!input) {
    return NextResponse.json(
      { error: "Missing 'repo' parameter" },
      { status: 400 }
    );
  }

  const parsed = parseRepoInput(input);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid repository format. Use 'owner/repo' or a GitHub URL." },
      { status: 400 }
    );
  }

  const cacheKey = `${parsed.owner}/${parsed.repo}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    const data = await fetchRepoData(parsed.owner, parsed.repo, { token: token || undefined });

    // Store in cache
    cache.set(cacheKey, { data, timestamp: Date.now() });

    // Evict old entries if cache is too large
    if (cache.size > 50) {
      const oldest = [...cache.entries()].sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );
      for (let i = 0; i < 10; i++) {
        cache.delete(oldest[i][0]);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    const status = message.includes("rate limit")
      ? 429
      : message.includes("not found")
        ? 404
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
