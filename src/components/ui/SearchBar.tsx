"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { parseRepoInput } from "@/lib/github";

const EXAMPLE_REPOS = [
  "facebook/react",
  "vercel/next.js",
  "denoland/deno",
  "rust-lang/rust",
  "sveltejs/svelte",
  "danielyj147/overwatch",
];

interface SearchBarProps {
  onSubmit: (owner: string, repo: string) => void;
}

export function SearchBar({ onSubmit }: SearchBarProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loading = useAppStore((s) => s.loading);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (value?: string) => {
      const v = value || input;
      const parsed = parseRepoInput(v);
      if (!parsed) {
        setError("Enter a valid repository: owner/repo or GitHub URL");
        return;
      }
      setError(null);
      onSubmit(parsed.owner, parsed.repo);
    },
    [input, onSubmit]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative transition-all duration-300 ${
          focused ? "scale-[1.02]" : ""
        }`}
      >
        <div
          className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${
            focused ? "shadow-lg shadow-indigo-500/10" : ""
          } ${error ? "border-red-500/30" : ""}`}
        >
          <div className="flex items-center px-5 py-4">
            <svg
              className="w-5 h-5 text-gray-500 mr-3 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="owner/repo or GitHub URL"
              className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-gray-500 font-light"
              disabled={loading}
            />
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !input.trim()}
              className="ml-3 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating
                </span>
              ) : (
                "Explore"
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-red-400 text-sm px-2 animate-fade-in">
            {error}
          </p>
        )}
      </div>

      {/* Example repos */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <span className="text-xs text-gray-600">Try:</span>
        {EXAMPLE_REPOS.map((repo) => (
          <button
            key={repo}
            onClick={() => {
              setInput(repo);
              handleSubmit(repo);
            }}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-indigo-400 transition-colors px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/30 disabled:opacity-50 font-mono"
          >
            {repo}
          </button>
        ))}
      </div>
    </div>
  );
}
