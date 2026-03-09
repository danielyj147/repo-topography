"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "repo-topo-gh-token";

export function useGitHubToken(): [string, (token: string) => void] {
  const [token, setTokenState] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setTokenState(stored);
  }, []);

  const setToken = (t: string) => {
    setTokenState(t);
    if (t) {
      localStorage.setItem(STORAGE_KEY, t);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return [token, setToken];
}

interface TokenInputProps {
  token: string;
  onTokenChange: (token: string) => void;
}

export function TokenInput({ token, onTokenChange }: TokenInputProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(token);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
        {token ? "Token set" : "Add GitHub token for higher rate limits"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 animate-fade-in">
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ghp_..."
        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/50 w-48 font-mono"
        autoFocus
      />
      <button
        onClick={() => {
          onTokenChange(value);
          setEditing(false);
        }}
        className="text-xs text-indigo-400 hover:text-indigo-300"
      >
        Save
      </button>
      <button
        onClick={() => {
          setValue(token);
          setEditing(false);
        }}
        className="text-xs text-gray-500 hover:text-gray-400"
      >
        Cancel
      </button>
    </div>
  );
}
