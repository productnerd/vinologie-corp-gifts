import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { eur } from '../lib/pricing'

const PLACEHOLDER =
  'e.g. €45 per box. 2 Italian reds, 1 crisp Greek white, and a whisky. ' +
  'For snacks: an assortment of dark chocolate and a calming tea. Tasteful and giftable.'

export default function AiAssistant({ brief, onBriefChange, onClose, onUse }) {
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function suggest() {
    setStatus('loading'); setError(''); setResult(null)
    const { data, error } = await supabase.functions.invoke('vinologie-ai-box', { body: { brief } })
    if (error || data?.error) {
      setError(data?.error || error.message || 'Something went wrong.')
      setStatus('error')
      return
    }
    setResult(data)
    setStatus('done')
  }

  const showingResult = status === 'done' && result

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-panel p-6 shadow-xl ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-cream">✨ AI Somm</h2>
          <button onClick={onClose} className="text-2xl leading-none text-cream/40 hover:text-cream/70">×</button>
        </div>

        {showingResult ? (
          <>
            <button
              onClick={() => setStatus('idle')}
              className="mt-3 w-fit text-xs font-medium text-cream/50 hover:text-cream"
            >
              ← Edit brief
            </button>
            <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10">
              <div className="border-b border-white/10 bg-panel2 px-4 py-3 text-sm text-cream/70">{result.rationale}</div>
              <ul className="flex-1 divide-y divide-white/5 overflow-y-auto">
                {result.box.map((it, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="text-cream/80">{it.quantity > 1 ? `${it.quantity}× ` : ''}{it.name}</span>
                    <span className="text-cream/50">{eur(it.price * it.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                <span className="text-sm font-semibold text-cream/80">≈ {eur(result.estimatedPerBox)} / box</span>
                <button onClick={() => onUse(result.box)} className="glow-cta rounded-full bg-cream px-4 py-2 text-sm font-semibold text-ink hover:bg-cream-bright">
                  Use this box
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <textarea
              value={brief}
              onChange={(e) => onBriefChange(e.target.value)}
              rows="5"
              placeholder={PLACEHOLDER}
              className="mt-4 w-full rounded-lg border border-white/15 bg-panel2 p-3 text-sm text-cream placeholder:text-cream/40"
            />
            <button
              onClick={suggest}
              disabled={!brief.trim() || status === 'loading'}
              className="glow-cta mt-3 w-full rounded-full bg-cream py-2.5 font-semibold text-ink hover:bg-cream-bright disabled:opacity-40 disabled:shadow-none"
            >
              {status === 'loading' ? 'Thinking…' : 'Suggest a box'}
            </button>
            {status === 'error' && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
