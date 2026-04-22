export const LEGACY_PROFILE_STORAGE_KEY = "myunghae_user_profile";
export const LEGACY_SAJU_CACHE_STORAGE_KEY = "myunghae_saju_v1";

export function getProfileStorageKey(userId: string): string {
  return `${LEGACY_PROFILE_STORAGE_KEY}:${userId}`;
}

export function getSajuCacheStorageKey(userId: string): string {
  return `${LEGACY_SAJU_CACHE_STORAGE_KEY}:${userId}`;
}
