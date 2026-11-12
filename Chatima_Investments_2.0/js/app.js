(function(){
var KEY='fleetRevenue_v1',SYNC_KEY='chatima_sync',storageOK=true;
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
  try{var r=localStorage.getItem(KEY);
    if(r){var d=JSON.parse(r);d.users=d.users||[];d.gone=d.gone||{};
      if(!d.users.length&&d.sec)d.users.push({id:'u'+uid(),name:'Main admin',role:'owner',salt:d.sec.salt,hash:d.sec.hash});
      delete d.sec;return d}
  }catch(e){storageOK=false}
  return seed();
}
var S=load();var SY=loadSY();
function persist(){
  try{localStorage.setItem(KEY,JSON.stringify(S)); storageOK=true}catch(e){storageOK=false}
}
function save(){persist();schedSync()}
var ui={tab:'today',date:today(),period:'week',msg:'',me:null,lockMsg:'',last:Date.now(),hid:0};

function money(n){return S.currency+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function active(){return S.vehicles.filter(function(v){return !v.archived})}
function sum(list){return list.reduce(function(a,e){return a+e.amount},0)}
function kindLabel(k){return k==='bus'?'Bus':k==='combi'?'Combi':'Van'}

function dateBar(){
  var d=parse(ui.date), label=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  return '<div class="datebar"><button class="ghost" data-a="prev" aria-label="Previous day">‹</button>'+
    '<input type="date" id="dpick" value="'+ui.date+'" aria-label="Pick date">'+
    '<button class="ghost" data-a="next" aria-label="Next day">›</button></div>'+
    '<div class="muted" style="margin:-6px 0 10px">'+esc(label)+(ui.date===today()?' (today)':'')+'</div>';
}

var ROLES={owner:{n:'Main admin',l:4,d:'Full control: people, vehicles, backups and deleting data.'},
  admin:{n:'Admin',l:3,d:'Runs the day: vehicles, reports, managers and employees.'},
  manager:{n:'Manager',l:2,d:'Adds revenue for any day and sees every report.'},
  employee:{n:'Employee',l:1,d:'Adds today’s revenue and sees only their own entries.'}};
function me(){return S.users.filter(function(u){return u.id===ui.me})[0]}
function lvl(){var m=me();return m?ROLES[m.role].l:0}
function nameOf(id){var u=S.users.filter(function(x){return x.id===id})[0];return u?u.name:'Former staff'}
function logo(sz,anim){var d='M43.8 22.8A15 15 0 1 0 43.8 41.2';
  return '<svg class="'+(anim?'anim':'')+'" viewBox="0 0 64 64" width="'+sz+'" height="'+sz+'" role="img" aria-label="Chatima Investments logo"><rect width="64" height="64" rx="15" fill="#0E3B37"/><path class="arc" d="'+d+'" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="'+d+'" fill="none" stroke="#F2B632" stroke-width="1.6" stroke-dasharray="3 3"/><path d="M46 26.5L57 32L46 37.5Z" fill="#F2B632"/></svg>'}
function cloudOut(){var C=window.ChatimaCloud;try{if(C&&C.currentUser&&C.currentUser())return Promise.resolve(C.signOut()).catch(function(){})}catch(e){}return Promise.resolve()}
function pinIn(id,ph,vis){return '<input id="'+id+'" type="'+(vis?'text':'password')+'" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="'+ph+'" aria-label="'+ph+'">'}
function avatar(u,sz){var st='width:'+sz+'px;height:'+sz+'px;font-size:'+Math.round(sz*.4)+'px';
  if(u.photo)return '<img class="av" style="'+st+'" src="'+u.photo+'" alt="">';
  var ini=u.name.split(' ').filter(Boolean).slice(0,2).map(function(w){return w[0].toUpperCase()}).join('');
  return '<span class="av" style="'+st+'" aria-hidden="true">'+esc(ini)+'</span>'}
function ownerCount(){return S.users.filter(function(u){return u.role==='owner'}).length}
function allowedRoles(){var r=lowerRoles();if(lvl()===4&&ownerCount()<2)r.unshift('owner');return r}
function canPhoto(u){return u.id===ui.me||ROLES[u.role].l<lvl()}
function photoRow(u){if(!canPhoto(u))return '';
  return '<div class="addrow" style="grid-template-columns:1fr 1fr"><label class="filebtn">'+(u.photo?'Change photo':'Add photo')+'<input type="file" accept="image/*" data-a="uphoto" data-id="'+u.id+'" hidden></label>'+
    (u.photo?'<button class="ghost small" data-a="urmphoto" data-id="'+u.id+'">Remove photo</button>':'<span></span>')+'</div>'}
function thumb(v){return v.photo?'<img class="ph" src="'+v.photo+'" alt="">':''}
function viewToday(){
  var emp=lvl()===1; if(emp)ui.date=today();
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
               (canDel?'<button class="danger small" data-a="del" data-id="'+e.id+'">Delete</button>':'')+'</li>'}).join('')+'</ul>';
    }
    h+='</div>';
  });
  return h;
}

