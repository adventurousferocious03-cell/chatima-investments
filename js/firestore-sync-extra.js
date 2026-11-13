/* Chatima Firestore helper, part 2. Load it AFTER firestore-sync.js (which stays unchanged).
   Adds: vehicle saving, soft-delete of transactions and expenses, expense saving and live expense updates.
   It only ever writes the exact fields your Firestore rules allow, and never deletes a document. */
(function () {
    'use strict';
    var C = window.ChatimaCloud;
    if (!C) { console.error('Load firestore-sync.js before firestore-sync-extra.js'); return; }

    function fail(message) { return Promise.reject(new Error(message)); }
    function offline() { return typeof navigator !== 'undefined' && navigator.onLine === false; }
    function same(a, b, keys) { return keys.every(function (k) { return String(a[k]) === String(b[k]); }); }

    C.saveVehicle = function (localUser, v) {
        var self = this;
        if (!v || !v.id) return fail('No vehicle supplied.');
        if (offline()) return fail('You are offline.');
        var record = { id: String(v.id), name: String(v.name || '').trim(), kind: String(v.kind), archived: v.archived === true };
        if (!record.name || ['bus', 'combi', 'van'].indexOf(record.kind) < 0) return fail('Invalid vehicle details.');
        return self.verifyLocalLink(localUser).then(function () {
            return self.businessRef().collection('vehicles').doc(record.id).set(record);
        }).then(function () { return { saved: true, record: record }; });
    };

    C.saveExpense = function (localUser, x) {
        var self = this;
        if (!x) return fail('No expense supplied.');
        if (offline()) return fail('You are offline. The expense remains pending on this device.');
        var amount = Number(x.amount), ts = Number(x.ts);
        if (!x.id || !x.vid || !x.date || !x.by || ['Fuel', 'Maintenance', 'Other'].indexOf(x.cat) < 0 ||
            !Number.isFinite(amount) || amount <= 0 || amount > 1000000000 || !Number.isFinite(ts)) {
            return fail('Invalid expense details.');
        }
        var record = { id: String(x.id), vid: String(x.vid), date: String(x.date), amount: amount, cat: String(x.cat), by: String(x.by), ts: ts };
        return self.verifyLocalLink(localUser).then(function () {
            var ref = self.businessRef().collection('expenses').doc(record.id);
            return window.db.runTransaction(function (tx) {
                return tx.get(ref).then(function (doc) {
                    if (doc.exists) {
                        if (same(doc.data(), record, ['id', 'vid', 'date', 'amount', 'cat', 'by', 'ts'])) return { saved: true, alreadyExists: true };
                        throw new Error('A different expense already uses this ID. No data was overwritten.');
                    }
                    tx.set(ref, record);
                    return { saved: true, alreadyExists: false };
                });
            });
        });
    };

    // Soft delete: the record stays in Firestore, marked as deleted. Nothing is ever removed.
    function softDelete(self, collection, localUser, id, by) {
        if (!id) return fail('No record supplied.');
        if (offline()) return fail('You are offline.');
        return self.verifyLocalLink(localUser).then(function () {
            var ref = self.businessRef().collection(collection).doc(String(id));
            return window.db.runTransaction(function (tx) {
                return tx.get(ref).then(function (doc) {
                    if (!doc.exists) return { deleted: false, missing: true };
                    if (doc.data().deleted === true) return { deleted: true, already: true };
                    tx.update(ref, { deleted: true, deletedBy: String(by || ''), deletedAt: Date.now() });
                    return { deleted: true };
                });
            });
        });
    }
    C.markTransactionDeleted = function (localUser, id, by) { return softDelete(this, 'transactions', localUser, id, by); };
    C.markExpenseDeleted = function (localUser, id, by) { return softDelete(this, 'expenses', localUser, id, by); };

    C.startExpenseSync = function (localUser, onUpdate, onError) {
        var self = this;
        return self.verifyLocalLink(localUser).then(function () {
            var stopped = false;
            var unsubscribe = self.businessRef().collection('expenses').onSnapshot(function (snapshot) {
                if (!stopped && typeof onUpdate === 'function') onUpdate(snapshot.docs.map(function (d) { return d.data(); }));
            }, function (error) { if (!stopped && typeof onError === 'function') onError(error); });
            return function () { if (!stopped) { stopped = true; unsubscribe(); } };
        });
    };
    console.log('Chatima Firestore helper part 2 loaded.');
})();
