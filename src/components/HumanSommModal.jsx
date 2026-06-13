// Phone number is a placeholder — update to Vinologie's real sommelier line.
const PHONE_DISPLAY = '+357 25 000 123'
const PHONE_TEL = '+35725000123'

export default function HumanSommModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-panel p-6 text-center shadow-xl ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-cream">Talk to a human somm</h2>
          <button onClick={onClose} className="text-2xl leading-none text-cream/40 hover:text-cream/70">×</button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-cream/60">
          Prefer a personal touch? Our sommelier can craft bespoke corporate boxes,
          source special bottles, and advise on large orders.
        </p>
        <a
          href={`tel:${PHONE_TEL}`}
          className="glow-cta mt-5 flex items-center justify-center gap-2 rounded-full bg-cream py-3 font-display text-lg text-ink hover:bg-cream-bright"
        >
          📞 {PHONE_DISPLAY}
        </a>
        <p className="mt-3 text-xs text-cream/40">Mon–Fri, 9:00–18:00 (Cyprus time)</p>
      </div>
    </div>
  )
}
