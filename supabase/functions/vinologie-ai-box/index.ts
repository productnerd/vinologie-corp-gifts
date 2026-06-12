import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Vinologie AI box assembler.
// Input:  { brief: string }   — natural-language: budget/box, how many types, preferences, counts
// Output: { box: [{id,name,category,price,quantity}], estimatedPerBox, rationale }
//
// Reuses the project-wide ANTHROPIC_API_KEY secret. Catalog is read server-side
// with the service role so the model is grounded in real products + prices.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const CAT_LABEL: Record<string, string> = {
  red_wine: "Red Wine", white_wine: "White Wine", spirits: "Spirits", snacks: "Snacks",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { brief } = await req.json().catch(() => ({ brief: "" }));
    if (!brief?.trim()) return json({ error: "Please describe what you'd like in the box." }, 400);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: products, error } = await supabase
      .from("vinologie_products")
      .select("id, name, price, category_id")
      .eq("active", true)
      .order("category_id");
    if (error) return json({ error: "Failed to load catalog: " + error.message }, 500);

    const catalog = (products ?? [])
      .map((p) => `${p.id} | ${CAT_LABEL[p.category_id] ?? p.category_id} | ${p.name} | EUR ${Number(p.price).toFixed(2)}`)
      .join("\n");

    const system =
      "You are a corporate gift-box assembler for Vinologie, a premium wine & spirits boutique. " +
      "You build ONE gift box by choosing items strictly from the provided catalog. " +
      "Honor the client's budget PER BOX, the requested number of different product types, the categories/styles they like, and any quantities. " +
      "Prefer variety and a balanced, giftable selection. Never invent products or prices; only use catalog rows. " +
      "If the client asks for a specific style, varietal, or product that is NOT in the catalog (e.g. a Riesling, a Prosecco, a particular brand), DO NOT drop it from the box — substitute the CLOSEST available alternative (nearest grape/style/character) and briefly note the substitution in the rationale (e.g. 'no Riesling available, so a crisp aromatic white instead'). Always fill the requested number of items. " +
      "Stay at or under the stated per-box budget. " +
      "Respond with ONLY a JSON object, no markdown, of the exact shape: " +
      '{"items":[{"id":"<catalog id>","quantity":<int>}],"rationale":"<one short friendly sentence>"}.';

    const user =
      `CATALOG (id | category | name | price):\n${catalog}\n\n` +
      `CLIENT BRIEF:\n${brief}\n\n` +
      `Return the JSON object now.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1200,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!claudeRes.ok) return json({ error: "AI error", details: await claudeRes.text() }, 502);

    const data = await claudeRes.json();
    const raw: string = data.content?.find((b: any) => b.type === "text")?.text ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: any;
    try { parsed = JSON.parse(cleaned); } catch { return json({ error: "Could not parse AI response", raw }, 502); }

    // Validate against the real catalog: only keep known ids, attach authoritative prices.
    const byId = new Map((products ?? []).map((p) => [p.id, p]));
    const box: any[] = [];
    for (const it of parsed.items ?? []) {
      const p = byId.get(it.id);
      if (!p) continue;
      const quantity = Math.max(1, Math.min(12, parseInt(it.quantity, 10) || 1));
      box.push({ id: p.id, name: p.name, category: p.category_id, price: Number(p.price), quantity });
    }
    if (box.length === 0) return json({ error: "The AI did not return any valid catalog items. Try rephrasing." }, 422);

    const estimatedPerBox = box.reduce((s, i) => s + i.price * i.quantity, 0);
    return json({ box, estimatedPerBox, rationale: String(parsed.rationale ?? "") });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