function rangeDates(){
  var out=[],i;
  if(ui.period==='week'){for(i=6;i>=0;i--)out.push(addDays(ui.date,-i))}
  else{var d=parse(ui.date),y=d.getFullYear(),m=d.getMonth(),n=new Date(y,m+1,0).getDate();
       for(i=1;i<=n;i++)out.push(y+'-'+pad(m+1)+'-'+pad(i))}
  return out;
}

function viewReports(){
  var dates=rangeDates(), set={};dates.forEach(function(d){set[d]=1});
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
    var t=sum(inRange.filter(function(e){return e.vid===v.id})), pct=grand?Math.round(t/grand*100):0;
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
    var low=ROLES[u.role].l<L, peer=u.role==='owner'&&L===4&&u.id!==ui.me;
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
    h+='<h2>Backup</h2><p class="muted">Data lives only on this phone. Back up weekly and send the file to yourself. Backup files are not locked, so keep them private.</p><div class="stack"><button data-a="csv">Download revenue sheet (CSV)</button>';
    if(L>=3)h+='<button class="ghost" data-a="json">Download full backup (JSON)</button><label class="muted" for="imp">Restore from a backup file</label><input type="file" id="imp" accept=".json,application/json">';
    h+='</div>';
  }
  h+=onlineCard();
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
  return '<div class="lockwrap">'+logo(96,1)+'<h1>Chatima Investments</h1>'+
    '<p class="muted">Main Admins: use Firebase email and password. Staff: use their PIN.</p></div><div class="stack">'+
    '<input id="firebase-email" type="email" placeholder="Main Admin email" autocomplete="username">'+
    '<input id="firebase-password" type="password" placeholder="Firebase password" autocomplete="current-password">'+
    pinIn('lockpin','Your Chatima PIN')+'<button data-a="unlock">Unlock</button>'+
    (ui.lockMsg?'<p role="alert" style="color:var(--danger);margin:0">'+esc(ui.lockMsg)+'</p>':'')+
    '<button class="ghost small" data-a="forgot">Forgot PIN?</button></div>';
}
function viewSetup(){
  var h='<div class="lockwrap">'+logo(96,1)+'<h1>Chatima Investments</h1><p class="muted">Set up in two minutes.</p></div>'+joinBox()+'<h2>Name your vehicles</h2><div class="stack">';
  active().forEach(function(v){h+='<input id="setup-'+v.id+'" value="'+esc(v.name)+'" maxlength="30" aria-label="'+kindLabel(v.kind)+' name">'});
  h+='</div><h2>Main admin (you)</h2><div class="stack"><input id="su-name" placeholder="Your name" maxlength="30">'+pinIn('su-pin','Your PIN (4 to 6 digits)')+pinIn('su-pin2','Repeat PIN')+
     '<p id="setupmsg" role="alert" style="color:var(--danger);margin:0"></p><button data-a="setup">Save and start</button></div>';
  return h;
}

function hex(buf){return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2)}).join('')}
function rndHex(n){var a=new Uint8Array(n);
  if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(a);else for(var i=0;i<n;i++)a[i]=Math.floor(Math.random()*256);
  return hex(a)}
function hashPin(pin,salt){
  if(window.crypto&&crypto.subtle&&window.TextEncoder){
    var enc=new TextEncoder();
    return crypto.subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveBits']).then(function(k){
      return crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:150000,hash:'SHA-256'},k,256)}).then(hex);
  }
  var h=5381,t=salt+pin;for(var r=0;r<20000;r++){for(var i=0;i<t.length;i++){h=((h<<5)+h+t.charCodeAt(i))|0}}
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
  var a=document.getElementById('amt-'+vid), n=document.getElementById('note-'+vid);
  var amt=parseFloat(String(a.value).replace(',','.'));
  if(!isFinite(amt)||amt<=0){a.focus();a.style.borderColor='var(--danger)';return}
  S.entries.push({id:uid(),vid:vid,date:lvl()===1?today():ui.date,amount:Math.round(amt*100)/100,note:n.value.trim(),by:ui.me,ts:Date.now()});
  save();render();
  var next=document.getElementById('amt-'+vid); if(next)next.focus();
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

