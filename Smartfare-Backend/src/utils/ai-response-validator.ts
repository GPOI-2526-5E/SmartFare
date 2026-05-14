/**
 * AI Response Validator
 * Robust JSON parsing and validation for Gemini API responses
 */

import { AiItineraryChatResponse } from '../models/ai.model';
import { AI_ACTION_TYPES, AI_SUGGESTION_TYPES } from '../constants/chat.constants';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

/**
 * Validates and parses Gemini AI response
 * Handles malformed JSON, missing fields, and edge cases
 */
export class AiResponseValidator {
  private static readonly MAX_REPLY_LENGTH = 4000;
  private static readonly MAX_SUGGESTIONS = 10;
  private static readonly MAX_ACTIONS = 10;
  private static readonly MAX_FOLLOW_UP = 5;

  /**
   * Parse and validate AI response with fallback strategies
   */
  static validateAndParse(
    text: string,
    fallbackReply?: string
  ): ValidationResult<AiItineraryChatResponse> {
    const errors: string[] = [];

    if (!text || typeof text !== 'string') {
      return this.createFallbackResponse(
        fallbackReply || 'Non sono riuscito a generare una risposta.',
        ['Input text invalid or empty']
      );
    }

    // Try to parse JSON
    const parseResult = this.tryParseJson(text.trim());
    if (!parseResult.success || !parseResult.data) {
      return this.createFallbackResponse(
        text.substring(0, this.MAX_REPLY_LENGTH) || fallbackReply || 'Risposta ricevuta.',
        ['JSON parsing failed, using raw text as fallback', ...parseResult.errors]
      );
    }

    const parsed = parseResult.data as Record<string, unknown>;

    // Validate required fields
    const validation = this.validateStructure(parsed, errors);
    if (!validation) {
      return this.createFallbackResponse(
        this.extractReplyFromRawJson(parsed) || fallbackReply || 'Risposta ricevuta.',
        errors
      );
    }

    // Build response with sanitized data
    const response: AiItineraryChatResponse = {
      reply: this.sanitizeReply(parsed.reply as string),
      suggestions: this.sanitizeSuggestions(parsed.suggestions as any[] || []),
      actions: this.sanitizeActions(parsed.actions as any[] || []),
      followUpQuestions: this.sanitizeFollowUpQuestions(parsed.followUpQuestions as string[] || []),
      needsConfirmation: Boolean(parsed.needsConfirmation)
    };

    return {
      success: true,
      data: response,
      errors
    };
  }

