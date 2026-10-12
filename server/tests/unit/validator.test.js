import test from "node:test";
import assert from "node:assert/strict";
import { validateCombinedBody } from "../../src/validators/analysis.validator.js";

test("validateCombinedBody passes for valid numeric feature payloads", () => {
  const req = {
    body: {
      forecastFeatures: {
        ambient_temp_c: 25.0,
        hour: 12,
      },
      anomalyFeatures: {
        total_power_kwh: 9750.0,
        pue: 1.15,
      },
    },
  };
  let errorReceived = null;
  const next = (err) => {
    errorReceived = err;
  };

  validateCombinedBody(req, {}, next);
  assert.equal(errorReceived, undefined);
});

test("validateCombinedBody fails when forecastFeatures is missing", () => {
  const req = {
    body: {
      anomalyFeatures: { total_power_kwh: 9750.0 },
    },
  };
  let errorReceived = null;
  const next = (err) => {
    errorReceived = err;
  };

  validateCombinedBody(req, {}, next);
  assert.ok(errorReceived);
  assert.equal(errorReceived.statusCode, 400);
});

test("validateCombinedBody fails when feature contains non-numeric value", () => {
  const req = {
    body: {
      forecastFeatures: { ambient_temp_c: "hot" },
      anomalyFeatures: { total_power_kwh: 9750.0 },
    },
  };
  let errorReceived = null;
  const next = (err) => {
    errorReceived = err;
  };

  validateCombinedBody(req, {}, next);
  assert.ok(errorReceived);
  assert.equal(errorReceived.statusCode, 400);
});
