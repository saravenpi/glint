import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const CACHE_DIR = path.join(os.homedir(), ".glint-cache");

/**
 * Article caching system to avoid re-processing same URLs
 */
export class ArticleCache {
  private cacheDir: string;

  constructor() {
    this.cacheDir = CACHE_DIR;
  }

  /**
   * Create MD5 hash of content
   * @param {string} content - Content to hash
   * @returns {string} MD5 hash
   */
  private hash(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  /**
   * Get cache file path for URL
   * @param {string} url - URL to get cache path for
   * @returns {string} Cache file path
   */
  private getCachePath(url: string): string {
    const urlHash = this.hash(url);
    return path.join(this.cacheDir, `${urlHash}.json`);
  }

  /**
   * Ensure cache directory exists
   * @returns {Promise<void>}
   */
  async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch {
    }
  }

  /**
   * Get cached article text if still valid
   * @param {string} url - Article URL
   * @returns {Promise<{text: string, timestamp: number} | null>} Cached data or null
   */
  async get(url: string): Promise<{ text: string; timestamp: number } | null> {
    try {
      const cachePath = this.getCachePath(url);
      const data = await fs.readFile(cachePath, "utf8");
      const cached = JSON.parse(data);
      
      if (Date.now() - cached.timestamp < 6 * 60 * 60 * 1000) {
        return cached;
      }
    } catch {
    }
    return null;
  }

  /**
   * Cache article text
   * @param {string} url - Article URL
   * @param {string} text - Article text
   * @returns {Promise<void>}
   */
  async set(url: string, text: string): Promise<void> {
    try {
      await this.ensureCacheDir();
      const cachePath = this.getCachePath(url);
      const data = { text, timestamp: Date.now() };
      await fs.writeFile(cachePath, JSON.stringify(data));
    } catch {
    }
  }

  /**
   * Remove cache files older than 24 hours
   * @returns {Promise<void>}
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      
      for (const file of files) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const data = JSON.parse(await fs.readFile(filePath, "utf8"));
          
          if (now - data.timestamp > 24 * 60 * 60 * 1000) {
            await fs.unlink(filePath);
          }
        } catch {
          
        }
      }
    } catch {
    }
  }
}