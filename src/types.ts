/**
 * Application configuration structure
 */
export interface Config {
  feeds: string[];
  outputDir?: string;
}

/**
 * RSS feed item structure
 */
export interface FeedItem {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
}

/**
 * Processed article with AI-generated markdown
 */
export interface ProcessedArticle {
  title: string;
  markdown: string;
  feedUrl: string;
  articleUrl: string;
}

/**
 * Source summary containing multiple articles from the same feed
 */
export interface SourceSummary {
  feedUrl: string;
  articles: ProcessedArticle[];
  summary: string;
}