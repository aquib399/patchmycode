import { Octokit } from "@octokit/rest";
import parseDiff from "parse-diff";

export interface BlastRadiusReference {
  symbol: string;
  sourceFile: string;
  referencingFiles: string[];
}

const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  // JavaScript / TypeScript
  js: [
    /(?:export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface)\s+)([a-zA-Z0-9_$]+)/
  ],
  ts: [
    /(?:export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface)\s+)([a-zA-Z0-9_$]+)/
  ],
  jsx: [
    /(?:export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+)([a-zA-Z0-9_$]+)/
  ],
  tsx: [
    /(?:export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface)\s+)([a-zA-Z0-9_$]+)/
  ],

  // Python
  py: [/^(?:def|class)\s+([a-zA-Z0-9_]+)/],

  // Go
  go: [
    /^func\s+(?:\([^)]+\)\s+)?([A-Z][a-zA-Z0-9_]*)/,
    /^type\s+([A-Z][a-zA-Z0-9_]*)\s+(?:struct|interface)/
  ],

  // Rust
  rs: [/pub\s+(?:async\s+)?(?:fn|struct|enum|trait|type)\s+([a-zA-Z0-9_]+)/],

  // Java / Kotlin / C#
  java: [
    /(?:public|protected)\s+(?:static\s+)?(?:class|interface|enum|record|[\w<>[\]]+)\s+([a-zA-Z0-9_]+)\s*[\(\{]/
  ],
  cs: [
    /(?:public|protected)\s+(?:static\s+)?(?:class|interface|struct|record|[\w<>[\]]+)\s+([a-zA-Z0-9_]+)\s*[\(\{]/
  ],
  kt: [/(?:public\s+)?(?:fun|class|interface|object)\s+([a-zA-Z0-9_]+)/],

  // C / C++
  c: [/^(?:[a-zA-Z0-9_*]+\s+)+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/],
  cpp: [
    /^(?:[a-zA-Z0-9_*<>]+\s+)+(?:class|struct\s+)?([a-zA-Z0-9_]+)\s*[\(\{]/
  ],
  h: [/^(?:[a-zA-Z0-9_*<>]+\s+)+([a-zA-Z0-9_]+)\s*[\(\{;]/],
  hpp: [/^(?:[a-zA-Z0-9_*<>]+\s+)+([a-zA-Z0-9_]+)\s*[\(\{;]/],

  // Ruby
  rb: [/^\s*(?:def|class|module)\s+([a-zA-Z0-9_]+)/],

  // PHP
  php: [
    /(?:public\s+)?(?:static\s+)?function\s+([a-zA-Z0-9_]+)/,
    /(?:class|interface|trait)\s+([a-zA-Z0-9_]+)/
  ]
};

const UNIVERSAL_FALLBACK: RegExp[] = [
  /(?:export|pub|public)?\s*(?:def|fn|func|function|class|interface|struct)\s+([a-zA-Z0-9_]+)/
];

export function extractModifiedSymbols(
  files: parseDiff.File[]
): Map<string, string> {
  const symbolToFile = new Map<string, string>();

  for (const file of files) {
    const filePath = file.to || file.from || "";
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const patterns = LANGUAGE_PATTERNS[ext] || UNIVERSAL_FALLBACK;

    for (const chunk of file.chunks) {
      for (const change of chunk.changes) {
        if (change.type !== "add" && change.type !== "del") continue;

        const line = change.content.trim();
        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            symbolToFile.set(match[1], filePath);
            break;
          }
        }
      }
    }
  }

  return symbolToFile;
}

export async function analyzeBlastRadius(
  octokit: Octokit,
  owner: string,
  repo: string,
  parsedFiles: parseDiff.File[]
): Promise<BlastRadiusReference[]> {
  const symbols = extractModifiedSymbols(parsedFiles);
  const results: BlastRadiusReference[] = [];

  for (const [symbol, sourceFile] of symbols.entries()) {
    try {
      const { data } = await octokit.rest.search.code({
        q: `${symbol} repo:${owner}/${repo}`
      });

      const referencingFiles = data.items
        .map((item) => item.path)
        .filter((path) => path !== sourceFile);

      if (referencingFiles.length > 0) {
        results.push({
          symbol,
          sourceFile,
          referencingFiles
        });
      }
    } catch (err) {
      console.warn(`[Blast Radius] Search failed for symbol "${symbol}":`, err);
    }
  }

  return results;
}
