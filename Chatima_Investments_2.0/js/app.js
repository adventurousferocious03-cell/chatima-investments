

(function(){



var KEY='fleetRevenue_v1', storageOK=true;



function pad(n){return n<10?'0'+n:''+n}

function dstr(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}

function today(){return dstr(new Date())}

function parse(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2])}

function addDays(s,n){var d=parse(s);d.setDate(d.getDate()+n);return dstr(d)}

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

function esc(t){return String(t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}



function seed(){return{currency:'$',users:[],gone:{},vehicles:[

{id:'v2',name:'Combi 1',kind:'combi'},{id:'v3',name:'Combi 2',kind:'combi'},

{id:'v4',name:'Combi 3',kind:'combi'},{id:'v5',name:'Adv van',kind:'van'}],entries:[]}}



function load(){

try{

var r=localStorage.getItem(KEY);

if(r){

var d=JSON.parse(r);d.users=d.users||[];d.gone=d.gone||{};

if(!d.users.length&&d.sec)d.users.push({id:'u'+uid(),name:'Main admin',role:'owner',salt:d.sec.salt,hash:d.sec.hash});

delete d.sec;return d

}

}catch(e){storageOK=false}

return seed();

}



var S=load();



function persist(){

try{localStorage.setItem(KEY,JSON.stringify(S));storageOK=true}catch(e){storageOK=false}

}

function save(){persist()}



var ui={tab:'today',date:today(),period:'week',msg:'',me:null,lockMsg:'',last:Date.now(),hid:0};



function money(n){return S.currency+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}

function active(){return S.vehicles.filter(function(v){return !v.archived})}

function sum(list){return list.reduce(function(a,e){return a+e.amount},0)}

function kindLabel(k){return k==='bus'?'Bus':k==='combi'?'Combi':'Van'}



function dateBar(){

var d=parse(ui.date),label=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});

return '<div class="datebar"><button class="ghost" data-a="prev" aria-label="Previous day">‹</button>'+

'<input type="date" id="dpick" value="'+ui.date+'" aria-label="Pick date">'+

'<button class="ghost" data-a="next" aria-label="Next day">›</button></div>'+

'<div class="muted" style="margin:-6px 0 10px">'+esc(label)+(ui.date===today()?' (today)':'')+'</div>';

}



var ROLES={

owner:{n:'Main admin',l:4,d:'Full control: people, vehicles, backups and deleting data.'},

admin:{n:'Admin',l:3,d:'Runs the day: vehicles, reports, managers and employees.'},

manager:{n:'Manager',l:2,d:'Adds revenue for any day and sees every report.'},

employee:{n:'Employee',l:1,d:'Adds today’s revenue and sees only their own entries.'}

};



function me(){return S.users.filter(function(u){return u.id===ui.me})[0]}

function lvl(){var m=me();return m?ROLES[m.role].l:0}

function nameOf(id){var u=S.users.filter(function(x){return x.id===id})[0];return u?u.name:'Former staff'}

function logo(sz,anim){

var d='M43.8 22.8A15 15 0 1 0 43.8 41.2';

return '<svg class="'+(anim?'anim':'')+'" viewBox="0 0 64 64" width="'+sz+'" height="'+sz+'" role="img" aria-label="Chatima Investments logo"><rect width="64" height="64" rx="15" fill="#0E3B37"/><path class="arc" d="'+d+'" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="'+d+'" fill="none" stroke="#F2B632" stroke-width="1.6" stroke-dasharray="3 3"/><path d="M46 26.5L57 32L46 37.5Z" fill="#F2B632"/></svg>'

}

function pinIn(id,ph,vis){return '<input id="'+id+'" type="'+(vis?'text':'password')+'" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="'+ph+'" aria-label="'+ph+'">'}

function avatar(u,sz){

var st='width:'+sz+'px;height:'+sz+'px;font-size:'+Math.round(sz*.4)+'px';

if(u.photo)return '<img class="av" style="'+st+'" src="'+u.photo+'" alt="">';

var ini=u.name.split(' ').filter(Boolean).slice(0,2).map(function(w){return w[0].toUpperCase()}).join('');

return '<span class="av" style="'+st+'" aria-hidden="true">'+esc(ini)+'</span>'

}

function ownerCount(){return S.users.filter(function(u){return u.role==='owner'}).length}

function allowedRoles(){var r=lowerRoles();if(lvl()===4&&ownerCount()<2)r.unshift('owner');return r}

function canPhoto(u){return u.id===ui.me||ROLES[u.role].l<lvl()}

function photoRow(u){

if(!canPhoto(u))return '';

return '<div class="addrow" style="grid-template-columns:1fr 1fr"><label class="filebtn">'+(u.photo?'Change photo':'Add photo')+'<input type="file" accept="image/*" data-a="uphoto" data-id="'+u.id+'" hidden></label>'+

(u.photo?'<button class="ghost small" data-a="urmphoto" data-id="'+u.id+'">Remove photo</button>':'<span></span>')+'</div>'

}

function thumb(v){return v.photo?'<img class="ph" src="'+v.photo+'" alt="">':''}




