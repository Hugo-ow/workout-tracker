// lib/whopAuth.js
// Valide le token Whop et retourne le userId

export async function verifyWhopToken(token) {
  if (!token) return null

  try {
    const res = await fetch('https://api.whop.com/api/v5/oauth/token/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
      },
      body: JSON.stringify({ token }),
    })

    if (!res.ok) return null

    const data = await res.json()

    // Retourne l'userId stable Whop
    return data?.user_id || data?.sub || null
  } catch (e) {
    console.error('[whopAuth] Erreur validation token:', e.message)
    return null
  }
}

// Helper CORS pour les routes API
export function setCorsHeaders(res, allowedOrigin) {
  const origin = allowedOrigin || process.env.ALLOWED_ORIGIN || 'https://whop.com'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-whop-user-token')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}
