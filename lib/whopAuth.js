// lib/whopAuth.js
export async function verifyWhopToken(headers) {
  // Gérer les différents formats de headers (objet Next.js ou objet standard)
  let token = null
  
  try {
    if (headers && typeof headers.get === 'function') {
      token = headers.get('x-whop-user-token')
    } else if (headers && typeof headers === 'object') {
      token = headers['x-whop-user-token']
    }
  } catch(e) {
    token = null
  }

  if (!token) return null

  try {
    const res = await fetch('https://api.whop.com/api/v5/oauth/token/introspect', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.sub || data?.user_id || null
  } catch (e) {
    console.error('[whopAuth]', e.message)
    return null
  }
}

export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-whop-user-token, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'false')
}
