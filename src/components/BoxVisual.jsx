import { useState } from 'react'
import { eur } from '../lib/pricing'
import { asset } from '../lib/asset'

const ACCEPT_LABEL = { wine: 'Wine', red_wine: 'Red', white_wine: 'White', spirits: 'Spirit', snacks: 'Snack' }
const isTall = (accept) => accept === 'wine' || accept === 'red_wine' || accept === 'white_wine' || accept === 'spirits'

// Inner filler rectangle of the box image (where products rest).
const INNER = 'absolute inset-x-[19%] top-[15%] bottom-[15%]'

function ProductImg({ product, className }) {
  const [src, setSrc] = useState(asset(`assets/products/${product.slug}.png`))
  return (
    <img
      src={src} alt={product.name} className={className} draggable={false}
      onError={() => { if (product.source_photo_url && src !== product.source_photo_url) setSrc(product.source_photo_url) }}
    />
  )
}

function BowOverlay({ bow, mini }) {
  const [ok, setOk] = useState(true)
  if (!bow) return null
  const file = asset(`assets/bows/${bow.name.toLowerCase()}.png`)
  if (ok) {
    return (
      <img
        src={file} alt={`${bow.name} bow`} onError={() => setOk(false)}
        className="pointer-events-none absolute left-1/2 top-[1%] z-30 w-[24%] -translate-x-1/2 drop-shadow-md"
      />
    )
  }
  if (mini) return null
  return (
    <span
      className="pointer-events-none absolute right-[5%] top-[3%] z-30 rounded-full px-2 py-1 text-[10px] font-semibold text-white shadow"
      style={{ background: bow.color_hex }}
    >
      {bow.name}
    </span>
  )
}

// One product or empty slot. Heights use container-query units (cqh/cqw) so they
// resolve against the box, not the flex line — keeping wine tall and snacks ~1/3.
function Slot({ slot, active, onClick, mini }) {
  const tall = isTall(slot.accept)
  const imgClass =
    'w-auto object-contain object-bottom drop-shadow-lg ' +
    (tall ? 'h-[80cqh] max-w-[26cqw] ' : 'h-[30cqh] max-w-[28cqw] ')

  if (slot.product) {
    if (mini) return <ProductImg product={slot.product} className={imgClass} />
    return (
      <button onClick={onClick} className="group relative flex items-end" title={`${slot.product.name} — click to remove`}>
        <ProductImg product={slot.product} className={imgClass + 'transition group-hover:-translate-y-1'} />
        <span className="absolute -right-1 top-0 hidden h-5 w-5 items-center justify-center rounded-full bg-wine text-xs text-white group-hover:flex">×</span>
      </button>
    )
  }
  if (mini) return null
  return (
    <button
      onClick={onClick}
      className={
        'flex items-center justify-center rounded-lg border-2 border-dashed text-[9px] font-semibold uppercase tracking-wide transition ' +
        (active ? 'border-gold bg-gold/10 text-gold ' : 'border-black/25 text-black/30 hover:border-black/45 ') +
        (tall ? 'h-[70cqh] w-[12cqw]' : 'h-[26cqh] w-[15cqw]')
      }
    >
      {ACCEPT_LABEL[slot.accept] || 'Item'}
    </button>
  )
}

export default function BoxVisual({ box, bowOptions, paperOptions, activeSlotId, onSlotClick, unitPrice, mini = false }) {
  const [boxImgOk, setBoxImgOk] = useState(true)
  const bow = bowOptions.find((o) => o.id === box.bowId)
  const paper = paperOptions?.find((o) => o.id === box.paperId)
  const bottles = box.slots.filter((s) => isTall(s.accept))
  const snacks = box.slots.filter((s) => !isTall(s.accept))

  const renderSlot = (s) => (
    <Slot key={s.sid} slot={s} active={s.sid === activeSlotId} onClick={() => onSlotClick?.(s)} mini={mini} />
  )

  return (
    <div className="relative mx-auto flex w-full flex-1 flex-col justify-center">
      <div className="relative aspect-square w-full">
        {/* Box base layer */}
        {boxImgOk ? (
          <img
            src={asset('assets/box/box.png')} alt="" onError={() => setBoxImgOk(false)}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 rounded-2xl border-[6px] border-[#caa15e]/50 bg-[#efe7d8] shadow-inner" />
        )}

        {/* Filler color wash (multiply tint over the white paper) */}
        {paper && paper.color_hex.toLowerCase() !== '#ffffff' && (
          <div
            className={INNER + ' z-0 rounded-md mix-blend-multiply'}
            style={{ background: paper.color_hex, opacity: 0.5 }}
          />
        )}

        <BowOverlay bow={bow} mini={mini} />

        {/* Items: two bottom-anchored bands — bottles behind, snacks in front */}
        <div className={INNER + ' overflow-hidden'} style={{ containerType: 'size' }}>
          {box.slots.length === 0 ? (
            mini ? null : (
              <div className="flex h-full items-center justify-center text-center text-sm text-black/30">
                Pick a template or add products →
              </div>
            )
          ) : (
            <>
              {bottles.length > 0 && (
                <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap content-end items-end justify-center gap-x-1 gap-y-1">
                  {bottles.map(renderSlot)}
                </div>
              )}
              {snacks.length > 0 && (
                <div className="absolute inset-x-[4%] bottom-0 z-20 flex flex-wrap content-end items-end justify-center gap-1">
                  {snacks.map(renderSlot)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Live price badge */}
        {!mini && (
          <div className="absolute bottom-[2%] left-[2%] z-30 rounded-full bg-wine px-3 py-1.5 text-sm font-semibold text-white shadow">
            {eur(unitPrice)} <span className="font-normal opacity-70">/ box</span>
          </div>
        )}
      </div>
    </div>
  )
}