/* ---------- Online connection (Firebase Realtime Database, end-to-end encrypted) ---------- */
var syncBusy=false,syncTimer=0;
var RULES='{\n "rules": {\n  ".read": false,\n  ".write": false,\n  "ws": {\n   "$ws": {\n    ".read": true,\n    ".write": true,\n    "r": { ".indexOn": ["s"] }\n   }\n  }\n }\n}';
function loadSY(){try{var r=localStorage.getItem(SYNC_KEY);return r?JSON.parse(r):null}catch(e){return null}}
function saveSY(){try{if(SY)localStorage.setItem(SYNC_KEY,JSON.stringify(SY));else localStorage.removeItem(SYNC_KEY)}catch(e){}}
function canOnline(){return typeof location!=='undefined'&&/^https?:/.test(location.protocol)&&!!(window.crypto&&crypto.subtle)}
function b64(buf){var a=new Uint8Array(buf),t='';for(var i=0;i<a.length;i++)t+=String.fromCharCode(a[i]);return btoa(t)}
function unb64(t){var x=atob(t),a=new Uint8Array(x.length);for(var i=0;i<x.length;i++)a[i]=x.charCodeAt(i);return a}
function randB64(n){return b64(crypto.getRandomValues(new Uint8Array(n)))}
function impKey(k){return crypto.subtle.importKey('raw',unb64(k),'AES-GCM',false,['encrypt','decrypt'])}
function encRec(K,o){var iv=crypto.getRandomValues(new Uint8Array(12));
  return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},K,new TextEncoder().encode(JSON.stringify(o))).then(function(c){return {c:b64(c),i:b64(iv)}})}
function decRec(K,r){return crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(r.i)},K,unb64(r.c)).then(function(p){return JSON.parse(new TextDecoder().decode(p))})}
function hs(str){var h=5381,i=str.length;while(i)h=(h*33)^str.charCodeAt(--i);return (h>>>0)+':'+str.length}
function sig(r){var c={};Object.keys(r).forEach(function(k){if(k!=='u')c[k]=r[k]});return JSON.stringify(c)}
function recKey(k,r){return k+'_'+(k==='c'?'cfg':r.id)}
function allRecs(){var o=[];S.vehicles.forEach(function(v){o.push(['v',v])});S.entries.forEach(function(e){o.push(['e',e])});
  S.users.forEach(function(u){o.push(['u',u])});o.push(['c',{id:'cfg',currency:S.currency,u:(S.cfg&&S.cfg.u)||0}]);return o}
function api(method,path,body,q){
  return fetch(SY.url+path+'.json'+(q||''),{method:method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined})
   .then(function(r){return r.text().then(function(t){if(!r.ok)throw new Error('HTTP '+r.status+' '+t.slice(0,120));return t?JSON.parse(t):null})})}
function friendly(e){e=String(e&&e.message||e);
  if(e==='offline'||/Failed to fetch|NetworkError|Load failed/i.test(e))return 'no internet. Changes stay on this phone and send later.';
  if(/Index not defined|indexOn/i.test(e))return 'the database rules need the indexOn line. Paste the rules again.';
  if(/401|403|Permission/i.test(e))return 'the database rules do not allow this. Paste the rules again and Publish.';
  if(/404/.test(e))return 'database address not found. Check it.';return e}
function ago(t){var x=Math.round((Date.now()-t)/1000);return x<60?'just now':x<3600?Math.round(x/60)+' min ago':Math.round(x/3600)+' h ago'}
function syncLine(){if(!SY)return '';
  var t=SY.err==='revoked'?'Disconnected by the Main admin. Ask for the new code (More tab).':SY.err?'Not syncing: '+friendly(SY.err):SY.lastOk?'Online · synced '+ago(SY.lastOk):'Online · connecting…';
  return '<p class="muted" style="margin:0 0 8px">'+esc(t)+'</p>'}
function pendingCount(){if(!SY)return 0;var n=0;allRecs().forEach(function(p){if(SY.sigs[recKey(p[0],p[1])]!==hs(sig(p[1])))n++});
  Object.keys(S.gone).forEach(function(id){if(!SY.sigs['t_'+id])n++});return n}
function applyRemote(k,d,key){
  if(k==='t'){S.gone[d.id]=d.u;S.entries=S.entries.filter(function(e){return e.id!==d.id});S.users=S.users.filter(function(u){return u.id!==d.id});SY.sigs[key]=1;return true}
  var ch=false;
  if(k==='c'){if(d.u>((S.cfg&&S.cfg.u)||0)){S.cfg=d;S.currency=d.currency;ch=true}}
  else{if(S.gone[d.id])return false;
    var arr=k==='e'?S.entries:k==='v'?S.vehicles:S.users,i=-1;
    for(var j=0;j<arr.length;j++)if(arr[j].id===d.id){i=j;break}
    if(i<0){arr.push(d);ch=true}else if(d.u>(arr[i].u||0)){arr[i]=d;ch=true}}
  if(ch)SY.sigs[key]=hs(sig(k==='c'?{id:'cfg',currency:d.currency}:d));
  return ch}
