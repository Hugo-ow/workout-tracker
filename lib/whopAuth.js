// lib/whopAuth.js

export async function verifyWhopToken(headers) {
  try {
    let token = null
    if (headers && typeof headers.get === 'function') {
      token = headers.get('x-whop-user-token')
    } else if (headers && typeof headers === 'object') {
      token = headers['x-whop-user-token']
    }
    if (!token) return null

    const res = await fetch('https://api.whop.com/api/v5/oauth/token/introspect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    console.log('[whopAuth] introspect status:', res.status)
    const data = await res.json()
    console.log('[whopAuth] introspect response:', JSON.stringify(data))

    return data?.sub || data?.user_id || null
  } catch (e) {
    console.error('[whopAuth] erreur:', e.message)
    return null
  }
}

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-whop-user-token, Authorization')
}
