import unittest
from urllib.parse import quote
from unittest.mock import patch

from api.finance import finance_response, normalize_articles, retrieve


class FinanceTests(unittest.TestCase):
    def test_metadata_is_safe_deduplicated_and_not_full_text(self):
        row = {"新闻标题": "<em>利率</em> &amp; 经济", "新闻链接": "http://finance.eastmoney.com/a/202610041234.html", "发布时间": "2026-10-04 12:00:00", "文章来源": "Example publisher", "新闻内容": "Must not republish"}
        records = [row, row, {**row, "新闻链接": "javascript:alert(1)"}, {**row, "新闻链接": "https://finance.eastmoney.com.evil/a/123.html"}]
        articles = normalize_articles(records)
        self.assertEqual(len(articles), 1)
        self.assertEqual(articles[0]["title"], "利率 & 经济")
        self.assertEqual(articles[0]["publishedAt"], "2026-10-04T12:00:00+08:00")
        self.assertTrue(articles[0]["url"].startswith("https://"))
        self.assertNotIn("新闻内容", articles[0])

    def test_validation_and_failure_do_not_invent_records(self):
        for query in ["x", "a" * 81, "https://example.com", "stock;print(1)"]:
            self.assertEqual(finance_response("/api/finance?q=" + quote(query))[0], 400)
        status, payload = finance_response("/api/finance?q=" + quote("利率"), lambda q: [])
        self.assertEqual(status, 200)
        self.assertEqual(payload["articles"], [])
        def fail(q):
            raise TimeoutError()
        self.assertEqual(finance_response("/api/finance?q=stocks", fail), (503, {"error": "FINANCE_UNAVAILABLE"}))

    def test_worker_is_bounded_and_query_is_not_code(self):
        with patch("api.finance.subprocess.run") as run:
            run.return_value.stdout = "[]"
            self.assertEqual(retrieve("600519"), [])
            self.assertEqual(run.call_args.args[0][-1], "600519")
            self.assertEqual(run.call_args.kwargs["timeout"], 30)
            self.assertNotIn("shell", run.call_args.kwargs)


if __name__ == "__main__":
    unittest.main()
