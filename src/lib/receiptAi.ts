import { supabase } from './supabase'
import type { ReceiptParseSuggestion } from './types'

export type SuggestReceiptOptions = {
  budgetHints?: string[]
}

export async function suggestReceiptFromImage(
  file: File,
  options: SuggestReceiptOptions = {},
): Promise<{ suggestion: ReceiptParseSuggestion | null; error: string | null }> {
  if (!file.type.startsWith('image/')) {
    return {
      suggestion: null,
      error: 'Kvitteringsleser støtter bilder (JPEG/PNG). For PDF, fyll ut manuelt.',
    }
  }

  const base64 = await fileToBase64(file)
  const mimeType = file.type || 'image/jpeg'

  const { data, error } = await supabase.functions.invoke('parse-receipt', {
    body: {
      imageBase64: base64,
      mimeType,
      budgetHints: options.budgetHints?.slice(0, 40),
    },
  })

  const payload = data as {
    suggestion?: ReceiptParseSuggestion
    error?: string
  } | null

  if (payload?.error) {
    return { suggestion: null, error: payload.error }
  }

  if (error) {
    const msg = error.message ?? 'Kunne ikke kalle kvitteringsleser'
    if (msg.includes('404') || msg.includes('not found')) {
      return {
        suggestion: null,
        error:
          'Kvitteringsleser er ikke aktivert ennå. Deploy Edge Function parse-receipt og sett OPENAI_API_KEY (se README).',
      }
    }
    if (msg.includes('503') || msg.includes('OPENAI')) {
      return {
        suggestion: null,
        error:
          'OPENAI_API_KEY mangler på Supabase. Legg den inn under Edge Function secrets, eller fyll ut manuelt.',
      }
    }
    return { suggestion: null, error: msg }
  }

  if (!payload?.suggestion) {
    return { suggestion: null, error: 'Ingen forslag returnert fra kvitteringsleser.' }
  }

  return { suggestion: payload.suggestion, error: null }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Kunne ikke lese fil'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Kunne ikke lese fil'))
    reader.readAsDataURL(file)
  })
}
