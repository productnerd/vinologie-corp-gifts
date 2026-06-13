import { useState } from 'react'
import { eur, boxUnitPrice, WISH_PER_BOX } from '../lib/pricing'
import BoxVisual from './BoxVisual'

function boxSummary(box) {
  const filled = box.slots.filter((s) => s.product)
  if (filled.length === 0) return 'Empty box'
  return filled.map((s) => s.product.name).join(', ')
}

// Custom printed-card wish: optional message (with @name tokens) + optional CSV of names.
function WishSection({ wish, setWish, boxCount }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(wish.text)
  const [names, setNames] = useState(wish.names)
  const [warning, setWarning] = useState('')

  const onCsv = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = String(reader.result || '')
        .split(/\r?\n/)
        .map((line) => line.split(',')[0].trim())
        .filter(Boolean)
      setNames(parsed)
      // Expect one name per box (or one extra).
      if (parsed.length === boxCount || parsed.length === boxCount + 1) setWarning('')
      else
        setWarning(
          `You added ${parsed.length} name${parsed.length === 1 ? '' : 's'}, but there ${boxCount === 1 ? 'is' : 'are'} ${boxCount} box${boxCount === 1 ? '' : 'es'}. We expect ${boxCount} or ${boxCount + 1}. Saved anyway — we'll confirm on the call.`,
        )
    }
    reader.readAsText(file)
  }

  const save = () => { setWish({ enabled: true, text, names }); setOpen(false) }
  const remove = () => { setWish({ enabled: false, text: '', names: [] }); setText(''); setNames([]); setWarning(''); setOpen(false) }

  // Collapsed summary once a wish is saved
  if (wish.enabled && !open) {
    return (
      <div className="mb-4 rounded-xl border border-gold/30 bg-gold/5 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gold">✦ Custom wish <span className="font-normal text-cream/50">(+{eur(WISH_PER_BOX)}/box)</span></span>
          <div className="flex gap-3 text-xs">
            <button onClick={() => { setText(wish.text); setNames(wish.names); setOpen(true) }} className="text-cream/60 hover:text-cream">Edit</button>
            <button onClick={remove} className="text-cream/40 hover:text-wine">Remove</button>
          </div>
        </div>
        {wish.text && <p className="mt-1 line-clamp-2 text-xs italic text-cream/50">“{wish.text}”</p>}
        {wish.names.length > 0 && <p className="mt-1 text-[11px] text-cream/40">{wish.names.length} name{wish.names.length === 1 ? '' : 's'} uploaded</p>}
      </div>
    )
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mb-4 w-full rounded-xl border border-dashed border-gold/40 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/10">
        ✦ Add custom wish ({eur(WISH_PER_BOX)})
      </button>
    )
  }

  // Editor
  return (
    <div className="mb-4 rounded-xl border border-gold/30 bg-gold/5 p-3">
      <div className="text-sm font-semibold text-gold">Custom wish <span className="font-normal text-cream/50">(+{eur(WISH_PER_BOX)}/box)</span></div>
      <p className="mt-1 text-[11px] text-cream/45">A printed card in every box. Use <span className="font-semibold text-gold">@name</span> to personalise per recipient.</p>
      <textarea
        value={text} onChange={(e) => setText(e.target.value)} rows="3"
        placeholder="e.g. Happy holidays @name — thank you for a wonderful year!"
        className="mt-2 w-full rounded-lg border border-white/15 bg-panel2 p-2.5 text-sm text-cream placeholder:text-cream/40"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="cursor-pointer rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-cream/70 hover:bg-cream-bright/5">
          {names.length ? `${names.length} names ✓` : 'Upload names (CSV)'}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onCsv} />
        </label>
        <div className="flex gap-2">
          {wish.enabled && <button onClick={remove} className="rounded-full px-3 py-1.5 text-xs text-cream/40 hover:text-wine">Remove</button>}
          <button onClick={save} disabled={!text.trim()} className="rounded-full bg-cream px-4 py-1.5 text-xs font-semibold text-ink hover:bg-cream-bright disabled:opacity-40">Save</button>
        </div>
      </div>
      {warning && <p className="mt-2 text-[11px] leading-snug text-amber-300/90">{warning}</p>}
    </div>
  )
}

