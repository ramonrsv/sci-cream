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
import { getAllBalanceableKeys, getTypicalBalancingKeys, isBalanceableKey } from "./balancing";
import { getWasmEnums } from "./util";

test("getAllBalanceableKeys returns valid PropKey values", () => {
  const balanceableKeys = getAllBalanceableKeys();
  expect(balanceableKeys).toContain(compToPropKey(CompKey.MilkFat));
  expect(balanceableKeys).toContain(compToPropKey(CompKey.MSNF));
  expect(balanceableKeys).toContain(ratioToPropKey(RatioKey.AbsNetPAC));
});

test("getAllBalanceableKeys excludes every FpdKey", () => {
  const balanceableKeys = getAllBalanceableKeys();
  for (const fpdKey of getTsEnumStringKeys(FpdKey)) {
    expect(balanceableKeys).not.toContain(fpdKey);
  }
});

test("getTypicalBalancingKeys returns valid PropKey values", () => {
  const typicalKeys = getTypicalBalancingKeys();
  expect(typicalKeys).toContain(compToPropKey(CompKey.MilkFat));
  expect(typicalKeys).toContain(compToPropKey(CompKey.MSNF));
  expect(typicalKeys).toContain(ratioToPropKey(RatioKey.AbsNetPAC));
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

test("isBalanceableKey returns false for every FpdKey", () => {
  for (const key of getWasmEnums(FpdKey)) {
    expect(isBalanceableKey(fpdToPropKey(key))).toBe(false);
  }
});

test("isBalanceableKey returns true for known balanceable keys", () => {
  expect(isBalanceableKey(compToPropKey(CompKey.MilkFat))).toBe(true);
  expect(isBalanceableKey(compToPropKey(CompKey.MSNF))).toBe(true);
  expect(isBalanceableKey(ratioToPropKey(RatioKey.AbsNetPAC))).toBe(true);
});

test("isBalanceableKey returns false for known non-balanceable keys", () => {
  expect(isBalanceableKey(compToPropKey(CompKey.ABV))).toBe(false);
});
