import { describe, expect, it } from "vitest";
import { generateSlots, isSlotAvailable, overlaps, type SlotInput } from "./slots";
import { formatTime } from "./time";

const TZ = "Asia/Bangkok";
const at = (iso: string) => new Date(iso);

function input(overrides: Partial<SlotInput> = {}): SlotInput {
  return {
    date: "2026-10-13",
    timezone: TZ,
    hours: { openMin: 10 * 60, closeMin: 12 * 60, isClosed: false },
    isHoliday: false,
    durationMin: 30,
    stepMin: 30,
    busy: [],
    now: at("2026-10-12T00:00:00Z"), // day before
    minLeadMin: 0,
    ...overrides,
  };
}

const labels = (i: SlotInput) => generateSlots(i).map((s) => formatTime(s.start, TZ));

describe("overlaps", () => {
  it("treats ranges as half-open (back-to-back is fine)", () => {
    const a = { start: at("2026-01-01T03:00:00Z"), end: at("2026-01-01T03:30:00Z") };
    const b = { start: at("2026-01-01T03:30:00Z"), end: at("2026-01-01T04:00:00Z") };
    expect(overlaps(a, b)).toBe(false);
    expect(overlaps(b, a)).toBe(false);
  });

  it("detects partial and full overlap", () => {
    const a = { start: at("2026-01-01T03:00:00Z"), end: at("2026-01-01T04:00:00Z") };
    expect(overlaps(a, { start: at("2026-01-01T03:59:00Z"), end: at("2026-01-01T05:00:00Z") })).toBe(true);
    expect(overlaps(a, { start: at("2026-01-01T03:10:00Z"), end: at("2026-01-01T03:20:00Z") })).toBe(true);
  });
});

describe("generateSlots", () => {
  it("lists every slot between opening and closing in shop local time", () => {
    expect(labels(input())).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });

  it("converts local times to UTC correctly (Bangkok is UTC+7)", () => {
    const [first] = generateSlots(input());
    expect(first.start.toISOString()).toBe("2026-10-13T03:00:00.000Z");
    expect(first.end.toISOString()).toBe("2026-10-13T03:30:00.000Z");
  });

  it("only offers slots where the whole service fits before closing", () => {
    expect(labels(input({ durationMin: 90 }))).toEqual(["10:00", "10:30"]);
    expect(labels(input({ durationMin: 150 }))).toEqual([]);
  });

  it("respects a finer step than the duration", () => {
    expect(labels(input({ durationMin: 60, stepMin: 15 }))).toEqual([
      "10:00",
      "10:15",
      "10:30",
      "10:45",
      "11:00",
    ]);
  });

  it("returns nothing on closed weekdays, holidays or missing hours", () => {
    expect(generateSlots(input({ hours: { openMin: 600, closeMin: 720, isClosed: true } }))).toEqual([]);
    expect(generateSlots(input({ isHoliday: true }))).toEqual([]);
    expect(generateSlots(input({ hours: null }))).toEqual([]);
  });

  it("skips slots that overlap existing bookings", () => {
    const busy = [{ start: at("2026-10-13T03:30:00Z"), end: at("2026-10-13T04:00:00Z") }]; // 10:30–11:00
    expect(labels(input({ busy }))).toEqual(["10:00", "11:00", "11:30"]);
    // A 60-minute service cannot start at 10:00 because it would run into 10:30
    expect(labels(input({ busy, durationMin: 60 }))).toEqual(["11:00"]);
  });

  it("hides slots in the past and inside the minimum lead time", () => {
    const now = at("2026-10-13T03:10:00Z"); // 10:10 local
    expect(labels(input({ now, minLeadMin: 0 }))).toEqual(["10:30", "11:00", "11:30"]);
    expect(labels(input({ now, minLeadMin: 60 }))).toEqual(["11:30"]);
  });

  it("rejects invalid duration/step", () => {
    expect(() => generateSlots(input({ durationMin: 0 }))).toThrow();
    expect(() => generateSlots(input({ stepMin: -5 }))).toThrow();
  });

  it("works across DST changes in other timezones", () => {
    // 2026-03-08: New York switches to UTC-4 at 02:00 local
    const slots = generateSlots(
      input({
        date: "2026-03-08",
        timezone: "America/New_York",
        hours: { openMin: 9 * 60, closeMin: 10 * 60, isClosed: false },
        now: at("2026-03-01T00:00:00Z"),
      }),
    );
    expect(slots[0].start.toISOString()).toBe("2026-03-08T13:00:00.000Z");
  });
});

describe("isSlotAvailable", () => {
  it("accepts only start times that generateSlots would offer", () => {
    expect(isSlotAvailable(input(), at("2026-10-13T03:00:00Z"))).toBe(true);
    expect(isSlotAvailable(input(), at("2026-10-13T03:10:00Z"))).toBe(false); // not on the grid
    expect(isSlotAvailable(input(), at("2026-10-13T05:00:00Z"))).toBe(false); // 12:00 = closing
  });
});
