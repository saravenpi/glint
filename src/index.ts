import path from "node:path";

import { loadConfig, resolveOutputDir } from "./config";
import { fetchAllFeeds } from "./rss";
import { fetchAllArticles } from "./scraper";
import { AIProcessor } from "./ai";
import { 
  safeFileName, 
  getCurrentDateISO, 
  ensureDirectoryExists, 
  writeMarkdownFile,
  writeBatchMarkdownFiles 
} from "./utils";
import type { ProcessedArticle } from "./types";

/**
 * Main application function that orchestrates the entire news processing pipeline
 * @returns {Promise<void>}
 */
async function main() {
  const startTime = Date.now();
  
  const config = await loadConfig();
  const root = resolveOutputDir(config);
  const dateISO = getCurrentDateISO();
  
  if (!dateISO) process.exit(1);

  const reviewDir = path.join(root, dateISO);
  await ensureDirectoryExists(reviewDir);

  console.log(`🚀  Starting parallel processing of ${config.feeds.length} feeds...`);

  const feedResults = await fetchAllFeeds(config.feeds);
  const allArticles = feedResults.flatMap(({ url, items }) => 
    items.filter(item => item.link && item.title).map(item => ({
      url: item.link!,
      title: item.title!,
      feedUrl: url
    }))
  );

  console.log(`📰  Found ${allArticles.length} articles to process`);

  if (allArticles.length === 0) {
    console.log("No articles found");
    return;
  }

  const articleTexts = await fetchAllArticles(allArticles.map(a => a.url));
  const validArticles = allArticles.filter((_, i) => articleTexts[i] && articleTexts[i].text.length > 0);
  const validTexts = articleTexts.filter(t => t && t.text.length > 0);

  console.log(`📝  Successfully scraped ${validArticles.length} articles`);

  const aiProcessor = new AIProcessor();
  await aiProcessor.loadPrompt();

  console.log(`🤖  Processing with AI...`);
  const markdownResults = await aiProcessor.batchToMarkdown(validTexts.map(t => t.text));

  const filesToWrite: { path: string; content: string }[] = [];
  const processedArticles: ProcessedArticle[] = [];

  for (let i = 0; i < validArticles.length; i++) {
    const article = validArticles[i];
    const md = markdownResults[i];
    
    filesToWrite.push({
      path: path.join(reviewDir, safeFileName(article.title)),
      content: md
    });
    
    processedArticles.push({
      title: article.title,
      markdown: md,
      feedUrl: article.feedUrl
    });
  }

  console.log(`💾  Writing ${filesToWrite.length} files...`);
  await writeBatchMarkdownFiles(filesToWrite);

  if (processedArticles.length > 0) {
    console.log("📝  Generating daily summary...");
    try {
      const summary = await aiProcessor.generateSummary(processedArticles, dateISO);
      await writeMarkdownFile(
        path.join(reviewDir, "summary.md"),
        summary
      );
      console.log("✅  Summary created");
    } catch (e: any) {
      console.error(`Failed to generate summary: ${e.message}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`🎉  Completed in ${totalTime}s - Review created at: ${reviewDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
