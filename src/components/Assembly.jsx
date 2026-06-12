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
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-black/40">{title}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            title={`${o.name}${Number(o.surcharge) ? ` · +${eur(o.surcharge)}` : ''}`}
            className={
              'h-8 w-8 rounded-full border transition ' +
              (o.id === selectedId ? 'ring-2 ring-gold ring-offset-2' : 'border-black/15 hover:scale-105')
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
    <div className="group flex items-stretch gap-3 rounded-xl border border-black/10 bg-white p-2 transition hover:border-wine/40 hover:shadow-sm">
      {/* Bigger, tightly-cropped transparent product photo */}
      <div className="flex w-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-cream/60 to-white p-1">
        <ProductThumb product={product} className="h-24 w-full object-contain" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
        <div className="text-sm font-medium leading-snug text-black/80">{product.name}</div>
        <div className="mt-0.5 text-sm font-semibold text-wine">{eur(product.price)}</div>
        <button
          onClick={() => onAdd(product)}
          className="mt-2 w-fit rounded-full bg-wine/10 px-3 py-1 text-xs font-semibold text-wine transition group-hover:bg-wine group-hover:text-white"
        >
          + Add to box
        </button>
      </div>
    </div>
  )
}

export default function Assembly({
  templates, categories, productsByCat, bowOptions, paperOptions,
  box, onApplyTemplate, onAddProduct, onSetBow, onSetPaper,
}) {
  const [openCat, setOpenCat] = useState(categories[0]?.id ?? null)

  return (
    <div className="flex flex-col gap-5">
      {/* Templates */}
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-black/40">Start from a template</div>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onApplyTemplate(t)}
              className="rounded-full border border-wine/30 bg-wine/5 px-3 py-1.5 text-sm font-medium text-wine hover:bg-wine hover:text-white"
            >
              {t.name}
            </button>
          ))}
          <button
            onClick={() => onApplyTemplate(null)}
            className="rounded-full border border-black/15 px-3 py-1.5 text-sm font-medium text-black/50 hover:bg-black/5"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Bow + filler paper colors */}
      <div className="flex flex-wrap gap-6">
        <Swatches title="Bow color" options={bowOptions} selectedId={box.bowId} onSelect={onSetBow} />
        <Swatches title="Filler paper color" options={paperOptions} selectedId={box.paperId} onSelect={onSetPaper} />
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-2">
        {categories.map((cat) => {
          const items = productsByCat[cat.id] || []
          const open = openCat === cat.id
          return (
            <div key={cat.id} className="rounded-xl border border-black/10">
              <button
                onClick={() => setOpenCat(open ? null : cat.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-semibold text-black/80">{cat.name}</span>
                <span className="text-xs text-black/40">{items.length} · {open ? '−' : '+'}</span>
              </button>
              {open && (
                <div className="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-2">
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
