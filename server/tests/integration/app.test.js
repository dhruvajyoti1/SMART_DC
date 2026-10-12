import test from "node:test";
import assert from "node:assert/strict";
import app from "../../src/app.js";

test("Integration: GET / returns 200 health check", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());

  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/`);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.status, "ok");
  assert.equal(data.service, "SmartDC-Energy Express Server");
});

test("Integration: GET /api/unknown-endpoint returns 404 via error middleware", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());

  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/api/unknown-endpoint`);
  assert.equal(res.status, 404);

  const data = await res.json();
  assert.equal(data.error, "Not Found");
});

test("Integration: POST /api/analysis/combined rejects empty body with 400", async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());

  const port = server.address().port;
  const res = await fetch(`http://localhost:${port}/api/analysis/combined`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);

  const data = await res.json();
  assert.ok(data.error.includes("forecastFeatures"));
});