var stopCloudLiveSync = null;
var liveSyncStarting = false;

function stopCloudSync(){
    if (typeof stopCloudLiveSync === 'function') {
        stopCloudLiveSync();
    }
    stopCloudLiveSync = null;
    liveSyncStarting = false;
}

function mergeLiveCloudData(remote){
    if (!remote || !ui.me || lvl() !== 4) return;

    var localEntries = {};
    S.entries.forEach(function(entry){
        localEntries[entry.id] = entry;
    });

    (remote.entries || []).forEach(function(entry){
        if (!entry || !entry.id) return;

        var local = localEntries[entry.id];
        if (!local) {
            S.entries.push(entry);
            return;
        }

        // A matching cloud record confirms that a pending local
        // transaction has reached Firestore.
        if (local._cloudPending === true &&
            Number(local.amount) === Number(entry.amount) &&
            local.vid === entry.vid &&
            local.date === entry.date &&
            (local.note || '') === (entry.note || '') &&
            local.by === entry.by &&
            Number(local.ts) === Number(entry.ts)) {
            delete local._cloudPending;
        }
    });

    var localVehicles = {};
    S.vehicles.forEach(function(vehicle){
        localVehicles[vehicle.id] = vehicle;
    });

    (remote.vehicles || []).forEach(function(vehicle){
        if (!vehicle || !vehicle.id) return;

        var localVehicle = localVehicles[vehicle.id];
        if (!localVehicle) {
            S.vehicles.push(vehicle);
        } else {
            // Preserve local-only fields such as vehicle photos.
            Object.keys(vehicle).forEach(function(key){
                localVehicle[key] = vehicle[key];
            });
        }
    });

    persist();
    render();
}

function startCloudLiveSync(){
    var owner = me();

    stopCloudSync();

    if (!owner || owner.role !== 'owner' ||
        !window.ChatimaCloud ||
        !window.ChatimaCloud.currentUser() ||
        typeof window.ChatimaCloud.startLiveSync !== 'function') {
        return Promise.resolve(false);
    }

    liveSyncStarting = true;

    return window.ChatimaCloud.startLiveSync(
        owner,
        function(remote){
            if (!ui.me || ui.me !== owner.id || lvl() !== 4) return;
            mergeLiveCloudData(remote);
        },
        function(error){
            console.warn('Chatima live sync:', error);
            if (ui.me === owner.id) {
                ui.msg = 'Live cloud update failed. Check your connection.';
                render();
            }
        }
    ).then(function(stop){
        liveSyncStarting = false;

        // The user may have logged out while verification was running.
        if (!ui.me || ui.me !== owner.id || !window.ChatimaCloud.currentUser()) {
            stop();
            return false;
        }

        stopCloudLiveSync = stop;
        return true;
    }).catch(function(error){
        liveSyncStarting = false;
        console.warn('Could not start Chatima live sync:', error);
        return false;
    });
}

function syncLine(){
    if (!window.ChatimaCloud || !window.ChatimaCloud.ready()) {
        return '<p class="muted">Cloud is unavailable. Changes remain on this device.</p>';
    }
    return window.ChatimaCloud.currentUser()
        ? '<p class="muted">Connected to Chatima cloud.</p>'
        : '<p class="muted">Local mode. Main Admin cloud sync is inactive.</p>';
}

function syncCloudData(){
    var owner = me();
    if (!owner || owner.role !== 'owner' || !window.ChatimaCloud ||
        !window.ChatimaCloud.currentUser()) return Promise.resolve(false);

    return window.ChatimaCloud.loadBusinessData(owner).then(function(remote){
        var known = {};
        S.entries.forEach(function(e){ known[e.id] = true; });
        (remote.entries || []).forEach(function(e){
            if (e && e.id && !known[e.id]) S.entries.push(e);
        });

        var vehicleIds = {};
        S.vehicles.forEach(function(v){ vehicleIds[v.id] = true; });
        (remote.vehicles || []).forEach(function(v){
            if (v && v.id && !vehicleIds[v.id]) S.vehicles.push(v);
        });
        persist();

        var pending = S.entries.filter(function(e){ return e._cloudPending === true; });
        return pending.reduce(function(chain, entry){
            return chain.then(function(){
                return window.ChatimaCloud.saveTransaction(owner, entry).then(function(){
                    delete entry._cloudPending;
                    persist();
                });
            });
        }, Promise.resolve()).then(function(){
            return true;
        });
    }).catch(function(error){
        console.warn('Chatima cloud sync:', error);
        ui.msg = 'Cloud sync could not finish: ' + (error.message || 'Please try again.');
        return false;
    });
}

