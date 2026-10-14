import { describe, expect, it } from "vitest";
import {
  addDays,
  hhmmToMinutes,
  isDateString,
  minutesToHHMM,
  toZonedDateString,
  tzOffsetMinutes,
  weekdayOf,
  zonedToUtc,
} from "./time";
import { bahtToSatang, maskPhone, normalizePhone } from "./format";

describe("time helpers", () => {
  it("reads timezone offsets", () => {
    expect(tzOffsetMinutes("Asia/Bangkok", new Date())).toBe(420);
    expect(tzOffsetMinutes("UTC", new Date())).toBe(0);
  });

  it("converts local midnight to the previous UTC day", () => {
    expect(zonedToUtc("2026-10-13", 0, "Asia/Bangkok").toISOString()).toBe("2026-10-12T17:00:00.000Z");
  });

  it("finds the local calendar date of an instant", () => {
    // 18:00 UTC is already the next day in Bangkok
    expect(toZonedDateString(new Date("2026-10-12T18:00:00Z"), "Asia/Bangkok")).toBe("2026-10-13");
  });

  it("does calendar math across month/year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(weekdayOf("2026-10-12")).toBe(1); // Monday
  });

  it("validates dates and HH:mm", () => {
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026-02-28")).toBe(true);
    expect(hhmmToMinutes("09:30")).toBe(570);
    expect(hhmmToMinutes("24:00")).toBe(1440);
    expect(hhmmToMinutes("25:00")).toBeNull();
    expect(minutesToHHMM(570)).toBe("09:30");
  });
});

describe("format helpers", () => {
  it("normalizes Thai phone numbers", () => {
    expect(normalizePhone("081-234-5678")).toBe("0812345678");
    expect(normalizePhone("+66812345678")).toBe("0812345678");
    expect(normalizePhone("02 123 4567")).toBe("021234567");
    expect(normalizePhone("12345")).toBeNull();
  });

  it("parses baht into integer satang without float drift", () => {
    expect(bahtToSatang("19.99")).toBe(1999);
    expect(bahtToSatang("1,500")).toBe(150000);
    expect(bahtToSatang("-1")).toBeNull();
  });

  it("masks phone numbers", () => {
    expect(maskPhone("0812345678")).toBe("••••••5678");
  });
});
