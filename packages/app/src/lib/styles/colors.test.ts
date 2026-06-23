import { expect, test } from "vitest";

import { Color, addOrUpdateAlpha, worseStatusColor, getTargetColor, getRangeColor } from "./colors";

test("addOrUpdateAlpha correctly replaces alpha value", () => {
  expect(addOrUpdateAlpha("rgba(100, 150, 200, 0.8)", 0.5)).toBe("rgba(100, 150, 200, 0.5)");
});

test("addOrUpdateAlpha correctly converts rgb to rgba", () => {
  expect(addOrUpdateAlpha("rgb(100, 150, 200)", 0.5)).toBe("rgba(100, 150, 200, 0.5)");
});

test("addOrUpdateAlpha supports optional commas", () => {
  expect(addOrUpdateAlpha("rgb(100 150 200)", 0.5)).toBe("rgba(100, 150, 200, 0.5)");
});

test("addOrUpdateAlpha supports hex colors", () => {
  expect(addOrUpdateAlpha("#6496c8", 0.5)).toBe("rgba(100, 150, 200, 0.5)");
});

test("worseStatusColor returns the color with higher severity", () => {
  expect(worseStatusColor(Color.GraphGreen, Color.GraphYellow)).toBe(Color.GraphYellow);
  expect(worseStatusColor(Color.GraphOrange, Color.GraphYellow)).toBe(Color.GraphOrange);
  expect(worseStatusColor(Color.GraphRedDull, Color.GraphGreen)).toBe(Color.GraphRedDull);
});

test("worseStatusColor throws for non-status colors", () => {
  expect(() => worseStatusColor(Color.Grid, Color.Legend)).toThrow("Invalid status color");
  expect(() => worseStatusColor(Color.Grid, Color.GraphYellow)).toThrow("Invalid status color");
});

test("getTargetColor returns correct colors based on value's position relative to target", () => {
  expect(getTargetColor(95, 100)).toBe(Color.GraphGreen);
  expect(getTargetColor(105, 100)).toBe(Color.GraphGreen);
  expect(getTargetColor(90, 100)).toBe(Color.GraphYellow);
  expect(getTargetColor(110, 100)).toBe(Color.GraphYellow);
  expect(getTargetColor(85, 100)).toBe(Color.GraphOrange);
  expect(getTargetColor(115, 100)).toBe(Color.GraphOrange);
  expect(getTargetColor(80, 100)).toBe(Color.GraphRedDull);
  expect(getTargetColor(120, 100)).toBe(Color.GraphRedDull);
});

test("getTargetColor with custom stepPercent", () => {
  expect(getTargetColor(90, 100, 0.1)).toBe(Color.GraphGreen);
  expect(getTargetColor(110, 100, 0.1)).toBe(Color.GraphGreen);
  expect(getTargetColor(80, 100, 0.1)).toBe(Color.GraphYellow);
  expect(getTargetColor(120, 100, 0.1)).toBe(Color.GraphYellow);
  expect(getTargetColor(70, 100, 0.1)).toBe(Color.GraphOrange);
  expect(getTargetColor(130, 100, 0.1)).toBe(Color.GraphOrange);
  expect(getTargetColor(60, 100, 0.1)).toBe(Color.GraphRedDull);
  expect(getTargetColor(140, 100, 0.1)).toBe(Color.GraphRedDull);
});

test("getRangeColor returns correct colors based on value's position in range", () => {
  const range = { min: 0, max: 100 };
  expect(getRangeColor(15, range)).toBe(Color.GraphGreen);
  expect(getRangeColor(50, range)).toBe(Color.GraphGreen);
  expect(getRangeColor(75, range)).toBe(Color.GraphGreen);
  expect(getRangeColor(0, range)).toBe(Color.GraphYellow);
  expect(getRangeColor(100, range)).toBe(Color.GraphYellow);
  expect(getRangeColor(-15, range)).toBe(Color.GraphOrange);
  expect(getRangeColor(115, range)).toBe(Color.GraphOrange);
  expect(getRangeColor(-30, range)).toBe(Color.GraphRedDull);
  expect(getRangeColor(130, range)).toBe(Color.GraphRedDull);
});

test("getRangeColor with custom stepPercent", () => {
  const range = { min: 0, max: 100 };
  expect(getRangeColor(20, range, 0.2)).toBe(Color.GraphGreen);
  expect(getRangeColor(50, range, 0.2)).toBe(Color.GraphGreen);
  expect(getRangeColor(80, range, 0.2)).toBe(Color.GraphGreen);
  expect(getRangeColor(0, range, 0.2)).toBe(Color.GraphYellow);
  expect(getRangeColor(100, range, 0.2)).toBe(Color.GraphYellow);
  expect(getRangeColor(-20, range, 0.2)).toBe(Color.GraphOrange);
  expect(getRangeColor(120, range, 0.2)).toBe(Color.GraphOrange);
  expect(getRangeColor(-40, range, 0.2)).toBe(Color.GraphRedDull);
  expect(getRangeColor(140, range, 0.2)).toBe(Color.GraphRedDull);
});
