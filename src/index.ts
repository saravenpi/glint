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
import type { ProcessedArticle, SourceSummary } from "./types";

/**
 * Main application function that orchestrates the entire news processing pipeline
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  const startTime = Date.now();
  
  const configPath = process.argv[2];
  const config = await loadConfig(configPath);
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

  if (validArticles.length > 0) {
    console.log("📝  Grouping articles by source and generating summaries directly...");
    
    // Group articles by feed URL with raw text
    const articlesBySource = new Map<string, {title: string, url: string, text: string}[]>();
    for (let i = 0; i < validArticles.length; i++) {
      const article = validArticles[i];
      const textData = validTexts[i];
      
      if (!article || !textData || !textData.text) continue;
      
      if (!articlesBySource.has(article.feedUrl)) {
        articlesBySource.set(article.feedUrl, []);
      }
      articlesBySource.get(article.feedUrl)!.push({
        title: article.title,
        url: article.url,
        text: textData.text
      });
    }

    // Create source data for processing
    const sourcesData = Array.from(articlesBySource.entries()).map(([feedUrl, articles]) => ({
      feedUrl,
      articles
    }));

    try {
      console.log(`🤖  Processing ${sourcesData.length} sources with AI...`);
      // Generate source summaries directly from raw text (no individual article processing)
      const sourceSummariesWithContent = await aiProcessor.generateSourceSummariesFromRaw(sourcesData);
      
      // Write source summary files
      const sourceFiles: { path: string; content: string }[] = [];
      for (const source of sourceSummariesWithContent) {
        const hostname = new URL(source.feedUrl).hostname;
        const safeHostname = hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
        sourceFiles.push({
          path: path.join(reviewDir, `${safeHostname}_summary.md`),
          content: source.summary
        });
      }
      
      console.log(`💾  Writing ${sourceFiles.length} source summary files...`);
      await writeBatchMarkdownFiles(sourceFiles);

      // Generate and write global summary
      console.log("📝  Generating global summary...");
      const globalSummary = await aiProcessor.generateGlobalSummary(sourceSummariesWithContent, dateISO);
      await writeMarkdownFile(
        path.join(reviewDir, "global_summary.md"),
        globalSummary
      );
      
      console.log("✅  All summaries created");
    } catch (e: any) {
      console.error(`Failed to generate summaries: ${e.message}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`🎉  Completed in ${totalTime}s - Review created at: ${reviewDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
