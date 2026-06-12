import { eur, boxUnitPrice } from '../lib/pricing'
import BoxVisual from './BoxVisual'

function boxSummary(box) {
  const filled = box.slots.filter((s) => s.product)
  if (filled.length === 0) return 'Empty box'
  return filled.map((s) => s.product.name).join(', ')
}

export default function BasketDrawer({ basket, totals, opts, onClose, onQty, onEdit, onRemove, onCheckout }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-panel shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-cream">Your basket</h2>
          <button onClick={onClose} className="text-2xl leading-none text-cream/40 hover:text-cream/70">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {basket.length === 0 ? (
            <p className="mt-10 text-center text-sm text-cream/40">No boxes yet. Assemble one and add it here.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {basket.map((line) => (
                <li key={line.id} className="rounded-xl border border-white/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-24 shrink-0">
                      <BoxVisual box={line.box} bowOptions={opts.bowOptions} paperOptions={opts.paperOptions} mini />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-cream/80">{eur(boxUnitPrice(line.box, opts))} / box</div>
                      <div className="mt-0.5 line-clamp-3 text-xs text-cream/50">{boxSummary(line.box)}</div>
                    </div>
                    <button onClick={() => onRemove(line.id)} className="shrink-0 text-xs text-cream/40 hover:text-cream">Remove</button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => onQty(line.id, line.qty - 1)} className="h-7 w-7 rounded-full border border-white/15 text-cream/60 hover:bg-white/5">−</button>
                      <input
                        type="number" min="1" value={line.qty}
                        onChange={(e) => onQty(line.id, parseInt(e.target.value || '1', 10))}
                        className="w-14 rounded-md border border-white/15 px-2 py-1 text-center text-sm"
                      />
                      <button onClick={() => onQty(line.id, line.qty + 1)} className="h-7 w-7 rounded-full border border-white/15 text-cream/60 hover:bg-white/5">+</button>
                    </div>
                    <button onClick={() => onEdit(line.id)} className="text-xs font-medium text-cream hover:underline">Edit box</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 p-5">
          <div className="flex justify-between text-sm text-cream/60">
            <span>Boxes</span><span>{totals.boxCount}</span>
          </div>
          <div className="flex justify-between text-sm text-cream/60">
            <span>Subtotal</span><span>{eur(totals.subtotal)}</span>
          </div>
          {totals.discountPct > 0 && (
            <div className="flex justify-between text-sm font-medium text-green-700">
              <span>Bulk discount ({totals.discountPct}%)</span>
              <span>−{eur(totals.subtotal - totals.total)}</span>
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
            className="mt-4 w-full rounded-full bg-cream py-3 font-semibold text-ink hover:bg-white disabled:opacity-40"
          >
            Submit order
          </button>
        </div>
      </div>
    </div>
  )
}