function viewToday(){

var emp=lvl()===1;if(emp)ui.date=today();

var all=S.entries.filter(function(e){return e.date===ui.date});

var day=emp?all.filter(function(e){return e.by===ui.me}):all;

var h='<h1>'+(emp?'Your revenue today':'Daily revenue')+'</h1>'+syncLine()+(emp?'':dateBar());

h+='<div class="total"><div class="muted">'+(emp?'Your total today':'Total for the day')+'</div><div class="num">'+money(sum(day))+'</div>'+

'<div class="muted">'+day.length+' entr'+(day.length===1?'y':'ies')+'</div></div>';

active().forEach(function(v){

var es=day.filter(function(e){return e.vid===v.id}).sort(function(a,b){return b.ts-a.ts});

h+='<div class="vcard '+v.kind+'"><div class="vhead"><span class="vl">'+thumb(v)+'<span><span class="vname">'+esc(v.name)+'</span><br><span class="muted">'+kindLabel(v.kind)+' · '+es.length+' entr'+(es.length===1?'y':'ies')+'</span></span></span>'+

'<span class="vtotal num">'+money(sum(es))+'</span></div>'+

'<div class="addrow"><input inputmode="decimal" placeholder="Amount" id="amt-'+v.id+'" data-v="'+v.id+'">'+

'<input placeholder="Note (optional)" id="note-'+v.id+'" data-v="'+v.id+'"><button data-a="add" data-v="'+v.id+'">Add</button></div>';

if(es.length){

h+='<ul class="entries">'+es.map(function(e){

var canDel=lvl()>=2||(e.by===ui.me&&e.date===today());

return '<li><span><span class="num">'+money(e.amount)+'</span> <span class="note">'+esc(e.note||'')+(emp?'':' · '+esc(nameOf(e.by)))+'</span></span>'+

(canDel?'<button class="danger small" data-a="del" data-id="'+e.id+'">Delete</button>':'')+'</li>'

}).join('')+'</ul>';

}

h+='</div>';

});

return h;

}



function rangeDates(){

var out=[],i;

if(ui.period==='week'){for(i=6;i>=0;i--)out.push(addDays(ui.date,-i))}

else{

var d=parse(ui.date),y=d.getFullYear(),m=d.getMonth(),n=new Date(y,m+1,0).getDate();

for(i=1;i<=n;i++)out.push(y+'-'+pad(m+1)+'-'+pad(i))

}

return out;

}



