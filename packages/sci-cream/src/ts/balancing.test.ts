import { expect, test } from "vitest";

import {
  CompKey,
  FpdKey,
  RatioKey,
  compToPropKey,
  ratioToPropKey,
  getTsEnumStringKeys,
} from "../../dist/index";

import { fpdToPropKey } from "./prop-key";
import { getWasmEnums } from "./util";

import {
  getAllBalanceableKeys,
  getAllNativeBalancingKeys,
  getTypicalBalancingKeys,
  isBalanceableKey,
} from "./balancing";

test("getAllBalanceableKeys returns valid PropKey values", () => {
  const balanceableKeys = getAllBalanceableKeys();
  expect(balanceableKeys).toContain(compToPropKey(CompKey.MilkFat));
  expect(balanceableKeys).toContain(compToPropKey(CompKey.MSNF));
  expect(balanceableKeys).toContain(ratioToPropKey(RatioKey.AbsNetPAC));
  expect(balanceableKeys).toContain(fpdToPropKey(FpdKey.ServingTemp));
});

test("getAllBalanceableKeys includes every FpdKey", () => {
  const balanceableKeys = getAllBalanceableKeys();
  for (const fpdKey of getTsEnumStringKeys(FpdKey)) {
    expect(balanceableKeys).toContain(fpdKey);
  }
});

test("getAllNativeBalancingKeys returns valid PropKey values", () => {
  const nativeKeys = getAllNativeBalancingKeys();
  expect(nativeKeys).toContain(compToPropKey(CompKey.MilkFat));
  expect(nativeKeys).toContain(compToPropKey(CompKey.MSNF));
  expect(nativeKeys).toContain(ratioToPropKey(RatioKey.AbsNetPAC));
});

test("getAllNativeBalancingKeys is a subset of getAllBalanceableKeys", () => {
  const balanceableKeys = getAllBalanceableKeys();
  for (const key of getAllNativeBalancingKeys()) {
    expect(balanceableKeys).toContain(key);
  }
});

test("getAllNativeBalancingKeys does not return keys with proxies", () => {
  const nativeKeys = getAllNativeBalancingKeys();

  // @todo Consider exposing proxy information from Rust/WASM
  for (const key of [compToPropKey(CompKey.ABV), ...getTsEnumStringKeys(FpdKey)]) {
    expect(nativeKeys).not.toContain(key);
  }
});

test("getTypicalBalancingKeys returns valid PropKey values", () => {
  const typicalKeys = getTypicalBalancingKeys();
  expect(typicalKeys).toContain(compToPropKey(CompKey.MilkFat));
  expect(typicalKeys).toContain(compToPropKey(CompKey.MSNF));
  expect(typicalKeys).toContain(compToPropKey(CompKey.ABV));
  expect(typicalKeys).toContain(fpdToPropKey(FpdKey.ServingTemp));
});

test("getTypicalBalancingKeys is a subset of getAllBalanceableKeys", () => {
  const balanceableKeys = getAllBalanceableKeys();
  for (const key of getTypicalBalancingKeys()) {
    expect(balanceableKeys).toContain(key);
  }
});

test("isBalanceableKey returns true for every key in getAllBalanceableKeys", () => {
  for (const key of getAllBalanceableKeys()) {
    expect(isBalanceableKey(key)).toBe(true);
  }
});

test("isBalanceableKey returns true for every FpdKey", () => {
  for (const key of getWasmEnums(FpdKey)) {
    expect(isBalanceableKey(fpdToPropKey(key))).toBe(true);
  }
});

test("isBalanceableKey returns true for known balanceable keys", () => {
  expect(isBalanceableKey(compToPropKey(CompKey.MilkFat))).toBe(true);
  expect(isBalanceableKey(compToPropKey(CompKey.MSNF))).toBe(true);
  expect(isBalanceableKey(compToPropKey(CompKey.ABV))).toBe(true);
  expect(isBalanceableKey(ratioToPropKey(RatioKey.AbsNetPAC))).toBe(true);
  expect(isBalanceableKey(fpdToPropKey(FpdKey.ServingTemp))).toBe(true);
});
