// extraido dos bytes da candidata v120 a partir do char 1337943

      (() => {
        const SUPABASE_URL = 'https://yyzqoxlkcvqpessypfjo.supabase.co';
        const SUPABASE_KEY = 'sb_publishable_ha5BDvPjcE8eniuYIL7F2A_lmqEu3YB';
        const core = document.getElementById('bfr-core-runtime');
        let bundlePromise = null;
        let replaying = false;

        function loadSupabaseLibrary() {
          if (window.supabase) return Promise.resolve(window.supabase);
          const script = document.querySelector('script[src*="supabase-js"]');
          if (!script) return Promise.reject(new Error('Biblioteca de autenticação ausente.'));
          return new Promise((resolve, reject) => {
            script.addEventListener('load', () => window.supabase ? resolve(window.supabase) : reject(new Error('Biblioteca de autenticação indisponível.')), { once:true });
            script.addEventListener('error', () => reject(new Error('Biblioteca de autenticação indisponível.')), { once:true });
          });
        }

        function executeDeferred(node) {
          const script = document.createElement('script');
          if (node.id) script.id = node.id;
          const source = node.dataset.bfrSrc;
          if (source) {
            script.src = source;
            script.async = false;
          } else {
            script.textContent = node.textContent;
          }
          return new Promise((resolve, reject) => {
            if (source) {
              script.addEventListener('load', resolve, { once:true });
              script.addEventListener('error', reject, { once:true });
            } else resolve();
            node.replaceWith(script);
          });
        }

         function loadApplication() {
           if (bundlePromise) return bundlePromise;
           bundlePromise = (async () => {
             await loadSupabaseLibrary().catch(() => null);
             if (core?.isConnected) await executeDeferred(core);
             const activateApplicationModules = async () => {
               if (window.__BFR_AUTH_MODULES_PROMISE) return window.__BFR_AUTH_MODULES_PROMISE;
               window.__BFR_AUTH_MODULES_PROMISE = (async () => {
                 window.__BFR_DEFERRED_LOADER_ACTIVE = true;
                 try {
                   const nodes = [...document.querySelectorAll('script[type="text/plain"][data-bfr-auth-deferred],script[type="text/plain"][data-bfr-deferred]')]
                     .filter(node => !node.hasAttribute('data-bfr-auth-deferred-disabled'));
                   for (const node of nodes) {
                     if (!node.isConnected) continue;
                     try { await executeDeferred(node); } catch (error) { console.warn('BFR application module failed', node.id || node.dataset.bfrDeferred || 'anonymous', error); }
                     await new Promise(resolve => setTimeout(resolve, 0));
                   }
                 } finally {
                   window.__BFR_DEFERRED_LOADER_ACTIVE = false;
                 }
               })();
               return window.__BFR_AUTH_MODULES_PROMISE;
             };
             window.BFR_AUTH_MODULES_READY = activateApplicationModules;
           })();
           return bundlePromise;
         }

        async function restoreSession() {
           const library = await loadSupabaseLibrary();
            const client = window.BFR_SUPABASE_CLIENT || library.createClient(SUPABASE_URL, SUPABASE_KEY, { auth:{ autoRefreshToken:true, persistSession:true, detectSessionInUrl:false, flowType:'pkce' } });
           window.BFR_SUPABASE_CLIENT = client;
           const { data } = await client.auth.getSession();
           const params = new URLSearchParams(location.search);
           const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
           const hasOAuthCallback = params.has('code') || params.has('error') || hash.has('access_token') || hash.has('error');
           if (data?.session || hasOAuthCallback) await loadApplication();
        }

        function bindTrigger(trigger) {
          if (!trigger) return;
          trigger.addEventListener('click', async event => {
            if (replaying) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            try {
              await loadApplication();
              replaying = true;
              trigger.dataset.replaying = 'true';
              trigger.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
            } catch (error) {
              console.error('BFR application failed to start', error);
            } finally {
              delete trigger.dataset.replaying;
              replaying = false;
            }
          }, true);
        }

        bindTrigger(document.getElementById('googleLogin'));
        bindTrigger(document.getElementById('publicScheduleBtn'));
        document.querySelectorAll('#loginScreen button, #loginScreen a[href]').forEach(function(el){ if (el.id==='googleLogin'||el.id==='publicScheduleBtn') return; bindTrigger(el); });
        restoreSession().catch(error => console.warn('BFR session restore deferred', error));
      })();
    