export default function BasketDrawer({ basket, totals, wish, setWish, onClose, onQty, onEdit, onRemove, onCheckout }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-panel shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-display text-lg text-cream">Your basket</h2>
          <button onClick={onClose} className="text-2xl leading-none text-cream/40 hover:text-cream/70">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {basket.length === 0 ? (
            <p className="mt-10 text-center text-sm text-cream/40">No boxes yet. Assemble one and add it here.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {basket.map((line) => (
                <li key={line.id} className="relative rounded-xl border border-white/10 p-3">
                  <button
                    onClick={() => onRemove(line.id)}
                    title="Remove box"
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-lg leading-none text-cream/40 transition hover:bg-white/10 hover:text-wine"
                  >
                    ×
                  </button>
                  <div className="flex items-start gap-3 pr-6">
                    <div className="w-24 shrink-0">
                      <BoxVisual box={line.box} mini />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-cream/80">{eur(boxUnitPrice(line.box))} / box</div>
                      <div className="mt-0.5 line-clamp-3 text-xs text-cream/50">{boxSummary(line.box)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onQty(line.id, line.qty - 1)} className="h-7 w-7 rounded-full border border-white/15 text-cream/60 hover:bg-cream-bright/5">−</button>
                      <input
                        type="number" min="1" value={line.qty}
                        onChange={(e) => onQty(line.id, parseInt(e.target.value || '1', 10))}
                        className="w-14 rounded-md border border-white/15 bg-panel2 px-2 py-1 text-center text-sm text-cream"
                      />
                      <button onClick={() => onQty(line.id, line.qty + 1)} className="h-7 w-7 rounded-full border border-white/15 text-cream/60 hover:bg-cream-bright/5">+</button>
                    </div>
                    <button onClick={() => onEdit(line.id)} className="text-xs font-medium text-cream hover:underline">Edit box</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 p-5">
          {basket.length > 0 && <WishSection wish={wish} setWish={setWish} boxCount={totals.boxCount} />}

          <div className="flex justify-between text-sm text-cream/60">
            <span>Boxes</span><span>{totals.boxCount}</span>
          </div>
          <div className="flex justify-between text-sm text-cream/60">
            <span>Subtotal</span><span>{eur(totals.subtotal)}</span>
          </div>
          {totals.discountPct > 0 && (
            <div className="flex justify-between text-sm font-medium text-green-400">
              <span>Bulk discount ({totals.discountPct}%)</span>
              <span>−{eur(totals.subtotal - (totals.total - totals.wishCost))}</span>
            </div>
          )}
          {totals.wishCost > 0 && (
            <div className="flex justify-between text-sm text-gold">
              <span>Custom wish ({eur(WISH_PER_BOX)} × {totals.boxCount})</span>
              <span>+{eur(totals.wishCost)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-base font-semibold text-cream/85">
            <span>Total</span><span>{eur(totals.total)}</span>
          </div>
          {totals.discountPct === 0 && totals.boxCount > 0 && (
            <p className="mt-1 text-xs text-cream/40">Add {21 - totals.boxCount > 0 ? 21 - totals.boxCount : 1} more boxes for 5% off.</p>
          )}
          <button
            disabled={basket.length === 0}
            onClick={onCheckout}
            className="mt-4 w-full rounded-full bg-cream py-3 font-semibold text-ink hover:bg-cream-bright disabled:opacity-40"
          >
            Submit order
          </button>
          <p className="mt-2 text-center text-[11px] leading-snug text-cream/40">
            No payment is taken now — we'll call you back to verify your order and address any custom requests.
          </p>
        </div>
      </div>
    </div>
  )
}
