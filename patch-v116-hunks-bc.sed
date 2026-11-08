/trigger\.click();/c\
              trigger.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
/bindTrigger(document.getElementById('publicScheduleBtn'));/a\
        document.querySelectorAll('#loginScreen button, #loginScreen a[href]').forEach(function(el){ if (el.id==='googleLogin'||el.id==='publicScheduleBtn') return; bindTrigger(el); });