function pull(){
  return api('GET','/ws/'+SY.ws+'/r',null,'?orderBy='+encodeURIComponent('"s"')+'&startAt='+(SY.cursor||0)).then(function(map){
    map=map||{};var keys=Object.keys(map),changed=false,maxS=SY.cursor||0;
    return impKey(SY.key).then(function(K){return Promise.all(keys.map(function(key){var r=map[key];if(r.s>maxS)maxS=r.s;
      return decRec(K,r).then(function(o){if(applyRemote(o.k,o.d,key))changed=true},function(){})}))})
    .then(function(){SY.cursor=maxS;return changed})})}
function localChanges(){var out=[],now=Date.now();
  allRecs().forEach(function(p){var k=p[0],r=p[1],key=recKey(k,r),h=hs(sig(r));
    if(SY.sigs[key]!==h){if(k==='c'){S.cfg={id:'cfg',currency:S.currency,u:now};r=S.cfg}else r.u=now;out.push({key:key,k:k,d:r,h:h})}});
  Object.keys(S.gone).forEach(function(id){if(!SY.sigs['t_'+id])out.push({key:'t_'+id,k:'t',d:{id:id,u:S.gone[id]},h:1})});
  return out}
function pushChanges(list){var chunks=[];for(var i=0;i<list.length;i+=40)chunks.push(list.slice(i,i+40));
  return chunks.reduce(function(p,ch){return p.then(function(){
    return impKey(SY.key).then(function(K){return Promise.all(ch.map(function(x){return encRec(K,{k:x.k,d:x.d}).then(function(e){e.s={'.sv':'timestamp'};return [x.key,e]})}))})
    .then(function(pairs){var b={};pairs.forEach(function(q){b[q[0]]=q[1]});return api('PATCH','/ws/'+SY.ws+'/r',b)})
    .then(function(){ch.forEach(function(x){SY.sigs[x.key]=x.h});saveSY()})})},Promise.resolve())}
