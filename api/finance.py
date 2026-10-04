"""Read-only AKShare news adapter; no user-selected Python functions."""

import json
import logging
import re
import subprocess
import sys
from datetime import datetime
from html import unescape
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlsplit
from zoneinfo import ZoneInfo


def normalize_articles(records):
    articles, seen, titles = [], set(), set()
    for record in records:
        title = record.get("新闻标题")
        link = record.get("新闻链接")
        if not isinstance(title, str) or not isinstance(link, str):
            continue
        title = unescape(re.sub(r"<[^>]*>", "", title)).strip()
        try:
            url = urlsplit(link)
            if (url.scheme not in ("https", "http") or url.username or url.password
                    or url.hostname != "finance.eastmoney.com"
                    or not re.fullmatch(r"/a/\d+\.html", url.path)):
                continue
        except ValueError:
            continue
        link = "https://finance.eastmoney.com" + url.path
        if not title or len(title) > 400 or link in seen or title.casefold() in titles:
            continue
        seen.add(link)
        titles.add(title.casefold())
        published = ""
        try:
            published = datetime.strptime(str(record.get("发布时间", "")), "%Y-%m-%d %H:%M:%S").replace(tzinfo=ZoneInfo("Asia/Shanghai")).isoformat()
        except ValueError:
            pass
        source = record.get("文章来源")
        articles.append({"title": title, "url": link,
                         "source": source.strip()[:120] if isinstance(source, str) and source.strip() else "东方财富",
                         "publishedAt": published, "language": "zh",
                         "provider": "AKShare", "interface": "stock_news_em"})
    articles.sort(key=lambda item: item["publishedAt"], reverse=True)
    return articles[:8]


def retrieve(query):
    # Kill the isolated worker on timeout: AKShare's upstream call has no timeout.
    worker = "import akshare as ak,sys; print(ak.stock_news_em(symbol=sys.argv[1]).to_json(orient='records',force_ascii=False))"
    result = subprocess.run([sys.executable, "-c", worker, query], capture_output=True, text=True, timeout=30, check=True)
    records = json.loads(result.stdout)
    if not isinstance(records, list):
        raise ValueError("Invalid upstream records")
    return normalize_articles(records)


def finance_response(path, loader=retrieve):
    query = parse_qs(urlsplit(path).query).get("q", [""])[0].strip()
    if not 2 <= len(query) <= 80 or not re.fullmatch(r"[\w\s-]+", query, re.UNICODE):
        return 400, {"error": "INVALID_QUERY"}
    try:
        return 200, {"articles": loader(query), "provider": "AKShare", "usage": "research-only"}
    except Exception as error:
        logging.warning("AKShare retrieval failed: %s", type(error).__name__)
        return 503, {"error": "FINANCE_UNAVAILABLE"}


class handler(BaseHTTPRequestHandler):
    def respond(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1200" if status == 200 else "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        self.respond(*finance_response(self.path))

    def do_POST(self):
        self.respond(405, {"error": "METHOD_NOT_ALLOWED"})
