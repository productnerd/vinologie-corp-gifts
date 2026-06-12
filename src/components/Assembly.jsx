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

function ProductCard({ product, onAdd }) {
  return (
    <button
      onClick={() => onAdd(product)}
      className="group relative flex w-full items-stretch gap-3 rounded-xl border border-white/10 bg-panel p-2.5 text-left transition hover:border-cream/40 hover:bg-white/[0.04]"
    >
      {/* Tightly-cropped transparent product photo */}
      <div className="flex w-16 shrink-0 items-center justify-center rounded-lg bg-white/5 p-1">
        <ProductThumb product={product} className="h-20 w-full object-contain" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
        <div className="text-xs font-medium leading-snug text-cream/80">{product.name}</div>
        <div className="mt-0.5 text-xs font-semibold text-cream">{eur(product.price)}</div>
        {/* Reserved space; reveals on hover so there's no layout shift */}
        <span className="mt-1 text-[11px] font-semibold text-gold opacity-0 transition group-hover:opacity-100">
          + Add to box
        </span>
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
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onApplyTemplate(t)}
              className="rounded-full border border-cream/25 bg-cream/10 px-3 py-1.5 text-sm font-medium text-cream hover:bg-cream hover:text-ink"
            >
              {t.name}
            </button>
          ))}
          <button
            onClick={() => onApplyTemplate(null)}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-medium text-cream/50 hover:bg-white/5"
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
                <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">
                  {items.map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={onAddProduct} />
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
