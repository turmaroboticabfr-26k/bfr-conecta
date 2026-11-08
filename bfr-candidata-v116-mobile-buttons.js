// Candidata v116 — corrige botões inoperantes no mobile (login screen)
// Causa raiz: 3 problemas compostos
//   1. auth-restoring bloqueia interações por 15s com token expirado
//   2. bindTrigger só attacha em #googleLogin e #publicScheduleBtn
//   3. Synthetic click replay falha no mobile após await
//
// Hunk A: Validar token antes de adicionar auth-restoring (linhas 2047-2059)
// Hunk B: Adicionar bindTrigger em todos os botões da tela de login (linhas 11685-11686)
// Hunk C: Melhorar replay do click para mobile (linhas 11667-11683)

// ===== HUNK A: Validação de token antes de auth-restoring =====
// Substituir linhas 2047-2059 por:
/*
    let hasStoredSession = false;
    let hasValidSession = false;
    try {
      const stored = localStorage.getItem('sb-yyzqoxlkcvqcpessypfjo-auth-token');
      if (stored) {
        hasStoredSession = true;
        const session = JSON.parse(stored);
        const now = Math.floor(Date.now() / 1000);
        hasValidSession = session.expires_at && session.expires_at > now;
      }
    } catch {}
    const isOAuthCallback = params.has('code') || hash.has('access_token') || params.has('error') || hash.has('error');
    if ((params.has('code') || hash.has('access_token') || hasValidSession) && !isOAuthCallback) {
      document.documentElement.classList.add('auth-restoring');
    }
    if (hasValidSession && !isOAuthCallback) window.setTimeout(() => {
      if (document.getElementById('appShell')?.classList.contains('ready')) return;
      document.documentElement.classList.remove('auth-restoring');
      const status = document.getElementById('authStatus');
      if (status) {
        status.textContent = 'A verificação da sessão demorou. Entre novamente se o acesso não for restaurado.';
        status.className = 'auth-status pending';
      }
    }, 15000);
*/

// ===== HUNK B: bindTrigger em todos os botões da login screen =====
// Adicionar após linha 11686:
/*
        // Adicionar bindTrigger para todos os botões interativos da tela de login
        document.querySelectorAll('#loginScreen button, #loginScreen a[href]').forEach(el => {
          if (el.id === 'googleLogin' || el.id === 'publicScheduleBtn') return; // já tem bindTrigger
          bindTrigger(el);
        });
*/

// ===== HUNK C: Melhorar replay do click para mobile =====
// Substituir função bindTrigger (linhas 11667-11683) por:
/*
        function bindTrigger(trigger) {
          if (!trigger) return;
          trigger.addEventListener('click', async event => {
            if (replaying) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            try {
              await loadApplication();
              replaying = true;
              // Usar dispatchEvent em vez de trigger.click() para melhor compatibilidade mobile
              const replayEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              trigger.dispatchEvent(replayEvent);
            } catch (error) {
              console.error('BFR application failed to start', error);
              // Fallback: remover auth-restoring se falhar
              document.documentElement.classList.remove('auth-restoring');
            } finally {
              replaying = false;
            }
          }, true);
        }
*/

// ===== INSTRUÇÕES DE APLICAÇÃO =====
// 1. Aplicar Hunk A: validar token antes de auth-restoring
// 2. Aplicar Hunk B: adicionar bindTrigger em todos os botões
// 3. Aplicar Hunk C: melhorar replay do click
// 4. Testar no mobile (390px) e desktop (1280px)
// 5. Verificar se botões respondem imediatamente (sem esperar 15s)
// 6. Verificar se Google OAuth ainda funciona
// 7. Verificar se "Ver horários" abre modal
// 8. Verificar se botões legais (Privacidade, Termos, Contato) abrem modal
