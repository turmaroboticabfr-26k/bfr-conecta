# Hunk A: Fix auth-restoring to validate token
/^    let hasStoredSession = false;$/,/^    }, 15000);$/ {
  /^    let hasStoredSession = false;$/c\
    let hasStoredSession = false;\
    let hasValidSession = false;\
    try {\
      const stored = localStorage.getItem('sb-yyzqoxlkcvqcpessypfjo-auth-token');\
      if (stored) {\
        hasStoredSession = true;\
        const session = JSON.parse(stored);\
        const now = Math.floor(Date.now() / 1000);\
        hasValidSession = session.expires_at && session.expires_at > now;\
      }\
    } catch {}
  /^    try { hasStoredSession = Boolean/d
  /^    const isOAuthCallback/c\
    const isOAuthCallback = params.has('code') || hash.has('access_token') || params.has('error') || hash.has('error');
  /^    if (params.has('code')/c\
    if ((params.has('code') || hash.has('access_token') || hasValidSession) && !isOAuthCallback) document.documentElement.classList.add('auth-restoring');
  /^    if (hasStoredSession &&/c\
    if (hasValidSession && !isOAuthCallback) window.setTimeout(() => {
}
