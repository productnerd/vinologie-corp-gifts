# Vinologie Corporate Gift Boxes — build plan

Single-page demo. React + Vite + Tailwind v4. Backend: Supabase **SeeHer** project
(`knftyqkhampkqchoncel`), tables prefixed `vinologie_`.

## Decisions (locked with Maria)
- AI → Supabase Edge Function (Anthropic key server-side)
- Bulk discount → total **box count**: >20 = 5%, >50 = 10%
- Templates → empty slots you fill
- Pricing → products + bow surcharge + paper surcharge

## Steps
- [x] 1. Scaffold two-panel SPA — *dev server runs, layout renders*
- [x] 2. DB: 5 `vinologie_` tables + `vinologie-assets` storage bucket + RLS
- [x] 3. Seed catalog from Wolt (164 products: red 39 / white 67 / spirits 7 / snacks 51)
- [x] 4. Assembly panel: templates, bow/paper swatches, category product lists, live price
- [x] 5a. Box visualization — placeholder compositor
- [~] 5b. Box visualization — real PNG layering (compositor built: box.png + cutouts + bow;
        awaiting box.png on disk + the cutout batch to finish)
- [x] 6. Basket: add box, edit qty, edit box contents, tiered discount
- [x] 7. Submit order → `vinologie_orders` (verified end-to-end, RLS anon insert OK)
- [x] 8. AI assembler — Edge Function `vinologie-ai-box`, reuses existing ANTHROPIC_API_KEY
        secret, verified end-to-end in UI (brief → recommendation → Use this box)
- [ ] 9. Deploy (GitHub Pages / Netlify — NOT Vercel)

## Round 3 (visualization + AI polish) — DONE
- [x] AI prompt: substitute CLOSEST available alternative for unavailable items (verified:
      Riesling → Grüner Veltliner, fills all requested items). Edge fn v2 deployed.
- [x] Background removal: all 163 product photos → transparent cutouts (rembg/u2net) in
      public/assets/products/. ~22MB.
- [x] Real box image added at public/assets/box/box.png (2048²).
- [x] Box visualization: realistic proportions — bottles tall in back, snacks ~1/3 height
      in front, resting on the filler (container-query units, two bottom-anchored bands).
- [x] Product cards: bigger tightly-cropped transparent cutout, info to the right.
- [x] Filler paper COLORS re-added (picker + multiply tint over the filler) + paper surcharge.
- [x] Basket lines show a realistic mini box preview (BoxVisual mini mode).

## Decisions update (white-filler round)
- Filler = white only → removed the paper-color picker; box price = products + bow surcharge.
- Product cutouts = auto background-removal of Wolt photos (background batch running).
  → Maria does NOT need to supply product PNGs.
- Still needed from Maria: `public/assets/box/box.png`; optional bow PNGs at
  `public/assets/bows/<color>.png` (burgundy/gold/forest/navy/cream).

## Review
Steps 1–7 done and verified in the preview (template → fill slots → price €82/box →
basket 25 boxes → 5% discount → order persisted with items JSON, then test row deleted).
Box price for an empty box = €3 (bow €2 + paper €1 surcharge) by design.

Blocked on Maria for: transparent PNGs (box base, filler-per-color, bow-per-color,
product images) and the Anthropic API key for the edge function.