  /**
   * Attempt JSON parsing with error capture
   */
  private static tryParseJson(text: string): ValidationResult<unknown> {
    const errors: string[] = [];

    // Try direct JSON parse
    try {
      const data = JSON.parse(text);
      return { success: true, data, errors };
    } catch (e) {
      errors.push(`Direct JSON parse failed: ${(e as Error).message}`);
    }

    // Try extracting JSON from text (in case of extra text)
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return { success: true, data, errors };
      }
    } catch (e) {
      errors.push(`Regex JSON extraction failed`);
    }

    // Try removing markdown code blocks
    try {
      const cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      if (cleaned !== text) {
        const data = JSON.parse(cleaned);
        return { success: true, data, errors };
      }
    } catch (e) {
      errors.push(`Markdown cleanup parse failed`);
    }

    return { success: false, errors };
  }

  /**
   * Public helper to attempt JSON parsing using internal strategies.
   * Returns the same ValidationResult structure as the internal parser.
   */
  static parseJson(text: string): ValidationResult<unknown> {
    return this.tryParseJson(text);
  }

  /**
   * Validate JSON structure before processing
   */
  private static validateStructure(data: Record<string, unknown>, errors: string[]): boolean {
    // reply is mandatory
    if (!data.reply || typeof data.reply !== 'string') {
      errors.push('Missing or invalid "reply" field');
      return false;
    }

    // Validate suggestions array if present
    if (data.suggestions !== undefined) {
      if (!Array.isArray(data.suggestions)) {
        errors.push('"suggestions" must be an array');
        data.suggestions = [];
      }
    }

    // Validate actions array if present
    if (data.actions !== undefined) {
      if (!Array.isArray(data.actions)) {
        errors.push('"actions" must be an array');
        data.actions = [];
      }
    }

    // Validate followUpQuestions array if present
    if (data.followUpQuestions !== undefined) {
      if (!Array.isArray(data.followUpQuestions)) {
        errors.push('"followUpQuestions" must be an array');
        data.followUpQuestions = [];
      }
    }

    return true;
  }

  /**
   * Sanitize reply text
   */
  private static sanitizeReply(reply: string): string {
    if (!reply || typeof reply !== 'string') {
      return 'Risposta non disponibile.';
    }

    return reply
      .trim()
      .substring(0, this.MAX_REPLY_LENGTH)
      .replace(/\n{3,}/g, '\n\n'); // Remove excessive newlines
  }

  /**
   * Sanitize suggestions array
   */
  private static sanitizeSuggestions(suggestions: unknown[]): AiItineraryChatResponse['suggestions'] {
    if (!Array.isArray(suggestions)) {
      return [];
    }

    return suggestions
      .slice(0, this.MAX_SUGGESTIONS)
      .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
      .map(s => ({
        title: String(s.title || 'Suggerimento').substring(0, 200),
        description: s.description ? String(s.description).substring(0, 500) : undefined,
        type: this.validateSuggestionType(s.type)
      }));
  }

  /**
   * Validate suggestion type is one of allowed values
   */
  private static validateSuggestionType(type: unknown): AiItineraryChatResponse['suggestions'][0]['type'] {
    const validTypes = Object.values(AI_SUGGESTION_TYPES) as string[];
    if (typeof type === 'string' && validTypes.includes(type)) {
      return type as any;
    }
    return 'general';
  }

  /**
   * Sanitize actions array
   */
  private static sanitizeActions(actions: unknown[]): AiItineraryChatResponse['actions'] {
    if (!Array.isArray(actions)) {
      return [];
    }

    return actions
      .slice(0, this.MAX_ACTIONS)
      .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
      .map(a => ({
        type: this.validateActionType(a.type),
        payload: (typeof a.payload === 'object' && a.payload !== null) ? (a.payload as Record<string, unknown>) : undefined
      }));
  }

  /**
   * Validate action type is one of allowed values
   */
  private static validateActionType(type: unknown): AiItineraryChatResponse['actions'][0]['type'] {
    const validTypes = Object.values(AI_ACTION_TYPES) as string[];
    if (typeof type === 'string' && validTypes.includes(type)) {
      return type as any;
    }
    return 'suggest';
  }

  /**
   * Sanitize followUpQuestions array
   */
  private static sanitizeFollowUpQuestions(questions: unknown[]): string[] {
    if (!Array.isArray(questions)) {
      return [];
    }

    return questions
      .slice(0, this.MAX_FOLLOW_UP)
      .filter((q): q is string => typeof q === 'string' && q.length > 0)
      .map(q => q.substring(0, 200));
  }

  /**
   * Extract reply from raw JSON even if other fields are invalid
   */
  private static extractReplyFromRawJson(data: Record<string, unknown>): string | null {
    if (typeof data.reply === 'string' && data.reply.length > 0) {
      return this.sanitizeReply(data.reply);
    }
    return null;
  }

  /**
   * Create fallback response with errors logged
   */
  private static createFallbackResponse(
    reply: string,
    errors: string[]
  ): ValidationResult<AiItineraryChatResponse> {
    console.warn('[AI Response Validator] Fallback response:', { errors });

    return {
      success: false,
      data: {
        reply: this.sanitizeReply(reply),
        suggestions: [],
        actions: [],
        followUpQuestions: [],
        needsConfirmation: false
      },
      errors
    };
  }
}
