#!/usr/bin/env python3
"""
Export full LinkedIn article bodies to Markdown using a logged-in browser session.

Features
- Reads a CSV with columns: Title, Article Date, Article Link
- Uses Playwright persistent profile so login is reused
- Extracts article title/date/body from LinkedIn article pages
- Converts article HTML to Markdown
- Saves one .md per row and creates a zip automatically

Usage
  python export_linkedin_articles.py --csv "ArticlesAndPosts.xlsx - Articles.csv" --out out_md --headful

Notes
- First run should be headed so you can sign into LinkedIn if prompted.
- Subsequent runs can be headless once the session exists in ./.pw_profile
"""

import argparse
import datetime as dt
import os
import re
import sys
import time
import zipfile
from pathlib import Path

import pandas as pd
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


def slugify(s: str, maxlen: int = 100) -> str:
    s = (s or '').strip().lower()
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'\s+', '-', s).strip('-')
    s = re.sub(r'-{2,}', '-', s)
    return (s[:maxlen].rstrip('-') or 'article')


def parse_date(s):
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return ''
    s = str(s).strip()
    if not s:
        return ''
    for fmt in [
        '%A, %B %d, %Y', '%B %d, %Y', '%b %d, %Y', '%b %d,%Y',
        '%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y'
    ]:
        try:
            return dt.datetime.strptime(s, fmt).date().isoformat()
        except Exception:
            pass
    try:
        val = pd.to_datetime(s, errors='coerce')
        if pd.notna(val):
            return val.date().isoformat()
    except Exception:
        pass
    return ''


def clean_soup(node: BeautifulSoup):
    # remove scripts/styles/non-content
    for tag in node.select('script, style, noscript, svg, form, button[aria-label*="like" i], aside'):
        tag.decompose()
    # convert pre/code to fenced code blocks where possible after markdownify
    return node


def find_title(soup: BeautifulSoup, fallback=''):
    # preferred LinkedIn selectors/meta tags
    selectors = [
        'h1',
        'meta[property="og:title"]',
        'meta[name="title"]',
        'title'
    ]
    for sel in selectors:
        el = soup.select_one(sel)
        if not el:
            continue
        if el.name == 'meta':
            txt = (el.get('content') or '').strip()
        else:
            txt = el.get_text(' ', strip=True)
        if txt:
            txt = re.sub(r'\s*\|\s*LinkedIn.*$', '', txt, flags=re.I)
            return txt
    return fallback


def find_date_text(soup: BeautifulSoup, fallback=''):
    # LinkedIn may keep this in time tag or text around "Published"
    t = soup.select_one('time')
    if t:
        txt = t.get('datetime') or t.get_text(' ', strip=True)
        if txt:
            return txt.strip()
    txt = soup.get_text('\n', strip=True)
    m = re.search(r'Published\s+([A-Z][a-z]{2,9}\s+\d{1,2},\s+\d{4})', txt)
    if m:
        return m.group(1)
    return fallback


def find_article_node(soup: BeautifulSoup):
    # Common public LinkedIn/Pulse article containers; fall back to text-dense container.
    candidate_selectors = [
        'article',
        'div.reader-article-content',
        'div.main-content',
        'section.article-main',
        'main',
        'div[data-test-id="article-content"]',
        'div.attributed-text-segment-list__container',
    ]
    for sel in candidate_selectors:
        node = soup.select_one(sel)
        if node and len(node.get_text(' ', strip=True)) > 500:
            return node

    # Heuristic fallback: choose the biggest content-ish container
    candidates = []
    for node in soup.find_all(['article', 'main', 'section', 'div']):
        txt = node.get_text(' ', strip=True)
        if len(txt) < 500:
            continue
        # favor containers with headings/paragraphs/images and low link density
        p_count = len(node.find_all('p'))
        img_count = len(node.find_all('img'))
        a_text = ' '.join(a.get_text(' ', strip=True) for a in node.find_all('a'))
        link_ratio = (len(a_text) / max(len(txt), 1))
        score = len(txt) + p_count * 100 + img_count * 30 - link_ratio * 2000
        candidates.append((score, node))
    if not candidates:
        return soup.body or soup
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def html_to_markdown(article_node: BeautifulSoup) -> str:
    article_node = clean_soup(article_node)
    html = str(article_node)
    text = md(html, heading_style='ATX', bullets='-', autolinks=True)
    # normalize excessive blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip() + '\n'


def wait_for_possible_login(page):
    # If login wall appears, wait until user signs in and returns to an article page
    current = page.url or ''
    if 'login' not in current and '/checkpoint/' not in current:
        return
    print('\nLinkedIn login detected. Please sign in in the opened browser window.\n')
    for _ in range(900):  # ~15 mins
        time.sleep(1)
        current = page.url or ''
        if 'login' not in current and '/checkpoint/' not in current:
            return
    raise RuntimeError('Timed out waiting for LinkedIn login.')


