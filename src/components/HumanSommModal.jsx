// Phone number is a placeholder — update to Vinologie's real sommelier line.
const PHONE_DISPLAY = '+357 25 000 123'
const PHONE_TEL = '+35725000123'

export default function HumanSommModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-panel p-6 text-center shadow-xl ring-1 ring-cream/15" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg text-cream">Talk to a human</h2>
        <a
          href={`tel:${PHONE_TEL}`}
          className="glow-cta mt-4 flex items-center justify-center gap-2 rounded-full bg-cream py-3 font-display text-lg text-ink hover:bg-cream-bright"
        >
          📞 {PHONE_DISPLAY}
        </a>
        <p className="mt-3 text-xs text-cream/40">Mon–Fri, 9:00–18:00 (Cyprus time)</p>
      </div>
    </div>
  )
}
