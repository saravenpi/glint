import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { ProcessedArticle, SourceSummary } from "./types";
import { chunkArray, parallelLimit } from "./performance";

const PROMPT_TEMPLATE = `<prompt>
  <instructions>
    GLINT news condensor. Summarize article in 40% length Markdown.

    Requirements:
    • Keep all facts, figures, names, quotes
    • Use headings & bullets
    • Neutral tone
    • GitHub Markdown only
    {{LANGUAGE_INSTRUCTION}}
  </instructions>

  <output_format>markdown</output_format>
</prompt>`;

/**
 * AI processor for converting articles to markdown and generating summaries
 */
export class AIProcessor {
  private model: ChatOpenAI;
  private systemPrompt: string | null = null;
  private language?: string;

  constructor(language?: string) {
    this.model = new ChatOpenAI({
      temperature: 0.3,
      modelName: "gpt-4o-mini",
    });
    this.language = language || "English";
  }

  /**
   * Load system prompt with language configuration
   * @param {string} [language] - Optional language for output
   * @returns {Promise<void>}
   */
  async loadPrompt(language?: string): Promise<void> {
    let prompt = PROMPT_TEMPLATE;
    
    const lang = language || "English";
    const languageInstruction = `• Write output in ${lang}`;
    prompt = prompt.replace('{{LANGUAGE_INSTRUCTION}}', languageInstruction);
    
    this.systemPrompt = prompt;
  }

  /**
   * Convert single article to markdown
   * @param {string} article - Article text content
   * @returns {Promise<string>} Markdown formatted article
   */
  async toMarkdown(article: string): Promise<string> {
    if (!this.systemPrompt) {
      await this.loadPrompt(this.language);
    }

    const response = await this.model.invoke([
      new SystemMessage(this.systemPrompt!),
      new HumanMessage(article),
    ]);
    
    return response.content.toString();
  }

  /**
   * Convert multiple articles to markdown in optimized batches
   * @param {string[]} articles - Array of article text content
   * @returns {Promise<string[]>} Array of markdown formatted articles
   */
  async batchToMarkdown(articles: string[]): Promise<string[]> {
    if (!this.systemPrompt) {
      await this.loadPrompt(this.language);
    }

    const processArticle = async (article: string) => {
      const response = await this.model.invoke([
        new SystemMessage(this.systemPrompt!),
        new HumanMessage(article),
      ]);
      return response.content.toString();
    };

    const chunks = chunkArray(articles, 8);
    const results: string[] = [];

    for (const chunk of chunks) {
      const chunkResults = await parallelLimit(chunk, processArticle, 5);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Generate summary for a single source with multiple articles directly from raw text
   * @param {Array} articles - Array with title, url, and raw text content
   * @param {string} feedUrl - URL of the RSS feed
   * @returns {Promise<string>} Markdown formatted source summary
   */
  async generateSourceSummaryFromRaw(articles: {title: string, url: string, text: string}[], feedUrl: string): Promise<string> {
    const lang = this.language || "English";
    let summaryPrompt = `GLINT source summary for ${new URL(feedUrl).hostname}. ${articles.length} articles from this source.\n\nSummarize the key themes and information from these articles. Use headings/bullets. Include article links in format [Article Title](article_url). Keep key facts/names/quotes. Neutral tone. GitHub Markdown only. Write output in ${lang}.`;

    const articlesText = articles.map(article => 
      `Title: ${article.title}\nURL: ${article.url}\nContent:\n${article.text.slice(0, 6000)}`
    ).join('\n\n---\n\n');

    const response = await this.model.invoke([
      new SystemMessage(summaryPrompt),
      new HumanMessage(articlesText),
    ]);
    
    return response.content.toString();
  }

  /**
   * Generate multiple source summaries in parallel from raw article data
   * @param {Array} sourcesData - Array of source data with raw articles
   * @returns {Promise<SourceSummary[]>} Array of source summaries with generated content
   */
  async generateSourceSummariesFromRaw(sourcesData: {feedUrl: string, articles: {title: string, url: string, text: string}[]}[]): Promise<SourceSummary[]> {
    const processSource = async (sourceData: {feedUrl: string, articles: {title: string, url: string, text: string}[]}): Promise<SourceSummary> => {
      const summary = await this.generateSourceSummaryFromRaw(sourceData.articles, sourceData.feedUrl);
      const processedArticles: ProcessedArticle[] = sourceData.articles.map(article => ({
        title: article.title,
        markdown: "", // Not needed anymore
        feedUrl: sourceData.feedUrl,
        articleUrl: article.url
      }));
      return { feedUrl: sourceData.feedUrl, articles: processedArticles, summary };
    };

    return await parallelLimit(sourcesData, processSource, 6);
  }

  /**
   * Generate global summary from source summaries
   * @param {SourceSummary[]} sourceSummaries - Array of source summaries
   * @param {string} date - Date string for the summary
   * @returns {Promise<string>} Markdown formatted global summary
   */
  async generateGlobalSummary(sourceSummaries: SourceSummary[], date: string): Promise<string> {
    const totalArticles = sourceSummaries.reduce((sum, source) => sum + source.articles.length, 0);
    const lang = this.language || "English";
    let summaryPrompt = `GLINT global summary for ${date}. ${totalArticles} articles from ${sourceSummaries.length} sources.\n\nSummarize the main themes and important news across all sources. Use headings/bullets. Reference sources by domain name. Keep key facts/names/quotes. Neutral tone. GitHub Markdown only. Write output in ${lang}.`;

    const sourcesText = sourceSummaries.map(source => 
      `Source: ${new URL(source.feedUrl).hostname} (${source.articles.length} articles)\nSummary:\n${source.summary}`
    ).join('\n\n---\n\n');

    const response = await this.model.invoke([
      new SystemMessage(summaryPrompt),
      new HumanMessage(sourcesText),
    ]);
    
    return response.content.toString();
  }
}