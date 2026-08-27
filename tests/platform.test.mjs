import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("security headers stay enforced without wildcard origins", async () => {
  const config = await read("next.config.ts");

  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /X-Content-Type-Options.*nosniff/s);
  assert.match(config, /Strict-Transport-Security.*max-age=63072000/s);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /object-src 'none'/);
  assert.doesNotMatch(config, /https?:\/\/\*/);
});

test("root metadata exposes canonical identity and truthful schema", async () => {
  const layout = await read("src/app/layout.tsx");

  assert.match(layout, /canonical:\s*"\/"/);
  assert.match(layout, /"@type": "Organization"/);
  assert.match(layout, /"@type": "WebApplication"/);
  assert.match(layout, /price:\s*"0"/);
  assert.match(layout, /href="\/privacy"/);
  assert.match(layout, /href="\/about"/);
  assert.match(layout, /href="\/contact"/);
});

test("initial task controls have stable accessible names", async () => {
  const page = await read("src/app/page.tsx");

  assert.match(page, /<label htmlFor="task-input"/);
  assert.match(page, /id="task-input"/);
  assert.match(page, /aria-label="Upload a task file"/);
  assert.match(page, /aria-label="Choose a task file to upload"/);
});

test("crawler discovery files name the public trust routes", async () => {
  const llms = await read("public/llms.txt");
  const robots = await read("src/app/robots.ts");
  const sitemap = await read("src/app/sitemap.ts");

  assert.match(llms, /https:\/\/8020\.best\/privacy/);
  assert.match(llms, /Price: \$0/);
  assert.match(robots, /GPTBot/);
  assert.match(robots, /https:\/\/8020\.best\/sitemap\.xml/);
  assert.match(sitemap, /"\/about"/);
  assert.match(sitemap, /"\/contact"/);
  assert.match(sitemap, /"\/privacy"/);
});
