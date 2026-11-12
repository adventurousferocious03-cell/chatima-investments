
(function () {
    'use strict';

    // Confirm that Firebase SDKs have loaded.
    if (
        typeof firebase === 'undefined' ||
        !firebase.initializeApp ||
        !firebase.auth ||
        !firebase.firestore
    ) {
        console.error(
            'Firebase SDK not loaded. Check index.html script order.'
        );

        window.firebaseReady = false;
        return;
    }

    // Firebase project configuration.
    var firebaseConfig = {
        apiKey: "AIzaSyDV_UVd_8x-VYxN9mgLSY78tnVpjNoFN44",
        authDomain: "chatima-investments-2.firebaseapp.com",
        projectId: "chatima-investments-2",
        storageBucket: "chatima-investments-2.firebasestorage.app",
        messagingSenderId: "584021782681",
        appId: "1:584021782681:web:b5ab0bdf6e3a5e796b4808"
    };

    try {

        // Initialise Firebase only once.
        var firebaseApp = firebase.apps.length
            ? firebase.app()
            : firebase.initializeApp(firebaseConfig);

        // Initialise Firebase services.
        var auth = firebaseApp.auth();
        var db = firebaseApp.firestore();

        // Make services available to Chatima.
        window.firebaseApp = firebaseApp;
        window.auth = auth;
        window.db = db;

        // Start Firestore offline persistence.
        window.firestorePersistenceReady = db.enablePersistence({
            synchronizeTabs: true
        }).then(function () {

            console.log(
                'Chatima Firestore offline persistence enabled.'
            );

            return true;

        }).catch(function (error) {

            if (error.code === 'failed-precondition') {
                console.warn(
                    'Firestore persistence unavailable: another tab may be using it.'
                );
            } else if (error.code === 'unimplemented') {
                console.warn(
                    'This browser does not support Firestore persistence.'
                );
            } else {
                console.warn(
                    'Firestore persistence error:',
                    error.message
                );
            }

            return false;
        });

        window.firebaseReady = true;

        console.log(
            'Chatima Firebase initialised:',
            firebaseApp.options.projectId
        );

    } catch (error) {

        window.firebaseReady = false;

        console.error(
            'Chatima Firebase initialisation failed:',
            error
        );
    }

})();
