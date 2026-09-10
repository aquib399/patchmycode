import { Schema, Type } from "@google/genai";

export interface FileSummary {
  path: string;
  summary: string;
}

export interface ReviewIssue {
  path: string;
  line: number;
  severity: "CRITICAL" | "WARNING" | "NOTE";
  category:
    "BUG" | "BREAKING_CHANGE" | "SECURITY" | "PERFORMANCE" | "CODE_SMELL";
  comment: string;
  suggestion?: string;
}

export interface PRReviewOutput {
  verdict: "APPROVE" | "REQUEST_CHANGES" | "COMMENT";
  overallSummary: string;
  fileSummaries: FileSummary[];
  issues: ReviewIssue[];
}

export const prReviewResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verdict: {
      type: Type.STRING,
      enum: ["APPROVE", "REQUEST_CHANGES", "COMMENT"]
    },
    overallSummary: {
      type: Type.STRING
    },
    fileSummaries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING },
          summary: { type: Type.STRING }
        },
        required: ["path", "summary"]
      }
    },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING },
          line: { type: Type.INTEGER },
          severity: {
            type: Type.STRING,
            enum: ["CRITICAL", "WARNING", "NOTE"]
          },
          category: {
            type: Type.STRING,
            enum: [
              "BUG",
              "BREAKING_CHANGE",
              "SECURITY",
              "PERFORMANCE",
              "CODE_SMELL"
            ]
          },
          comment: { type: Type.STRING },
          suggestion: { type: Type.STRING }
        },
        required: ["path", "line", "severity", "category", "comment"]
      }
    }
  },
  required: ["verdict", "overallSummary", "fileSummaries", "issues"]
};
