import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { ProcessedArticle } from "./types";
import { chunkArray, parallelLimit } from "./performance";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPT_PATH = path.join(__dirname, "..", "prompt.xml");

/**
 * AI processor for converting articles to markdown and generating summaries
 */
export class AIProcessor {
  private model: ChatOpenAI;
  private systemPrompt: string | null = null;

  constructor() {
    this.model = new ChatOpenAI({
      temperature: 0.3,
      modelName: "gpt-4o-mini",
    });
  }

  /**
   * Load system prompt from prompt.xml file
   * @returns {Promise<void>}
   */
  async loadPrompt(): Promise<void> {
    this.systemPrompt = await fs.readFile(PROMPT_PATH, "utf8");
  }

  /**
   * Convert single article to markdown
   * @param {string} article - Article text content
   * @returns {Promise<string>} Markdown formatted article
   */
  async toMarkdown(article: string): Promise<string> {
    if (!this.systemPrompt) {
      await this.loadPrompt();
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
      await this.loadPrompt();
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
   * Generate daily summary from processed articles
   * @param {ProcessedArticle[]} articles - Array of processed articles
   * @param {string} date - Date string for the summary
   * @returns {Promise<string>} Markdown formatted daily summary
   */
  async generateSummary(articles: ProcessedArticle[], date: string): Promise<string> {
    const summaryPrompt = `GLINT daily summary for ${date}. ${articles.length} articles.\n\nOrganize by topic. Use headings/bullets. Keep key facts/names/quotes. Neutral tone. GitHub Markdown only.`;

    const articlesText = articles.map(article => 
      `${article.title}:\n${article.markdown}`
    ).join('\n\n---\n\n');

    const response = await this.model.invoke([
      new SystemMessage(summaryPrompt),
      new HumanMessage(articlesText),
    ]);
    
    return response.content.toString();
  }
}