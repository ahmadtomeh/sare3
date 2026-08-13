import { useState, useRef, useEffect } from 'react'
import { Modal } from './ui/Modal'
import { Sparkles, Trophy, Gift, Check, Copy } from 'lucide-react'
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
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef(null)

  // Render Ultra-Sharp Retina HTML5 Canvas Wheel
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const size = 600 // High-DPI 2x resolution
    canvas.width = size
    canvas.height = size

    const centerX = size / 2
    const centerY = size / 2
    const radius = (size / 2) - 20

    const numSlices = prizes.length
    const sliceAngle = (2 * Math.PI) / numSlices

    ctx.clearRect(0, 0, size, size)

    // Draw Slices
    prizes.forEach((prize, idx) => {
      const startAngle = idx * sliceAngle
      const endAngle = startAngle + sliceAngle

      // Draw Slice Wedge
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()

      // Gradient Fill
      const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius)
      grad.addColorStop(0, '#FFFFFF22')
      grad.addColorStop(1, prize.color || '#8B5CF6')
      ctx.fillStyle = grad
      ctx.fill()

      // White Divider Border
      ctx.lineWidth = 4
      ctx.strokeStyle = '#FFFFFF'
      ctx.stroke()

      // Render Text & Icon
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + sliceAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '900 24px system-ui, -apple-system, sans-serif'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 6
      ctx.fillText(prize.label, radius - 36, 8)
      ctx.restore()
    })

    // Outer Casino Rim with Golden Bulbs
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.lineWidth = 12
    ctx.strokeStyle = '#F59E0B'
    ctx.stroke()

    // Outer Rim Golden Bulbs
    const numBulbs = 16
    for (let i = 0; i < numBulbs; i++) {
      const angle = (i * 2 * Math.PI) / numBulbs
      const bx = centerX + Math.cos(angle) * (radius + 1)
      const by = centerY + Math.sin(angle) * (radius + 1)
      ctx.beginPath()
      ctx.arc(bx, by, 6, 0, 2 * Math.PI)
      ctx.fillStyle = '#FEF08A'
      ctx.fill()
      ctx.lineWidth = 1.5
      ctx.strokeStyle = '#B45309'
      ctx.stroke()
    }

    // Center Gold Wheel Knob
    ctx.beginPath()
    ctx.arc(centerX, centerY, 38, 0, 2 * Math.PI)
    ctx.fillStyle = '#1E1B4B'
    ctx.fill()
    ctx.lineWidth = 5
    ctx.strokeStyle = '#F59E0B'
    ctx.stroke()

    ctx.fillStyle = '#F59E0B'
    ctx.font = '900 20px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎰', centerX, centerY)
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
      osc.frequency.setValueAtTime(800, audioCtx.currentTime)
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03)
      osc.start(audioCtx.currentTime)
      osc.stop(audioCtx.currentTime + 0.03)
    } catch {}
  }

  // Play winning fanfare sound
  const playWinSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const notes = [523.25, 659.25, 783.99, 1046.50]
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

    // ── GEOMETRIC ROTATION CALCULATION (100% PRECISE) ──
    const numSlices = prizes.length
    const sliceDeg = 360 / numSlices

    // Middle angle of the winning slice in Canvas space (0 deg = 3 o'clock)
    const prizeMidDeg = (prizeIndex + 0.5) * sliceDeg

    // Pointer is at the TOP (270 degrees in Canvas space)
    let neededRotation = 270 - prizeMidDeg
    if (neededRotation < 0) neededRotation += 360

    // 7 Full Dramatic Spins + Needed Angle Offset
    const fullSpins = 360 * 7
    const targetRotation = fullSpins + neededRotation

    setRotation(targetRotation)

    // Play tick sound pattern
    let ticks = 0
    const tickInterval = setInterval(() => {
      playTickSound()
      ticks++
      if (ticks > 28) clearInterval(tickInterval)
    }, 140)

    // Complete Spin after 4.5 seconds
    setTimeout(() => {
      clearInterval(tickInterval)
      setSpinning(false)
      setWonPrize(selectedPrize)

      if (selectedPrize.type !== 'no_win') {
        playWinSound()
      }
    }, 4500)
  }

  const handleCopyCode = (code) => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('📋 تم نسخ كود الخصم!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal title="🎡 عجلة الحظ والجوائز" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '6px 0' }}>
        
        {!wonPrize ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--clr-text-2)', lineHeight: 1.5 }}>
              🎉 مبروك! مشترياتك أهلتك لتدوير عجلة الجوائز الكبرى.<br />
              <strong style={{ color: 'var(--clr-accent)' }}>اضغط على الزر واكسب جائزتك فوراً! 🎁</strong>
            </div>

            {/* Wheel Container */}
            <div style={{ position: 'relative', width: 290, height: 290, margin: '14px 0' }}>
              
              {/* Golden 3D Pointer Arrow Pin at Top */}
              <div style={{
                position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)',
                zIndex: 20, width: 0, height: 0,
                borderLeft: '16px solid transparent',
                borderRight: '16px solid transparent',
                borderTop: '28px solid #DC2626',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
              }} />

              {/* Inner Golden Pointer Shadow Accent */}
              <div style={{
                position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                zIndex: 21, width: 0, height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '18px solid #F59E0B',
              }} />

              {/* Canvas Wheel */}
              <canvas
                ref={canvasRef}
                style={{
                  width: 290, height: 290, borderRadius: '50%',
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? 'transform 4.5s cubic-bezier(0.12, 0.8, 0.15, 1)' : 'none',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.25), 0 0 20px rgba(245, 158, 11, 0.3)'
                }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={spin}
              disabled={spinning}
              style={{
                width: '100%', maxWidth: 290, borderRadius: 14,
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
                <div style={{ fontSize: 56, animation: 'bounce 1s infinite' }}>🎉</div>
                <h2 style={{ fontSize: 21, fontWeight: 900, color: 'var(--clr-accent)' }}>
                  مبروك! فزت بـ {wonPrize.label}! 🎁
                </h2>
                <p style={{ fontSize: 13, color: 'var(--clr-text-2)' }}>
                  يمكنك استخدام كود الخصم التالي وتطبيقه في السلة مباشرة:
                </p>
                {wonPrize.code && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'var(--glass-bg-2)', border: '2px dashed var(--clr-accent)',
                    borderRadius: 12, padding: '10px 20px', fontSize: 18, fontWeight: 900,
                    color: 'var(--clr-text)', letterSpacing: 1
                  }}>
                    <span>{wonPrize.code}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 4 }}
                      onClick={() => handleCopyCode(wonPrize.code)}
                      title="نسخ الكود"
                    >
                      {copied ? <Check size={18} style={{ color: 'var(--clr-accent)' }} /> : <Copy size={18} />}
                    </button>
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
                <div style={{ fontSize: 54 }}>🍀</div>
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
