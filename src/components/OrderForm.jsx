import { useState } from 'react'
import { eur } from '../lib/pricing'

export default function OrderForm({ totals, onClose, onSubmit }) {
  const [form, setForm] = useState({ company: '', customer_name: '', customer_email: '', customer_phone: '', notes: '' })
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const valid = form.customer_name.trim() && /\S+@\S+\.\S+/.test(form.customer_email)

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setStatus('sending')
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {status === 'done' ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>
            <h2 className="text-lg font-semibold text-black/85">Order received</h2>
            <p className="mt-2 text-sm text-black/60">
              Thank you! Our team will review your {totals.boxCount} boxes and call you shortly to confirm the details.
            </p>
            <button onClick={onClose} className="mt-5 rounded-full bg-wine px-5 py-2 font-medium text-white hover:bg-wine-dark">Close</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="text-lg font-semibold text-wine">Submit your order</h2>
            <p className="mt-1 text-sm text-black/50">
              {totals.boxCount} boxes · {eur(totals.total)}{totals.discountPct > 0 ? ` (incl. ${totals.discountPct}% bulk discount)` : ''}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <input className="rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Company" value={form.company} onChange={set('company')} />
              <input className="rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Your name *" value={form.customer_name} onChange={set('customer_name')} />
              <input className="rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Email *" value={form.customer_email} onChange={set('customer_email')} />
              <input className="rounded-lg border border-black/15 px-3 py-2 text-sm" placeholder="Phone" value={form.customer_phone} onChange={set('customer_phone')} />
              <textarea className="rounded-lg border border-black/15 px-3 py-2 text-sm" rows="2" placeholder="Notes (delivery date, message, etc.)" value={form.notes} onChange={set('notes')} />
            </div>
            {status === 'error' && <p className="mt-2 text-sm text-red-600">Something went wrong. Please try again.</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-full border border-black/15 py-2.5 font-medium text-black/60 hover:bg-black/5">Cancel</button>
              <button type="submit" disabled={!valid || status === 'sending'} className="flex-1 rounded-full bg-wine py-2.5 font-semibold text-white hover:bg-wine-dark disabled:opacity-40">
                {status === 'sending' ? 'Sending…' : 'Place order'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