def fetch_article(page, url: str, fallback_title: str = '', fallback_date: str = ''):
    page.goto(url, wait_until='domcontentloaded', timeout=120000)
    wait_for_possible_login(page)
    # Give the client app a moment to hydrate
    page.wait_for_timeout(3500)
    # some pages need a scroll to trigger lazy render
    page.mouse.wheel(0, 1200)
    page.wait_for_timeout(1000)

    html = page.content()
    soup = BeautifulSoup(html, 'html.parser')

    title = find_title(soup, fallback_title)
    date_text = find_date_text(soup, fallback_date)
    article_node = find_article_node(soup)
    body_md = html_to_markdown(article_node)

    # light cleanup: remove duplicate title lines from beginning if repeated
    body_lines = body_md.splitlines()
    while body_lines and title and body_lines[0].strip().lower() == title.strip().lower():
        body_lines = body_lines[1:]
    body_md = '\n'.join(body_lines).strip() + '\n'

    return {
        'title': title or fallback_title,
        'date': parse_date(date_text or fallback_date),
        'markdown': body_md,
        'raw_date_text': date_text or fallback_date,
        'html_length': len(html),
        'body_length': len(body_md),
    }


def load_rows(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df.columns = [c.strip() for c in df.columns]
    title_col = next((c for c in df.columns if c.lower() == 'title'), df.columns[0])
    date_col = next((c for c in df.columns if c.lower() == 'article date'), None)
    link_col = next((c for c in df.columns if c.lower() == 'article link'), None)
    if not link_col:
        raise ValueError('CSV must contain an "Article Link" column.')
    rows = df[df[link_col].notna()].copy()
    rows[link_col] = rows[link_col].astype(str).str.strip()
    rows = rows[rows[link_col].str.startswith('http')]
    rows['__title'] = rows[title_col].astype(str).str.strip()
    rows['__date'] = rows[date_col].astype(str).str.strip() if date_col else ''
    return rows[[title_col] + ([date_col] if date_col else []) + [link_col, '__title', '__date']]


def write_md(out_path: Path, title: str, date_iso: str, url: str, body_md: str):
    frontmatter = (
        '---\n'
        f'title: "{(title or "").replace(chr(34), chr(92)+chr(34))}"\n'
        f'date: "{date_iso}"\n'
        'source: "LinkedIn"\n'
        f'url: "{url}"\n'
        '---\n\n'
    )
    content = frontmatter + f'# {title}\n\n' + body_md
    out_path.write_text(content, encoding='utf-8')


def make_zip(folder: Path, zip_name: Path):
    with zipfile.ZipFile(zip_name, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        for p in folder.rglob('*'):
            if p.is_file():
                zf.write(p, arcname=p.relative_to(folder.parent))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--csv', required=True, help='CSV containing Title, Article Date, Article Link')
    ap.add_argument('--out', required=True, help='Output folder for markdown files')
    ap.add_argument('--profile', default='.pw_profile', help='Playwright persistent browser profile')
    ap.add_argument('--headful', action='store_true', help='Open visible browser window (recommended for first login)')
    ap.add_argument('--preserve-duplicates', action='store_true', help='Write one file per row even if URLs repeat')
    args = ap.parse_args()

    rows = load_rows(args.csv)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    log_rows = []
    seen = set()

    with sync_playwright() as p:
        browser = p.chromium.launch_persistent_context(
            user_data_dir=args.profile,
            headless=not args.headful,
            viewport={'width': 1440, 'height': 1200},
        )
        page = browser.new_page()

        total = len(rows)
        for idx, (_, row) in enumerate(rows.iterrows(), start=1):
            url = str(row.iloc[-3 if False else -3]) if False else None  # unused placeholder to keep code formatter simple
            # safer explicit pull
            url = str(row[[c for c in rows.columns if c.lower() == 'article link'][0]])
            title = row['__title']
            date_text = row['__date']

            normalized = re.sub(r'\?.*$', '', url)
            if normalized in seen and not args.preserve_duplicates:
                print(f'[{idx}/{total}] Skipping duplicate URL: {title}')
                continue
            seen.add(normalized)

            try:
                print(f'[{idx}/{total}] Fetching: {title}')
                info = fetch_article(page, url, fallback_title=title, fallback_date=date_text)
                date_iso = info['date'] or parse_date(date_text)
                slug = slugify(info['title'] or title)
                prefix = date_iso or f'{idx:03d}'
                out_path = out_dir / f'{prefix}-{slug}.md'
                write_md(out_path, info['title'] or title, date_iso, url, info['markdown'])
                log_rows.append({
                    'row': idx,
                    'title': info['title'] or title,
                    'url': url,
                    'date': date_iso,
                    'file': out_path.name,
                    'body_length': info['body_length'],
                    'status': 'ok',
                })
            except PlaywrightTimeoutError as e:
                log_rows.append({'row': idx, 'title': title, 'url': url, 'date': parse_date(date_text), 'file': '', 'body_length': 0, 'status': f'timeout: {e}'})
                print(f'  TIMEOUT: {title} -> {e}')
            except Exception as e:
                log_rows.append({'row': idx, 'title': title, 'url': url, 'date': parse_date(date_text), 'file': '', 'body_length': 0, 'status': f'error: {e}'})
                print(f'  ERROR: {title} -> {e}')

        browser.close()

    # write manifest/log
    manifest = pd.DataFrame(log_rows)
    manifest.to_csv(out_dir / 'export_manifest.csv', index=False)

    zip_path = out_dir.parent / f'{out_dir.name}.zip'
    make_zip(out_dir, zip_path)
    print(f'\nDone. Markdown folder: {out_dir}')
    print(f'ZIP: {zip_path}')


if __name__ == '__main__':
    main()
