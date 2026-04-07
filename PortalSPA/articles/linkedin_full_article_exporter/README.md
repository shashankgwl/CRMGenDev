# LinkedIn Full Article Exporter

This package contains a **local** exporter that signs into LinkedIn in a browser, opens each article URL from your CSV, extracts the **full article body**, converts it to Markdown, and writes one `.md` file per article.

## Why this package exists
The chat environment here does **not** have a live authenticated browser session into LinkedIn. Public web search only exposes indexed snippets, not guaranteed full-fidelity article HTML. This package is the accurate path for complete extraction.

## Files
- `export_linkedin_articles.py` — main exporter
- `requirements.txt` — Python dependencies
- `README.md` — these instructions

## Input CSV
Expected columns:
- `Title`
- `Article Date`
- `Article Link`

## Setup
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python -m playwright install
```

## Run
First run should be headful so you can sign in to LinkedIn if prompted:

```bash
python export_linkedin_articles.py --csv "ArticlesAndPosts.xlsx - Articles.csv" --out linkedin_articles_md --headful
```

After you have a saved session in `.pw_profile`, you can run headless:

```bash
python export_linkedin_articles.py --csv "ArticlesAndPosts.xlsx - Articles.csv" --out linkedin_articles_md
```

## Output
- One Markdown file per article in the output folder.
- `export_manifest.csv` showing status, body lengths, and filenames.
- Automatic ZIP of the output folder.

## Notes
- If LinkedIn changes DOM structure, selectors may need a small update. The script already includes multiple fallbacks.
- If you want duplicate URLs preserved as separate files, add `--preserve-duplicates`.
