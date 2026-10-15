import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

type Body = {
  imageBase64?: string
  mimeType?: string
  budgetHints?: string[]
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY")
    if (!apiKey) {
      return json(
        {
          error:
            "OPENAI_API_KEY mangler i Edge Function-secrets. Fyll ut manuelt eller legg til nøkkel i Supabase Dashboard.",
        },
        503,
      )
    }

    const body = (await req.json()) as Body
    if (!body.imageBase64) {
      return json({ error: "imageBase64 mangler" }, 400)
    }

    const mimeType = body.mimeType ?? "image/jpeg"
    const dataUrl = `data:${mimeType};base64,${body.imageBase64}`
    const hints = (body.budgetHints ?? []).filter(Boolean)
    const hintBlock =
      hints.length > 0
        ? `\nBudsjettposter i prosjektet (bruk nærmeste i budget_item_hint):\n${hints.map((h) => `- ${h}`).join("\n")}`
        : ""

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Du leser norske kvitteringer og fakturaer for et oppussingsprosjekt.
Returner JSON med feltene:
vendor (string),
receipt_date (YYYY-MM-DD eller null),
amount (number, total inkl mva),
vat_amount (number eller null),
cost_type ("materials" | "labor" | "other"),
description (kort tekst),
budget_item_hint (kort tekst som matcher en av budsjettpostene nedenfor, eller generelt ord som "flis", "riving").
Bruk null for ukjente felter.${hintBlock}`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Les kvitteringen og foreslå verdier for registrering.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 500,
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      return json({ error: `OpenAI-feil: ${errText}` }, 502)
    }

    const completion = await openaiRes.json()
    const content = completion.choices?.[0]?.message?.content
    if (!content) {
      return json({ error: "Tomt svar fra OpenAI" }, 502)
    }

    const suggestion = JSON.parse(content)
    return json({ suggestion })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ukjent feil"
    return json({ error: message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
