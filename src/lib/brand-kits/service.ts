import { getSql, isDatabaseConfigured } from "@/lib/db";
import type { BrandColors } from "@/lib/assets/types";
import type { BrandBrainInput } from "@/lib/types/pipelineEnhancements";

export type BrandKitRow = {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  banned_phrases: string[];
  required_phrases: string[];
};

export async function listBrandKits(userId: string): Promise<BrandKitRow[]> {
  if (!isDatabaseConfigured()) return [];
  const sql = getSql();
  const rows = await sql`
    SELECT id, user_id, name, logo_url, primary_color, secondary_color, banned_phrases, required_phrases
    FROM brand_kits
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
  return rows as BrandKitRow[];
}

export async function getBrandKitForUser(
  userId: string,
  kitId: string
): Promise<BrandKitRow | null> {
  if (!isDatabaseConfigured()) return null;
  const sql = getSql();
  const rows = await sql`
    SELECT id, user_id, name, logo_url, primary_color, secondary_color, banned_phrases, required_phrases
    FROM brand_kits
    WHERE id = ${kitId}::uuid AND user_id = ${userId}
  `;
  return (rows as BrandKitRow[])[0] ?? null;
}

export async function insertBrandKit(
  userId: string,
  input: {
    name: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    bannedPhrases?: string[];
    requiredPhrases?: string[];
  }
): Promise<{ id: string }> {
  const sql = getSql();
  const banned = input.bannedPhrases ?? [];
  const required = input.requiredPhrases ?? [];
  const rows = await sql`
    INSERT INTO brand_kits (
      user_id, name, logo_url, primary_color, secondary_color, banned_phrases, required_phrases
    )
    VALUES (
      ${userId},
      ${input.name},
      ${input.logoUrl ?? null},
      ${input.primaryColor ?? null},
      ${input.secondaryColor ?? null},
      ${banned}::text[],
      ${required}::text[]
    )
    RETURNING id
  `;
  const id = (rows as { id: string }[])[0]?.id;
  if (!id) throw new Error("insertBrandKit failed");
  return { id };
}

export async function updateBrandKit(
  userId: string,
  kitId: string,
  patch: Partial<{
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    bannedPhrases: string[];
    requiredPhrases: string[];
  }>
): Promise<boolean> {
  const existing = await getBrandKitForUser(userId, kitId);
  if (!existing) return false;
  const name = patch.name !== undefined ? patch.name : existing.name;
  const logoUrl = patch.logoUrl !== undefined ? patch.logoUrl : existing.logo_url;
  const primaryColor = patch.primaryColor !== undefined ? patch.primaryColor : existing.primary_color;
  const secondaryColor = patch.secondaryColor !== undefined ? patch.secondaryColor : existing.secondary_color;
  const bannedPhrases = patch.bannedPhrases !== undefined ? patch.bannedPhrases : existing.banned_phrases;
  const requiredPhrases = patch.requiredPhrases !== undefined ? patch.requiredPhrases : existing.required_phrases;

  const sql = getSql();
  const rows = await sql`
    UPDATE brand_kits
    SET
      name = ${name},
      logo_url = ${logoUrl},
      primary_color = ${primaryColor},
      secondary_color = ${secondaryColor},
      banned_phrases = ${bannedPhrases}::text[],
      required_phrases = ${requiredPhrases}::text[],
      updated_at = now()
    WHERE id = ${kitId}::uuid AND user_id = ${userId}
    RETURNING id
  `;
  return (rows as { id: string }[]).length > 0;
}

export async function deleteBrandKit(userId: string, kitId: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM brand_kits WHERE id = ${kitId}::uuid AND user_id = ${userId} RETURNING id
  `;
  return (rows as { id: string }[]).length > 0;
}

export function brandKitToPipelineFields(kit: BrandKitRow): {
  brandColors?: BrandColors;
  brandBrain?: BrandBrainInput;
} {
  const brandColors: BrandColors | undefined =
    kit.primary_color != null && kit.primary_color.trim() !== ""
      ? {
        primary: kit.primary_color.trim(),
        ...(kit.secondary_color != null && kit.secondary_color.trim() !== ""
          ? { secondary: kit.secondary_color.trim() }
          : {}),
      }
      : undefined;

  const banned = kit.banned_phrases?.filter((s) => typeof s === "string" && s.trim());
  const required = kit.required_phrases?.filter((s) => typeof s === "string" && s.trim());
  const brandBrain: BrandBrainInput | undefined =
    (banned?.length ?? 0) > 0 || (required?.length ?? 0) > 0
      ? {
        ...(banned?.length ? { bannedPhrases: banned } : {}),
        ...(required?.length ? { requiredPhrases: required } : {}),
      }
      : undefined;

  return {
    ...(brandColors ? { brandColors } : {}),
    ...(brandBrain && Object.keys(brandBrain).length ? { brandBrain } : {}),
  };
}