function viewReports(){

var dates=rangeDates(),set={};dates.forEach(function(d){set[d]=1});

var inRange=S.entries.filter(function(e){return set[e.date]});

var vids={};inRange.forEach(function(e){vids[e.vid]=1});

var cols=S.vehicles.filter(function(v){return !v.archived||vids[v.id]});

var h='<h1>Reports</h1><div class="seg"><button data-a="period" data-p="week" class="'+(ui.period==='week'?'on':'')+'">7 days</button>'+

'<button data-a="period" data-p="month" class="'+(ui.period==='month'?'on':'')+'">This month</button></div>'+dateBar();

var grand=sum(inRange);

h+='<div class="total"><div class="muted">'+(ui.period==='week'?'Last 7 days to selected date':parse(ui.date).toLocaleDateString('en-GB',{month:'long',year:'numeric'}))+'</div>'+

'<div class="num">'+money(grand)+'</div><div class="muted">Average per day: '+money(grand/dates.length)+'</div></div>';

h+='<h2>By vehicle</h2>';

cols.forEach(function(v){

var t=sum(inRange.filter(function(e){return e.vid===v.id})),pct=grand?Math.round(t/grand*100):0;

h+='<div class="share '+v.kind+'"><div class="vhead"><span class="vname">'+esc(v.name)+(v.archived?' (removed)':'')+'</span>'+

'<span class="num">'+money(t)+'</span></div><div class="bar"><span style="width:'+pct+'%"></span></div>'+

'<div class="muted">'+pct+'% of total</div></div>';

});

h+='<h2>Day by day</h2><div class="scroll"><table><thead><tr><th>Date</th>'+

cols.map(function(v){return '<th>'+esc(v.name)+'</th>'}).join('')+'<th>Total</th></tr></thead><tbody>';

dates.forEach(function(d){

var es=inRange.filter(function(e){return e.date===d});

h+='<tr><td>'+parse(d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+'</td>'+

cols.map(function(v){var t=sum(es.filter(function(e){return e.vid===v.id}));return '<td class="num">'+(t?t.toFixed(2):'–')+'</td>'}).join('')+

'<td class="num">'+(es.length?sum(es).toFixed(2):'–')+'</td></tr>';

});

h+='</tbody><tfoot><tr><td>Total</td>'+cols.map(function(v){return '<td class="num">'+sum(inRange.filter(function(e){return e.vid===v.id})).toFixed(2)+'</td>'}).join('')+

'<td class="num">'+grand.toFixed(2)+'</td></tr></tfoot></table></div>';

return h;

}



function viewFleet(){

var h='<h1>Fleet</h1><p class="muted">Name each vehicle and add a photo from the camera or gallery. Removing a vehicle keeps its past revenue.</p>';

active().forEach(function(v){

h+='<div class="vcard '+v.kind+'"><div class="vl">'+thumb(v)+'<input data-a="rename" data-v="'+v.id+'" value="'+esc(v.name)+'" aria-label="Vehicle name"></div>'+

'<div class="addrow" style="grid-template-columns:1fr 1fr"><select data-a="kind" data-v="'+v.id+'" aria-label="Vehicle type">'+

['bus','combi','van'].map(function(k){return '<option value="'+k+'"'+(v.kind===k?' selected':'')+'>'+kindLabel(k)+'</option>'}).join('')+'</select>'+

'<label class="filebtn">'+(v.photo?'Change photo':'Add photo')+'<input type="file" accept="image/*" data-a="photo" data-v="'+v.id+'" hidden></label></div>'+

'<div class="addrow" style="grid-template-columns:1fr 1fr">'+(v.photo?'<button class="ghost small" data-a="rmphoto" data-v="'+v.id+'">Remove photo</button>':'<span></span>')+

'<button class="danger small" data-a="remove" data-v="'+v.id+'">Remove vehicle</button></div></div>';

});

h+='<h2>Add a vehicle</h2><div class="row"><input id="newname" placeholder="e.g. Omnibus 1"><select id="newkind"><option value="combi">Combi</option><option value="bus">Bus</option><option value="van">Van</option></select>'+

'<button data-a="addveh">Add</button></div><h2>Currency symbol</h2><input id="cur" value="'+esc(S.currency)+'" maxlength="4" style="max-width:120px">';

return h;

}



function lowerRoles(){var L=lvl();return Object.keys(ROLES).filter(function(k){return ROLES[k].l<L})}

function viewPeople(){

var L=lvl(),lr=allowedRoles();

var h='<h1>People and PINs</h1>'+(ui.msg?'<p class="muted" role="status">'+esc(ui.msg)+'</p>':'')+

'<p class="muted">Each person gets their own PIN. The app knows who they are, and what they may do, from the PIN alone.</p>';

S.users.forEach(function(u){

var low=ROLES[u.role].l<L,peer=u.role==='owner'&&L===4&&u.id!==ui.me;

h+='<div class="vcard" style="--c:var(--brand)"><div class="vhead"><span class="vl">'+avatar(u,52)+'<span class="vname">'+esc(u.name)+(u.id===ui.me?' (you)':'')+'</span></span><span class="chip">'+ROLES[u.role].n+'</span></div>'+

'<div class="muted">'+ROLES[u.role].d+'</div>'+photoRow(u)+

((low||peer)?'<div class="addrow" style="grid-template-columns:1fr auto auto">'+pinIn('np-'+u.id,'New PIN',1)+'<button class="ghost small" data-a="resetpin" data-id="'+u.id+'">Set PIN</button>'+(low?'<button class="danger small" data-a="rmuser" data-id="'+u.id+'">Remove</button>':'<span></span>')+'</div>':'')+'</div>';

});

h+='<h2>Add a person</h2><div class="stack"><input id="pn" placeholder="Name" maxlength="30"><select id="pr" aria-label="Role">'+

lr.map(function(k){return '<option value="'+k+'">'+ROLES[k].n+'</option>'}).join('')+'</select><p class="muted" id="pd" style="margin:0">'+ROLES[lr[0]].d+'</p>'+

'<div class="addrow" style="grid-template-columns:1fr auto;margin:0">'+pinIn('pp','PIN (4 to 6 digits)',1)+'<button class="ghost" data-a="suggest">Suggest</button></div>'+

'<button data-a="adduser">Add person</button></div>';

return h;

}



function viewMore(){

var m=me(),L=lvl();

var h='<h1>Your account</h1>'+(ui.msg?'<p class="muted" role="status">'+esc(ui.msg)+'</p>':'')+

'<div class="vcard" style="--c:var(--brand)"><div class="vhead"><span class="vl">'+avatar(m,52)+'<span class="vname">'+esc(m.name)+'</span></span><span class="chip">'+ROLES[m.role].n+'</span></div><div class="muted">'+ROLES[m.role].d+'</div>'+photoRow(m)+'</div>'+

'<div class="stack"><button data-a="lock">Lock now</button>'+pinIn('sec-cur','Current PIN')+pinIn('sec-new','New PIN (4 to 6 digits)')+pinIn('sec-new2','Repeat new PIN')+

'<button class="ghost" data-a="changepin">Change my PIN</button></div>';

if(L>=2){

h+='<h2>Backup</h2><p class="muted">Records are stored on this device first. Main Admins can sync authorised records to the shared cloud. Back up regularly and keep backup files private.</p><div class="stack"><button data-a="csv">Download revenue sheet (CSV)</button>';

if(L>=3)h+='<button class="ghost" data-a="json">Download full backup (JSON)</button><label class="muted" for="imp">Restore from a backup file</label><input type="file" id="imp" accept=".json,application/json">';

h+='</div>';

}

h+='<h2>Cloud sync</h2><p class="muted">Main Admins sync shared records when signed in. Staff changes stay on this device until a Main Admin signs in here.</p>';

var web=typeof location!=='undefined'&&/^https?:/.test(location.protocol);

var inApp=window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches;

if(web){

h+='<h2>Install and share</h2><div class="stack">';

if(!inApp)h+=deferredInstall?'<button data-a="install">Install app on this phone</button>':'<p class="muted" style="margin:0">To install: open the browser menu and choose “Install app” or “Add to Home screen”.</p>';

h+='<button class="ghost" data-a="share">Share app link</button></div>';

}

if(L===4)h+='<h2>Delete everything</h2><div class="stack"><button class="danger" data-a="wipe">Delete all data</button></div>';

return h;

}



function viewLock(){

return '<div class="lockwrap">' +

logo(96,1) +

'<h1>Chatima Investments</h1>' +

'<p class="muted">Main Admins: use Firebase email and password. Staff: use their PIN.</p>' +

'</div>' +

'<div class="stack">' +

'<input id="firebase-email" type="email" placeholder="Main Admin email" autocomplete="username">' +

'<input id="firebase-password" type="password" placeholder="Firebase password" autocomplete="current-password">' +

pinIn('lockpin','Your Chatima PIN') +

'<button data-a="unlock">Unlock</button>' +

(ui.lockMsg ? '<p role="alert" style="color:var(--danger);margin:0">' + esc(ui.lockMsg) + '</p>' : '') +

'<button class="ghost small" data-a="forgot">Forgot PIN?</button>' +

'</div>';

}



function viewSetup(){

var h='<div class="lockwrap">'+logo(96,1)+'<h1>Chatima Investments</h1><p class="muted">Set up in two minutes.</p></div><h2>Name your vehicles</h2><div class="stack">';

active().forEach(function(v){h+='<input id="setup-'+v.id+'" value="'+esc(v.name)+'" maxlength="30" aria-label="'+kindLabel(v.kind)+' name">'});

h+='</div><h2>Main admin (you)</h2><div class="stack"><input id="su-name" placeholder="Your name" maxlength="30">'+pinIn('su-pin','Your PIN (4 to 6 digits)')+pinIn('su-pin2','Repeat PIN')+

'<p id="setupmsg" role="alert" style="color:var(--danger);margin:0"></p><button data-a="setup">Save and start</button></div>';

return h;

}



function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2)}).join('')}

