import { useEffect, useState } from 'react'
import { eur } from '../lib/pricing'
import { celebrate } from '../lib/confetti'

// Torn-paper bottom edge for the receipt.
const ZIGZAG =
  'polygon(0 0,100% 0,100% 94%,96% 100%,92% 94%,88% 100%,84% 94%,80% 100%,76% 94%,72% 100%,68% 94%,64% 100%,60% 94%,56% 100%,52% 94%,48% 100%,44% 94%,40% 100%,36% 94%,32% 100%,28% 94%,24% 100%,20% 94%,16% 100%,12% 94%,8% 100%,4% 94%,0 100%)'

function buildReceipt(basket, totals) {
  // One line per box (its pure product value), with surcharges split out separately.
  const boxes = basket.map((l, i) => {
    const pure = l.box.slots.reduce((s, sl) => s + (sl.product ? Number(sl.product.price) : 0), 0)
    return { label: basket.length > 1 ? `Box ${i + 1}` : 'Gift box', qty: l.qty, unit: pure, line: pure * l.qty }
  })
  const pureTotal = boxes.reduce((s, b) => s + b.line, 0)
  const bowTotal = basket.reduce((s, l) => s + (Number(l.box.bow?.surcharge) || 0) * l.qty, 0)
  const paperTotal = basket.reduce((s, l) => s + (Number(l.box.paper?.surcharge) || 0) * l.qty, 0)
  const wishCost = totals.wishCost || 0
  return {
    boxes,
    bowTotal,
    paperTotal,
    wishCost,
    subtotal: pureTotal + bowTotal + paperTotal + wishCost,
    discountPct: totals.discountPct,
    discountAmt: totals.subtotal * (totals.discountPct / 100),
    total: totals.total,
    vat: totals.total * (19 / 119),
    boxCount: totals.boxCount,
  }
}