function syncNow(){
  if(!SY||syncBusy)return Promise.resolve(false);
  if(typeof navigator!=='undefined'&&navigator.onLine===false){SY.err='offline';return Promise.resolve(false)}
  syncBusy=true;var changedAny=false;
  return api('GET','/ws/'+SY.ws+'/m').then(function(m){if(m===null&&(SY.cursor||0)>0){SY.err='revoked';throw new Error('revoked')}})
   .then(pull).then(function(ch){changedAny=ch;var list=localChanges();persist();return pushChanges(list)})
   .then(function(){SY.lastOk=Date.now();SY.err='';saveSY();persist();syncBusy=false;
      var ae=document.activeElement;if(changedAny&&(!ae||!/INPUT|SELECT|TEXTAREA/.test(ae.tagName)))render();return true},
     function(e){syncBusy=false;if(SY){if(String(e&&e.message)!=='revoked')SY.err=String(e&&e.message||e);saveSY()}return false});
}
function schedSync(){if(!SY)return;clearTimeout(syncTimer);syncTimer=setTimeout(function(){syncNow()},1500)}
function parseCode(t){try{t=String(t).replace(/\s+/g,'');if(t.indexOf('CH1-')===0)t=t.slice(4);var o=JSON.parse(atob(t));
  if(/^https:\/\//.test(o.u)&&o.w&&o.k)return {url:o.u.replace(/\/+$/,''),ws:o.w,key:o.k}}catch(e){}return null}
function mkCode(){return 'CH1-'+btoa(JSON.stringify({u:SY.url,w:SY.ws,k:SY.key}))}
function freshWs(url,old){SY={url:url,ws:rndHex(12),key:randB64(32),sigs:{},cursor:0};
  return api('PUT','/ws/'+SY.ws+'/m',{t:Date.now()}).then(function(){return syncNow()}).then(function(ok){
    if(!ok){var m=SY.err;SY=old;saveSY();throw new Error(m)}saveSY()},function(e){SY=old;saveSY();throw e})}
function startWorkspace(url){url=String(url).trim().replace(/\/+$/,'');
  if(!/^https:\/\/\S+$/.test(url))return Promise.reject(new Error('Enter the full database address, starting with https://'));
  return freshWs(url,null)}
function rotate(){var old=SY;return freshWs(old.url,old).then(function(){return fetch(old.url+'/ws/'+old.ws+'.json',{method:'DELETE'}).catch(function(){})})}
function joinWithCode(t){var c=parseCode(t);if(!c)return Promise.reject(new Error('That code is not valid. Paste the whole code.'));
  var prevS=S,prevSY=SY;S={currency:'$',users:[],vehicles:[],entries:[],gone:{}};SY={url:c.url,ws:c.ws,key:c.key,sigs:{},cursor:0};
  var undo=function(e){S=prevS;SY=prevSY;saveSY();persist();throw e};
  return api('GET','/ws/'+c.ws+'/m').then(function(m){if(m===null)throw new Error('No business found for this code.');return syncNow()})
   .then(function(ok){if(!ok||!S.users.length)throw new Error(SY&&SY.err||'No data found for this code.');persist();saveSY()},undo)}
function joinBox(){
  return '<h2>Already set up on another phone?</h2><div class="stack">'+(canOnline()?'<input id="jcode" placeholder="Paste the connection code" autocapitalize="off"><button class="ghost" data-a="join">Connect this phone</button><p id="joinmsg" role="alert" class="muted" style="margin:0"></p>':'<p class="muted" style="margin:0">Connecting phones works in the installed web version of the app.</p>')+'</div><p class="muted">Or set up a new business below.</p>'}
function onlineCard(){
  var L=lvl(),h='',ta='<textarea readonly rows="4" onclick="this.select()" style="width:100%;font-size:.8rem;border-radius:8px;border:1.5px solid var(--line);padding:8px;background:var(--card);color:var(--ink)">';
  if(!SY){
    if(L<4)return '';
    h+='<h2>Connect phones online</h2>';
    if(!canOnline())return h+'<p class="muted">This works in the installed web version of the app, not from a saved file.</p>';
    return h+'<p class="muted">Free, about 5 minutes, done once:</p><ol class="muted" style="padding-left:20px;margin:0 0 8px"><li>Sign in at console.firebase.google.com and create a project.</li><li>Open Build, then Realtime Database, create a database and start in test mode.</li><li>Open its Rules tab, replace everything with the text below, and Publish.</li><li>Copy the database address from the Data tab and paste it here.</li></ol>'+
      ta+esc(RULES)+'</textarea><div class="stack" style="margin-top:8px"><input id="dburl" placeholder="https://your-project-default-rtdb.firebaseio.com" inputmode="url" autocapitalize="off"><button data-a="connect">Connect and create code</button></div>';
  }
  var pc=pendingCount();
  h+='<h2>Online connection</h2>'+syncLine()+(pc?'<p class="muted" style="margin:0 0 8px">'+pc+' change'+(pc===1?'':'s')+' waiting to send.</p>':'')+'<div class="stack"><button data-a="syncnow">Sync now</button>';
  if(SY.err==='revoked')h+='<input id="jcode" placeholder="Paste the new connection code"><button data-a="join">Reconnect</button>';
  if(L===4){
    h+='<button class="ghost" data-a="showcode">'+(ui.showCode?'Hide':'Show')+' connection code</button>';
    if(ui.showCode)h+=ta+esc(mkCode())+'</textarea><button class="ghost" data-a="sharecode">Share or copy code</button><p class="muted" style="margin:0">Anyone with this code can connect a phone. Send it only to people you trust. Each person still signs in with their own PIN.</p>';
    h+='<button class="ghost" data-a="newcode">Make a new code (cuts off other phones)</button>';
  }
  if(L>=3)h+='<button class="danger" data-a="disconnect">Disconnect this phone</button>';
  return h+'</div>';
}
var NEED={remove:3,addveh:3,rmphoto:3,adduser:3,resetpin:3,rmuser:3,suggest:3,json:3,csv:2,wipe:4};

document.addEventListener('click',function(ev){
  var el=ev.target.closest('[data-a]'); if(!el)return;
  var a=el.getAttribute('data-a'),g=function(k){return el.getAttribute(k)};
  if(NEED[a]&&lvl()<NEED[a])return;
  if(a==='unlock'){
    var now=Date.now();
    if(now<(S.until||0)){ui.lockMsg='Too many wrong tries. Wait '+Math.ceil((S.until-now)/1000)+' seconds.';render();return}
    var pin=val('lockpin'),em=val('firebase-email'),pw=val('firebase-password');
    Promise.all(S.users.map(function(u){return hashPin(pin,u.salt).then(function(h){return h===u.hash?u:null})})).then(function(results){
      var u=results.filter(Boolean)[0];
      if(!u){S.fails=(S.fails||0)+1;if(S.fails>=3)S.until=Date.now()+Math.min(900,30*Math.pow(2,S.fails-3))*1000;
        save();ui.lockMsg='Wrong PIN.'+(S.fails>=3?' Locked for a short time.':'');render();return}
      var enter=function(){S.fails=0;S.until=0;save();ui.me=u.id;ui.lockMsg='';ui.last=Date.now();ui.tab='today';ui.date=today();ui.msg='';render()};
      if(u.role!=='owner')return cloudOut().then(enter);
      var C=window.ChatimaCloud;
      if(!em||!pw){ui.lockMsg='Main Admins must enter their Firebase email and password.';render();return}
      if(!C||!C.ready||!C.ready()){ui.lockMsg='Firebase is unavailable. Check the connection and try again.';render();return}
      ui.lockMsg='Verifying Main Admin account...';render();
      return Promise.resolve(C.signIn(em,pw)).then(function(){return C.getProfile()}).then(function(p){
        if(!p||p.role!=='owner'||p.active!==true||p.localUserId!==u.id)throw new Error('This Firebase account is not linked to this Main Admin.');
        enter()
      }).catch(function(err){return cloudOut().then(function(){ui.me=null;ui.lockMsg=(err&&err.message)||'Main Admin authentication failed.';render()})});
    }).catch(function(err){ui.lockMsg=(err&&err.message)||'Sign-in failed.';render()});
  }
  else if(a==='lock'){ui.me=null;ui.showCode=false;cloudOut();render()}
  else if(a==='urmphoto'){var ru0=S.users.filter(function(u){return u.id===g('data-id')})[0];if(ru0&&canPhoto(ru0)){delete ru0.photo;save();render()}}
  else if(a==='syncnow'){if(!SY)return;syncNow().then(function(ok){note(ok?'Synced.':'Not synced: '+friendly(SY&&SY.err))})}
  else if(a==='connect'&&canOnline()){note('Connecting…');startWorkspace(val('dburl')).then(function(){ui.showCode=true;note('Connected. Your connection code is below. Keep it secret.')},function(e){note('Could not connect: '+friendly(e))})}
  else if(a==='showcode'){ui.showCode=!ui.showCode;render()}
  else if(a==='sharecode'&&SY){var cd=mkCode();
    if(navigator.share)navigator.share({title:'Chatima connection code',text:cd}).catch(function(){});
    else if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(cd).then(function(){note('Code copied. Paste it into a private message.')});
    else note('Select the code and copy it.')}
  else if(a==='newcode'&&SY){if(confirm('Every other phone is cut off until it gets the new code. Continue?')){note('Creating a new code…');
    rotate().then(function(){ui.showCode=true;note('New code created. Old code no longer works.')},function(e){note('Could not make a new code: '+friendly(e))})}}
  else if(a==='disconnect'){if(confirm('Stop syncing on this phone? Records already on it stay.')){SY=null;saveSY();note('Disconnected.')}}
  else if(a==='join'){
    if(S.users.length&&!(SY&&SY.err==='revoked'))return;
    var jm=document.getElementById('joinmsg');if(jm)jm.textContent='Connecting…';
    joinWithCode(val('jcode')).then(function(){ui.me=null;ui.msg='';render()},function(e){if(jm)jm.textContent=friendly(e);else note(friendly(e))})}
  else if(a==='install'){if(deferredInstall){deferredInstall.prompt();deferredInstall.userChoice.then(function(){deferredInstall=null;render()})}}
  else if(a==='share'){var u=location.href.split('#')[0];
    if(navigator.share)navigator.share({title:'Chatima Investments',text:'Open this link, then install the app from your browser menu.',url:u}).catch(function(){});
    else if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(function(){note('Link copied. Paste it into WhatsApp.')});
    else note('Share this link: '+u)}
  else if(a==='forgot'){
    if(confirm('Without a PIN, the only way in is to erase all data on this phone and start again. You can then restore a backup. Erase everything?')&&confirm('This cannot be undone. Erase everything?')){S=seed();SY=null;saveSY();save();ui.me=null;render()}}
  else if(a==='setup'){
    var nm=val('su-name'),p1=val('su-pin'),p2=val('su-pin2'),sm=document.getElementById('setupmsg');
    if(!nm){sm.textContent='Enter your name.';return}
    if(!validPin(p1)||p1!==p2){sm.textContent='PINs must match and be 4 to 6 digits.';return}
    S.vehicles.forEach(function(v){var i=document.getElementById('setup-'+v.id);if(i&&i.value.trim())v.name=i.value.trim()});
    mkHash(p1).then(function(h){var u={id:'u'+uid(),name:nm,role:'owner',salt:h.salt,hash:h.hash};
      S.users=[u];save();ui.me=u.id;ui.last=Date.now();ui.tab='today';render();window.scrollTo(0,0)});
  }
  else if(a==='tab'){ui.tab=g('data-t');ui.msg='';ui.showCode=false;render();window.scrollTo(0,0)}
  else if(a==='prev'){ui.date=addDays(ui.date,-1);render()}
  else if(a==='next'){ui.date=addDays(ui.date,1);render()}
  else if(a==='period'){ui.period=g('data-p');render()}
  else if(a==='add'){addEntry(g('data-v'))}
  else if(a==='del'){if(confirm('Delete this entry?')){var id=g('data-id');
    var en=S.entries.filter(function(e){return e.id===id})[0];
    if(en&&(lvl()>=2||(en.by===ui.me&&en.date===today()))){S.entries=S.entries.filter(function(e){return e.id!==id});S.gone[id]=Date.now();save();render()}}}
  else if(a==='remove'){var vid=g('data-v');
    if(confirm('Remove '+vname(vid)+'? Its past revenue stays in reports.')){S.vehicles.forEach(function(v){if(v.id===vid)v.archived=true});save();render()}}
  else if(a==='rmphoto'){S.vehicles.forEach(function(v){if(v.id===g('data-v'))delete v.photo});save();render()}
  else if(a==='addveh'){var vn=val('newname');if(!vn){document.getElementById('newname').focus();return}
    S.vehicles.push({id:uid(),name:vn,kind:document.getElementById('newkind').value});save();render()}
  else if(a==='suggest'){var f=document.getElementById('pp');f.value=String(1000+Math.floor(Math.random()*9000))}
  else if(a==='adduser'){
    var un=val('pn'),ur=val('pr'),up=val('pp');
    if(!un)return note('Enter a name.');
    if(allowedRoles().indexOf(ur)<0)return;
    if(!validPin(up))return note('PIN must be 4 to 6 digits.');
    pinTaken(up).then(function(t){
      if(t)return note('That PIN is already used by someone else. Choose another.');
      mkHash(up).then(function(h){S.users.push({id:'u'+uid(),name:un,role:ur,salt:h.salt,hash:h.hash});save();note(un+' added as '+ROLES[ur].n+'. Give them PIN '+up+'.')})});
  }
  else if(a==='resetpin'){
    var tid=g('data-id'),tu=S.users.filter(function(u){return u.id===tid})[0],np=val('np-'+tid);
    if(!tu||!(ROLES[tu.role].l<lvl()||(tu.role==='owner'&&lvl()===4)))return;
    if(!validPin(np))return note('New PIN must be 4 to 6 digits.');
    pinTaken(np,tid).then(function(t){
      if(t)return note('That PIN is already used. Choose another.');
      mkHash(np).then(function(h){tu.salt=h.salt;tu.hash=h.hash;save();note('New PIN set for '+tu.name+'.')})});
  }
  else if(a==='rmuser'){
    var rid=g('data-id'),ru=S.users.filter(function(u){return u.id===rid})[0];
    if(ru&&ROLES[ru.role].l<lvl()&&confirm('Remove '+ru.name+'? Their past entries stay in the records.')){S.users=S.users.filter(function(u){return u.id!==rid});S.gone[rid]=Date.now();save();note(ru.name+' removed.')}}
  else if(a==='changepin'){
    var cu=me(),c0=val('sec-cur'),c1=val('sec-new'),c2=val('sec-new2');
    if(!validPin(c1)||c1!==c2)return note('New PINs must match and be 4 to 6 digits.');
    hashPin(c0,cu.salt).then(function(h){
      if(h!==cu.hash)return note('Current PIN is wrong.');
      pinTaken(c1,cu.id).then(function(t){
        if(t)return note('That PIN is already used. Choose another.');
        mkHash(c1).then(function(n){cu.salt=n.salt;cu.hash=n.hash;save();note('Your PIN was changed.')})})});
  }
  else if(a==='csv'){
    var rows=['Date,Vehicle,Amount,Note,Recorded by'];
    S.entries.slice().sort(function(x,y){return x.date<y.date?-1:x.date>y.date?1:x.ts-y.ts}).forEach(function(e){
      rows.push([e.date,'"'+vname(e.vid).replace(/"/g,'""')+'"',e.amount.toFixed(2),'"'+(e.note||'').replace(/"/g,'""')+'"','"'+nameOf(e.by).replace(/"/g,'""')+'"'].join(','))});
    download('chatima-revenue-'+today()+'.csv',rows.join('\n'),'text/csv')}
  else if(a==='json'){var copy=JSON.parse(JSON.stringify(S));delete copy.fails;delete copy.until;download('chatima-backup-'+today()+'.json',JSON.stringify(copy),'application/json')}
  else if(a==='wipe'){
    if(confirm('Delete ALL vehicles, people and revenue from this phone?')&&confirm('This cannot be undone. Delete everything?')){S=seed();SY=null;saveSY();save();ui.me=null;render()}}
});

document.addEventListener('change',function(ev){
  var t=ev.target,a=t.getAttribute&&t.getAttribute('data-a'),vid=t.getAttribute&&t.getAttribute('data-v');
  if(t.id==='dpick'&&t.value){ui.date=lvl()===1?today():t.value;render()}
  else if(a==='uphoto'&&t.files&&t.files[0]){
    var pid=t.getAttribute('data-id'),pu=S.users.filter(function(u){return u.id===pid})[0];
    if(!pu||!canPhoto(pu))return;
    var fr0=new FileReader();
    fr0.onload=function(){var im=new Image();im.onload=function(){
      var k=Math.min(1,200/Math.min(im.width,im.height)),w=Math.round(im.width*k),h=Math.round(im.height*k),c=document.createElement('canvas');
      c.width=c.height=Math.min(w,h);c.getContext('2d').drawImage(im,(w-c.width)/-2,(h-c.height)/-2,w,h);
      pu.photo=c.toDataURL('image/jpeg',0.75);save();render()};im.src=fr0.result};
    fr0.readAsDataURL(t.files[0]);
  }
  else if(t.id==='pr'){document.getElementById('pd').textContent=ROLES[t.value].d}
  else if(lvl()>=3&&a==='rename'){var nm=t.value.trim();if(nm){S.vehicles.forEach(function(v){if(v.id===vid)v.name=nm});save()}else render()}
  else if(lvl()>=3&&a==='kind'){S.vehicles.forEach(function(v){if(v.id===vid)v.kind=t.value});save();render()}
  else if(lvl()>=3&&a==='photo'&&t.files&&t.files[0]){
    var fr=new FileReader();
    fr.onload=function(){var im=new Image();im.onload=function(){
      var k=Math.min(1,480/Math.max(im.width,im.height)),c=document.createElement('canvas');
      c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      S.vehicles.forEach(function(v){if(v.id===vid)v.photo=c.toDataURL('image/jpeg',0.72)});save();render()};
      im.src=fr.result};
    fr.readAsDataURL(t.files[0]);
  }
  else if(lvl()>=3&&t.id==='cur'){S.currency=t.value.trim()||'$';save()}
  else if(lvl()>=3&&t.id==='imp'&&t.files&&t.files[0]){
    var r=new FileReader();
    r.onload=function(){
      if(SY){ui.msg='Disconnect online sync before restoring a backup.';return render()}
      try{var d=JSON.parse(r.result);d.gone=d.gone||{};if(!d||!Array.isArray(d.vehicles)||!Array.isArray(d.entries))throw 0;
        if(confirm('Replace the data on this phone with this backup ('+d.entries.length+' entries)?')){
          if(!d.users||!d.users.length)d.users=S.users;delete d.sec;S=d;save();ui.me=null;return render()}
      }catch(e){ui.msg='That file is not a valid backup.'}
      render();};
    r.readAsText(t.files[0]);
  }
});

document.addEventListener('keydown',function(ev){
  if(ev.key==='Enter'&&(ev.target.id==='lockpin'||ev.target.id==='firebase-password')){ev.preventDefault();var b=document.querySelector('[data-a="unlock"]');if(b)b.click();return}
  var id=ev.target.id||'';
  if(ev.key==='Enter'&&(id.indexOf('amt-')===0||id.indexOf('note-')===0))addEntry(ev.target.getAttribute('data-v'));
});
['click','keydown','touchstart'].forEach(function(t){document.addEventListener(t,function(){ui.last=Date.now()},true)});
setInterval(function(){if(ui.me&&Date.now()-ui.last>180000){ui.me=null;cloudOut();render()}},15000);
document.addEventListener('visibilitychange',function(){
  if(document.hidden){ui.hid=Date.now()}
  else if(ui.me&&ui.hid&&Date.now()-ui.hid>60000){ui.me=null;cloudOut();render()}
});
if(window.addEventListener)window.addEventListener('online',function(){syncNow()});
document.addEventListener('visibilitychange',function(){if(!document.hidden)syncNow()});
setInterval(function(){if(SY&&!document.hidden)syncNow()},30000);
render();
if(SY)syncNow();
})();