import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { z } from "zod";
import type { Config } from "./types";

const CONFIG_PATH = path.join(os.homedir(), "glint.yml");

const configSchema = z.object({
  feeds: z.array(z.string()).nonempty(),
  outputDir: z.string().optional(),
});

/**
 * Parse YAML content into JavaScript object
 * @param {string} yamlContent - YAML content as string
 * @returns {any} Parsed object
 */
function parseYaml(yamlContent: string): any {
  const lines = yamlContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
  const result: any = {};
  let currentArray: string[] | null = null;
  let currentKey = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      if (currentArray) {
        currentArray.push(trimmed.substring(2).trim());
      }
    } else if (trimmed.includes(':')) {
      const [key, value] = trimmed.split(':', 2);
      const cleanKey = key.trim();
      const cleanValue = value?.trim();
      
      if (cleanValue) {
        result[cleanKey] = cleanValue.startsWith('"') ? cleanValue.slice(1, -1) : cleanValue;
      } else {
        currentKey = cleanKey;
        currentArray = [];
        result[cleanKey] = currentArray;
      }
    }
  }

  return result;
}

/**
 * Load and validate configuration from ~/glint.yml
 * @returns {Promise<Config>} Validated configuration object
 */
export async function loadConfig(): Promise<Config> {
  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const parsed = parseYaml(raw);
  return configSchema.parse(parsed);
}

/**
 * Resolve output directory path with home directory expansion
 * @param {Config} config - Configuration object
 * @returns {string} Absolute path to output directory
 */
export function resolveOutputDir(config: Config): string {
  const outputDir = config.outputDir ?? "~/glint";
  return path.resolve(outputDir.replace(/^~/, os.homedir()));
}