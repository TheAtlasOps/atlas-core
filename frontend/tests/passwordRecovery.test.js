import assert from "node:assert/strict";
import { test } from "node:test";
import { passwordRecoveryError, recoveryTokenFromHash } from "../src/utils/passwordRecovery.js";

test("recovery accepts only a complete opaque token from the fragment", () => {
  const token = "a".repeat(43);
  assert.equal(recoveryTokenFromHash(`#token=${token}`), token);
  for (const value of ["", "#token=short", "#token=atlas_ot-99999_abcdef"]) {
    assert.equal(recoveryTokenFromHash(value), "");
  }
});

test("password and confirmation must match and meet the minimum length", () => {
  assert.equal(passwordRecoveryError("new-synthetic-password", "new-synthetic-password"), "");
  assert.ok(passwordRecoveryError("short", "short"));
  assert.ok(passwordRecoveryError("new-synthetic-password", "different-password"));
  assert.ok(passwordRecoveryError(" ".repeat(20), " ".repeat(20)));
  assert.ok(passwordRecoveryError("😀".repeat(6), "😀".repeat(6)));
});

test("bcrypt limit applies to UTF-8 bytes without silent truncation", () => {
  for (const password of ["a".repeat(73), "á".repeat(37)]) assert.ok(passwordRecoveryError(password, password));
  const boundary = "á".repeat(36);
  assert.equal(passwordRecoveryError(boundary, boundary), "");
});
