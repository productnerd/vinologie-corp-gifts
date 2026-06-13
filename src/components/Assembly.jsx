import { useState } from 'react'
import { eur } from '../lib/pricing'
import { asset } from '../lib/asset'

// Cutout image with graceful fallback to the original Wolt photo.
function ProductThumb({ product, className }) {
  const [src, setSrc] = useState(asset(`assets/products/${product.slug}.png`))
  return (
    <img
      src={src} alt={product.name} className={className} draggable={false}
      onError={() => { if (product.source_photo_url && src !== product.source_photo_url) setSrc(product.source_photo_url) }}
    />
  )
}

function ScoreBar({ label, value }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-9 shrink-0 text-[9px] uppercase tracking-wide text-cream/40">{label}</span>
      <div className="flex flex-1 gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={'h-1 flex-1 rounded-full ' + (i <= value ? 'bg-gold' : 'bg-white/10')} />
        ))}
      </div>
    </div>
  )
}

function ProductCard({ product, onAdd, wine, added: inBox, blocked }) {
  const hasScores = product.body != null
  const [flash, setFlash] = useState(false)
  const handleClick = () => {
    onAdd(product)
    if (blocked) return
    setFlash(true)
    window.clearTimeout(handleClick._t)
    handleClick._t = window.setTimeout(() => setFlash(false), 950)
  }
  const state = inBox
    ? 'cursor-add border-gold/70 bg-gold/[0.07] ring-1 ring-gold/40'
    : blocked
      ? 'cursor-block border-white/10 bg-panel opacity-50'
      : 'cursor-add border-white/10 bg-panel hover:border-cream/40 hover:bg-cream-bright/[0.04]'
  return (
    <button
      onClick={handleClick}
      className={'group relative flex w-full flex-col gap-2 overflow-hidden rounded-xl border p-2.5 text-left transition ' + state + (blocked ? ' cursor-block' : '')}
    >
      {/* ADDED pill — top right when in the box */}
      {inBox && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold tracking-wide text-ink">
          ADDED
        </span>
      )}
      {/* Popular pill — top left, above the name */}
      {product.popular && (
        <span className="w-fit rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-gold">
          ★ POPULAR
        </span>
      )}
      {/* Name spans the full card width (reserve space only when the ADDED pill is shown) */}
      <div className={'text-xs font-medium leading-snug text-cream/85 ' + (inBox ? 'pr-16' : '')}>{product.name}</div>

      <div className="flex flex-1 gap-3">
        {/* Wines: bare slender bottle at max height. Snacks: in a tile. */}
        {wine ? (
          <div className="flex w-16 shrink-0 items-center justify-center">
            <ProductThumb product={product} className="max-h-44 w-auto max-w-16 object-contain" />
          </div>
        ) : (
          <div className="flex w-16 shrink-0 items-center justify-center rounded-lg bg-white/5 p-1">
            <ProductThumb product={product} className="max-h-28 w-auto max-w-full object-contain" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {product.country && (
            <div className="text-[10px] font-medium uppercase tracking-wide text-cream/40">{product.country}</div>
          )}
          {product.description && (
            <div title={product.description} className="mt-1 text-[8px] leading-tight text-cream/45 line-clamp-3 group-hover:line-clamp-none">{product.description}</div>
          )}
          {hasScores && (
            <div className="mt-2 flex flex-col gap-0.5">
              <ScoreBar label="Body" value={product.body} />
              <ScoreBar label="Acid" value={product.acidity} />
              {product.tannin > 1 && <ScoreBar label="Tann" value={product.tannin} />}
              <ScoreBar label="Swt" value={product.sweetness} />
            </div>
          )}
        </div>
      </div>

      {/* Price, right-aligned */}
      <div className="text-right text-sm font-semibold text-cream">{eur(product.price)}</div>

      {/* Added confirmation flash */}
      <div className={'pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-1.5 bg-gold/20 text-sm font-semibold text-gold backdrop-blur-[1px] transition-opacity duration-150 ' + (flash ? 'opacity-100' : 'opacity-0')}>
        ✓ Added to box
      </div>
    </button>
  )
}

const SLOT_LABEL = { wine: 'wine', spirits: 'spirit', snacks: 'snack' }
const describeSlots = (slots) =>
  Object.entries(slots).map(([k, v]) => `${v} ${SLOT_LABEL[k] || k}${v > 1 ? 's' : ''}`).join(' · ')

const AI_PLACEHOLDER =
  "Tell me your budget & taste… e.g. “€45/box — 2 full-bodied Italian reds, a whisky, and an assortment of dark chocolate and a calming tea.”"

export default function Assembly({
  templates, sections,
  box, addedIds, addable, onApplyTemplate, onAddProduct,
  aiBrief, onAiBriefChange, onAiSend, aiLoading, aiError,
}) {
  return (
    <div className="flex flex-col gap-7">
      {/* AI Somm — label + textbox + send (no separate container) */}
      <div>
        <div className="mb-1.5 font-display text-sm text-gold">AI Somm</div>
        <div className="relative">
          <textarea
            value={aiBrief}
            onChange={(e) => onAiBriefChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onAiSend() } }}
            rows="3"
            placeholder={AI_PLACEHOLDER}
            className="w-full resize-none rounded-lg border border-white/15 bg-panel2 p-2.5 pb-12 text-sm text-cream placeholder:text-cream/40"
          />
          <button
            onClick={onAiSend}
            disabled={!aiBrief.trim() || aiLoading}
            title="Ask AI Somm"
            className="glow-cta absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gold text-base font-bold text-ink transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
          >
            {aiLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" /> : '↑'}
          </button>
        </div>
        {aiError && <p className="mt-1.5 text-xs text-red-400">{aiError}</p>}
      </div>

      {/* Templates */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-cream/40">Start from a box size</div>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => {
            const active = box.templateId === t.id
            return (
              <button
                key={t.id}
                onClick={() => onApplyTemplate(t)}
                className={
                  'flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2 transition ' +
                  (active ? 'border-cream bg-cream text-ink' : 'border-cream/25 bg-cream/10 text-cream hover:bg-cream/20')
                }
              >
                <span className="text-xs font-bold uppercase tracking-wide">{t.name}</span>
                <span className={'text-[10px] ' + (active ? 'text-ink/60' : 'text-cream/45')}>{describeSlots(t.slots)}</span>
              </button>
            )
          })}
          <button
            onClick={() => onApplyTemplate(null)}
            className={
              'flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2 transition ' +
              (box.templateId === 'custom' ? 'border-cream bg-cream text-ink' : 'border-white/15 text-cream/50 hover:bg-cream-bright/5')
            }
          >
            <span className="text-xs font-bold uppercase tracking-wide">Custom</span>
            <span className={'text-[10px] ' + (box.templateId === 'custom' ? 'text-ink/60' : 'text-cream/40')}>unlimited</span>
          </button>
        </div>
      </div>

      {/* Sections — always expanded (snacks split into Snacks / Coffee / Tea) */}
      <div className="flex flex-col gap-5">
        {sections.map((sec) => {
          const blocked = addable ? !addable[sec.bucket] : false
          const gridCols = sec.wineLike ? 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'sm:grid-cols-2'
          return (
            <div key={sec.key}>
              <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-display text-base text-cream/85">{sec.name}</span>
                <span className="text-xs text-cream/40">{sec.items.length}</span>
              </div>
              <div className={'grid grid-cols-1 gap-3 ' + gridCols}>
                {sec.items.map((p) => (
                  <ProductCard key={p.id} product={p} onAdd={onAddProduct} wine={sec.wineLike} added={addedIds?.has(p.id)} blocked={blocked} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