function rndHex(n){

var a=new Uint8Array(n);

if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(a);else for(var i=0;i<n;i++)a[i]=Math.floor(Math.random()*256);

return hex(a);

}



function hashPin(pin,salt){

if(window.crypto&&crypto.subtle&&window.TextEncoder){

var enc=new TextEncoder();

return crypto.subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveBits']).then(function(k){

return crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:150000,hash:'SHA-256'},k,256)

}).then(hex);

}

var h=5381,t=salt+pin;

for(var r=0;r<20000;r++){for(var i=0;i<t.length;i++){h=((h<<5)+h+t.charCodeAt(i))|0}}

return Promise.resolve('f'+(h>>>0).toString(16));

}



function validPin(p){return /^\d{4,6}$/.test(p)}

function val(id){var e=document.getElementById(id);return e?e.value.trim():''}

function tabsFor(){var L=lvl(),t={today:'Today'};if(L>=2)t.reports='Reports';if(L>=3){t.fleet='Fleet';t.people='People'}t.more='More';return t}



function render(){

var app=document.getElementById('app'),nav=document.getElementById('nav');

if(!S.users.length||!me()){

app.innerHTML=S.users.length?viewLock():viewSetup();nav.innerHTML='';nav.style.display='none';

if(S.users.length)setTimeout(function(){var i=document.getElementById('lockpin');if(i)i.focus()},50);

return;

}

nav.style.display='';

var tabs=tabsFor();if(!tabs[ui.tab])ui.tab='today';

var m=me(),warn=storageOK?'':'<div class="warn">This browser is not saving data (private mode?). Use a normal browser tab and back up often.</div>';

var top='<div class="top">'+logo(42)+'<span class="brand"><b>Chatima</b><span>Investments</span></span><span class="who">'+esc(m.name)+'<br><span class="chip">'+ROLES[m.role].n+'</span></span>'+avatar(m,40)+'</div>';

var views={today:viewToday,reports:viewReports,fleet:viewFleet,people:viewPeople,more:viewMore};

app.innerHTML=warn+top+views[ui.tab]();

nav.style.gridTemplateColumns='repeat('+Object.keys(tabs).length+',1fr)';

nav.innerHTML=Object.keys(tabs).map(function(k){return '<button data-a="tab" data-t="'+k+'" class="'+(ui.tab===k?'on':'')+'">'+tabs[k]+'</button>'}).join('');

}



function download(name,text,type){

try{

var b=new Blob([text],{type:type}),u=URL.createObjectURL(b),a=document.createElement('a');

a.href=u;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);

setTimeout(function(){URL.revokeObjectURL(u)},2000);

ui.msg='Saved as '+name+'. Check your Downloads folder.';

}catch(e){ui.msg='Download failed on this browser.'}

render();

}



function vname(id){var v=S.vehicles.filter(function(x){return x.id===id})[0];return v?v.name:'Unknown'}



