import { useState } from 'react'
import { asset } from '../lib/asset'

const ACCEPT_LABEL = { wine: 'Wine', red_wine: 'Red', white_wine: 'White', spirits: 'Spirit', snacks: 'Snack' }
const isTall = (accept) => accept === 'wine' || accept === 'red_wine' || accept === 'white_wine' || accept === 'spirits'

// Inner filler rectangle of the box image (where products rest).
const INNER = 'absolute inset-x-[19%] top-[15%] bottom-[15%]'
// Separate references so bottles fill most of the box height (less empty space
// up top) while snacks stay small enough not to overflow the row below.
const BOTTLE_UNIT = 66 // a full wine bottle (scale 1.0) → 66% of inner height
const SNACK_UNIT = 40  // the biggest snack (scale ~0.78) → ~31%
// Max items shown per row before collapsing the rest into a "+N more" pill.
const CAP_BOTTLES = 6
const CAP_SNACKS = 8

const scaleOf = (slot) =>
  Number(slot.product?.display_scale) || (isTall(slot.accept) ? 0.92 : 0.42)

function ProductImg({ product, style }) {
  const [src, setSrc] = useState(asset(`assets/products/${product.slug}.png`))
  return (
    <img
      src={src} alt={product.name} draggable={false} style={style}
      className="w-auto max-w-full object-contain object-bottom drop-shadow-lg"
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
  const h = bow.color_hex.replace('#', '')
  const light = (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) > 150
  return (
    <span
      className={'pointer-events-none absolute right-[5%] top-[3%] z-30 rounded-full px-2 py-1 text-[10px] font-semibold shadow ring-1 ring-black/10 ' + (light ? 'text-ink' : 'text-white')}
      style={{ background: bow.color_hex }}
    >
      {bow.name} bow
    </span>
  )
}

// Each item gets its own flex cell so cells never overlap. Height is driven by
// display_scale (relative real-world size); object-contain keeps it tidy.
function Cell({ slot, active, onClick, mini }) {
  const tall = isTall(slot.accept)
  const cell = `flex min-w-0 flex-1 items-end justify-center ${tall ? 'max-w-[24%]' : 'max-w-[22%]'}`
  const h = { height: `${(scaleOf(slot) * (tall ? BOTTLE_UNIT : SNACK_UNIT)).toFixed(1)}cqh` }

  if (slot.product) {
    if (mini) return <div className={cell}><ProductImg product={slot.product} style={h} /></div>
    return (
      <button onClick={onClick} className={'group relative ' + cell} title={`${slot.product.name} — click to remove`}>
        <div className="flex items-end transition group-hover:-translate-y-1" style={h}>
          <ProductImg product={slot.product} style={{ height: '100%' }} />
        </div>
        <span className="absolute right-0 top-0 hidden h-5 w-5 items-center justify-center rounded-full bg-wine text-xs text-white group-hover:flex">×</span>
      </button>
    )
  }
  if (mini) return null
  return (
    <div className={cell}>
      <button
        onClick={onClick}
        style={{ height: `${tall ? 56 : 22}cqh` }}
        className={
          'flex w-full items-center justify-center rounded-lg border-2 border-dashed text-[9px] font-semibold uppercase tracking-wide transition ' +
          (active ? 'border-gold bg-gold/10 text-gold' : 'border-white/25 text-white/40 hover:border-white/50')
        }
      >
        {ACCEPT_LABEL[slot.accept] || 'Item'}
      </button>
    </div>
  )
}

function MorePill({ n }) {
  return (
    <div className="flex min-w-0 flex-1 max-w-[22%] items-end justify-center">
      <span className="rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-cream ring-1 ring-white/15">
        +{n} more
      </span>
    </div>
  )
}

function Row({ items, cap, cellFor }) {
  if (items.length === 0) return null
  const overflow = items.length > cap
  const shown = overflow ? items.slice(0, cap - 1) : items
  const more = overflow ? items.length - shown.length : 0
  return (
    <div className="flex items-end justify-center gap-[2cqw]">
      {shown.map(cellFor)}
      {more > 0 && <MorePill n={more} />}
    </div>
  )
}

export default function BoxVisual({ box, bowOptions, paperOptions, activeSlotId, onSlotClick, unitPrice, mini = false }) {
  const [boxImgOk, setBoxImgOk] = useState(true)
  const bow = bowOptions.find((o) => o.id === box.bowId)
  const paper = paperOptions?.find((o) => o.id === box.paperId)
  const bottles = box.slots.filter((s) => isTall(s.accept))
  const snacks = box.slots.filter((s) => !isTall(s.accept))

  const cellFor = (s) => <Cell key={s.sid} slot={s} active={s.sid === activeSlotId} onClick={() => onSlotClick?.(s)} mini={mini} />

  return (
    <div className="relative mx-auto flex w-full flex-1 flex-col justify-center">
      <div className="relative aspect-square w-full">
        {boxImgOk ? (
          <img
            src={asset('assets/box/box.png')} alt="" onError={() => setBoxImgOk(false)}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 rounded-2xl border-[6px] border-[#caa15e]/50 bg-[#efe7d8] shadow-inner" />
        )}

        {paper && paper.color_hex.toLowerCase() !== '#ffffff' && (
          <div className={INNER + ' z-0 rounded-md mix-blend-multiply'} style={{ background: paper.color_hex, opacity: 0.5 }} />
        )}

        <BowOverlay bow={bow} mini={mini} />

        {/* Items: bottles row on top, snacks row below — separate, never overlapping */}
        <div className={INNER + ' z-10 flex flex-col justify-center gap-[1.5cqh] overflow-hidden'} style={{ containerType: 'size' }}>
          {box.slots.length === 0 ? (
            mini ? null : (
              <div className="flex h-full items-center justify-center text-center text-sm text-white/30">
                Pick a template or add products →
              </div>
            )
          ) : (
            <>
              <Row items={bottles} cap={CAP_BOTTLES} cellFor={cellFor} />
              <Row items={snacks} cap={CAP_SNACKS} cellFor={cellFor} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
