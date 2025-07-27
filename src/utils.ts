import fs from "node:fs/promises";
import path from "node:path";
import { parallelLimit } from "./performance";

/**
 * Convert article title to safe filename
 * @param {string} title - Article title
 * @returns {string} Safe filename with .md extension
 */
export function safeFileName(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) + ".md"
  );
}

/**
 * Get current date in ISO format (YYYY-MM-DD)
 * @returns {string} ISO date string
 */
export function getCurrentDateISO(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Ensure directory exists, creating it if necessary
 * @param {string} dirPath - Directory path to create
 * @returns {Promise<void>}
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Write content to a markdown file
 * @param {string} filePath - File path to write to
 * @param {string} content - Content to write
 * @returns {Promise<void>}
 */
export async function writeMarkdownFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, "utf8");
}

/**
 * Write multiple markdown files in parallel
 * @param {{path: string, content: string}[]} files - Array of file objects
 * @returns {Promise<void>}
 */
export async function writeBatchMarkdownFiles(files: { path: string; content: string }[]): Promise<void> {
  const writeFile = async (file: { path: string; content: string }) => {
    await fs.writeFile(file.path, file.content, "utf8");
  };

  await parallelLimit(files, writeFile, 20);
}