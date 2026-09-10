import fs from "node:fs/promises";
import path from "node:path";

export interface CallerSnippet {
  path: string;
  line: number;
  snippet: string;
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
): Promise<CallerSnippet[]> {
  const callers: CallerSnippet[] = [];
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

      try {
        const content = await fs.readFile(fullPath, "utf-8");
        if (!regex.test(content)) continue;

        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (callers.length >= maxMatches) break;

          if (regex.test(lines[i])) {
            const start = Math.max(0, i - 2);
            const end = Math.min(lines.length, i + 3);
            const snippet = lines.slice(start, end).join("\n");

            callers.push({
              path: relativePath,
              line: i + 1,
              snippet
            });
          }
        }
      } catch {
        // Skip unreadable or binary files
      }
    }
  }

  await walk(repoDir);
  return callers;
}
