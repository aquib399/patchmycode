import { parseFile, getEnclosingSymbol } from "./scope-resolver.js";
import fs from "node:fs/promises";
import path from "node:path";

export interface CallerReference {
  file: string;
  line: number;
  enclosingSymbol: {
    name: string;
    startLine: number;
    endLine: number;
    source: string;
  } | null;
  snippet: string; // fallback when the call site isn't inside any function (e.g. top-level wiring)
}

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "vendor",
  ".turbo"
]);
const IGNORED_EXTS = new Set([
  ".lock",
  ".json",
  ".map",
  ".min.js",
  ".min.css",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".tar.gz"
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findSymbolCallers(
  repoDir: string,
  symbol: string,
  sourceFile: string,
  maxMatches = 25
): Promise<CallerReference[]> {
  const callers: CallerReference[] = [];
  const regex = new RegExp(`\\b${escapeRegExp(symbol)}\\b`);
  const normalizedSource = path.normalize(sourceFile).replace(/^(\.\/|\/)/, "");

  async function walk(currentDir: string): Promise<void> {
    if (callers.length >= maxMatches) return;
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (callers.length >= maxMatches) break;

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path
        .relative(repoDir, fullPath)
        .split(path.sep)
        .join("/");

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          await walk(fullPath);
        }
        continue;
      }

      if (relativePath === normalizedSource) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (IGNORED_EXTS.has(ext)) continue;

      let content: string;
      try {
        content = await fs.readFile(fullPath, "utf-8");
      } catch {
        continue;
      }
      if (!regex.test(content)) continue;

      const tree = parseFile(relativePath, content);
      const lines = content.split("\n");

      for (let i = 0; i < lines.length && callers.length < maxMatches; i++) {
        if (!regex.test(lines[i])) continue;
        const lineNumber = i + 1;

        if (tree) {
          const col = lines[i].indexOf(symbol);
          const node = tree.rootNode.descendantForPosition({
            row: i,
            column: Math.max(col, 0)
          });
          if (node && (node.type === "comment" || node.type.includes("string")))
            continue; // not a real reference
        }

        const enclosing = tree
          ? getEnclosingSymbol(tree, relativePath, lineNumber)
          : null;

        if (enclosing) {
          const alreadyCaptured = callers.some(
            (c) =>
              c.file === relativePath &&
              c.enclosingSymbol?.name === enclosing.name &&
              c.enclosingSymbol?.startLine === enclosing.startLine
          );
          if (alreadyCaptured) continue; // don't re-add the same caller function for every matching line inside it

          callers.push({
            file: relativePath,
            line: lineNumber,
            enclosingSymbol: {
              name: enclosing.name,
              startLine: enclosing.startLine,
              endLine: enclosing.endLine,
              source: enclosing.source
            },
            snippet: ""
          });
        } else {
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 3);
          callers.push({
            file: relativePath,
            line: lineNumber,
            enclosingSymbol: null,
            snippet: lines.slice(start, end).join("\n")
          });
        }
      }
    }
  }

  await walk(repoDir);
  return callers;
}
