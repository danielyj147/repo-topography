"use client";

import { create } from "zustand";
import type { AppState } from "./types";

export const useAppStore = create<AppState>((set) => ({
  repoInput: "",
  repoData: null,
  terrainData: null,
  loading: false,
  loadingPhase: "idle",
  loadingProgress: 0,
  error: null,
  hoveredNode: null,
  selectedNode: null,
  cameraTarget: null,
  showUI: true,

  setRepoInput: (input) => set({ repoInput: input }),
  setRepoData: (data) => set({ repoData: data }),
  setTerrainData: (data) => set({ terrainData: data }),
  setLoading: (loading) => set({ loading }),
  setLoadingPhase: (phase) => set({ loadingPhase: phase }),
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
  setError: (error) => set({ error }),
  setHoveredNode: (node) => set({ hoveredNode: node }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  setShowUI: (show) => set({ showUI: show }),

  reset: () =>
    set({
      repoData: null,
      terrainData: null,
      loading: false,
      loadingPhase: "idle",
      loadingProgress: 0,
      error: null,
      hoveredNode: null,
      selectedNode: null,
      cameraTarget: null,
    }),
}));
