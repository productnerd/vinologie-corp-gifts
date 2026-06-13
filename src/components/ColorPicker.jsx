import { useState } from 'react'
import { COLOUR_SURCHARGE } from '../lib/pricing'

const normalizeHex = (raw) => {
  let h = raw.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('')
  return /^[0-9a-fA-F]{6}$/.test(h) ? '#' + h.toLowerCase() : null
}

const isWhite = (hex) => (hex || '').toLowerCase() === '#ffffff'
const surchargeFor = (hex) => (isWhite(hex) ? 0 : COLOUR_SURCHARGE)

export default function ColorPicker({ label, options, value, onSelect }) {
  const [customOpen, setCustomOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const nonDefault = value?.hex && !isWhite(value.hex)

  const pickOption = (o) => onSelect({ id: o.id, hex: o.color_hex, surcharge: Number(o.surcharge) })
  const applyCustom = () => {
    const hex = normalizeHex(draft)
    if (!hex) return
    onSelect({ id: 'custom', hex, surcharge: surchargeFor(hex) })
    setCustomOpen(false)
    setDraft('')
  }

  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-cream/40">
        {label}
        {nonDefault && <span className="font-medium normal-case tracking-normal text-gold">+€{COLOUR_SURCHARGE.toFixed(2)}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => pickOption(o)}
            title={o.name}
            className={'h-7 w-7 rounded-full border transition ' + (value?.id === o.id ? 'ring-2 ring-gold ring-offset-2 ring-offset-panel' : 'border-white/15 hover:scale-110')}
            style={{ background: o.color_hex }}
          />
        ))}
        {value?.id === 'custom' && (
          <button
            title="Custom colour"
            className="h-7 w-7 rounded-full border ring-2 ring-gold ring-offset-2 ring-offset-panel"
            style={{ background: value.hex }}
          />
        )}
        <button
          onClick={() => setCustomOpen((v) => !v)}
          title="Add a custom colour (hex)"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-cream/40 text-cream/60 transition hover:border-cream hover:text-cream"
        >
          +
        </button>
      </div>
      {customOpen && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
            placeholder="#RRGGBB"
            className="w-28 rounded-md border border-white/15 bg-panel2 px-2 py-1 text-xs text-cream placeholder:text-cream/40"
          />
          <button onClick={applyCustom} className="rounded-full bg-cream px-3 py-1 text-xs font-semibold text-ink hover:bg-cream-bright">Add</button>
        </div>
      )}
    </div>
  )
}
