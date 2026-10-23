/** Optional author metadata; never pass this whole object into player UI. */
export interface CharacterData {
  id: string;
  preferredName?: string;
  pronouns?: string;
  relationshipNotes?: string;
  identityNotes?: string;
  authorNotes?: string;
}
/** Public names are opt-in. Notes and pronouns are not automatically disclosed. */
export function publicCharacter(character: CharacterData) {
  return { id: character.id, preferredName: character.preferredName };
}
export const PLAYER_PROFILE_KEY = 'puppy-mart.player-profile.v1';
export function normalizeName(value: string): string {
  return Array.from(value.trim()).slice(0, 16).join('');
}
export function loadName(): string {
  try {
    const profile = JSON.parse(localStorage.getItem(PLAYER_PROFILE_KEY) ?? 'null');
    return profile?.version === 1 && typeof profile.preferredName === 'string' ? normalizeName(profile.preferredName) : '';
  } catch { return ''; }
}
export function saveName(name: string): boolean {
  try { localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify({ version: 1, preferredName: normalizeName(name) })); return true; }
  catch { return false; }
}
