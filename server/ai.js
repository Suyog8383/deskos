'use strict';

/**
 * ai.js — Multi-model OpenRouter AI integration
 *
 * Supports multiple models per query with:
 *   • Explicit model selection (phone passes "model" in the request)
 *   • Automatic fallback chain (tries each model in order if one fails)
 *   • Per-model token limits to protect the $10 credit
 *
 * Environment variables:
 *   OPENROUTER_API_KEY  - Your sk-or-... key
 *   AI_MODEL            - Default model slug (overridden per-request)
 */

const axios = require('axios');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ─── Model Roster ───────────────────────────────────────────────────────────
// Models available to the phone. Order = fallback priority (index 0 = first try).
// The phone can pick any model by its "id" field.
const MODELS = [
  {
    id: 'minimax-m3-free',
    slug: 'minimax/minimax-m3:free',
    label: 'MiniMax M3 (Free)',
    maxTokens: 1024,
    cost: 'free',
  },
  {
    id: 'deepseek-r1-free',
    slug: 'deepseek/deepseek-r1:free',
    label: 'DeepSeek R1 (Free, reasoning)',
    maxTokens: 1024,
    cost: 'free',
  },
  {
    id: 'gemma-3-free',
    slug: 'google/gemma-3-27b-it:free',
    label: 'Google Gemma 3 27B (Free)',
    maxTokens: 1024,
    cost: 'free',
  },
  {
    id: 'llama-4-free',
    slug: 'meta-llama/llama-4-maverick:free',
    label: 'Llama 4 Maverick (Free)',
    maxTokens: 1024,
    cost: 'free',
  },
  // ⚠️ PAID — only used as last-resort fallback if all free models fail
  {
    id: 'deepseek-chat',
    slug: 'deepseek/deepseek-chat',
    label: 'DeepSeek Chat (Paid fallback)',
    maxTokens: 512,
    cost: '$0.14/M',
  },
];

// Default model if none specified (uses AI_MODEL env var, falls back to minimax-m3-free)
function getDefaultModel() {
  const envSlug = process.env.AI_MODEL;
  if (envSlug) {
    const match = MODELS.find(m => m.slug === envSlug || m.id === envSlug);
    if (match) return match;
  }
  return MODELS[0]; // minimax-m3-free
}

/**
 * Query a specific model.
 * @param {string} userText
 * @param {object} model  - entry from MODELS array
 * @param {string} [systemPrompt]
 * @returns {Promise<string>}
 */
async function callModel(userText, model, systemPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.startsWith('sk-or-paste')) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const messages = [
    {
      role: 'system',
      content: systemPrompt ||
        'You are a helpful assistant integrated into DeskOS, a phone-to-PC control app. ' +
        'The user may send OCR-captured text from their phone screen. ' +
        'Be concise, clear, and actionable.',
    },
    { role: 'user', content: userText },
  ];

  console.log(`[AI] → Trying model: ${model.label} (${model.slug})`);

  const response = await axios.post(
    OPENROUTER_URL,
    {
      model: model.slug,
      messages,
      max_tokens: model.maxTokens,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/deskos-hackathon',
        'X-Title': 'DeskOS',
      },
      timeout: 30_000,
    }
  );

  const result = response.data?.choices?.[0]?.message?.content;
  if (!result) throw new Error('Empty response from model');

  console.log(`[AI] ✅ ${model.label} responded (${result.length} chars)`);
  return result;
}

/**
 * Query the AI with automatic fallback across the model roster.
 *
 * @param {string}   userText      - Prompt / OCR text from the phone
 * @param {string}   [modelId]     - Specific model ID to use (from MODELS[].id)
 *                                   If omitted, uses the default + fallback chain
 * @param {string}   [systemPrompt]- Optional system instruction override
 * @returns {Promise<{result: string, model: string, modelLabel: string}>}
 */
async function queryAI(userText, modelId, systemPrompt) {
  // ── Single specific model requested ────────────────────────────────────────
  if (modelId) {
    const model = MODELS.find(m => m.id === modelId || m.slug === modelId);
    if (!model) {
      throw new Error(`Unknown model ID "${modelId}". Call LIST_MODELS to see available models.`);
    }
    const result = await callModel(userText, model, systemPrompt);
    return { result, model: model.id, modelLabel: model.label };
  }

  // ── Fallback chain: try default first, then rest of the roster ────────────
  const defaultModel = getDefaultModel();
  const fallbackOrder = [
    defaultModel,
    ...MODELS.filter(m => m.id !== defaultModel.id),
  ];

  const errors = [];
  for (const model of fallbackOrder) {
    try {
      const result = await callModel(userText, model, systemPrompt);
      return { result, model: model.id, modelLabel: model.label };
    } catch (err) {
      console.warn(`[AI] ⚠️  ${model.label} failed: ${err.message}`);
      errors.push(`${model.label}: ${err.message}`);
    }
  }

  throw new Error(`All models failed:\n${errors.join('\n')}`);
}

/**
 * Returns the model roster (for LIST_MODELS action on the phone).
 */
function listModels() {
  const defaultModel = getDefaultModel();
  return MODELS.map(m => ({
    id: m.id,
    label: m.label,
    cost: m.cost,
    default: m.id === defaultModel.id,
  }));
}

module.exports = { queryAI, listModels };
