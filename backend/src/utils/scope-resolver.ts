import { getLanguageConfig } from "./parser-registry.js";
import Parser from "tree-sitter";

export interface ResolvedSymbol {
  name: string;
  type: string;
  startLine: number; // 1-indexed
  endLine: number;
  source: string;
}

const parserCache = new Map<string, Parser>();

function getParserForExt(ext: string): Parser | null {
  const config = getLanguageConfig(ext);
  if (!config) return null;

  let parser = parserCache.get(ext);
  if (!parser) {
    parser = new Parser();
    parser.setLanguage(config.language);
    parserCache.set(ext, parser);
  }
  return parser;
}

export function parseFile(
  filePath: string,
  content: string
): Parser.Tree | null {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const parser = getParserForExt(ext);
  return parser ? parser.parse(content) : null;
}

function extractSymbolName(node: Parser.SyntaxNode): string | null {
  const nameField = node.childForFieldName("name");
  if (nameField) return nameField.text;

  // const foo = () => {} / const foo = function () {}
  const parent = node.parent;
  if (
    parent?.type === "variable_declarator" ||
    parent?.type === "assignment_expression"
  ) {
    const lhs =
      parent.childForFieldName("name") || parent.childForFieldName("left");
    if (lhs) return lhs.text;
  }

  // { foo: () => {} } / { foo() {} }
  if (parent?.type === "pair" || parent?.type === "pair_pattern") {
    const key = parent.childForFieldName("key");
    if (key) return key.text;
  }

  return null;
}

export function getEnclosingSymbol(
  tree: Parser.Tree,
  filePath: string,
  lineNumber: number // 1-indexed
): ResolvedSymbol | null {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const config = getLanguageConfig(ext);
  if (!config) return null;

  let node: Parser.SyntaxNode | null = tree.rootNode.descendantForPosition({
    row: lineNumber - 1,
    column: 0
  });

  while (node) {
    if (config.symbolNodeTypes.has(node.type)) {
      const name = extractSymbolName(node);
      if (name) {
        return {
          name,
          type: node.type,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          source: node.text
        };
      }
    }
    node = node.parent;
  }
  return null;
}
