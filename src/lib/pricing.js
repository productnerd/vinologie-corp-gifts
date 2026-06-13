// Discount is based on the TOTAL number of boxes across the basket.
// >20 boxes → 5%, >50 boxes → 10%.
export function discountPctForBoxCount(boxCount) {
  if (boxCount > 50) return 10
  if (boxCount > 20) return 5
  return 0
}

// Price of a single assembled box: products inside + bow surcharge + paper surcharge.
export function boxUnitPrice(box, { bowOptions, paperOptions }) {
  const products = box.slots.reduce((sum, s) => sum + (s.product ? Number(s.product.price) : 0), 0)
  const bow = bowOptions.find((o) => o.id === box.bowId)
  const paper = paperOptions?.find((o) => o.id === box.paperId)
  const bowFee = bow ? Number(bow.surcharge) : 0
  const paperFee = paper ? Number(paper.surcharge) : 0
  return products + bowFee + paperFee
}

export const WISH_PER_BOX = 2

export function basketTotals(basket, opts, wishPerBox = 0) {
  const boxCount = basket.reduce((n, line) => n + line.qty, 0)
  const subtotal = basket.reduce(
    (sum, line) => sum + boxUnitPrice(line.box, opts) * line.qty,
    0,
  )
  const discountPct = discountPctForBoxCount(boxCount)
  const wishCost = wishPerBox * boxCount
  const total = subtotal * (1 - discountPct / 100) + wishCost
  return { boxCount, subtotal, discountPct, wishCost, total }
}

export const eur = (n) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(n || 0)
