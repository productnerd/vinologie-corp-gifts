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

function Swatches({ title, note, options, selectedId, onSelect }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-1.5 text-xs font-semibold uppercase tracking-wide text-cream/40">
        {title}
        {note && <span className="font-medium normal-case tracking-normal text-gold">{note}</span>}
      </div>
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
  const [added, setAdded] = useState(false)
  const handleClick = () => {
    onAdd(product)
    setAdded(true)
    window.clearTimeout(handleClick._t)
    handleClick._t = window.setTimeout(() => setAdded(false), 950)
  }
  return (
    <button
      onClick={handleClick}
      className="cursor-add group relative flex w-full flex-col gap-2 overflow-hidden rounded-xl border border-white/10 bg-panel p-2.5 text-left transition hover:border-cream/40 hover:bg-cream-bright/[0.04]"
    >
      {product.popular && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-gold">
          ★ POPULAR
        </span>
      )}
      {/* Name spans the full card width */}
      <div className="pr-16 text-xs font-medium leading-snug text-cream/85">{product.name}</div>

      <div className="flex flex-1 gap-3">
        {/* Wines: bare slender bottle at max height. Snacks: in a tile. */}
        {wine ? (
          <div className="flex w-12 shrink-0 items-center justify-center">
            <ProductThumb product={product} className="max-h-36 w-auto max-w-12 object-contain" />
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
            <div className="mt-1 text-[8px] leading-tight text-cream/45 line-clamp-2">{product.description}</div>
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
      <div className={'pointer-events-none absolute inset-0 z-20 flex items-center justify-center gap-1.5 bg-gold/20 text-sm font-semibold text-gold backdrop-blur-[1px] transition-opacity duration-150 ' + (added ? 'opacity-100' : 'opacity-0')}>
        ✓ Added to box
      </div>
    </button>
  )
}

export default function Assembly({
  templates, categories, productsByCat, bowOptions, paperOptions,
  box, onApplyTemplate, onAddProduct, onSetBow, onSetPaper,
}) {
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
                : 'border-white/15 text-cream/50 hover:bg-cream-bright/5')
            }
          >
            Custom · unlimited
          </button>
        </div>
      </div>

      {/* Bow + filler paper colors */}
      <div className="flex flex-wrap gap-8">
        <Swatches title="Bow color" note="+€2.50 / colour" options={bowOptions} selectedId={box.bowId} onSelect={onSetBow} />
        <Swatches title="Filler paper color" note="+€2.50 / colour" options={paperOptions} selectedId={box.paperId} onSelect={onSetPaper} />
      </div>

      {/* Categories — always expanded */}
      <div className="flex flex-col gap-5">
        {categories.map((cat) => {
          const items = productsByCat[cat.id] || []
          const wineLike = cat.id === 'red_wine' || cat.id === 'white_wine' || cat.id === 'spirits'
          const gridCols = wineLike ? 'sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'sm:grid-cols-2'
          return (
            <div key={cat.id}>
              <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                <span className="font-display text-base text-cream/85">{cat.name}</span>
                <span className="text-xs text-cream/40">{items.length}</span>
              </div>
              <div className={'grid grid-cols-1 gap-3 ' + gridCols}>
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} onAdd={onAddProduct} wine={wineLike} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
