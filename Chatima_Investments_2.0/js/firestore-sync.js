
(function () {
    'use strict';

    function cloudError(message) {
        return Promise.reject(new Error(message));
    }

    function sameTransaction(a, b) {
        return a.id === b.id &&
            a.vid === b.vid &&
            a.date === b.date &&
            Number(a.amount) === Number(b.amount) &&
            (a.note || '') === (b.note || '') &&
            a.by === b.by &&
            Number(a.ts) === Number(b.ts);
    }

    window.ChatimaCloud = {

        ready: function () {
            return !!(
                window.auth &&
                window.db &&
                typeof window.db.collection === 'function'
            );
        },

        signIn: function (email, password) {
            if (!this.ready()) {
                return cloudError('Firebase is not initialised.');
            }

            if (!email || !password) {
                return cloudError('Enter your Firebase email and password.');
            }

            return window.auth.signInWithEmailAndPassword(
                email.trim(),
                password
            );
        },

        signOut: function () {
            if (!window.auth) {
                return Promise.resolve();
            }

            return window.auth.signOut();
        },

        currentUser: function () {
            return window.auth ? window.auth.currentUser : null;
        },

        getProfile: function () {
            var user = this.currentUser();

            if (!this.ready()) {
                return cloudError('Firebase is not initialised.');
            }

            if (!user) {
                return cloudError('No Firebase user is signed in.');
            }

            return window.db.collection('users')
                .doc(user.uid)
                .get()
                .then(function (doc) {
                    if (!doc.exists) {
                        throw new Error(
                            'No authorised Chatima profile found.'
                        );
                    }

                    var profile = doc.data();

                    if (profile.active !== true) {
                        throw new Error('This account is inactive.');
                    }

                    if (profile.role !== 'owner') {
                        throw new Error(
                            'Only Main Admin accounts can access cloud data.'
                        );
                    }

                    return profile;
                });
        },

        verifyLocalLink: function (localUser) {
            if (!localUser || localUser.role !== 'owner') {
                return cloudError(
                    'A valid local Main Admin account is required.'
                );
            }

            return this.getProfile().then(function (profile) {
                var firebaseUser = window.auth.currentUser;

                if (!firebaseUser) {
                    throw new Error('Firebase session has expired.');
                }

                if (profile.localUserId !== localUser.id) {
                    throw new Error(
                        'Local account does not match Firebase account.'
                    );
                }

                if (profile.role !== localUser.role) {
                    throw new Error(
                        'Local and Firebase roles do not match.'
                    );
                }

                return {
                    verified: true,
                    name: profile.name,
                    role: profile.role,
                    firebaseUID: firebaseUser.uid
                };
            });
        },

        businessRef: function () {
            if (!this.ready()) {
                throw new Error('Firebase is not initialised.');
            }

            return window.db.collection('businesses')
                .doc('chatima-main');
        },

        loadBusinessData: function (localUser) {
            var self = this;

            return self.verifyLocalLink(localUser).then(function () {
                if (
                    typeof navigator !== 'undefined' &&
                    navigator.onLine === false
                ) {
                    throw new Error(
                        'You are offline. Cloud records cannot be loaded yet.'
                    );
                }

                var business = self.businessRef();

                return Promise.all([
                    business.collection('vehicles').get(),
                    business.collection('transactions').get()
                ]);
            }).then(function (results) {
                return {
                    vehicles: results[0].docs.map(function (doc) {
                        return doc.data();
                    }),

                    entries: results[1].docs.map(function (doc) {
                        return doc.data();
                    })
                };
            });
        },

        saveTransaction: function (localUser, transaction) {
            var self = this;

            if (!transaction) {
                return cloudError('No transaction supplied.');
            }

            if (
                typeof navigator !== 'undefined' &&
                navigator.onLine === false
            ) {
                return cloudError(
                    'You are offline. The transaction remains pending on this device.'
                );
            }

            var amount = Number(transaction.amount);
            var timestamp = Number(transaction.ts);

            if (
                !transaction.id ||
                !transaction.vid ||
                !transaction.date ||
                !transaction.by ||
                !Number.isFinite(amount) ||
                amount <= 0 ||
                amount > 1000000000 ||
                !Number.isFinite(timestamp)
            ) {
                return cloudError('Invalid transaction details.');
            }

            var record = {
                id: String(transaction.id),
                vid: String(transaction.vid),
                date: String(transaction.date),
                amount: amount,
                note: String(transaction.note || ''),
                by: String(transaction.by),
                ts: timestamp
            };

            return self.verifyLocalLink(localUser).then(function () {
                var docRef = self.businessRef()
                    .collection('transactions')
                    .doc(record.id);

                // Check before writing. Never overwrite an existing record.
                return docRef.get().then(function (doc) {
                    if (doc.exists) {
                        var existing = doc.data();

                        if (sameTransaction(existing, record)) {
                            return {
                                saved: true,
                                alreadyExists: true,
                                record: record
                            };
                        }

                        throw new Error(
                            'A different transaction already uses this ID. No data was overwritten.'
                        );
                    }

                    return docRef.set(record).then(function () {
                        return {
                            saved: true,
                            alreadyExists: false,
                            record: record
                        };
                    });
                });
            });
        }
    };

    console.log('Chatima Firestore helper loaded.');

})();