function addEntry(vid){

var a=document.getElementById('amt-'+vid),n=document.getElementById('note-'+vid);

var amt=parseFloat(String(a.value).replace(',','.'));

if(!isFinite(amt)||amt<=0){a.focus();a.style.borderColor='var(--danger)';return}

S.entries.push({id:uid(),vid:vid,date:lvl()===1?today():ui.date,amount:Math.round(amt*100)/100,note:n.value.trim(),by:ui.me,ts:Date.now(),_cloudPending:true});

save();render();
if(lvl()===4)syncCloudData().then(function(){render();});

var next=document.getElementById('amt-'+vid);if(next)next.focus();

}



function pinTaken(pin,except){

return Promise.all(S.users.map(function(u){return hashPin(pin,u.salt).then(function(h){return h===u.hash&&u.id!==except})})).then(function(r){return r.some(Boolean)});

}

function mkHash(pin){var salt=rndHex(16);return hashPin(pin,salt).then(function(h){return {salt:salt,hash:h}})}

function note(msg){ui.msg=msg;render()}



var deferredInstall=null;

if(window.addEventListener){

window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e;if(ui.me&&ui.tab==='more')render()});

window.addEventListener('appinstalled',function(){deferredInstall=null});

}



var NEED={remove:3,addveh:3,rmphoto:3,adduser:3,resetpin:3,rmuser:3,suggest:3,json:3,csv:2,wipe:4};



