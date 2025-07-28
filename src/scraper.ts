import { load as loadHTML } from "cheerio";
import { parallelLimit } from "./performance";
import { ArticleCache } from "./cache";

const cache = new ArticleCache();

/**
 * Fetch and extract text content from an article URL
 * @param {string} url - Article URL to scrape
 * @returns {Promise<string>} Extracted article text (max 8000 chars)
 */
export async function fetchArticleText(url: string): Promise<string> {
  const cached = await cache.get(url);
  if (cached) {
    return cached.text;
  }

  const res = await fetch(url, { 
    headers: { 'User-Agent': 'Glint/1.0' },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`Failed to fetch article: ${url}`);
  
  const html = await res.text();
  const $ = loadHTML(html);
  
  const text =
    $("article").text().trim() ||
    $("main").text().trim() ||
    $("body").text().trim();
    
  const cleanText = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  
  await cache.set(url, cleanText);
  
  return cleanText;
}

/**
 * Fetch text content from multiple article URLs in parallel
 * @param {string[]} urls - Array of article URLs
 * @returns {Promise<{url: string, text: string}[]>} Array of URL and text pairs
 */
export async function fetchAllArticles(urls: string[]): Promise<{ url: string; text: string }[]> {
  const fetchArticle = async (url: string) => {
    try {
      const text = await fetchArticleText(url);
      return { url, text };
    } catch (error) {
      console.error(`Failed to scrape ${url}: ${error}`);
      return { url, text: "" };
    }
  };

  return parallelLimit(urls, fetchArticle, 25);
}