import { describe, it, expect } from "vitest";
import { assertPlaceholderFloor, ImageFallbackFloorError } from "@/lib/images/source";
import { getUserFriendlyErrorMessage } from "@/lib/utils/error";

const FALLBACK = "/fallback.png";
const real = (n: number) => Array.from({ length: n }, (_, i) => ({ imageUrl: `/temp/x/shot-${i}.png` }));
const blanks = (n: number) => Array.from({ length: n }, () => ({ imageUrl: FALLBACK }));

describe("assertPlaceholderFloor", () => {
  it("throws when the placeholder ratio exceeds the cap", async () => {
    await expect(
      assertPlaceholderFloor([...blanks(2), ...real(2)], { maxPlaceholderRatio: 0.25 }),
    ).rejects.toBeInstanceOf(ImageFallbackFloorError);
  });

  it("does not throw when the ratio is within the cap", async () => {
    await expect(
      assertPlaceholderFloor([...blanks(1), ...real(3)], { maxPlaceholderRatio: 0.5 }),
    ).resolves.toBeUndefined();
  });

  it("never trips when the cap is 1", async () => {
    await expect(
      assertPlaceholderFloor(blanks(4), { maxPlaceholderRatio: 1 }),
    ).resolves.toBeUndefined();
  });

  it("trips at the default cap when more than half the shots are blank", async () => {
    await expect(assertPlaceholderFloor([...blanks(3), ...real(2)], {})).rejects.toBeInstanceOf(ImageFallbackFloorError);
    await expect(assertPlaceholderFloor([...blanks(2), ...real(2)], {})).resolves.toBeUndefined();
  });

  it("shows the user a plain message instead of the operator detail", async () => {
    const error: Error = await assertPlaceholderFloor(blanks(4), {}).catch((e) => e);
    const shown = getUserFriendlyErrorMessage(error.message);
    expect(shown).toMatch(/couldn't find enough images/);
    expect(shown).not.toMatch(/KEY|RATIO|placeholder/);
  });
});
