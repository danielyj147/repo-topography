import type { FileNode, TerrainNode, TerrainData, LayoutRect } from "./types";

// Squarified treemap algorithm
// Maps directory structure into 2D rectangular regions that become terrain

interface WeightedItem {
  node: FileNode;
  weight: number;
}

function squarify(
  items: WeightedItem[],
  rect: LayoutRect,
  depth: number,
  maxElevation: number
): TerrainNode[] {
  if (items.length === 0) return [];

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return [];

  const nodes: TerrainNode[] = [];
  const remaining = [...items];

  let currentRect = { ...rect };
  let remainingWeight = totalWeight;

  while (remaining.length > 0) {
    const row: WeightedItem[] = [];
    const isHorizontal = currentRect.width >= currentRect.height;
    const side = isHorizontal ? currentRect.height : currentRect.width;

    // Try adding items to the row until aspect ratio worsens
    let rowWeight = 0;
    let bestAspect = Infinity;

    while (remaining.length > 0) {
      const next = remaining[0];
      const testWeight = rowWeight + next.weight;
      const rowFraction = remainingWeight > 0 ? testWeight / remainingWeight : 0;
      const rowSize = side > 0 ? rowFraction * (isHorizontal ? currentRect.width : currentRect.height) : 0;

      // Calculate worst aspect ratio in the row (avoid array spread)
      let worstAspect = 0;
      for (let ri = 0; ri <= row.length; ri++) {
        const item = ri < row.length ? row[ri] : next;
        const itemFraction = rowSize > 0 ? (item.weight / testWeight) * side : 0;
        const aspect =
          rowSize > 0 && itemFraction > 0
            ? Math.max(rowSize / itemFraction, itemFraction / rowSize)
            : Infinity;
        worstAspect = Math.max(worstAspect, aspect);
      }

      if (row.length > 0 && worstAspect > bestAspect) {
        break;
      }

      row.push(remaining.shift()!);
      rowWeight = testWeight;
      bestAspect = worstAspect;

      if (row.length >= remaining.length + row.length) break;
    }

    // Layout the row (remainingWeight still includes row items here)
    const rowFraction = remainingWeight > 0 ? rowWeight / remainingWeight : 1;
    const rowSize = isHorizontal
      ? rowFraction * currentRect.width
      : rowFraction * currentRect.height;

    let offset = 0;
    for (const item of row) {
      const itemFraction = rowWeight > 0 ? item.weight / rowWeight : 1 / row.length;
      const itemSize = itemFraction * side;

      const itemRect: LayoutRect = isHorizontal
        ? {
            x: currentRect.x,
            y: currentRect.y + offset,
            width: rowSize,
            height: itemSize,
          }
        : {
            x: currentRect.x + offset,
            y: currentRect.y,
            width: itemSize,
            height: rowSize,
          };

      // Normalize elevation: file size relative to max
      // Use cube root for better distribution — prevents one giant file from
      // flattening everything else, while maintaining clear height differences
      const elevation = maxElevation > 0
        ? Math.pow(item.node.size / maxElevation, 0.4)
        : 0;

      const terrainNode: TerrainNode = {
        path: item.node.path,
        name: item.node.name,
        type: item.node.type,
        rect: itemRect,
        depth,
        size: item.node.size,
        language: item.node.language,
        elevation: Math.min(elevation, 1),
        heat: 0.5, // Default; enriched later with commit data
      };

      if (item.node.type === "directory" && item.node.children?.length) {
        // Add padding for directory boundaries (creates visual valleys)
        const padding = Math.max(0.2, 1.0 - depth * 0.15);
        const innerRect: LayoutRect = {
          x: itemRect.x + padding,
          y: itemRect.y + padding,
          width: Math.max(0.1, itemRect.width - padding * 2),
          height: Math.max(0.1, itemRect.height - padding * 2),
        };

        const childItems: WeightedItem[] = item.node.children
          .filter((c) => c.size > 0 || c.type === "directory")
          .map((c) => ({
            node: c,
            weight: Math.max(c.size, 1),
          }))
          .sort((a, b) => b.weight - a.weight);

        terrainNode.children = squarify(childItems, innerRect, depth + 1, maxElevation);
      }

      nodes.push(terrainNode);
      offset += itemSize;
    }

    // Subtract consumed weight
    remainingWeight -= rowWeight;

    // Update remaining rect
    if (isHorizontal) {
      currentRect = {
        x: currentRect.x + rowSize,
        y: currentRect.y,
        width: currentRect.width - rowSize,
        height: currentRect.height,
      };
    } else {
      currentRect = {
        x: currentRect.x,
        y: currentRect.y + rowSize,
        width: currentRect.width,
        height: currentRect.height - rowSize,
      };
    }
  }

  return nodes;
}

function flattenNodes(nodes: TerrainNode[]): TerrainNode[] {
  const result: TerrainNode[] = [];
  function walk(node: TerrainNode) {
    if (node.type === "file") {
      result.push(node);
    }
    node.children?.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

function findMaxFileSize(node: FileNode): number {
  if (node.type === "file") return node.size;
  let max = 0;
  for (const child of node.children || []) {
    max = Math.max(max, findMaxFileSize(child));
  }
  return max;
}

function countMaxDepth(nodes: TerrainNode[], current = 0): number {
  let max = current;
  for (const node of nodes) {
    if (node.children) {
      max = Math.max(max, countMaxDepth(node.children, current + 1));
    } else {
      max = Math.max(max, current);
    }
  }
  return max;
}

// Set language for directories based on majority child language
function propagateLanguages(node: FileNode): string | null {
  if (node.type === "file") return node.language;

  const langCounts: Record<string, number> = {};
  for (const child of node.children || []) {
    const lang = propagateLanguages(child);
    if (lang) {
      langCounts[lang] = (langCounts[lang] || 0) + child.size;
    }
  }

  const entries = Object.entries(langCounts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  node.language = entries[0][0];
  return node.language;
}

export function buildTerrainLayout(tree: FileNode): TerrainData {
  propagateLanguages(tree);

  const maxFileSize = findMaxFileSize(tree);

  // Scale the terrain based on total file count for good density
  const totalFiles = countFiles(tree);
  const scale = Math.sqrt(totalFiles) * 3 + 20;

  const bounds = { width: scale, height: scale };
  const rootRect: LayoutRect = { x: 0, y: 0, width: scale, height: scale };

  const topChildren = tree.children || [];
  const weightedItems: WeightedItem[] = topChildren
    .filter((c) => c.size > 0 || c.type === "directory")
    .map((c) => ({
      node: c,
      weight: Math.max(c.size, 1),
    }))
    .sort((a, b) => b.weight - a.weight);

  const nodes = squarify(weightedItems, rootRect, 0, maxFileSize);
  const flatNodes = flattenNodes(nodes);
  const maxDepth = countMaxDepth(nodes);

  return { nodes, flatNodes, bounds, maxDepth };
}

function countFiles(node: FileNode): number {
  if (node.type === "file") return 1;
  let count = 0;
  for (const child of node.children || []) {
    count += countFiles(child);
  }
  return count;
}