document.addEventListener('click',function(ev){

var el=ev.target.closest('[data-a]');if(!el)return;

var a=el.getAttribute('data-a'),g=function(k){return el.getAttribute(k)};

if(NEED[a]&&lvl()<NEED[a])return;



if(a==='unlock'){

var now=Date.now();

if(now<(S.until||0)){

ui.lockMsg='Too many wrong tries. Wait '+Math.ceil((S.until-now)/1000)+' seconds.';

render();return;

}

var pin=val('lockpin');

Promise.all(S.users.map(function(u){

return hashPin(pin,u.salt).then(function(h){return h===u.hash?u:null});

})).then(function(results){

var u=results.filter(Boolean)[0];

if(!u){

S.fails=(S.fails||0)+1;

if(S.fails>=3){

S.until=Date.now()+Math.min(900,30*Math.pow(2,S.fails-3))*1000;

}

save();

ui.lockMsg='Wrong PIN.'+(S.fails>=3?' Locked for a short time.':'');

render();return;

}

if(u.role==='owner'){

var email=val('firebase-email');

var password=val('firebase-password');

if(!email||!password){

ui.lockMsg='Main Admins must enter their Firebase email and password.';

render();return;

}

if(!window.ChatimaCloud||!window.ChatimaCloud.ready()){

ui.lockMsg='Firebase is unavailable. Check the connection and try again.';

render();return;

}

ui.lockMsg='Verifying Main Admin account...';

render();

window.ChatimaCloud.signIn(email,password)

.then(function(){return window.ChatimaCloud.getProfile()})

.then(function(profile){

// Firebase UID and Firestore security rules identify the authorised
// cloud administrator. Local PIN accounts have device-specific IDs and
// names may differ between devices, so do not compare those values here.
if(profile.role!=='owner'||profile.active!==true){
throw new Error('This Firebase account is not an active Main Admin.');
}

S.fails=0;S.until=0;save();

ui.me=u.id;ui.lockMsg='';ui.last=Date.now();ui.tab='today';ui.date=today();ui.msg='';

render();
          syncCloudData().then(function(){ render(); return startCloudLiveSync(); });

})

.catch(function(error){

stopCloudSync();
window.ChatimaCloud.signOut().catch(function(){});

ui.me=null;ui.lockMsg=error.message||'Main Admin authentication failed.';

render();

});

return;

}

var signOutPromise=window.ChatimaCloud&&window.ChatimaCloud.currentUser()

?window.ChatimaCloud.signOut():Promise.resolve();

signOutPromise.then(function(){

S.fails=0;S.until=0;save();

ui.me=u.id;ui.lockMsg='';ui.last=Date.now();ui.tab='today';ui.date=today();ui.msg='';

render();

}).catch(function(){

ui.lockMsg='Could not close the previous cloud session. Please try again.';

render();

});

}).catch(function(error){

ui.lockMsg=error.message||'Sign-in failed.';

render();

});

}

else if(a==='lock'){

stopCloudSync();
ui.me=null;ui.showCode=false;

if(window.ChatimaCloud&&window.ChatimaCloud.currentUser()){

window.ChatimaCloud.signOut().catch(function(){});

}

render();

}

else if(a==='urmphoto'){

var ru0=S.users.filter(function(u){return u.id===g('data-id')})[0];

if(ru0&&canPhoto(ru0)){delete ru0.photo;save();render()}

}

else if(a==='install'){

if(deferredInstall){

deferredInstall.prompt();

deferredInstall.userChoice.then(function(){deferredInstall=null;render()});

}

}



else if(a==='share'){

var u=location.href.split('#')[0];

if(navigator.share)navigator.share({title:'Chatima Investments',text:'Open this link, then install the app from your browser menu.',url:u}).catch(function(){});

else if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(function(){note('Link copied. Paste it into WhatsApp.')});

else note('Share this link: '+u);

}



else if(a==='forgot'){

if(confirm('Without a PIN, the only way in is to erase all data on this phone and start again. You can then restore a backup. Erase everything?')&&confirm('This cannot be undone. Erase everything?')){

S=seed();save();ui.me=null;render();

}

}



else if(a==='setup'){

var nm=val('su-name'),p1=val('su-pin'),p2=val('su-pin2'),sm=document.getElementById('setupmsg');

if(!nm){sm.textContent='Enter your name.';return}

if(!validPin(p1)||p1!==p2){sm.textContent='PINs must match and be 4 to 6 digits.';return}

S.vehicles.forEach(function(v){

var i=document.getElementById('setup-'+v.id);

if(i&&i.value.trim())v.name=i.value.trim();

});

mkHash(p1).then(function(h){

var u={id:'u'+uid(),name:nm,role:'owner',salt:h.salt,hash:h.hash};

S.users=[u];save();ui.me=u.id;ui.last=Date.now();ui.tab='today';render();window.scrollTo(0,0);

});

}



else if(a==='tab'){ui.tab=g('data-t');ui.msg='';ui.showCode=false;render();window.scrollTo(0,0)}

else if(a==='prev'){ui.date=addDays(ui.date,-1);render()}

else if(a==='next'){ui.date=addDays(ui.date,1);render()}

else if(a==='period'){ui.period=g('data-p');render()}

else if(a==='add'){addEntry(g('data-v'))}



else if(a==='del'){

if(confirm('Delete this entry?')){

var id=g('data-id');

var en=S.entries.filter(function(e){return e.id===id})[0];

if(en&&(lvl()>=2||(en.by===ui.me&&en.date===today()))){

S.entries=S.entries.filter(function(e){return e.id!==id});

S.gone[id]=Date.now();save();render();

}

}

}



else if(a==='remove'){

var vid=g('data-v');

if(confirm('Remove '+vname(vid)+'? Its past revenue stays in reports.')){

S.vehicles.forEach(function(v){if(v.id===vid)v.archived=true});

save();render();

}

}



else if(a==='rmphoto'){

S.vehicles.forEach(function(v){if(v.id===g('data-v'))delete v.photo});

save();render();

}



else if(a==='addveh'){

var vn=val('newname');

if(!vn){document.getElementById('newname').focus();return}

S.vehicles.push({id:uid(),name:vn,kind:document.getElementById('newkind').value});

save();render();

}



else if(a==='suggest'){

var f=document.getElementById('pp');

f.value=String(1000+Math.floor(Math.random()*9000));

}



else if(a==='adduser'){

var un=val('pn'),ur=val('pr'),up=val('pp');

if(!un)return note('Enter a name.');

if(allowedRoles().indexOf(ur)<0)return;

if(!validPin(up))return note('PIN must be 4 to 6 digits.');

pinTaken(up).then(function(t){

if(t)return note('That PIN is already used by someone else. Choose another.');

mkHash(up).then(function(h){

S.users.push({id:'u'+uid(),name:un,role:ur,salt:h.salt,hash:h.hash});

save();note(un+' added as '+ROLES[ur].n+'. Give them PIN '+up+'.');

});

});

}



else if(a==='resetpin'){

var tid=g('data-id'),tu=S.users.filter(function(u){return u.id===tid})[0],np=val('np-'+tid);

if(!tu||!(ROLES[tu.role].l<lvl()||(tu.role==='owner'&&lvl()===4)))return;

if(!validPin(np))return note('New PIN must be 4 to 6 digits.');

pinTaken(np,tid).then(function(t){

if(t)return note('That PIN is already used. Choose another.');

mkHash(np).then(function(h){

tu.salt=h.salt;tu.hash=h.hash;save();note('New PIN set for '+tu.name+'.');

});

});

}



else if(a==='rmuser'){

var rid=g('data-id'),ru=S.users.filter(function(u){return u.id===rid})[0];

if(ru&&ROLES[ru.role].l<lvl()&&confirm('Remove '+ru.name+'? Their past entries stay in the records.')){

S.users=S.users.filter(function(u){return u.id!==rid});

S.gone[rid]=Date.now();save();note(ru.name+' removed.');

}

}



else if(a==='changepin'){

var cu=me(),c0=val('sec-cur'),c1=val('sec-new'),c2=val('sec-new2');

if(!validPin(c1)||c1!==c2)return note('New PINs must match and be 4 to 6 digits.');

hashPin(c0,cu.salt).then(function(h){

if(h!==cu.hash)return note('Current PIN is wrong.');

pinTaken(c1,cu.id).then(function(t){

if(t)return note('That PIN is already used. Choose another.');

mkHash(c1).then(function(n){

cu.salt=n.salt;cu.hash=n.hash;save();note('Your PIN was changed.');

});

});

});

}



else if(a==='csv'){

var rows=['Date,Vehicle,Amount,Note,Recorded by'];

S.entries.slice().sort(function(x,y){return x.date<y.date?-1:x.date>y.date?1:x.ts-y.ts}).forEach(function(e){

rows.push([e.date,'"'+vname(e.vid).replace(/"/g,'""')+'"',e.amount.toFixed(2),'"'+(e.note||'').replace(/"/g,'""')+'"','"'+nameOf(e.by).replace(/"/g,'""')+'"'].join(','));

});

download('chatima-revenue-'+today()+'.csv',rows.join('\n'),'text/csv');

}



else if(a==='json'){

var copy=JSON.parse(JSON.stringify(S));

delete copy.fails;delete copy.until;

download('chatima-backup-'+today()+'.json',JSON.stringify(copy),'application/json');

}



else if(a==='wipe'){

if(confirm('Delete ALL vehicles, people and revenue from this phone?')&&confirm('This cannot be undone. Delete everything?')){

S=seed();save();ui.me=null;render();

}

}



});



document.addEventListener('change',function(ev){

var t=ev.target,a=t.getAttribute&&t.getAttribute('data-a'),vid=t.getAttribute&&t.getAttribute('data-v');



if(t.id==='dpick'&&t.value){ui.date=lvl()===1?today():t.value;render()}



else if(a==='uphoto'&&t.files&&t.files[0]){

var pid=t.getAttribute('data-id'),pu=S.users.filter(function(u){return u.id===pid})[0];

if(!pu||!canPhoto(pu))return;

var fr0=new FileReader();

fr0.onload=function(){

var im=new Image();

im.onload=function(){

var k=Math.min(1,200/Math.min(im.width,im.height)),w=Math.round(im.width*k),h=Math.round(im.height*k),c=document.createElement('canvas');

c.width=c.height=Math.min(w,h);

c.getContext('2d').drawImage(im,(w-c.width)/-2,(h-c.height)/-2,w,h);

pu.photo=c.toDataURL('image/jpeg',0.75);save();render();

};

im.src=fr0.result;

};

fr0.readAsDataURL(t.files[0]);

}



else if(t.id==='pr'){

document.getElementById('pd').textContent=ROLES[t.value].d;

}



else if(lvl()>=3&&a==='rename'){

var nm=t.value.trim();

if(nm){S.vehicles.forEach(function(v){if(v.id===vid)v.name=nm});save()}

else render();

}



else if(lvl()>=3&&a==='kind'){

S.vehicles.forEach(function(v){if(v.id===vid)v.kind=t.value});

save();render();

}



else if(lvl()>=3&&a==='photo'&&t.files&&t.files[0]){

var fr=new FileReader();

fr.onload=function(){

var im=new Image();

im.onload=function(){

var k=Math.min(1,480/Math.max(im.width,im.height)),c=document.createElement('canvas');

c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);

c.getContext('2d').drawImage(im,0,0,c.width,c.height);

S.vehicles.forEach(function(v){if(v.id===vid)v.photo=c.toDataURL('image/jpeg',0.72)});

save();render();

};

im.src=fr.result;

};

fr.readAsDataURL(t.files[0]);

}



else if(lvl()>=3&&t.id==='cur'){

S.currency=t.value.trim()||'$';save();

}



else if(lvl()>=3&&t.id==='imp'&&t.files&&t.files[0]){

var r=new FileReader();

r.onload=function(){



try{

var d=JSON.parse(r.result);d.gone=d.gone||{};

if(!d||!Array.isArray(d.vehicles)||!Array.isArray(d.entries))throw 0;

if(confirm('Replace the data on this phone with this backup ('+d.entries.length+' entries)?')){

if(!d.users||!d.users.length)d.users=S.users;

delete d.sec;S=d;save();ui.me=null;return render();

}

}catch(e){ui.msg='That file is not a valid backup.'}

render();

};

r.readAsText(t.files[0]);

}

});



document.addEventListener('keydown',function(ev){



if(ev.key==='Enter'&&(ev.target.id==='lockpin'||ev.target.id==='firebase-password')){

ev.preventDefault();

var unlockButton=document.querySelector('[data-a="unlock"]');

if(unlockButton)unlockButton.click();

return;

}



var id=ev.target.id||'';

if(ev.key==='Enter'&&(id.indexOf('amt-')===0||id.indexOf('note-')===0)){

addEntry(ev.target.getAttribute('data-v'));

}

});



['click','keydown','touchstart'].forEach(function(t){

document.addEventListener(t,function(){ui.last=Date.now()},true);

});



setInterval(function(){

if(ui.me&&Date.now()-ui.last>180000){

stopCloudSync();
ui.me=null;

if(window.ChatimaCloud&&window.ChatimaCloud.currentUser()){

window.ChatimaCloud.signOut().catch(function(){});

}

render();

}

},15000);



document.addEventListener('visibilitychange',function(){

if(document.hidden){ui.hid=Date.now()}

else if(ui.me&&ui.hid&&Date.now()-ui.hid>60000){

stopCloudSync();
ui.me=null;

if(window.ChatimaCloud&&window.ChatimaCloud.currentUser()){

window.ChatimaCloud.signOut().catch(function(){});

}

render();

}

});



if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)){

window.addEventListener('load',function(){

navigator.serviceWorker.register('sw.js').catch(function(){});

});

}



try{

if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();

}catch(e){}



render();





})();