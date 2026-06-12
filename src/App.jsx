import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { basketTotals, boxUnitPrice, eur } from './lib/pricing'
import BoxVisual from './components/BoxVisual'
import Assembly from './components/Assembly'
import BasketDrawer from './components/BasketDrawer'
import OrderForm from './components/OrderForm'
import AiAssistant from './components/AiAssistant'
import ConfirmModal from './components/ConfirmModal'

const slotAccepts = (accept, category) =>
  accept === 'wine' ? category === 'red_wine' || category === 'white_wine' : accept === category

export default function App() {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)

  // box.locked = true when a template defines fixed slots (no extra adds allowed)
  const [box, setBox] = useState({ slots: [], bowId: null, paperId: null, locked: false })
  const [activeSlotId, setActiveSlotId] = useState(null)
  const [basket, setBasket] = useState([])
  const [editingLineId, setEditingLineId] = useState(null)
  const [basketOpen, setBasketOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null) // { message, confirmLabel, onConfirm }
  const sidRef = useRef(1)
  const nextSid = () => sidRef.current++
  const toastTimer = useRef()
  const showToast = (msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2800)
  }

  // Load catalog
  useEffect(() => {
    (async () => {
      const [cats, prods, tmpls, opts] = await Promise.all([
        supabase.from('vinologie_categories').select('*').order('sort_order'),
        supabase.from('vinologie_products').select('*').eq('active', true).order('sort_order'),
        supabase.from('vinologie_templates').select('*').order('sort_order'),
        supabase.from('vinologie_box_options').select('*').eq('active', true).order('sort_order'),
      ])
      const err = cats.error || prods.error || tmpls.error || opts.error
      if (err) { setLoadError(err.message); return }

      const bowOptions = opts.data.filter((o) => o.kind === 'bow')
      const paperOptions = opts.data.filter((o) => o.kind === 'paper')
      const productsByCat = {}
      const productsById = {}
      for (const c of cats.data) productsByCat[c.id] = []
      for (const p of prods.data) {
        (productsByCat[p.category_id] ||= []).push(p)
        productsById[p.id] = p
      }
      // Cheapest first within each category
      for (const c of cats.data) productsByCat[c.id].sort((a, b) => Number(a.price) - Number(b.price))

      setData({ categories: cats.data, productsByCat, productsById, templates: tmpls.data, bowOptions, paperOptions })
      setBox({ slots: [], bowId: bowOptions[0]?.id ?? null, paperId: paperOptions[0]?.id ?? null, locked: false })
    })()
  }, [])

  const opts = useMemo(
    () => ({ bowOptions: data?.bowOptions ?? [], paperOptions: data?.paperOptions ?? [] }),
    [data],
  )
  const totals = useMemo(() => basketTotals(basket, opts), [basket, opts])
  const unitPrice = data ? boxUnitPrice(box, opts) : 0
  const filledCount = box.slots.filter((s) => s.product).length

  // --- box editing ---
  const templateSlots = (t) => {
    const slots = []
    for (const [accept, count] of Object.entries(t.slots)) {
      for (let i = 0; i < count; i++) slots.push({ sid: nextSid(), accept, product: null, fromTemplate: true })
    }
    return slots
  }
  // Place existing products into matching slots; return the ones that don't fit.
  const placeProducts = (slots, products) => {
    const remaining = [...products]
    for (const s of slots) {
      const idx = remaining.findIndex((p) => slotAccepts(s.accept, p.category_id))
      if (idx !== -1) { s.product = remaining[idx]; remaining.splice(idx, 1) }
    }
    return remaining
  }

  function applyTemplate(t, force = false) {
    const filled = box.slots.filter((s) => s.product).map((s) => s.product)
    // "Custom" = unlimited slots — always keeps every product, just unlocks.
    if (!t) {
      setBox((b) => ({
        ...b,
        slots: filled.map((p) => ({ sid: nextSid(), accept: p.category_id, product: p, fromTemplate: false })),
        locked: false,
      }))
      setActiveSlotId(null)
      return
    }
    const slots = templateSlots(t)
    const leftover = placeProducts(slots, filled)
    // Smaller box than current selection → confirm before dropping the overflow.
    if (leftover.length > 0 && !force) {
      setConfirm({
        message: `“${t.name}” has room for fewer items — ${leftover.length} of your chosen product${leftover.length > 1 ? 's' : ''} won’t fit and will be removed. Continue?`,
        confirmLabel: 'Switch & remove',
        onConfirm: () => { setConfirm(null); applyTemplate(t, true) },
      })
      return
    }
    setBox((b) => ({ ...b, slots, locked: true }))
    setActiveSlotId(null)
  }

  function applyAiBox(items, force = false) {
    // Replacing a non-empty box with an AI suggestion needs confirmation.
    if (box.slots.some((s) => s.product) && !force) {
      setConfirm({
        message: 'Using this AI Somm box will replace your current selection. Continue?',
        confirmLabel: 'Replace',
        onConfirm: () => { setConfirm(null); applyAiBox(items, true) },
      })
      return
    }
    const slots = []
    for (const it of items) {
      const product = data.productsById[it.id]
      if (!product) continue
      for (let i = 0; i < (it.quantity || 1); i++) {
        slots.push({ sid: nextSid(), accept: product.category_id, product, fromTemplate: false })
      }
    }
    setBox((b) => ({ ...b, slots, locked: false }))
    setActiveSlotId(null)
    setAiOpen(false)
  }

  const acceptLabel = (cat) => (cat === 'spirits' ? 'spirit' : cat === 'snacks' ? 'snack' : 'wine')

  function addProduct(p) {
    const hasFreeSlot = box.slots.some((s) => !s.product && slotAccepts(s.accept, p.category_id))
    // In a locked template, you can only fill existing slots — no extras.
    if (box.locked && !hasFreeSlot) {
      showToast(`This template has no free ${acceptLabel(p.category_id)} slot — switch to Custom to add more.`)
      return
    }
    setBox((b) => {
      const slots = [...b.slots]
      let idx = slots.findIndex((s) => s.sid === activeSlotId && !s.product && slotAccepts(s.accept, p.category_id))
      if (idx === -1) idx = slots.findIndex((s) => !s.product && slotAccepts(s.accept, p.category_id))
      if (idx !== -1) {
        slots[idx] = { ...slots[idx], product: p }
      } else {
        slots.push({ sid: nextSid(), accept: p.category_id, product: p, fromTemplate: false })
      }
      return { ...b, slots }
    })
    setActiveSlotId(null)
  }

  function onSlotClick(slot) {
    if (slot.product) {
      // remove product; keep empty template slots, drop free-added ones
      setBox((b) => ({
        ...b,
        slots: slot.fromTemplate
          ? b.slots.map((s) => (s.sid === slot.sid ? { ...s, product: null } : s))
          : b.slots.filter((s) => s.sid !== slot.sid),
      }))
    } else {
      setActiveSlotId((id) => (id === slot.sid ? null : slot.sid))
    }
  }

  const resetBox = () => setBox((b) => ({ slots: [], bowId: b.bowId, paperId: b.paperId, locked: false }))

  // --- basket ---
  function addToBasket() {
    const snapshot = JSON.parse(JSON.stringify({ ...box, slots: box.slots.filter((s) => s.product) }))
    if (editingLineId) {
      setBasket((bk) => bk.map((l) => (l.id === editingLineId ? { ...l, box: snapshot } : l)))
      setEditingLineId(null)
    } else {
      setBasket((bk) => [...bk, { id: crypto.randomUUID(), box: snapshot, qty: 1 }])
    }
    resetBox()
    setActiveSlotId(null)
  }

  function editLine(id) {
    const line = basket.find((l) => l.id === id)
    if (!line) return
    setBox(JSON.parse(JSON.stringify(line.box)))
    setEditingLineId(id)
    setBasketOpen(false)
  }
  const setQty = (id, qty) => setBasket((bk) => bk.map((l) => (l.id === id ? { ...l, qty: Math.max(1, qty || 1) } : l)))
  const removeLine = (id) => setBasket((bk) => bk.filter((l) => l.id !== id))

  async function submitOrder(form) {
    const payload = {
      ...form,
      boxes: basket.map((l) => ({
        qty: l.qty,
        bowId: l.box.bowId,
        paperId: l.box.paperId,
        unitPrice: boxUnitPrice(l.box, opts),
        items: l.box.slots.filter((s) => s.product).map((s) => ({
          id: s.product.id, name: s.product.name, price: Number(s.product.price), category: s.product.category_id,
        })),
      })),
      box_count: totals.boxCount,
      subtotal: Number(totals.subtotal.toFixed(2)),
      discount_pct: totals.discountPct,
      total: Number(totals.total.toFixed(2)),
    }
    const { error } = await supabase.from('vinologie_orders').insert(payload)
    if (error) throw error
    setBasket([])
  }

  if (loadError) return <Centered>Failed to load catalog: {loadError}</Centered>
  if (!data) return <Centered>Loading catalog…</Centered>

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-white/10 bg-panel px-8 py-5">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-tight text-cream">Vinologie</span>
          <span className="text-sm text-cream/50">Corporate Gift Boxes</span>
        </div>
        <button
          onClick={() => setBasketOpen(true)}
          className="relative rounded-full bg-cream px-4 py-2 text-sm font-medium text-ink hover:bg-white"
        >
          Basket
          {totals.boxCount > 0 && (
            <span className="ml-2 rounded-full bg-panel/25 px-2 py-0.5 text-xs">{totals.boxCount}</span>
          )}
        </button>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-8 overflow-hidden p-8 lg:grid-cols-[minmax(0,440px)_1fr]">
        {/* LEFT */}
        <section className="flex flex-col rounded-2xl border border-white/10 bg-panel p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cream/40">Your box</h2>
            {editingLineId && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Editing basket box</span>}
          </div>
          <div className="mt-4 flex flex-1 flex-col">
            <BoxVisual
              box={box} bowOptions={data.bowOptions} paperOptions={data.paperOptions}
              activeSlotId={activeSlotId} onSlotClick={onSlotClick} unitPrice={unitPrice}
            />
          </div>
          <button
            onClick={addToBasket}
            disabled={filledCount === 0}
            className="mt-5 w-full rounded-full bg-cream py-3 font-semibold text-ink hover:bg-white disabled:opacity-40"
          >
            {editingLineId ? 'Update box in basket' : `Add box to basket · ${eur(unitPrice)}`}
          </button>
        </section>

        {/* RIGHT */}
        <section className="overflow-y-auto rounded-2xl border border-white/10 bg-panel p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-cream/40">Assemble</h2>
            <button
              onClick={() => setAiOpen(true)}
              className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-semibold text-gold transition hover:bg-gold hover:text-ink"
            >
              ✨ AI Somm
            </button>
          </div>
          <Assembly
            templates={data.templates} categories={data.categories} productsByCat={data.productsByCat}
            bowOptions={data.bowOptions} paperOptions={data.paperOptions} box={box}
            onApplyTemplate={applyTemplate} onAddProduct={addProduct}
            onSetBow={(id) => setBox((b) => ({ ...b, bowId: id }))}
            onSetPaper={(id) => setBox((b) => ({ ...b, paperId: id }))}
          />
        </section>
      </main>

      {basketOpen && (
        <BasketDrawer
          basket={basket} totals={totals} opts={opts}
          onClose={() => setBasketOpen(false)}
          onQty={setQty} onEdit={editLine} onRemove={removeLine}
          onCheckout={() => { setBasketOpen(false); setOrderOpen(true) }}
        />
      )}
      {orderOpen && (
        <OrderForm totals={totals} onClose={() => setOrderOpen(false)} onSubmit={submitOrder} />
      )}
      {aiOpen && <AiAssistant onClose={() => setAiOpen(false)} onUse={applyAiBox} />}

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-6 z-[60] -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream shadow-lg ring-1 ring-white/10">
          {toast}
        </div>
      )}
    </div>
  )
}

function Centered({ children }) {
  return <div className="flex h-full items-center justify-center text-cream/50">{children}</div>
}
