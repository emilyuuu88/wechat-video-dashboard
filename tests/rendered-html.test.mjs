import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the updated overview totals", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>嘴里人｜视频号数据驾驶舱<\/title>/i);
  assert.match(html, /累计数据截至 2026\.08\.27/);
  assert.match(html, /27,625/);
  assert.match(html, /粉丝数/);
  assert.match(html, />175</);
  assert.match(html, /14(?:<!-- -->)?条内容累计/);
});

test("server-renders the updated content analysis", async () => {
  const response = await render("/content");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /累计数据更新至 2026\.08\.27/);
  assert.match(html, /当前分类·单篇最高播放/);
  assert.match(html, /7,832/);
  assert.match(html, /106,835/);
  assert.match(html, />60</);
  assert.match(html, /《霸总》系列/);
  assert.match(html, /《AI财务》系列/);
});
