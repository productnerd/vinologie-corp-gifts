export default function ConfirmModal({ message, confirmLabel = 'Continue', onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-panel p-6 shadow-xl ring-1 ring-white/10" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm leading-relaxed text-cream/85">{message}</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-full border border-white/15 py-2.5 text-sm font-medium text-cream/70 hover:bg-cream-bright/5">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-full bg-cream py-2.5 text-sm font-semibold text-ink hover:bg-cream-bright">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
