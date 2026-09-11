import { parseFile, getEnclosingSymbol } from "./scope-resolver.js";
import { findSymbolCallers, CallerReference } from "./scanner.js";
import parseDiff from "parse-diff";
import fs from "node:fs/promises";
import path from "node:path";
export interface ModifiedSymbol {
  name: string;
  file: string;
  startLine: number;
  endLine: number;
  source: string;
}

export interface BlastRadiusNode {
  symbol: string;
  file: string;
  startLine: number;
  endLine: number;
  source: string;
  depth: number;
  callers: BlastRadiusNode[];
}

const MAX_DEPTH = 2;
const MAX_TOTAL_NODES = 100;
const MAX_CALLERS_PER_SYMBOL = 15;

export async function extractModifiedSymbols(
  repoDir: string,
  files: parseDiff.File[]
): Promise<ModifiedSymbol[]> {
  const seen = new Set<string>();
  const results: ModifiedSymbol[] = [];

  for (const file of files) {
    const filePath = file.to || file.from;
    if (!filePath || filePath === "/dev/null") continue;

    const changedLines = new Set<number>();
    for (const chunk of file.chunks) {
      const chunkAnchor = Math.max(1, chunk.newStart); // fallback anchor for pure deletions
      for (const change of chunk.changes) {
        if (change.type === "add") changedLines.add(change.ln);
        else if (change.type === "del") changedLines.add(chunkAnchor); // deleted line has no position in the new file
      }
    }
    if (changedLines.size === 0) continue;

    let content: string;
    try {
      content = await fs.readFile(path.join(repoDir, filePath), "utf-8");
    } catch {
      continue;
    }

    const tree = parseFile(filePath, content);
    if (!tree) continue; // unsupported extension - old regex path could be kept as a fallback here for .kt etc.

    for (const lineNumber of changedLines) {
      const symbol = getEnclosingSymbol(tree, filePath, lineNumber);
      if (!symbol) continue;

      const key = `${filePath}::${symbol.name}::${symbol.startLine}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        name: symbol.name,
        file: filePath,
        startLine: symbol.startLine,
        endLine: symbol.endLine,
        source: symbol.source
      });
    }
  }

  return results;
}

export async function analyzeBlastRadius(
  repoDir: string,
  parsedFiles: parseDiff.File[]
): Promise<BlastRadiusNode[]> {
  const modifiedSymbols = await extractModifiedSymbols(repoDir, parsedFiles);

  const visited = new Set<string>();
  let totalNodes = 0;

  async function buildNode(
    name: string,
    file: string,
    startLine: number,
    endLine: number,
    source: string,
    depth: number
  ): Promise<BlastRadiusNode | null> {
    const key = `${file}::${name}::${startLine}`;
    if (visited.has(key) || totalNodes >= MAX_TOTAL_NODES) return null;
    visited.add(key);
    totalNodes++;

    const node: BlastRadiusNode = {
      symbol: name,
      file,
      startLine,
      endLine,
      source,
      depth,
      callers: []
    };
    if (depth >= MAX_DEPTH) return node;

    let callers: CallerReference[];
    try {
      callers = await findSymbolCallers(
        repoDir,
        name,
        file,
        MAX_CALLERS_PER_SYMBOL
      );
    } catch (err) {
      console.warn(`[Blast Radius] Caller search failed for "${name}":`, err);
      return node;
    }

    for (const caller of callers) {
      if (totalNodes >= MAX_TOTAL_NODES) break;

      if (caller.enclosingSymbol) {
        const child = await buildNode(
          caller.enclosingSymbol.name,
          caller.file,
          caller.enclosingSymbol.startLine,
          caller.enclosingSymbol.endLine,
          caller.enclosingSymbol.source,
          depth + 1
        );
        if (child) node.callers.push(child);
      } else {
        const topLevelKey = `${caller.file}::__top_level__::${caller.line}`;
        if (!visited.has(topLevelKey) && totalNodes < MAX_TOTAL_NODES) {
          visited.add(topLevelKey);
          totalNodes++;
          node.callers.push({
            symbol: "(top-level)",
            file: caller.file,
            startLine: caller.line,
            endLine: caller.line,
            source: caller.snippet,
            depth: depth + 1,
            callers: []
          });
        }
      }
    }

    return node;
  }

  const results: BlastRadiusNode[] = [];
  for (const symbol of modifiedSymbols) {
    if (totalNodes >= MAX_TOTAL_NODES) break;
    const node = await buildNode(
      symbol.name,
      symbol.file,
      symbol.startLine,
      symbol.endLine,
      symbol.source,
      0
    );
    if (node) results.push(node);
  }

  return results;
}
