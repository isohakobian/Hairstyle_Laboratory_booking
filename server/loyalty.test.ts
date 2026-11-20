import { describe, expect, it } from "vitest";
import { calculateLoyaltyProgress } from "./loyalty";

describe("loyalty registration progress", () => {
  it("keeps a new member at zero visits with five visits remaining", () => {
    expect(calculateLoyaltyProgress(0, 0)).toEqual({
      stamps: 0,
      visitsRemaining: 5,
      rewardsEarned: 0,
      rewardsAvailable: 0,
      rewardsUsed: 0,
    });
  });

  it("makes every fifth completed visit an available reward", () => {
    expect(calculateLoyaltyProgress(5, 0)).toEqual({
      stamps: 0,
      visitsRemaining: 0,
      rewardsEarned: 1,
      rewardsAvailable: 1,
      rewardsUsed: 0,
    });
  });

  it("shows progress toward the next reward after redeeming one", () => {
    expect(calculateLoyaltyProgress(6, 1)).toEqual({
      stamps: 1,
      visitsRemaining: 4,
      rewardsEarned: 1,
      rewardsAvailable: 0,
      rewardsUsed: 1,
    });
  });
});
