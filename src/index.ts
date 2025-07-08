import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import RSSParser from "rss-parser";
import { load as loadHTML } from "cheerio";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

const CONFIG_PATH = path.join(os.homedir(), ".glint.conf");
const DATE_ISO = new Date().toISOString().split("T")[0];

type Config = {
  feeds: string[];
  outputDir?: string;
};

async function loadConfig(): Promise<Config> {
  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const schema = z.object({
    feeds: z.array(z.string()).nonempty(),
    outputDir: z.string().optional(),
  });
  return schema.parse(JSON.parse(raw));
}

async function fetchFeedItems(url: string, limit = 5) {
  try {
    const parser = new RSSParser();
    const feed = await parser.parseURL(url);
    return feed.items.slice(0, limit);
  } catch {
    throw new Error(`Invalid RSS source: ${url}`);
  }
}

async function fetchArticleText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch article: ${url}`);
  const html = await res.text();
  const $ = loadHTML(html);
  const text =
    $("article").text().trim() ||
    $("main").text().trim() ||
    $("body").text().trim();
  return text.replace(/\s+/g, " ").trim();
}

async function toMarkdown(
  article: string,
  model: ChatOpenAI,
  prompt: string
): Promise<string> {
  const response = await model.invoke([
    new SystemMessage(prompt),
    new HumanMessage(article),
  ]);
  return response.content.toString();
}

function safeFileName(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) + ".md"
  );
}

async function main() {
  const config = await loadConfig();
  const root = path.resolve(
    (config.outputDir ?? "~/glint").replace(/^~/, os.homedir())
  );
  if (!DATE_ISO) process.exit(1);

  const reviewDir = path.join(root, DATE_ISO);
  await fs.mkdir(reviewDir, { recursive: true });

  const systemPrompt = await fs.readFile("prompt.xml", "utf8");
  const chat = new ChatOpenAI({
    temperature: 0.3,
    modelName: "gpt-4o-mini",
  });

  for (const feed of config.feeds) {
    console.log(`📥  ${feed}`);
    let items;
    try {
      items = await fetchFeedItems(feed);
    } catch (e: any) {
      console.error(e.message);
      continue;
    }
    for (const item of items) {
      if (!item.link || !item.title) continue;
      console.log(`  → ${item.title}`);
      try {
        const rawText = await fetchArticleText(item.link);
        const md = await toMarkdown(rawText, chat, systemPrompt);
        await fs.writeFile(
          path.join(reviewDir, safeFileName(item.title)),
          md,
          "utf8"
        );
      } catch (e: any) {
        console.error(e.message);
      }
    }
  }

  console.log(`✅  Review created at: ${reviewDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
