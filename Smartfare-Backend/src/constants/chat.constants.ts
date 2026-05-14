/**
 * Chat Mode Constants
 * Centralized definitions for chat modes to prevent magic strings
 */

export const CHAT_MODES = {
  PLANNER: 'planner',
  ASSISTANT: 'assistant'
} as const;

export type ChatModeType = typeof CHAT_MODES[keyof typeof CHAT_MODES];

/**
 * Chat Role Constants
 */
export const CHAT_ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant'
} as const;

export type ChatRoleType = typeof CHAT_ROLES[keyof typeof CHAT_ROLES];

/**
 * Itinerary Item Type Constants
 */
export const ITINERARY_ITEM_TYPES = {
  ACTIVITY: 'ACTIVITY',
  ACCOMMODATION: 'ACCOMMODATION',
  TRANSPORT: 'TRANSPORT'
} as const;

export type ItineraryItemTypeCode = typeof ITINERARY_ITEM_TYPES[keyof typeof ITINERARY_ITEM_TYPES];

/**
 * AI Action Type Constants
 */
export const AI_ACTION_TYPES = {
  SUGGEST: 'suggest',
  ASK_CLARIFICATION: 'ask_clarification',
  ADD_ITEM: 'add_item',
  REMOVE_ITEM: 'remove_item',
  UPDATE_ITEM: 'update_item',
  REORDER_ITEMS: 'reorder_items'
} as const;

export type AiActionType = typeof AI_ACTION_TYPES[keyof typeof AI_ACTION_TYPES];

/**
 * AI Suggestion Type Constants
 */
export const AI_SUGGESTION_TYPES = {
  POI: 'poi',
  DAY: 'day',
  FOOD: 'food',
  EVENING: 'evening',
  ROUTE: 'route',
  GENERAL: 'general'
} as const;

export type AiSuggestionType = typeof AI_SUGGESTION_TYPES[keyof typeof AI_SUGGESTION_TYPES];

/**
 * Itinerary Visibility Constants
 */
export const ITINERARY_VISIBILITY = {
  PRIVATE: 'PRIVATE',
  PUBLIC: 'PUBLIC',
  SHARED: 'SHARED'
} as const;

export type ItineraryVisibilityCode = typeof ITINERARY_VISIBILITY[keyof typeof ITINERARY_VISIBILITY];

/**
 * Gemini Model Constants
 */
export const GEMINI_MODELS = {
  PREFERRED: 'gemini-2.5-flash',
  LITE: 'gemini-2.5-flash-lite',
  STABLE: 'gemini-2.0-flash'
} as const;

export const GEMINI_MODEL_FALLBACKS = [
  GEMINI_MODELS.PREFERRED,
  GEMINI_MODELS.LITE,
  GEMINI_MODELS.STABLE
] as const;

/**
 * AI Rate Limits
 */
export const AI_RATE_LIMITS = {
  WINDOW_MS: 1 * 60 * 1000, // 1 minute
  MAX_REQUESTS: 20,
  CHAT_MAX_REQUESTS: 30,
  WINDOW_MS_CHAT: 60 * 1000
} as const;

/**
 * Traveler Type Constants
 */
export const TRAVELER_TYPES = {
  SOLO: 'solo',
  COUPLE: 'couple',
  FAMILY: 'family',
  GROUP: 'group'
} as const;

export type TravelerType = typeof TRAVELER_TYPES[keyof typeof TRAVELER_TYPES];

/**
 * Travel Pace Constants
 */
export const TRAVEL_PACE = {
  RELAXED: 'relaxed',
  MODERATE: 'moderate',
  FAST: 'fast'
} as const;

export type TravelPaceType = typeof TRAVEL_PACE[keyof typeof TRAVEL_PACE];

/**
 * Travel Style Constants
 */
export const TRAVEL_STYLE = {
  LUXURY: 'luxury',
  BUDGET: 'budget',
  ADVENTURE: 'adventure',
  CULTURAL: 'cultural',
  MIXED: 'mixed'
} as const;

export type TravelStyleType = typeof TRAVEL_STYLE[keyof typeof TRAVEL_STYLE];

/**
 * Budget Level Constants
 */
export const BUDGET_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  LUXURY: 'LUXURY'
} as const;

export type BudgetLevelCode = typeof BUDGET_LEVELS[keyof typeof BUDGET_LEVELS];
