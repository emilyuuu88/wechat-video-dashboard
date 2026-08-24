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
  assert.match(html, /累计数据截至 2026\.08\.20/);
  assert.match(html, /102,576/);
  assert.match(html, /粉丝数/);
  assert.match(html, />277</);
  assert.match(html, /57(?:<!-- -->)?条内容累计/);
});

test("server-renders the updated content analysis", async () => {
  const response = await render("/content");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /累计数据更新至 2026\.08\.20/);
  assert.match(html, /2026\.04\.22 — 08\.20/);
  assert.match(html, /102,576/);
  assert.match(html, />57</);
});
