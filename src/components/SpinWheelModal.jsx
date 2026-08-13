import { useState, useRef, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Sparkles, Trophy, Gift, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_PRIZES = [
  { id: 'p1', label: 'خصم 10%', type: 'percentage', value: 10, code: 'SPIN10', color: '#8B5CF6' },
  { id: 'p2', label: 'خصم 5 ₪', type: 'fixed', value: 5, code: 'SPIN5', color: '#10B981' },
  { id: 'p3', label: 'شحن مجاني 🚚', type: 'free_shipping', value: 0, code: 'FREESHIP', color: '#F59E0B' },
  { id: 'p4', label: 'هدية مع الطلب 🎁', type: 'gift', value: 0, code: 'GIFT', color: '#EC4899' },
  { id: 'p5', label: 'حظاً أوفر 🍀', type: 'no_win', value: 0, code: '', color: '#6B7280' }
]

export default function SpinWheelModal({ store, onClose, onApplyCoupon }) {
  const prizes = store?.wheel_prizes || DEFAULT_PRIZES
  const [spinning, setSpinning] = useState(false)
  const [wonPrize, setWonPrize] = useState(null)
  const [rotation, setRotation] = useState(0)
  const canvasRef = useRef(null)

  // Draw the Wheel Slices on HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(centerX, centerY) - 10

    const numSlices = prizes.length
    const sliceAngle = (2 * Math.PI) / numSlices

    ctx.clearRect(0, 0, width, height)

    // Draw slices
    prizes.forEach((prize, idx) => {
      const startAngle = idx * sliceAngle
      const endAngle = startAngle + sliceAngle

      // Slice background
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = prize.color || '#8B5CF6'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.stroke()

      // Slice text
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + sliceAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 13px system-ui, sans-serif'
      ctx.fillText(prize.label, radius - 20, 5)
      ctx.restore()
    })

    // Outer ring
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.lineWidth = 6
    ctx.strokeStyle = '#FFFFFF'
    ctx.stroke()

    // Center peg
    ctx.beginPath()
    ctx.arc(centerX, centerY, 24, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = 'var(--clr-primary, #8B5CF6)'
    ctx.stroke()
  }, [prizes])

  // Play audio tick sound using Web Audio API
  const playTickSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(600, audioCtx.currentTime)
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04)
      osc.start(audioCtx.currentTime)
      osc.stop(audioCtx.currentTime + 0.04)
    } catch {}
  }

  // Play winning fanfare sound
  const playWinSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1)
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + idx * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.1 + 0.3)
        osc.start(audioCtx.currentTime + idx * 0.1)
        osc.stop(audioCtx.currentTime + idx * 0.1 + 0.3)
      })
    } catch {}
  }

  const spin = () => {
    if (spinning || wonPrize) return
    setSpinning(true)

    // Select random winning prize index
    const prizeIndex = Math.floor(Math.random() * prizes.length)
    const selectedPrize = prizes[prizeIndex]

    // Calculate target rotation angle (5 full spins + slice offset)
    const numSlices = prizes.length
    const sliceDeg = 360 / numSlices
    // Pointer is at the top (270 degrees in canvas coords, or top center)
    const prizeCenterDeg = (prizeIndex * sliceDeg) + (sliceDeg / 2)
    const targetDeg = 360 * 5 + (360 - prizeCenterDeg)

    setRotation(targetDeg)

    // Play tick sounds during spin
    let tickCount = 0
    const tickInterval = setInterval(() => {
      playTickSound()
      tickCount++
      if (tickCount > 25) clearInterval(tickInterval)
    }, 150)

    // Finish spin after 4.2 seconds
    setTimeout(() => {
      clearInterval(tickInterval)
      setSpinning(false)
      setWonPrize(selectedPrize)

      if (selectedPrize.type !== 'no_win') {
        playWinSound()
      }
    }, 4200)
  }

  return (
    <Modal title="🎡 عجلة الحظ والجوائز" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '8px 0' }}>
        
        {!wonPrize ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--clr-text-2)', lineHeight: 1.5 }}>
              🎉 مبروك! مشترياتك أهلتك لتدوير عجلة الحظ الكبرى.<br />
              <strong style={{ color: 'var(--clr-accent)' }}>اضغط على الزر واكسب جائزتك فوراً! 🎁</strong>
            </div>

            {/* Wheel Container */}
            <div style={{ position: 'relative', width: 280, height: 280, margin: '12px 0' }}>
              {/* Pointer Indicator */}
              <div style={{
                position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                zIndex: 10, width: 0, height: 0,
                borderLeft: '14px solid transparent',
                borderRight: '14px solid transparent',
                borderTop: '24px solid #EF4444',
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))'
              }} />

              {/* Canvas Wheel */}
              <canvas
                ref={canvasRef}
                width={280}
                height={280}
                style={{
                  width: 280, height: 280, borderRadius: '50%',
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4.2s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={spin}
              disabled={spinning}
              style={{
                width: '100%', maxWidth: 280, borderRadius: 14,
                fontSize: 16, fontWeight: 900, padding: '14px 20px',
                boxShadow: '0 6px 20px var(--clr-primary-glow)'
              }}
            >
              {spinning ? '🌀 جاري الدوران...' : '🚀 لَفّ العجلة الآن!'}
            </button>
          </>
        ) : (
          /* Won Prize Banner / Modal Result */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%', padding: '10px 0' }}>
            {wonPrize.type !== 'no_win' ? (
              <>
                <div style={{ fontSize: 50, animation: 'bounce 1s infinite' }}>🎉</div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--clr-accent)' }}>
                  مبروك! فزت بـ {wonPrize.label}! 🎁
                </h2>
                <p style={{ fontSize: 13, color: 'var(--clr-text-2)' }}>
                  يمكنك استخدام كود الخصم التالي وتطبيقه في السلة مباشرة:
                </p>
                {wonPrize.code && (
                  <div style={{
                    background: 'var(--glass-bg-2)', border: '2px dashed var(--clr-accent)',
                    borderRadius: 12, padding: '10px 20px', fontSize: 18, fontWeight: 900,
                    color: 'var(--clr-text)', letterSpacing: 1
                  }}>
                    {wonPrize.code}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, minHeight: 44, borderRadius: 10, fontWeight: 800 }}
                    onClick={() => {
                      if (onApplyCoupon && wonPrize.code) {
                        onApplyCoupon(wonPrize.code)
                      }
                      onClose()
                    }}
                  >
                    🎟️ تطبيق الخصم في السلة
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 50 }}>🍀</div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--clr-text)' }}>
                  حظاً أوفر في المرة القادمة!
                </h2>
                <p style={{ fontSize: 12, color: 'var(--clr-text-3)' }}>
                  شكراً لمشاركتك معنا! يمكنك محاولة الدوران في مشترياتك القادمة.
                </p>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onClose}
                  style={{ marginTop: 10 }}
                >
                  إغلاق
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
