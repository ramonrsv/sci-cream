import { expect, test } from "vitest";

import {
  CompKey,
  FpdKey,
  RatioKey,
  compToPropKey,
  ratioToPropKey,
  getTsEnumStringKeys,
} from "../../dist/index";

import { getAllBalanceableKeys, getTypicalBalancingKeys } from "./balancing";

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
