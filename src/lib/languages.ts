import type { BiomeConfig } from "./types";

// Language → Biome color mapping
// Colors are intentionally bright and saturated so they're visible in 3D
// "base" = lower/shadow color, "accent" = top/highlight color
const LANGUAGE_BIOMES: Record<string, BiomeConfig> = {
  // Forests (green family) — mainstream languages
  JavaScript: { base: "#3b7a1a", accent: "#66e33a", name: "Deciduous Forest" },
  TypeScript: { base: "#1a7a52", accent: "#34eaaa", name: "Evergreen Forest" },
  // Deserts (warm family) — systems languages
  Rust: { base: "#c45a20", accent: "#ff8844", name: "Red Desert" },
  C: { base: "#b86830", accent: "#ffaa55", name: "Canyon" },
  "C++": { base: "#a84a22", accent: "#ff7733", name: "Mesa" },
  Go: { base: "#8a6a3a", accent: "#ffcc44", name: "Sandstone" },
  // Ocean (blue family) — data/scripting languages
  Python: { base: "#2a6ab0", accent: "#66bbff", name: "Deep Ocean" },
  Ruby: { base: "#aa3388", accent: "#ff66cc", name: "Coral Reef" },
  // Tundra (cool family) — JVM languages
  Java: { base: "#5a6a88", accent: "#aabbdd", name: "Tundra" },
  Kotlin: { base: "#6a55aa", accent: "#b89aff", name: "Alpine" },
  Scala: { base: "#4455aa", accent: "#8899ff", name: "Glacier" },
  // Savanna (warm earth) — web/markup
  HTML: { base: "#bb6622", accent: "#ffaa22", name: "Savanna" },
  CSS: { base: "#7744bb", accent: "#cc88ff", name: "Lavender Fields" },
  SCSS: { base: "#8833aa", accent: "#dd66ff", name: "Amethyst Caves" },
  // Wetlands (murky green) — shell/config
  Shell: { base: "#338833", accent: "#66ee88", name: "Wetlands" },
  Dockerfile: { base: "#2a8877", accent: "#55eebb", name: "Mangrove" },
  // Volcanic (dark/red) — low-level
  Assembly: { base: "#aa2222", accent: "#ff5555", name: "Volcanic" },
  // Meadow (bright) — functional
  Haskell: { base: "#6633aa", accent: "#bb77ff", name: "Enchanted Forest" },
  Elixir: { base: "#7722bb", accent: "#bb55ff", name: "Crystal Caves" },
  Clojure: { base: "#228855", accent: "#44dd88", name: "Moss Garden" },
  // Prairie
  Swift: { base: "#cc5500", accent: "#ff8833", name: "Prairie" },
  "Objective-C": { base: "#aa8800", accent: "#eebb22", name: "Steppe" },
  // Other
  PHP: { base: "#6633bb", accent: "#9966ff", name: "Twilight Zone" },
  Lua: { base: "#2255bb", accent: "#4488ff", name: "Moonlit Lake" },
  Vue: { base: "#2a8866", accent: "#44ddaa", name: "Spring Valley" },
  Dart: { base: "#2277aa", accent: "#33bbee", name: "Oasis" },
  Markdown: { base: "#556677", accent: "#99aabb", name: "Flatlands" },
  JSON: { base: "#7a6633", accent: "#ccaa44", name: "Sandbed" },
  YAML: { base: "#446677", accent: "#66aacc", name: "Slate" },
  XML: { base: "#886633", accent: "#cc9944", name: "Quarry" },
  Config: { base: "#555560", accent: "#9999a5", name: "Gravel" },
  Text: { base: "#4a4a52", accent: "#8888aa", name: "Plains" },
};

const DEFAULT_BIOME: BiomeConfig = {
  base: "#3a3a42",
  accent: "#7a7a88",
  name: "Other",
};

export function getBiome(language: string | null): BiomeConfig {
  if (!language) return DEFAULT_BIOME;
  return LANGUAGE_BIOMES[language] || DEFAULT_BIOME;
}

export function getAllBiomes(): Record<string, BiomeConfig> {
  return LANGUAGE_BIOMES;
}

// Detect language from file extension
const EXT_TO_LANGUAGE: Record<string, string> = {
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  py: "Python",
  rb: "Ruby",
  rs: "Rust",
  go: "Go",
  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",
  scala: "Scala",
  c: "C",
  h: "C",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  hpp: "C++",
  cs: "C#",
  swift: "Swift",
  m: "Objective-C",
  mm: "Objective-C",
  php: "PHP",
  lua: "Lua",
  ex: "Elixir",
  exs: "Elixir",
  hs: "Haskell",
  clj: "Clojure",
  cljs: "Clojure",
  dart: "Dart",
  vue: "Vue",
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "SCSS",
  less: "CSS",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  fish: "Shell",
  asm: "Assembly",
  s: "Assembly",
  md: "Markdown",
  mdx: "Markdown",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "YAML",
  ini: "Config",
  cfg: "Config",
  conf: "Config",
  env: "Config",
  properties: "Config",
  editorconfig: "Config",
  prettierrc: "Config",
  eslintrc: "Config",
  babelrc: "Config",
  lock: "Config",
  xml: "XML",
  svg: "XML",
  plist: "XML",
  txt: "Text",
  log: "Text",
  csv: "Text",
  rst: "Text",
  gitignore: "Config",
  npmignore: "Config",
  dockerignore: "Config",
  dockerfile: "Dockerfile",
  snap: "JavaScript",
  map: "JSON",
  flow: "JavaScript",
};

// Well-known extensionless filenames
const KNOWN_FILENAMES: Record<string, string> = {
  makefile: "Shell",
  gemfile: "Ruby",
  rakefile: "Ruby",
  license: "Text",
  licence: "Text",
  readme: "Markdown",
  changelog: "Markdown",
  authors: "Text",
  contributing: "Markdown",
  ".gitignore": "Config",
  ".npmignore": "Config",
  ".eslintrc": "Config",
  ".prettierrc": "Config",
  ".babelrc": "Config",
  ".editorconfig": "Config",
  ".flowconfig": "Config",
  ".nvmrc": "Config",
  ".gitattributes": "Config",
  "package-lock.json": "JSON",
  "yarn.lock": "Config",
  "tsconfig.json": "JSON",
  "jest.config.js": "JavaScript",
  "webpack.config.js": "JavaScript",
  "rollup.config.js": "JavaScript",
};

export function detectLanguage(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (lower === "dockerfile" || lower.startsWith("dockerfile."))
    return "Dockerfile";

  // Check known filenames first
  const knownMatch = KNOWN_FILENAMES[lower];
  if (knownMatch) return knownMatch;

  // Check by extension
  const ext = lower.split(".").pop();
  if (!ext) return null;

  // Handle dotfiles like .eslintrc.json — try the last extension
  const result = EXT_TO_LANGUAGE[ext];
  if (result) return result;

  // Try the full filename for dotfiles (e.g., ".prettierrc" → Config)
  if (lower.startsWith(".")) {
    return "Config";
  }

  return null;
}
