import confetti from 'canvas-confetti'

const COLORS = ['#c9a35e', '#ece2cf', '#7a2438', '#274133', '#1f2d4a', '#b8924a']

// One burst from the bottom-right, then one from the bottom-left half a second later.
export function celebrate() {
  const fire = (x, angle) =>
    confetti({ particleCount: 90, angle, spread: 78, startVelocity: 72, gravity: 1.05, ticks: 340, scalar: 1.05, origin: { x, y: 1.05 }, colors: COLORS })

  fire(1, 120) // right first (shoots up and inward)
  setTimeout(() => fire(0, 60), 500) // left, half a second later
}
