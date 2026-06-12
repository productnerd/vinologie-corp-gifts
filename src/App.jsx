import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { basketTotals, boxUnitPrice, eur } from './lib/pricing'
import BoxVisual from './components/BoxVisual'
import Assembly from './components/Assembly'
import BasketDrawer from './components/BasketDrawer'
import OrderForm from './components/OrderForm'
import AiAssistant from './components/AiAssistant'

const slotAccepts = (accept, category) =>
  accept === 'wine' ? category === 'red_wine' || category === 'white_wine' : accept === category

export default function App() {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [box, setBox] = useState({ slots: [], bowId: null, paperId: null })
  const [activeSlotId, setActiveSlotId] = useState(null)
  const [basket, setBasket] = useState([])
  const [editingLineId, setEditingLineId] = useState(null)
  const [basketOpen, setBasketOpen] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const sidRef = useRef(1)
  const nextSid = () => sidRef.current++

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

      setData({ categories: cats.data, productsByCat, productsById, templates: tmpls.data, bowOptions, paperOptions })
      setBox({ slots: [], bowId: bowOptions[0]?.id ?? null, paperId: paperOptions[0]?.id ?? null })
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
  function applyTemplate(t) {
    if (!t) { setBox((b) => ({ ...b, slots: [] })); setActiveSlotId(null); return }
    const slots = []
    for (const [accept, count] of Object.entries(t.slots)) {
      for (let i = 0; i < count; i++) slots.push({ sid: nextSid(), accept, product: null, fromTemplate: true })
    }
    setBox((b) => ({ ...b, slots }))
    setActiveSlotId(null)
  }

  function applyAiBox(items) {
    const slots = []
    for (const it of items) {
      const product = data.productsById[it.id]
      if (!product) continue
      for (let i = 0; i < (it.quantity || 1); i++) {
        slots.push({ sid: nextSid(), accept: product.category_id, product, fromTemplate: false })
      }
    }
    setBox((b) => ({ ...b, slots }))
    setActiveSlotId(null)
    setAiOpen(false)
  }

  function addProduct(p) {
    setBox((b) => {
      const slots = [...b.slots]
      // 1. active empty slot that accepts it
      let idx = slots.findIndex((s) => s.sid === activeSlotId && !s.product && slotAccepts(s.accept, p.category_id))
      // 2. first empty slot that accepts it
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

  const resetBox = () => setBox((b) => ({ slots: [], bowId: b.bowId, paperId: b.paperId }))

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
      <header className="flex items-center justify-between border-b border-black/10 bg-white px-6 py-4">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-tight text-wine">Vinologie</span>
          <span className="text-sm text-black/50">Corporate Gift Boxes</span>
        </div>
        <button
          onClick={() => setBasketOpen(true)}
          className="relative rounded-full bg-wine px-4 py-2 text-sm font-medium text-white hover:bg-wine-dark"
        >
          Basket
          {totals.boxCount > 0 && (
            <span className="ml-2 rounded-full bg-white/25 px-2 py-0.5 text-xs">{totals.boxCount}</span>
          )}
        </button>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 lg:grid-cols-[minmax(0,440px)_1fr]">
        {/* LEFT */}
        <section className="flex flex-col rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-black/40">Your box</h2>
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
            className="mt-5 w-full rounded-full bg-wine py-3 font-semibold text-white hover:bg-wine-dark disabled:opacity-40"
          >
            {editingLineId ? 'Update box in basket' : `Add box to basket · ${eur(unitPrice)}`}
          </button>
        </section>

        {/* RIGHT */}
        <section className="overflow-y-auto rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-black/40">Assemble</h2>
            <button
              onClick={() => setAiOpen(true)}
              className="rounded-full border border-wine/30 bg-gradient-to-r from-wine/5 to-gold/10 px-3 py-1.5 text-sm font-semibold text-wine hover:from-wine hover:to-wine hover:text-white"
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
    </div>
  )
}

function Centered({ children }) {
  return <div className="flex h-full items-center justify-center text-black/50">{children}</div>
}
