import { Toaster } from 'react-hot-toast'

export default function Toast() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)',
          color: 'var(--clr-text)',
          fontFamily: 'var(--font-base)',
          fontSize: 'var(--text-sm)',
          borderRadius: 'var(--radius-md)',
          direction: 'rtl',
          boxShadow: 'var(--shadow-card)',
          maxWidth: '360px',
        },
        success: {
          iconTheme: { primary: 'var(--clr-success)', secondary: 'white' },
        },
        error: {
          iconTheme: { primary: 'var(--clr-danger)', secondary: 'white' },
        },
      }}
    />
  )
}
