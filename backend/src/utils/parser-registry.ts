import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import JavaScript from "tree-sitter-javascript";
import Python from "tree-sitter-python";
import Go from "tree-sitter-go";
import Rust from "tree-sitter-rust";
import Java from "tree-sitter-java";
import C from "tree-sitter-c";
import Cpp from "tree-sitter-cpp";
import Ruby from "tree-sitter-ruby";
import Php from "tree-sitter-php";

export interface LanguageConfig {
  language: Parser.Language;
  symbolNodeTypes: Set<string>;
}

const JS_TS_SYMBOL_TYPES = new Set([
  "function_declaration",
  "method_definition",
  "arrow_function",
  "function_expression",
  "class_declaration"
]);

// NOTE: verify these export shapes against the exact package versions you install —
// tree-sitter-typescript exports .typescript/.tsx, tree-sitter-php exports .php, etc.
// These have changed across major versions.
const CONFIG: Record<string, LanguageConfig> = {
  ts: {
    language: TypeScript.typescript,
    symbolNodeTypes: new Set([
      ...JS_TS_SYMBOL_TYPES,
      "interface_declaration",
      "type_alias_declaration"
    ])
  },
  tsx: {
    language: TypeScript.tsx,
    symbolNodeTypes: new Set([
      ...JS_TS_SYMBOL_TYPES,
      "interface_declaration",
      "type_alias_declaration"
    ])
  },
  js: { language: JavaScript, symbolNodeTypes: JS_TS_SYMBOL_TYPES },
  jsx: { language: JavaScript, symbolNodeTypes: JS_TS_SYMBOL_TYPES },
  py: {
    language: Python,
    symbolNodeTypes: new Set(["function_definition", "class_definition"])
  },
  go: {
    language: Go,
    symbolNodeTypes: new Set(["function_declaration", "method_declaration"])
  },
  rs: {
    language: Rust,
    symbolNodeTypes: new Set(["function_item", "impl_item", "trait_item"])
  },
  java: {
    language: Java,
    symbolNodeTypes: new Set([
      "method_declaration",
      "constructor_declaration",
      "class_declaration",
      "interface_declaration"
    ])
  },
  c: { language: C, symbolNodeTypes: new Set(["function_definition"]) },
  h: { language: C, symbolNodeTypes: new Set(["function_definition"]) },
  cpp: {
    language: Cpp,
    symbolNodeTypes: new Set(["function_definition", "class_specifier"])
  },
  hpp: {
    language: Cpp,
    symbolNodeTypes: new Set(["function_definition", "class_specifier"])
  },
  rb: {
    language: Ruby,
    symbolNodeTypes: new Set(["method", "class", "module"])
  },
  php: {
    language: Php.php,
    symbolNodeTypes: new Set([
      "function_definition",
      "method_declaration",
      "class_declaration"
    ])
  }
};

export function getLanguageConfig(ext: string): LanguageConfig | null {
  return CONFIG[ext] ?? null;
}
