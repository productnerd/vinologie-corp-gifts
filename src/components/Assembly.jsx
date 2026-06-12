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

function Swatches({ title, options, selectedId, onSelect }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-cream/40">{title}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            title={`${o.name}${Number(o.surcharge) ? ` · +${eur(o.surcharge)}` : ''}`}
            className={
              'h-8 w-8 rounded-full border transition ' +
              (o.id === selectedId ? 'ring-2 ring-gold ring-offset-2 ring-offset-panel' : 'border-white/15 hover:scale-105')
            }
            style={{ background: o.color_hex }}
          />
        ))}
      </div>
    </div>
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

function ProductCard({ product, onAdd, wine }) {
  const hasScores = product.body != null
  return (
    <button
      onClick={() => onAdd(product)}
      className="group relative flex w-full gap-3 rounded-xl border border-white/10 bg-panel p-2.5 text-left transition hover:border-cream/40 hover:bg-white/[0.04]"
    >
      {product.popular && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-gold">
          ★ POPULAR
        </span>
      )}
      {/* Wines: bare slender bottle at max height (no container). Snacks: in a tile. */}
      {wine ? (
        <div className="flex w-14 shrink-0 items-center justify-center">
          <ProductThumb product={product} className="max-h-40 w-auto max-w-14 object-contain" />
        </div>
      ) : (
        <div className="flex w-16 shrink-0 items-center justify-center rounded-lg bg-white/5 p-1">
          <ProductThumb product={product} className="max-h-32 w-auto max-w-full object-contain" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="pr-12 text-xs font-medium leading-snug text-cream/85">{product.name}</div>
        {product.country && (
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-cream/40">{product.country}</div>
        )}
        {product.description && (
          <div className="mt-1 text-[10px] leading-snug text-cream/50 line-clamp-2">{product.description}</div>
        )}
        {hasScores && (
          <div className="mt-2 flex flex-col gap-0.5">
            <ScoreBar label="Body" value={product.body} />
            <ScoreBar label="Acid" value={product.acidity} />
            {product.tannin > 1 && <ScoreBar label="Tann" value={product.tannin} />}
            <ScoreBar label="Swt" value={product.sweetness} />
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs font-semibold text-cream">{eur(product.price)}</span>
          <span className="text-[10px] font-semibold text-gold opacity-0 transition group-hover:opacity-100">+ Add to box</span>
        </div>
      </div>
    </button>
  )
}

export default function Assembly({
  templates, categories, productsByCat, bowOptions, paperOptions,
  box, onApplyTemplate, onAddProduct, onSetBow, onSetPaper,
}) {
  const [openCat, setOpenCat] = useState(categories[0]?.id ?? null)

  return (
    <div className="flex flex-col gap-7">
      {/* Templates */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-cream/40">Start from a template</div>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => {
            const active = box.templateId === t.id
            return (
              <button
                key={t.id}
                onClick={() => onApplyTemplate(t)}
                className={
                  'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ' +
                  (active
                    ? 'border-cream bg-cream text-ink'
                    : 'border-cream/25 bg-cream/10 text-cream hover:bg-cream/20')
                }
              >
                {t.name}
              </button>
            )
          })}
          <button
            onClick={() => onApplyTemplate(null)}
            className={
              'rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ' +
              (box.templateId === 'custom'
                ? 'border-cream bg-cream text-ink'
                : 'border-white/15 text-cream/50 hover:bg-white/5')
            }
          >
            Custom · unlimited
          </button>
        </div>
      </div>

      {/* Bow + filler paper colors */}
      <div className="flex flex-wrap gap-8">
        <Swatches title="Bow color" options={bowOptions} selectedId={box.bowId} onSelect={onSetBow} />
        <Swatches title="Filler paper color" options={paperOptions} selectedId={box.paperId} onSelect={onSetPaper} />
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-3">
        {categories.map((cat) => {
          const items = productsByCat[cat.id] || []
          const open = openCat === cat.id
          const wineLike = cat.id === 'red_wine' || cat.id === 'white_wine' || cat.id === 'spirits'
          const gridCols = wineLike ? 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'sm:grid-cols-2'
          return (
            <div key={cat.id} className="rounded-xl border border-white/10">
              <button
                onClick={() => setOpenCat(open ? null : cat.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-semibold text-cream/80">{cat.name}</span>
                <span className="text-xs text-cream/40">{items.length} · {open ? '−' : '+'}</span>
              </button>
              {open && (
                <div className={'grid grid-cols-1 gap-3 px-4 pb-4 ' + gridCols}>
                  {items.map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={onAddProduct} wine={wineLike} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
