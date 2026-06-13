import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { basketTotals, boxUnitPrice, eur, WISH_PER_BOX } from './lib/pricing'
import BoxVisual from './components/BoxVisual'
import Assembly from './components/Assembly'
import BasketDrawer from './components/BasketDrawer'
import OrderForm from './components/OrderForm'
import AiAssistant from './components/AiAssistant'
import ConfirmModal from './components/ConfirmModal'
import HumanSommModal from './components/HumanSommModal'
import ColorPicker from './components/ColorPicker'
import { asset } from './lib/asset'

const slotAccepts = (accept, category) =>
  accept === 'wine' ? category === 'red_wine' || category === 'white_wine' : accept === category

export default function App() {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)

  // box.locked = true when a template defines fixed slots (no extra adds allowed)
  // box.templateId = which chip is active ('custom' or a template id)
  const [box, setBox] = useState({ slots: [], bow: null, paper: null, locked: false, templateId: 'custom' })
  const [activeSlotId, setActiveSlotId] = useState(null)
  const [basket, setBasket] = useState([])
  const [editingLineId, setEditingLineId] = useState(null)
  const [basketOpen, setBasketOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [humanOpen, setHumanOpen] = useState(false)
  const [aiBrief, setAiBrief] = useState('') // persists the last AI Somm prompt
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null) // { message, confirmLabel, onConfirm }
  const [wish, setWish] = useState({ enabled: false, text: '', names: [] }) // custom card wish
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

      // Display sections — snacks are split into Snacks / Coffee / Tea, but all keep
      // the 'snacks' slot bucket so templates still treat them as snacks.
      const catName = Object.fromEntries(cats.data.map((c) => [c.id, c.name]))
      const snk = productsByCat['snacks'] || []
      const sections = [
        { key: 'red_wine', name: catName.red_wine, items: productsByCat.red_wine || [], bucket: 'wine', wineLike: true },
        { key: 'white_wine', name: catName.white_wine, items: productsByCat.white_wine || [], bucket: 'wine', wineLike: true },
        { key: 'spirits', name: catName.spirits, items: productsByCat.spirits || [], bucket: 'spirits', wineLike: true },
        { key: 'snacks', name: 'Snacks', items: snk.filter((p) => !p.subgroup), bucket: 'snacks', wineLike: false },
        { key: 'coffee', name: 'Coffee', items: snk.filter((p) => p.subgroup === 'coffee'), bucket: 'snacks', wineLike: false },
        { key: 'tea', name: 'Tea', items: snk.filter((p) => p.subgroup === 'tea'), bucket: 'snacks', wineLike: false },
      ].filter((s) => s.items.length > 0)

      const optObj = (o) => (o ? { id: o.id, hex: o.color_hex, surcharge: Number(o.surcharge) } : null)
      setData({ categories: cats.data, productsByCat, productsById, templates: tmpls.data, bowOptions, paperOptions, sections })
      setBox({ slots: [], bow: optObj(bowOptions[0]), paper: optObj(paperOptions[0]), locked: false, templateId: 'custom' })
    })()
  }, [])

  const totals = useMemo(
    () => basketTotals(basket, wish.enabled ? WISH_PER_BOX : 0),
    [basket, wish.enabled],
  )
  const unitPrice = data ? boxUnitPrice(box) : 0
  const filledCount = box.slots.filter((s) => s.product).length
  const addedIds = useMemo(
    () => new Set(box.slots.filter((s) => s.product).map((s) => s.product.id)),
    [box.slots],
  )
  // In a locked template, a category can only be added while it has a free slot.
  const addable = useMemo(() => {
    if (!box.locked) return { wine: true, spirits: true, snacks: true }
    const hasFree = (bucket) =>
      box.slots.some((s) => !s.product && (bucket === 'wine'
        ? s.accept === 'wine' || s.accept === 'red_wine' || s.accept === 'white_wine'
        : s.accept === bucket))
    return { wine: hasFree('wine'), spirits: hasFree('spirits'), snacks: hasFree('snacks') }
  }, [box.slots, box.locked])

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
        templateId: 'custom',
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
    setBox((b) => ({ ...b, slots, locked: true, templateId: t.id }))
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
    setBox((b) => ({ ...b, slots, locked: false, templateId: 'custom' }))
    setActiveSlotId(null)
    setAiOpen(false)
  }

  async function runAiSomm() {
    if (!aiBrief.trim() || aiLoading) return
    setAiLoading(true); setAiError('')
    const { data, error } = await supabase.functions.invoke('vinologie-ai-box', { body: { brief: aiBrief } })
    setAiLoading(false)
    if (error || data?.error) { setAiError(data?.error || error?.message || 'Something went wrong.'); return }
    setAiResult(data)
    setAiOpen(true)
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

  const resetBox = () => setBox((b) => ({ slots: [], bow: b.bow, paper: b.paper, locked: false, templateId: 'custom' }))

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
    setBox({ ...JSON.parse(JSON.stringify(line.box)), locked: false, templateId: 'custom' })
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
        bow: l.box.bow,
        paper: l.box.paper,
        unitPrice: boxUnitPrice(l.box),
        items: l.box.slots.filter((s) => s.product).map((s) => ({
          id: s.product.id, name: s.product.name, price: Number(s.product.price), category: s.product.category_id,
        })),
      })),
      box_count: totals.boxCount,
      subtotal: Number(totals.subtotal.toFixed(2)),
      discount_pct: totals.discountPct,
      total: Number(totals.total.toFixed(2)),
      custom_wish: wish.enabled ? wish.text : null,
      wish_names: wish.enabled && wish.names.length ? wish.names : null,
      wish_cost: Number((totals.wishCost || 0).toFixed(2)),
    }
    const { error } = await supabase.from('vinologie_orders').insert(payload)
    if (error) throw error
    setBasket([])
    setWish({ enabled: false, text: '', names: [] })
  }

  if (loadError) return <Centered>Failed to load catalog: {loadError}</Centered>
  if (!data) return <Centered>Loading catalog…</Centered>

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-white/10 bg-panel px-8 py-4">
        <img src={asset('assets/logo/logo.png')} alt="Top Tier Room" className="h-9 w-auto max-w-[220px] object-contain" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHumanOpen(true)}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-medium text-cream/70 hover:bg-cream-bright/5"
          >
            Talk to a human
          </button>
          {totals.boxCount > 0 && (
            <button
              onClick={() => setBasketOpen(true)}
              className="glow-cta relative rounded-full bg-cream px-4 py-2 text-sm font-medium text-ink hover:bg-cream-bright"
            >
              Basket
              <span className="ml-2 rounded-full bg-panel/25 px-2 py-0.5 text-xs">{totals.boxCount}</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile: assembling is easier on a bigger screen */}
      <div className="flex items-center justify-center gap-2 bg-gold/10 px-4 py-2 text-center text-xs text-gold lg:hidden">
        Tip: this builder works best on a desktop — assembling boxes is easier on a larger screen.
      </div>

      <main className="grid flex-1 grid-cols-1 gap-8 overflow-y-auto p-6 sm:p-8 lg:grid-cols-[minmax(0,660px)_1fr] lg:overflow-hidden">
        {/* LEFT — box + colours (shown first, so it's on top on mobile) */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-panel p-4 shadow-sm">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
              <ColorPicker label="Bow color" options={data.bowOptions} value={box.bow} onSelect={(bow) => setBox((b) => ({ ...b, bow }))} />
              <ColorPicker label="Filler paper" options={data.paperOptions} value={box.paper} onSelect={(paper) => setBox((b) => ({ ...b, paper }))} />
              {editingLineId && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Editing basket box</span>}
            </div>
            <div className="warm-glow mt-3 flex flex-col">
              <BoxVisual box={box} activeSlotId={activeSlotId} onSlotClick={onSlotClick} />
            </div>
          </div>
          {/* Always-visible price + add button at the bottom of the box panel */}
          <button
            onClick={addToBasket}
            disabled={filledCount === 0}
            className="mt-3 w-full rounded-full border border-cream/30 py-2 text-sm font-medium text-cream/90 transition hover:bg-cream hover:text-ink disabled:opacity-40"
          >
            {editingLineId ? `Update box · ${eur(unitPrice)}` : `Add box to basket · ${eur(unitPrice)}`}
          </button>
        </section>

        {/* RIGHT — assembly */}
        <section className="overflow-y-auto rounded-2xl border border-white/10 bg-panel p-6 shadow-sm sm:p-8">
          <Assembly
            templates={data.templates} sections={data.sections}
            box={box} addedIds={addedIds} addable={addable}
            onApplyTemplate={applyTemplate} onAddProduct={addProduct}
            aiBrief={aiBrief} onAiBriefChange={setAiBrief} onAiSend={runAiSomm}
            aiLoading={aiLoading} aiError={aiError}
          />
        </section>
      </main>

      {basketOpen && (
        <BasketDrawer
          basket={basket} totals={totals}
          wish={wish} setWish={setWish}
          onClose={() => setBasketOpen(false)}
          onQty={setQty} onEdit={editLine} onRemove={removeLine}
          onCheckout={() => { setBasketOpen(false); setOrderOpen(true) }}
        />
      )}
      {orderOpen && (
        <OrderForm totals={totals} onClose={() => setOrderOpen(false)} onSubmit={submitOrder} />
      )}
      {aiOpen && aiResult && <AiAssistant result={aiResult} onClose={() => setAiOpen(false)} onUse={applyAiBox} />}
      {humanOpen && <HumanSommModal onClose={() => setHumanOpen(false)} />}

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
