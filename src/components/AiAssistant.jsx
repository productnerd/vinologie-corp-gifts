import { eur } from '../lib/pricing'

// Result-only modal — the brief is entered inline in the assemble panel.
export default function AiAssistant({ result, onClose, onUse }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-panel p-6 shadow-xl ring-1 ring-gold/30" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-cream">AI Somm suggests</h2>
          <button onClick={onClose} className="text-2xl leading-none text-cream/40 hover:text-cream/70">×</button>
        </div>

        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10">
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
      </div>
    </div>
  )
}
