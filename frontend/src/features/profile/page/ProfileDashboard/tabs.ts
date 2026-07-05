export const PROFILE_TABS = ['profile', 'preferences', 'account', 'people'] as const
export type ProfileTab = (typeof PROFILE_TABS)[number]
