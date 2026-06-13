import { useEffect, useState } from 'react'
import { eur } from '../lib/pricing'
import { celebrate } from '../lib/confetti'

export default function OrderForm({ totals, onClose, onSubmit }) {
  const [form, setForm] = useState({ company: '', customer_name: '', customer_email: '', customer_phone: '', notes: '' })
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [placed, setPlaced] = useState({ boxCount: 0, total: 0 }) // snapshot before the basket clears
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const valid = form.customer_name.trim() && /\S+@\S+\.\S+/.test(form.customer_email)

  useEffect(() => { if (status === 'done') celebrate() }, [status])

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setStatus('sending')
    setPlaced({ boxCount: totals.boxCount, total: totals.total })
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
      <div className="w-full max-w-md rounded-2xl bg-panel p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {status === 'done' ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>
            <h2 className="font-display text-lg text-cream/85">Order received</h2>
            <p className="mt-2 text-sm text-cream/60">
              Thank you! Our team will review your {placed.boxCount} box{placed.boxCount === 1 ? '' : 'es'} ({eur(placed.total)}) and call you shortly to confirm the details and address any custom requests.
            </p>
            <button onClick={onClose} className="mt-5 rounded-full bg-cream px-5 py-2 font-medium text-ink hover:bg-cream-bright">Close</button>
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
