# 🌟 Glint — RSS → Markdown, right in your terminal

> **TL;DR :** Glint fetches the latest posts from your favourite RSS feeds, asks OpenAI for a long-yet-concise Markdown digest, and drops everything in dated folders so you can read the news straight from `$ less`. All in TypeScript, powered by Bun & LangChain.

---

## ✨ Features

| 🚀 What it does                           | 🛠️ How it works                                      |        |
| ----------------------------------------- | ----------------------------------------------------- | ------ |
| Reads your feed list from `~/.glint.conf` | Simple JSON config, overridable output directory      |        |
| Grabs **5 latest items** per feed         | Uses `rss-parser` for speedy parsing                  |        |
| Scrapes the full article                  | Cheerio (`<article>`, `<main>`, or `<body>` fallback) |        |
| Summarises & converts to Markdown         | OpenAI via LangChain with a custom `prompt.xml`       |        |
| Writes a **daily folder**                 | e.g. `~/glint/2025-07-08/` with one `.md` file / post |        |
| Works as a one-liner install              | \`curl …/install.sh                                   | bash\` |

---

## ⚡ Quick install

Install it
```bash
curl -fsSL https://raw.githubusercontent.com/saravenpi/glint/main/install.sh | bash
```

Run it
```bash
glint
```

> **Note:** Glint needs an OpenAI API key.
> `export OPENAI_API_KEY="sk-..."` before running.

---

## 🗂️ Configuration (`~/.glint.conf`)

```jsonc
{
  "feeds": [
    "https://www.lemonde.fr/rss/une.xml",
    "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"
  ],
  "outputDir": "~/glint"
}
```

Change it, save, rerun — done.
`~` is automatically resolved to your home directory.

---

## 📝 Daily output

```
~/glint/
└── 2025-07-08/
    ├── wildfire-siberia.md
    ├── ai-regulation-eu.md
    └── economy-q2-forecast.md
```

Each Markdown file is a **40 %-length** digest that preserves every key name, figure, and quote, with clear headings & bullet points for fast reading.

---

## 🔍 How it talks to OpenAI

The prompt lives in `prompt.xml`:

```xml
<prompt>
  <instructions>
    …(keeps all the important info, Markdown only, etc.)…
  </instructions>
  <output_format>markdown</output_format>
</prompt>
```

Feel free to tweak the style, target length, tone, or add front-matter.

---

## 🛠️ Development setup

```bash
git clone https://github.com/saravenpi/glint.git
cd glint
bun install

# run once
bun run src/index.ts

# or watch mode
bun run --watch src/index.ts
```

### Tech stack

* **Bun** — lightning-fast runtime & package manager
* **TypeScript** — strict typing, no surprises
* **LangChain 0.2+** — `@langchain/openai`, `@langchain/core`
* **OpenAI** — GPT-4o-mini by default (configurable)
* **Cheerio** — server-side jQuery for HTML scraping
* **rss-parser** — battle-tested RSS/Atom parsing
* **Zod** — runtime validation of the config file

---

## 🤝 Contributing

1. Fork & clone
2. `bun install`
3. Create a feature branch
4. Make your magic
5. PR ❤️

Please run `bun test` (coming soon) and keep commits clean.

---

## 📜 License

MIT — do what you want, just don’t blame us if your terminal catches fire. 🔥
