(function () {
    'use strict';
    var cfg = window.CHATIMA_FIREBASE_CONFIG;
    if (typeof firebase === 'undefined') { console.warn('Firebase SDK not loaded (offline?). Cloud features are off.'); return; }
    if (!cfg || !cfg.apiKey || /PASTE/.test(cfg.apiKey)) { console.warn('Add your Firebase settings to firebase-config.js'); return; }
    try {
        if (!firebase.apps.length) firebase.initializeApp(cfg);
        window.auth = firebase.auth();
        window.db = firebase.firestore();
    } catch (e) { console.error('Firebase start-up failed', e); }
})();
