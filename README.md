# 🌟 Glint — RSS → Markdown

Glint fetches RSS feeds, scrapes articles, and generates AI-powered Markdown summaries. All organized in daily folders for easy terminal reading.

Built with TypeScript, Bun, and LangChain for maximum performance.

## ⚡ Quick Start

1. **Install:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/saravenpi/glint/main/install.sh | bash
   ```

2. **Set OpenAI API key:**
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

3. **Create config:**
   ```bash
   cp glint.yml.example ~/glint.yml
   ```

4. **Run:**
   ```bash
   glint
   ```

## 🗂️ Configuration

Edit `~/glint.yml` to customize feeds and output directory:

```yaml
feeds:
  - https://www.lemonde.fr/rss/une.xml
  - https://rss.nytimes.com/services/xml/rss/nyt/World.xml
  - https://feeds.bbci.co.uk/news/world/rss.xml

outputDir: ~/glint
```

## 📝 Output

Articles are saved in daily folders:

```
~/glint/2025-07-27/
├── article-1.md
├── article-2.md
└── summary.md  ← Daily overview
```

Each article is condensed to ~40% length while preserving key facts, figures, and quotes. The summary organizes all articles by topic.

## 🛠️ Development

```bash
git clone https://github.com/saravenpi/glint.git
cd glint
bun install
bun run dev
```

**Commands:**
- `bun run dev` - Run from source
- `bun run build` - Build application  
- `bun run start` - Build and run

**Tech Stack:**
- **Bun** - Runtime and package manager
- **TypeScript** - Type safety
- **LangChain** - OpenAI integration
- **Cheerio** - HTML scraping
- **Zod** - Config validation

**Performance:**
- Parallel RSS fetching and article scraping
- Smart caching (6h TTL) to avoid duplicate work
- Optimized AI prompts for minimal token usage
- Batch processing for maximum speed

## 📜 License

MIT
