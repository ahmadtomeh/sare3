// Run this once to generate VAPID keys:
// node generate-vapid.js
// Then add the output to your .env and Vercel environment variables

const { webcrypto } = require('crypto')

const b64url = (buf) =>
  Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

;(async () => {
  const keyPair = await webcrypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  )

  const pubRaw = await webcrypto.subtle.exportKey('raw', keyPair.publicKey)
  const prvPkcs8 = await webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  const prvArr = new Uint8Array(prvPkcs8)

  const publicKey = b64url(pubRaw)
  const privateKey = b64url(prvArr.slice(36, 68))

  console.log('\n✅ VAPID Keys generated — Add these to your .env and Vercel:\n')
  console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}`)
  console.log(`VAPID_PRIVATE_KEY=${privateKey}`)
  console.log('\n⚠️  Keep VAPID_PRIVATE_KEY secret — only use it in the Edge Function, NOT in frontend code!\n')
})()