export default function OrderForm({ totals, basket, wish, onClose, onSubmit }) {
  const [form, setForm] = useState({ company: '', customer_name: '', customer_email: '', customer_phone: '', notes: '' })
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [receipt, setReceipt] = useState(null) // snapshot before the basket clears
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const valid = form.customer_name.trim() && /\S+@\S+\.\S+/.test(form.customer_email)

  useEffect(() => { if (status === 'done') celebrate() }, [status])

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setStatus('sending')
    setReceipt(buildReceipt(basket, totals))
    try {
      await onSubmit(form)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-panel p-6 shadow-xl ring-1 ring-cream/15" onClick={(e) => e.stopPropagation()}>
        {status === 'done' && receipt ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#228B22] text-2xl font-bold text-white shadow-lg shadow-[#228B22]/30">✓</div>
            <h2 className="font-display text-lg text-cream/85">Order received</h2>
            <p className="mt-2 text-sm text-cream/60">
              Thank you! We'll call you shortly to confirm the details and address any custom requests.
            </p>

            {/* Skeuomorphic paper receipt */}
            <div className="mx-auto mt-5 max-w-[20rem] bg-[#f4eddd] px-5 pb-7 pt-5 text-left font-mono text-[#2a2118] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]" style={{ clipPath: ZIGZAG }}>
              <div className="text-center">
                <div className="font-display text-sm tracking-wide">TOP TIER ROOM</div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-[#2a2118]/55">Order receipt</div>
                <div className="text-[9px] text-[#2a2118]/45">{new Date().toLocaleDateString('en-GB')} · {receipt.boxCount} box{receipt.boxCount === 1 ? '' : 'es'}</div>
              </div>
              <div className="my-3 border-t border-dashed border-[#2a2118]/30" />

              {/* One line per box (pure value only) */}
              {receipt.boxes.map((b, i) => (
                <div key={i} className="mb-1.5 flex items-start justify-between gap-2 text-[11px]">
                  <span className="min-w-0">
                    <span className="font-semibold">{b.qty}×</span> {b.label}
                    <span className="text-[#2a2118]/45"> @ {eur(b.unit)}</span>
                  </span>
                  <span className="shrink-0">{eur(b.line)}</span>
                </div>
              ))}

              {/* Surcharges, split out from the box value */}
              {(receipt.bowTotal > 0 || receipt.paperTotal > 0 || receipt.wishCost > 0) && (
                <div className="my-2 border-t border-dashed border-[#2a2118]/30" />
              )}
              {receipt.bowTotal > 0 && (
                <div className="mb-1 flex justify-between text-[11px] text-[#2a2118]/75"><span>Bow colour</span><span>{eur(receipt.bowTotal)}</span></div>
              )}
              {receipt.paperTotal > 0 && (
                <div className="mb-1 flex justify-between text-[11px] text-[#2a2118]/75"><span>Filler paper</span><span>{eur(receipt.paperTotal)}</span></div>
              )}
              {receipt.wishCost > 0 && (
                <div className="mb-1 flex justify-between text-[11px] text-[#2a2118]/75"><span>Custom wish cards</span><span>{eur(receipt.wishCost)}</span></div>
              )}

              <div className="my-3 border-t border-dashed border-[#2a2118]/30" />
              <div className="flex justify-between text-[11px]"><span>Subtotal</span><span>{eur(receipt.subtotal)}</span></div>
              {receipt.discountPct > 0 && (
                <div className="flex justify-between text-[11px] text-[#7a2438]"><span>Bulk discount ({receipt.discountPct}%)</span><span>−{eur(receipt.discountAmt)}</span></div>
              )}
              <div className="flex justify-between text-[11px] text-[#2a2118]/60"><span>incl. VAT (19%)</span><span>{eur(receipt.vat)}</span></div>
              <div className="mt-1.5 flex justify-between border-t-2 border-[#2a2118]/40 pt-1.5 text-sm font-bold"><span>TOTAL</span><span>{eur(receipt.total)}</span></div>

              <div className="mt-4 text-center text-[10px] tracking-wide text-[#2a2118]/60">★ Thank you for your order ★</div>
              <div className="mt-1 text-center text-[13px] leading-none tracking-[0.15em] text-[#2a2118]/70">▌║▌║▌▌║▌║║▌║▌▌║▌</div>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="font-display text-lg text-cream">Submit your order</h2>
            <p className="mt-1 text-sm text-cream/50">
              {totals.boxCount} boxes · {eur(totals.total)}{totals.discountPct > 0 ? ` (incl. ${totals.discountPct}% bulk discount)` : ''}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <input className="rounded-lg border border-white/15 bg-panel2 px-3 py-2 text-sm text-cream placeholder:text-cream/40" placeholder="Company" value={form.company} onChange={set('company')} />
              <input className="rounded-lg border border-white/15 bg-panel2 px-3 py-2 text-sm text-cream placeholder:text-cream/40" placeholder="Your name *" value={form.customer_name} onChange={set('customer_name')} />
              <input className="rounded-lg border border-white/15 bg-panel2 px-3 py-2 text-sm text-cream placeholder:text-cream/40" placeholder="Email *" value={form.customer_email} onChange={set('customer_email')} />
              <input className="rounded-lg border border-white/15 bg-panel2 px-3 py-2 text-sm text-cream placeholder:text-cream/40" placeholder="Phone" value={form.customer_phone} onChange={set('customer_phone')} />
              <textarea className="rounded-lg border border-white/15 bg-panel2 px-3 py-2 text-sm text-cream placeholder:text-cream/40" rows="2" placeholder="Notes (delivery date, message, etc.)" value={form.notes} onChange={set('notes')} />
            </div>
            {status === 'error' && <p className="mt-2 text-sm text-red-600">Something went wrong. Please try again.</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/15 py-2.5 font-medium text-cream/60 hover:bg-cream-bright/5">Cancel</button>
              <button type="submit" disabled={!valid || status === 'sending'} className="flex-1 rounded-full bg-cream py-2.5 font-semibold text-ink hover:bg-cream-bright disabled:opacity-40">
                {status === 'sending' ? 'Sending…' : 'Place order'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
