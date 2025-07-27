import RSSParser from "rss-parser";
import type { FeedItem } from "./types";
import { parallelLimit } from "./performance";

/**
 * Fetch items from a single RSS feed
 * @param {string} url - RSS feed URL
 * @param {number} limit - Maximum number of items to fetch
 * @returns {Promise<FeedItem[]>} Array of feed items
 */
export async function fetchFeedItems(url: string, limit = 5): Promise<FeedItem[]> {
  try {
    const parser = new RSSParser();
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, limit);
  } catch {
    throw new Error(`Invalid RSS source: ${url}`);
  }
}

/**
 * Fetch items from multiple RSS feeds in parallel
 * @param {string[]} urls - Array of RSS feed URLs
 * @param {number} limit - Maximum number of items per feed
 * @returns {Promise<{url: string, items: FeedItem[]}[]>} Array of feed results
 */
export async function fetchAllFeeds(urls: string[], limit = 5): Promise<{ url: string; items: FeedItem[] }[]> {
  const fetchFeed = async (url: string) => {
    try {
      const items = await fetchFeedItems(url, limit);
      return { url, items };
    } catch (error) {
      console.error(`Failed to fetch ${url}: ${error}`);
      return { url, items: [] };
    }
  };

  return parallelLimit(urls, fetchFeed, 10);
}