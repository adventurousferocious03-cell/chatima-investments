(function () {
    'use strict';

    function fail(message) { return Promise.reject(new Error(message)); }

    function sameTransaction(a, b) {
        return a.id === b.id && a.vid === b.vid && a.date === b.date &&
            Number(a.amount) === Number(b.amount) && (a.note || '') === (b.note || '') &&
            a.by === b.by && Number(a.ts) === Number(b.ts);
    }

    window.ChatimaCloud = {
        ready: function () {
            return !!(window.auth && window.db && typeof window.db.collection === 'function');
        },
        signIn: function (email, password) {
            if (!this.ready()) return fail('Firebase is not initialised.');
            if (!email || !password) return fail('Enter your Firebase email and password.');
            return window.auth.signInWithEmailAndPassword(email.trim(), password);
        },
        signOut: function () {
            return window.auth ? window.auth.signOut() : Promise.resolve();
        },
        currentUser: function () { return window.auth ? window.auth.currentUser : null; },
        getProfile: function () {
            var user = this.currentUser();
            if (!this.ready()) return fail('Firebase is not initialised.');
            if (!user) return fail('No Firebase user is signed in.');
            return window.db.collection('users').doc(user.uid).get().then(function (doc) {
                if (!doc.exists) throw new Error('No authorised Chatima profile found.');
                var profile = doc.data();
                if (profile.active !== true) throw new Error('This account is inactive.');
                if (profile.role !== 'owner') throw new Error('Only Main Admin accounts can access cloud data.');
                return profile;
            });
        },
        verifyLocalLink: function (localUser) {
            if (!localUser || localUser.role !== 'owner') return fail('A valid local Main Admin account is required.');
            return this.getProfile().then(function (profile) {
                var user = window.auth.currentUser;
                if (!user) throw new Error('Firebase session has expired.');
                // Firebase UID is the cloud identity. Firestore security rules
                // restrict access to the authorised Main Admin UIDs.
                // Local PIN IDs and display names are device-specific and are
                // not reliable Firebase identity checks.
                if (profile.role !== 'owner' || profile.active !== true) {
                    throw new Error('This Firebase account is not an active Main Admin.');
                }
                if (localUser.role !== 'owner') {
                    throw new Error('A local Main Admin account is required.');
                }
                return { verified: true, name: profile.name, role: profile.role, firebaseUID: user.uid };
            });
        },
        businessRef: function () {
            if (!this.ready()) throw new Error('Firebase is not initialised.');
            return window.db.collection('businesses').doc('chatima-main');
        },
        loadBusinessData: function (localUser) {
            var self = this;
            return self.verifyLocalLink(localUser).then(function () {
                if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                    throw new Error('You are offline. Cloud records cannot be loaded yet.');
                }
                var business = self.businessRef();
                return Promise.all([business.collection('vehicles').get(), business.collection('transactions').get()]);
            }).then(function (results) {
                return {
                    vehicles: results[0].docs.map(function (doc) { return doc.data(); }),
                    entries: results[1].docs.map(function (doc) { return doc.data(); })
                };
            });
        },
        startLiveSync: function (localUser, onUpdate, onError) {
            var self = this;
            return self.verifyLocalLink(localUser).then(function () {
                var business = self.businessRef();
                var stopped = false, vehiclesReady = false, entriesReady = false;
                var vehicles = [], entries = [], unsubscribers = [];
                function report(error) { if (!stopped && typeof onError === 'function') onError(error); }
                function publish() {
                    if (!stopped && vehiclesReady && entriesReady && typeof onUpdate === 'function') {
                        onUpdate({ vehicles: vehicles.slice(), entries: entries.slice() });
                    }
                }
                function stop() {
                    if (stopped) return;
                    stopped = true;
                    unsubscribers.forEach(function (unsubscribe) { unsubscribe(); });
                    unsubscribers = [];
                }
                try {
                    unsubscribers.push(business.collection('vehicles').onSnapshot(function (snapshot) {
                        if (stopped) return;
                        vehicles = snapshot.docs.map(function (doc) { return doc.data(); });
                        vehiclesReady = true; publish();
                    }, report));
                    unsubscribers.push(business.collection('transactions').onSnapshot(function (snapshot) {
                        if (stopped) return;
                        entries = snapshot.docs.map(function (doc) { return doc.data(); });
                        entriesReady = true; publish();
                    }, report));
                } catch (error) { stop(); throw error; }
                console.log('Chatima live cloud listeners started.');
                return stop;
            });
        },
        saveTransaction: function (localUser, transaction) {
            var self = this;
            if (!transaction) return fail('No transaction supplied.');
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                return fail('You are offline. The transaction remains pending on this device.');
            }
            var amount = Number(transaction.amount), timestamp = Number(transaction.ts);
            if (!transaction.id || !transaction.vid || !transaction.date || !transaction.by ||
                !Number.isFinite(amount) || amount <= 0 || amount > 1000000000 || !Number.isFinite(timestamp)) {
                return fail('Invalid transaction details.');
            }
            var record = {
                id: String(transaction.id), vid: String(transaction.vid), date: String(transaction.date),
                amount: amount, note: String(transaction.note || ''), by: String(transaction.by), ts: timestamp
            };
            return self.verifyLocalLink(localUser).then(function () {
                var ref = self.businessRef().collection('transactions').doc(record.id);
                return window.db.runTransaction(function (tx) {
                    return tx.get(ref).then(function (doc) {
                        if (doc.exists) {
                            if (sameTransaction(doc.data(), record)) {
                                return { saved: true, alreadyExists: true, record: record };
                            }
                            throw new Error('A different transaction already uses this ID. No data was overwritten.');
                        }
                        tx.set(ref, record);
                        return { saved: true, alreadyExists: false, record: record };
                    });
                });
            });
        }
    };
    console.log('Chatima Firestore helper loaded successfully.');
})();
