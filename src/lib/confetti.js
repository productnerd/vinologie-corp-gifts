import confetti from 'canvas-confetti'

const COLORS = ['#c9a35e', '#ece2cf', '#7a2438', '#274133', '#1f2d4a', '#b8924a']

// Celebratory burst: streams up from the bottom centre and explodes out of both
// bottom corners, then everything falls back down under gravity.
export function celebrate() {
  const corner = (x, angle) =>
    confetti({ particleCount: 60, angle, spread: 72, startVelocity: 70, gravity: 1.05, ticks: 320, scalar: 1.05, origin: { x, y: 1.05 }, colors: COLORS })
  const fountain = () =>
    confetti({ particleCount: 80, angle: 90, spread: 110, startVelocity: 75, gravity: 1.1, ticks: 340, origin: { x: 0.5, y: 1.05 }, colors: COLORS })

  const burst = () => { corner(0, 60); corner(1, 120); fountain() }
  burst()
  const end = Date.now() + 900
  const timer = setInterval(() => {
    if (Date.now() > end) return clearInterval(timer)
    burst()
  }, 260)
}
