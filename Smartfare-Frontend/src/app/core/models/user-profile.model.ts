export interface UserProfile {
  id?: number;
  name?: string | null;
  surname?: string | null;
  city?: string | null;
  street?: string | null;
  avatarUrl?: string | null;
  backgroundImageUrl?: string | null;
  bio?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  birthDate?: string | null;
}

export interface UserPreferenceInterestCategory {
  id: number;
  name: string;
}

export interface UserPreference {
  id?: number;
  travelStyle?: string | null;
  travelStyles?: string[];
  pace?: string | null;
  travelCompanion?: string | null;
  notes?: string | null;
  interestCategoryIds?: number[];
  interestCategories?: UserPreferenceInterestCategory[];
}

export interface UserProfileFull {
  id?: number;
  email: string;
  authProvider: string;
  profile: UserProfile | null;
  preference: UserPreference | null;
  followersCount?: number;
  followingCount?: number;
  publicItinerariesCount?: number;
  isFollowing?: boolean;
  lastPublishedAt?: string | null;
  followedAt?: string;
}

export interface MyFollowersResponse {
  followers: UserProfileFull[];
  total: number;
}
