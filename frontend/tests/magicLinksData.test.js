import assert from "node:assert/strict";
import { test } from "node:test";
import { buildOrderMagicToken, getPortalAccessError, mapApiSummaryToTrackingOrder } from "../src/lib/magicLinksData.js";

test("orders without an issued token never acquire a predictable substitute", () => {
  assert.equal(buildOrderMagicToken({
    id: "00000000-0000-4000-8000-000000abcdef", order_number: "#OT-99999",
  }), "");
});

test("the active token returned by the API is preserved verbatim", () => {
  assert.equal(buildOrderMagicToken({ active_magic_link_token: "synthetic-token-with-expir-inside" }),
    "synthetic-token-with-expir-inside");
});

test("link metadata excludes expired, revoked and undated links", () => {
  const future = new Date(Date.now() + 3600000).toISOString();
  const past = new Date(Date.now() - 3600000).toISOString();
  assert.equal(buildOrderMagicToken({ magic_links: [
    { token: "revoked", is_active: false, expires_at: future },
    { token: "expired", is_active: true, expires_at: past },
    { token: "undated", is_active: true },
    { token: "authorized", is_active: true, expires_at: future },
  ] }), "authorized");
});

test("only an API 410 classifies a link as expired or revoked", () => {
  assert.equal(getPortalAccessError({ status: 410 }).kind, "expired");
  assert.equal(getPortalAccessError({ status: 404, message: "expired" }).kind, "invalid");
  for (const error of [new TypeError("Failed to fetch"), { status: 500 }, { status: 503 }, { message: "410 expired" }]) {
    assert.equal(getPortalAccessError(error).kind, "unavailable");
  }
});

test("server error details containing sensitive data are not rendered", () => {
  const result = getPortalAccessError({ status: 500, message: "synthetic-private-token" });
  assert.equal(result.message.includes("synthetic-private-token"), false);
});

test("a validated summary retains customer tracking fields", () => {
  const mapped = mapApiSummaryToTrackingOrder({
    order_id: "synthetic-order", order_number: "#OT-TEST-001", status_key: "en_ruta",
    title: "Visita de prueba", company: "Empresa de prueba", address: "Dirección de prueba",
    technician: { name: "Persona de prueba", phone: "", avatar: "PP" },
    timeline_steps: [{ key: "en_ruta", label: "En ruta", current: true, completed: false }],
  });
  assert.equal(mapped.order_id, "synthetic-order");
  assert.equal(mapped.company, "Empresa de prueba");
  assert.equal(mapped.technician.name, "Persona de prueba");
  assert.equal(mapped.timeline_steps[0].current, true);
  assert.equal(mapApiSummaryToTrackingOrder(null), null);
});
