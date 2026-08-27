import test from "node:test";
import assert from "node:assert/strict";
import {
  secretAtRisk,
  createBeforeUnloadHandler,
  ACKNOWLEDGEMENT_LABEL,
} from "./secretGuard.ts";

function fakeUnloadEvent() {
  let prevented = false;
  const event = {
    preventDefault() {
      prevented = true;
    },
    returnValue: undefined,
  };
  return { event, wasPrevented: () => prevented };
}

test("secretAtRisk is true only when a secret exists and is unacknowledged", () => {
  assert.equal(secretAtRisk("SDNOTACKEDYET", false), true);
  assert.equal(secretAtRisk("SDNOTACKEDYET", true), false);
  assert.equal(secretAtRisk("", false), false);
  assert.equal(secretAtRisk("", true), false);
});

test("beforeunload handler triggers the native prompt while the key is at risk", () => {
  const handler = createBeforeUnloadHandler(() => true);
  const { event, wasPrevented } = fakeUnloadEvent();

  handler(event);

  assert.equal(wasPrevented(), true);
  assert.equal(event.returnValue, "");
});

test("beforeunload handler is inert once the key is no longer at risk", () => {
  const handler = createBeforeUnloadHandler(() => false);
  const { event, wasPrevented } = fakeUnloadEvent();

  handler(event);

  assert.equal(wasPrevented(), false);
  assert.equal(event.returnValue, undefined);
});

test("beforeunload handler re-reads risk state on every event", () => {
  let atRisk = false;
  const handler = createBeforeUnloadHandler(() => atRisk);

  const first = fakeUnloadEvent();
  handler(first.event);
  assert.equal(first.wasPrevented(), false);

  atRisk = true;
  const second = fakeUnloadEvent();
  handler(second.event);
  assert.equal(second.wasPrevented(), true);
});

test("the acknowledgement label states the key was saved securely", () => {
  assert.match(ACKNOWLEDGEMENT_LABEL, /saved my secret key/i);
});
