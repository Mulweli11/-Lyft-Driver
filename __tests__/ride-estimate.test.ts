import {
  estimateArrivalTime,
  estimateRideDurationMinutes,
} from "../lib/utils";

describe("ride drop-off estimates", () => {
  it("uses the stored ride duration when available", () => {
    expect(
      estimateRideDurationMinutes({
        durationMinutes: 27,
        originLatitude: -26.2,
        originLongitude: 28,
        destinationLatitude: -26.3,
        destinationLongitude: 28.1,
      }),
    ).toBe(27);
  });

  it("estimates duration from pickup and drop-off coordinates", () => {
    expect(
      estimateRideDurationMinutes({
        originLatitude: -26.2041,
        originLongitude: 28.0473,
        destinationLatitude: -26.2,
        destinationLongitude: 28.1,
      }),
    ).toBeGreaterThan(0);
  });

  it("returns null when duration and usable coordinates are missing", () => {
    expect(estimateRideDurationMinutes({})).toBeNull();
  });

  it("calculates the drop-off time from pickup time plus duration", () => {
    expect(
      estimateArrivalTime("2026-10-07T10:00:00.000Z", 30)?.toISOString(),
    ).toBe("2026-10-07T10:30:00.000Z");
  });
});
