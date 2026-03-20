var express=require('express'),http=require('http'),Server=require('socket.io').Server,os=require('os'),path=require('path'),fs=require('fs'),cookieParser=require('cookie-parser'),crypto=require('crypto'),QRCode=require('qrcode');
var app=express(),server=http.createServer(app);

var TOTAL_RAM=Math.round(os.totalmem()/1048576),CPU_COUNT=os.cpus().length,CPU_SPEED=os.cpus()[0]?os.cpus()[0].speed:2000,CPU_MODEL=os.cpus()[0]?os.cpus()[0].model:'?';
var POWER=Math.min(100,Math.round((CPU_COUNT*8)+(CPU_SPEED/50)+(TOTAL_RAM/200)));
var MAX_RAM=Math.round(TOTAL_RAM*0.25),MAX_STORAGE=10*1024;
var LIM={msgLen:Math.min(5000,1000+POWER*40),fileSize:Math.min(50,10+Math.round(POWER*0.4)),msgsPerRoom:Math.min(5000,500+POWER*45),maxRooms:Math.min(50,5+Math.round(POWER*0.45)),httpPerSec:Math.min(60,15+Math.round(POWER*0.45)),socketPer10s:Math.min(40,10+Math.round(POWER*0.3)),socketBuf:Math.min(100,20+Math.round(POWER*0.8))*1048576,saveInterval:Math.max(1,5-Math.round(POWER/30)),msgLifetime:24*3600000,maxLogs:Math.min(10000,1000+POWER*90)};

var io2=new Server(server,{maxHttpBufferSize:LIM.socketBuf});
var PORT=3000,DD=path.join(__dirname,'data'),MD=path.join(DD,'medya'),FD=path.join(DD,'dosyalar'),ID_DIR=path.join(DD,'id_mesajlar'),DM_DIR=path.join(DD,'dm');
[DD,MD,FD,ID_DIR,DM_DIR].forEach(function(d){if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true})});

var BAD_WORDS=['aq','amk','orospu','piç','siktir','sikeyim','gotten','yarrak','amina','sikerim','oç','mk'];
function filterBW(t){for(var i=0;i<BAD_WORDS.length;i++){var r=new RegExp(BAD_WORDS[i].split('').join('[\\s.*]*'),'gi');t=t.replace(r,function(m){return'*'.repeat(m.length)})}return t}

var mutedUsers={},spamTracker={},lastMessages={};
function checkSpam(uid){var now=Date.now();if(!spamTracker[uid])spamTracker[uid]={messages:[]};var t=spamTracker[uid];t.messages=t.messages.filter(function(x){return now-x<10000});t.messages.push(now);if(t.messages.length>=8){mutedUsers[uid]={until:now+60000,reason:'Spam'};t.messages=[];return{muted:true,duration:60}}return{muted:false}}
function checkRepeat(uid,msg){var now=Date.now();if(!lastMessages[uid])lastMessages[uid]=[];lastMessages[uid].push({text:msg,time:now});lastMessages[uid]=lastMessages[uid].filter(function(m){return now-m.time<30000});var same=0;for(var i=0;i<lastMessages[uid].length;i++)if(lastMessages[uid][i].text===msg)same++;if(same>=3){mutedUsers[uid]={until:now+60000,reason:'Tekrar'};lastMessages[uid]=[];return true}return false}
function isMuted(uid){if(!mutedUsers[uid])return{muted:false};if(Date.now()>mutedUsers[uid].until){delete mutedUsers[uid];return{muted:false}}return{muted:true,remaining:Math.ceil((mutedUsers[uid].until-Date.now())/1000),reason:mutedUsers[uid].reason}}
setInterval(function(){var now=Date.now();for(var u in mutedUsers)if(now>mutedUsers[u].until)delete mutedUsers[u]},30000);

function loadJSON(fp,fb){try{if(fs.existsSync(fp))return JSON.parse(fs.readFileSync(fp,'utf8'))}catch(e){}return fb}
function saveJSON(fp,d){try{fs.writeFileSync(fp,JSON.stringify(d,null,2),'utf8');return true}catch(e){return false}}
function getRF(id){return path.join(DD,'oda_'+id+'.json')}
function loadRM(id){return loadJSON(getRF(id),[])}
function saveRM(id){if(rooms[id])saveJSON(getRF(id),rooms[id].messages)}
var IF=path.join(DD,'kimlikler.json'),BF=path.join(DD,'banlar.json'),TBF=path.join(DD,'sureli_banlar.json'),RPF=path.join(DD,'sikayetler.json'),RMF=path.join(DD,'odalar.json'),AUF=path.join(DD,'denetim.json'),PNF=path.join(DD,'pinler.json'),SUF=path.join(DD,'server_uid.txt'),DIF=path.join(DD,'dm_index.json'),CLF=path.join(DD,'crash_log.json'),PLF=path.join(DD,'anketler.json'),GMF=path.join(DD,'oyunlar.json');

function saveAll(){var rd={};for(var id in rooms){rd[id]={name:rooms[id].name,createdBy:rooms[id].createdBy,moderators:rooms[id].moderators,createdAt:rooms[id].createdAt,password:rooms[id].password||null};saveRM(id)}saveJSON(RMF,rd);saveJSON(IF,identities);saveJSON(BF,bans);saveJSON(TBF,tempBans);saveJSON(RPF,reports);saveJSON(AUF,auditLog);saveJSON(PNF,pins);saveJSON(DIF,dmIndex);saveJSON(PLF,polls);saveJSON(GMF,games)}
function forceSave(){hasUnsaved=true;try{saveAll();hasUnsaved=false}catch(e){}}
function logAudit(w,a,d){auditLog.push({who:w,action:a,detail:d,date:new Date().toLocaleString('tr-TR'),ts:Date.now()});if(auditLog.length>1000)auditLog=auditLog.slice(-1000);hasUnsaved=true}
function logIDMsg(uid,un,rid,msg){try{var f=path.join(ID_DIR,uid+'.json'),l=loadJSON(f,[]);l.push({username:un,room:rid,message:msg.message||'['+msg.type+']',type:msg.type,time:msg.time,date:msg.date,id:msg.id,uid:uid});if(l.length>LIM.maxLogs)l=l.slice(-LIM.maxLogs);saveJSON(f,l)}catch(e){}}
function genId(){return crypto.randomBytes(16).toString('hex')}
function genApi(){return'API-'+crypto.randomBytes(24).toString('hex')}
function getDMFile(a,b){var s=[a,b].sort();return path.join(DM_DIR,s[0]+'_'+s[1]+'.json')}
function loadDM(a,b){return loadJSON(getDMFile(a,b),[])}
function saveDM(a,b,m){saveJSON(getDMFile(a,b),m)}
var dmIndex=loadJSON(DIF,{});
function updateDMI(fU,fN,tU,tN,msg,time){if(!dmIndex[fU])dmIndex[fU]={};if(!dmIndex[tU])dmIndex[tU]={};dmIndex[fU][tU]={name:tN,lastMsg:msg.substring(0,60),lastTime:time,unread:dmIndex[fU][tU]?dmIndex[fU][tU].unread:0};dmIndex[tU][fU]={name:fN,lastMsg:msg.substring(0,60),lastTime:time,unread:(dmIndex[tU][fU]?dmIndex[tU][fU].unread:0)+1};hasUnsaved=true}
function getDML(uid){if(!dmIndex[uid])return[];var l=[];for(var t in dmIndex[uid]){var d=dmIndex[uid][t],on=false;for(var s in users)if(users[s].uid===t){on=true;break}l.push({uid:t,name:d.name,lastMsg:d.lastMsg||'',lastTime:d.lastTime||'',unread:d.unread||0,online:on})}l.sort(function(a,b){return(b.lastTime||'').localeCompare(a.lastTime||'')});return l}
function markDMR(my,other){if(dmIndex[my]&&dmIndex[my][other]){dmIndex[my][other].unread=0;hasUnsaved=true}}

var users={},identities=loadJSON(IF,{}),bans=loadJSON(BF,[]),tempBans=loadJSON(TBF,[]),reports=loadJSON(RPF,[]),auditLog=loadJSON(AUF,[]),pins=loadJSON(PNF,{}),rooms={};
var polls=loadJSON(PLF,{}),games=loadJSON(GMF,{});
var hostSID=null,hostName=null,hostUID=null,hasUnsaved=false,crashLogs=loadJSON(CLF,[]);
var serverUID=null;if(fs.existsSync(SUF))serverUID=fs.readFileSync(SUF,'utf8').trim();

var savedRooms=loadJSON(RMF,null);
if(savedRooms&&Object.keys(savedRooms).length>0){for(var rid in savedRooms)rooms[rid]={name:savedRooms[rid].name,createdBy:savedRooms[rid].createdBy,moderators:savedRooms[rid].moderators||[],createdAt:savedRooms[rid].createdAt,password:savedRooms[rid].password||null,messages:loadRM(rid)}}
else{rooms['genel']={name:'Genel',createdBy:'Sistem',moderators:[],createdAt:new Date().toISOString(),password:null,messages:loadRM('genel')}}

process.on('uncaughtException',function(e){crashLogs.push({type:'ex',msg:e.message,date:new Date().toLocaleString('tr-TR')});if(crashLogs.length>100)crashLogs=crashLogs.slice(-100);try{saveJSON(CLF,crashLogs)}catch(x){}});
process.on('unhandledRejection',function(){});
process.on('SIGINT',function(){try{saveAll()}catch(e){}process.exit(0)});

function getIP(s){return(s.handshake.headers['x-forwarded-for']||s.handshake.address||'').replace('::ffff:','').replace('::1','127.0.0.1')||'?'}
function getReqIP(r){return(r.headers['x-forwarded-for']||r.connection.remoteAddress||'').replace('::ffff:','').replace('::1','127.0.0.1')||'?'}
function getServerIPs(){var ips=['127.0.0.1'];var ifaces=os.networkInterfaces();for(var n of Object.keys(ifaces))for(var i of ifaces[n])ips.push(i.address.replace('::ffff:',''));return ips}
var serverIPs=getServerIPs();
function isServerIP(ip){return serverIPs.indexOf(ip.replace('::ffff:','').replace('::1','127.0.0.1'))!==-1}
function isBanned(uid,ip){if(!uid||isServerIP(ip)||uid===serverUID||uid===hostUID)return{banned:false};if(bans.indexOf(uid)!==-1)return{banned:true,type:'permanent'};var now=Date.now();for(var i=0;i<tempBans.length;i++)if(tempBans[i].uniqueId===uid&&tempBans[i].until>now)return{banned:true,type:'temp',until:tempBans[i].until};return{banned:false}}
function fmtRem(ms){var dk=Math.ceil(ms/60000);if(dk<60)return dk+'dk';var s=Math.floor(dk/60);if(s<24)return s+'sa';return Math.floor(s/24)+'gun'}
function sanitize(s){return typeof s==='string'?s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,'').trim():''}
function isValid(s,min,max){return typeof s==='string'&&sanitize(s).length>=min&&sanitize(s).length<=max}
function getTime(){return new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}
function rand(){return Math.random().toString(36).substr(2,6)}
function getLocalIP(){var ifaces=os.networkInterfaces();for(var n of Object.keys(ifaces))for(var i of ifaces[n])if(i.family==='IPv4'&&!i.internal)return i.address;return'localhost'}
function getOnline(){var l=[];for(var s in users)l.push({name:users[s].name,role:users[s].role,currentRoom:users[s].currentRoom,uid:users[s].uid,ip:users[s].ip,status:users[s].status||'online'});return l}
function getRoomList(){var l=[];for(var id in rooms)l.push({id:id,name:rooms[id].name,userCount:getRU(id).length,messageCount:rooms[id].messages.length,hasPassword:!!rooms[id].password});return l}
function getRU(rid){var l=[];for(var s in users)if(users[s].currentRoom===rid)l.push({name:users[s].name,role:getRole(users[s].name),status:users[s].status||'online'});return l}
function getRole(name){for(var o in identities)if(identities[o].name===name&&o===serverUID)return'host';if(name===hostName)return'host';for(var o2 in identities)if(identities[o2].name===name&&identities[o2].role==='mod')return'mod';return'user'}
function markRead(rid,name){if(!rooms[rid])return;for(var i=0;i<rooms[rid].messages.length;i++){var m=rooms[rid].messages[i];if(!m.readBy)m.readBy=[];if(m.readBy.indexOf(name)===-1)m.readBy.push(name)}hasUnsaved=true}
function kickUser(uid,reason){for(var sid in users)if(users[sid].uid===uid){io2.to(sid).emit('banned',reason);var sk=io2.sockets.sockets.get(sid);if(sk)sk.disconnect(true)}}

function processCmd(text,username,uid,roomId){
    var l=text.toLowerCase().trim();
    if(l==='/zar')return{type:'bot',text:'🎲 '+username+': **'+(Math.floor(Math.random()*6)+1)+'**'};
    if(l==='/yazitura')return{type:'bot',text:'🪙 '+(Math.random()<0.5?'Yazi':'Tura')};
    if(l==='/saat')return{type:'bot',text:'🕐 '+new Date().toLocaleTimeString('tr-TR')};
    if(l==='/online')return{type:'bot',text:'👥 '+Object.keys(users).length+' kisi'};
    if(l==='/yardim')return{type:'bot',text:'📋 /zar /yazitura /saat /online /kura A B C\n/anket "Soru?" "A" "B"\n/tkmk @kisi /sayi 1 100'};
    if(l.startsWith('/rastgele ')){var max=parseInt(text.split(' ')[1]);if(!isNaN(max)&&max>0)return{type:'bot',text:'🎯 '+(Math.floor(Math.random()*max)+1)}}
    if(l.startsWith('/kura ')){var parts=text.substring(6).split(' ').filter(function(x){return x.trim()});if(parts.length>1)return{type:'bot',text:'🏆 '+parts[Math.floor(Math.random()*parts.length)]+' kazandi!'}}

    // ANKET
    if(l.startsWith('/anket ')){var match=text.match(/"([^"]+)"/g);if(!match||match.length<3)return{type:'bot',text:'❌ /anket "Soru?" "A" "B" "C"'};var q=match[0].replace(/"/g,'');var opts=[];for(var i=1;i<match.length;i++)opts.push({text:match[i].replace(/"/g,''),votes:[]});if(!polls[roomId])polls[roomId]=[];var poll={id:Date.now()+'_'+rand(),question:q,options:opts,createdBy:username,createdByUid:uid,createdAt:getTime(),active:true};polls[roomId].push(poll);if(polls[roomId].length>20)polls[roomId]=polls[roomId].slice(-20);hasUnsaved=true;return{type:'poll',poll:poll}}

    // TAS KAGIT MAKAS
    if(l.startsWith('/tkmk ')){var target=text.substring(6).trim().replace('@','');var tSid=null;for(var sid in users)if(users[sid].name.toLowerCase()===target.toLowerCase()&&users[sid].currentRoom===roomId){tSid=sid;break}if(!tSid)return{type:'bot',text:'❌ "'+target+'" bulunamadi'};if(users[tSid].name===username)return{type:'bot',text:'❌ Kendinle oynayamazsin!'};var gid=Date.now()+'_'+rand();if(!games[roomId])games[roomId]={};games[roomId][gid]={type:'tkmk',id:gid,player1:{uid:uid,name:username,choice:null},player2:{uid:users[tSid].uid,name:users[tSid].name,choice:null},status:'waiting',createdAt:getTime()};hasUnsaved=true;return{type:'tkmk-invite',gameId:gid,from:username,to:users[tSid].name}}

    // SAYI TAHMIN
    if(l.startsWith('/sayi ')){var p2=text.split(' ');var mn=parseInt(p2[1])||1,mx=parseInt(p2[2])||100;if(mn>=mx)return{type:'bot',text:'❌ Gecersiz'};var secret=Math.floor(Math.random()*(mx-mn+1))+mn;var gid2=Date.now()+'_'+rand();if(!games[roomId])games[roomId]={};games[roomId][gid2]={type:'sayi',id:gid2,min:mn,max:mx,secret:secret,guesses:[],createdBy:username,createdAt:getTime(),status:'active',maxGuess:10};hasUnsaved=true;return{type:'sayi-start',gameId:gid2,min:mn,max:mx,by:username}}

}

function cleanOld(){var now=Date.now(),del=0;for(var rid in rooms){var b=rooms[rid].messages.length;rooms[rid].messages=rooms[rid].messages.filter(function(m){var ts=parseInt((m.id||'0').split('_')[0]);if(!isNaN(ts)&&ts>1600000000000&&now-ts>LIM.msgLifetime){if(m.mediaFile)try{fs.unlinkSync(path.join(MD,m.mediaFile))}catch(e){}if(m.savedFile)try{fs.unlinkSync(path.join(FD,m.savedFile))}catch(e){}return false}return true});if(rooms[rid].messages.length>LIM.msgsPerRoom)rooms[rid].messages=rooms[rid].messages.slice(-LIM.msgsPerRoom);del+=(b-rooms[rid].messages.length)}if(del>0){hasUnsaved=true;for(var sid in users){var r=users[sid].currentRoom;if(r&&rooms[r])io2.to(sid).emit('messages-refreshed',{messages:rooms[r].messages})}}}
setInterval(cleanOld,10*60000);setTimeout(cleanOld,5000);
setInterval(function(){var now=Date.now(),b=tempBans.length;tempBans=tempBans.filter(function(x){return x.until>now});if(tempBans.length!==b)forceSave()},30000);
setInterval(function(){if(hasUnsaved){try{saveAll();hasUnsaved=false;if(hostSID)io2.to(hostSID).emit('save-status',{success:true,time:getTime(),auto:true})}catch(e){}}},LIM.saveInterval*60000);
setInterval(function(){var mb=Math.round(process.memoryUsage().heapUsed/1048576);if(mb>MAX_RAM){cleanOld();if(global.gc)global.gc()}},30000);

var rateLimits={};
function checkRL(ip,lim,win){var now=Date.now();if(!rateLimits[ip])rateLimits[ip]={c:0,r:now};if(now-rateLimits[ip].r>win)rateLimits[ip]={c:0,r:now};rateLimits[ip].c++;return rateLimits[ip].c<=lim}

app.use(cookieParser());
app.use(express.json({limit:'1mb'}));
app.use(function(req,res,next){if(!checkRL(getReqIP(req),LIM.httpPerSec,1000))return res.status(429).send('Yavasla');next()});
app.use(function(req,res,next){var uid=req.cookies.chat_uid,ip=getReqIP(req);if(!uid){uid=genId();var api=genApi();res.cookie('chat_uid',uid,{maxAge:365*86400000,httpOnly:false,sameSite:'lax'});res.cookie('chat_api',api,{maxAge:365*86400000,httpOnly:false,sameSite:'lax'});if(!identities[uid]){identities[uid]={name:null,role:'user',apiKey:api,ips:[ip],createdAt:new Date().toLocaleString('tr-TR'),lastSeen:new Date().toLocaleString('tr-TR'),status:'online'};hasUnsaved=true}}else{var ch=isBanned(uid,ip);if(ch.banned){var msg=ch.type==='permanent'?'Engellendi':'Gecici: '+fmtRem(ch.until-Date.now());return res.status(403).send('<html><body style="background:#1a1a2e;color:#ff5252;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center"><div style="padding:40px;border:2px solid #ff5252;border-radius:20px"><h1>'+msg+'</h1></div></body></html>')}if(identities[uid]){if(identities[uid].ips.indexOf(ip)===-1){identities[uid].ips.push(ip);if(identities[uid].ips.length>20)identities[uid].ips=identities[uid].ips.slice(-20)}identities[uid].lastSeen=new Date().toLocaleString('tr-TR')}}next()});

app.use(express.static(path.join(__dirname,'public')));
app.use('/medya',express.static(MD));
app.get('/dosya/:file',function(req,res){var fp=path.join(FD,req.params.file);if(!fs.existsSync(fp))return res.status(404).send('Yok');res.setHeader('Content-Disposition','attachment; filename="'+encodeURIComponent(req.query.name||req.params.file)+'"');res.setHeader('Content-Type','application/octet-stream');fs.createReadStream(fp).pipe(res)});
app.get('/api/identity',function(req,res){var uid=req.cookies.chat_uid;if(!uid||!identities[uid])return res.json({registered:false});if(identities[uid].name)return res.json({registered:true,name:identities[uid].name,uid:uid});return res.json({registered:false,uid:uid})});
app.get('/api/qr',function(req,res){var ip=getLocalIP();QRCode.toDataURL('http://'+ip+':'+PORT,{width:300},function(err,url){res.json(err?{error:true}:{qr:url,url:'http://'+ip+':'+PORT})})});
app.get('/api/status',function(req,res){var ip=getReqIP(req);if(!isServerIP(ip))return res.status(403).json({error:'Yetkisiz'});res.json({power:POWER,online:Object.keys(users).length,rooms:Object.keys(rooms).length,bans:bans.length,tempBans:tempBans.length,reports:reports.length,ram:Math.round(process.memoryUsage().heapUsed/1048576)+'MB',polls:Object.keys(polls).length,games:Object.keys(games).length})});

// ADMIN API
app.get('/api/admin/users',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json([]);var l=[];for(var uid in identities){var i=identities[uid];if(!i.name)continue;var on=false,cRoom='';for(var sid in users)if(users[sid].uid===uid){on=true;cRoom=users[sid].currentRoom||'';break}l.push({uid:uid,uidShort:uid.substring(0,12)+'...',name:i.name,role:i.role,online:on,currentRoom:cRoom,ips:i.ips||[],lastSeen:i.lastSeen||'?',createdAt:i.createdAt||'?'})}res.json(l)});
app.get('/api/admin/rooms',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json([]);var l=[];for(var id in rooms)l.push({id:id,name:rooms[id].name,createdBy:rooms[id].createdBy,hasPassword:!!rooms[id].password,messageCount:rooms[id].messages.length,userCount:getRU(id).length});res.json(l)});
app.get('/api/admin/bans',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json({});var p=bans.map(function(uid){return{uid:uid,uidShort:uid.substring(0,12)+'...',name:identities[uid]?identities[uid].name:'?'}});var t=tempBans.map(function(b){return{uid:b.uniqueId,uidShort:b.uniqueId.substring(0,12)+'...',name:b.username,remaining:Math.max(0,Math.ceil((b.until-Date.now())/60000))+'dk',bannedBy:b.bannedBy}});res.json({permanent:p,temporary:t})});
app.get('/api/admin/reports',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json([]);res.json(reports)});
app.get('/api/admin/audit',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json([]);res.json(auditLog.slice(-200))});
app.get('/api/admin/crashes',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json([]);res.json(crashLogs)});
app.get('/api/admin/dm-index',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json([]);var l=[];for(var uid in dmIndex){var name=identities[uid]?identities[uid].name:'?';for(var tuid in dmIndex[uid])l.push({from:name,fromUid:uid.substring(0,8),to:dmIndex[uid][tuid].name,toUid:tuid.substring(0,8),lastMsg:dmIndex[uid][tuid].lastMsg,lastTime:dmIndex[uid][tuid].lastTime})}res.json(l)});
app.get('/api/admin/messages',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json([]);var q=req.query.q||'',uidF=req.query.uid||'',roomF=req.query.room||'',typeF=req.query.type||'',limit=parseInt(req.query.limit)||100;var results=[];for(var rid in rooms){if(roomF&&rid!==roomF)continue;for(var i=0;i<rooms[rid].messages.length;i++){var m=rooms[rid].messages[i];if(uidF&&m.uid!==uidF)continue;if(typeF&&m.type!==typeF)continue;if(q){var lower=q.toLowerCase();if(!(m.message&&m.message.toLowerCase().indexOf(lower)!==-1)&&!(m.username&&m.username.toLowerCase().indexOf(lower)!==-1))continue}results.push({room:rid,id:m.id,uid:m.uid||'?',uidShort:(m.uid||'?').substring(0,10)+'...',ip:m.ip||'?',username:m.username,type:m.type,message:m.message||'['+m.type+']',time:m.time,date:m.date})}}res.json(results.slice(-limit))});
app.get('/api/admin/user-messages/:uid',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json([]);var uid=req.params.uid;var f=path.join(ID_DIR,uid+'.json');var logs=loadJSON(f,[]);res.json({uid:uid,uidShort:uid.substring(0,12)+'...',name:identities[uid]?identities[uid].name:'?',messages:logs.slice(-200)})});
app.post('/api/admin/save',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json({});try{saveAll();hasUnsaved=false;res.json({success:true})}catch(e){res.json({success:false})}});

app.post('/api/admin/unban',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json({});var uid=req.body.uid;if(!uid)return res.json({success:false});var removed=false,name=(identities[uid]?identities[uid].name:'?');var idx=bans.indexOf(uid);if(idx!==-1){bans.splice(idx,1);removed=true;logAudit('Admin','unban-perm',name)}var bLen=tempBans.length;tempBans=tempBans.filter(function(b){return b.uniqueId!==uid});if(tempBans.length!==bLen){removed=true;logAudit('Admin','unban-temp',name)}if(removed){forceSave();return res.json({success:true})}return res.json({success:false})});

app.post('/api/admin/ban',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json({});var uid=req.body.uid,duration=req.body.duration;if(!uid)return res.json({success:false});if(uid===serverUID)return res.json({success:false,error:'Sunucu banlananamaz'});var name=identities[uid]?identities[uid].name:'?';if(!duration||duration==='permanent'){tempBans=tempBans.filter(function(b){return b.uniqueId!==uid});if(bans.indexOf(uid)===-1)bans.push(uid);kickUser(uid,'Admin: Kalici');logAudit('Admin','ban-perm',name);forceSave();return res.json({success:true,type:'permanent'})}else{var dk=parseInt(duration);if(isNaN(dk)||dk<1)return res.json({success:false});var pidx=bans.indexOf(uid);if(pidx!==-1)bans.splice(pidx,1);tempBans=tempBans.filter(function(b){return b.uniqueId!==uid});tempBans.push({uniqueId:uid,username:name,until:Date.now()+dk*60000,duration:dk,bannedBy:'Admin',bannedAt:new Date().toLocaleString('tr-TR')});kickUser(uid,'Admin: '+dk+'dk');logAudit('Admin','ban-temp',name+' '+dk+'dk');forceSave();return res.json({success:true,type:'temporary'})}});

app.post('/api/admin/resolve-report',function(req,res){if(!isServerIP(getReqIP(req)))return res.status(403).json({});var reportId=req.body.reportId,action=req.body.action;if(!reportId)return res.json({success:false});if(action==='delete'){reports=reports.filter(function(r){return r.id!==reportId});forceSave();return res.json({success:true})}for(var i=0;i<reports.length;i++)if(reports[i].id===reportId){reports[i].status=action||'incelendi';break}forceSave();return res.json({success:true})});

// SOCKET
io2.on('connection',function(socket){
    var cIP=getIP(socket),sMsgC=0,sMsgR=Date.now();
    var cookies={};(socket.handshake.headers.cookie||'').split(';').forEach(function(c){var p=c.trim().split('=');if(p.length===2)cookies[p[0]]=p[1]});
    var uid=cookies.chat_uid||null;
    if(!uid){socket.emit('need-reload');socket.disconnect(true);return}
    var ch=isBanned(uid,cIP);if(ch.banned){socket.emit('banned',ch.type==='permanent'?'Kalici':'Gecici: '+fmtRem(ch.until-Date.now()));socket.disconnect(true);return}
    if(!identities[uid]){identities[uid]={name:null,role:'user',apiKey:genApi(),ips:[cIP],createdAt:new Date().toLocaleString('tr-TR'),lastSeen:new Date().toLocaleString('tr-TR'),status:'online'};hasUnsaved=true}
    if(identities[uid].ips.indexOf(cIP)===-1){identities[uid].ips.push(cIP);if(identities[uid].ips.length>20)identities[uid].ips=identities[uid].ips.slice(-20)}
    identities[uid].lastSeen=new Date().toLocaleString('tr-TR');

    function flood(){var now=Date.now();if(now-sMsgR>10000){sMsgC=0;sMsgR=now}sMsgC++;return sMsgC<=LIM.socketPer10s}

    socket.on('register-name',function(name){if(!isValid(name,1,20)){socket.emit('join-error','Gecersiz!');return}var cn=sanitize(name).substring(0,20);for(var o in identities)if(o!==uid&&identities[o].name&&identities[o].name.toLowerCase()===cn.toLowerCase()){socket.emit('join-error','Alinmis!');return}identities[uid].name=cn;hasUnsaved=true;socket.emit('name-registered',cn)});

    socket.on('join',function(){
        var ident=identities[uid];if(!ident||!ident.name){socket.emit('need-name');return}
        var name=ident.name;
        for(var sid in users){if(users[sid].name===name&&sid!==socket.id){var os2=io2.sockets.sockets.get(sid);if(os2){os2.emit('kicked','Baska yerden giris.');os2.disconnect(true)}delete users[sid]}}
        if(isServerIP(cIP)&&!serverUID){serverUID=uid;fs.writeFileSync(SUF,uid,'utf8')}
        var role='user';
        if(uid===serverUID){role='host';hostSID=socket.id;hostName=name;hostUID=uid;identities[uid].role='host'}
        else if(identities[uid].role==='mod')role='mod';
        users[socket.id]={name:name,role:role,currentRoom:null,ip:cIP,uid:uid,status:ident.status||'online'};hasUnsaved=true;
        socket.emit('join-success',{username:name,role:role,uid:uid,rooms:getRoomList(),onlineUsers:getOnline(),dmList:getDML(uid),limits:{maxFileSize:LIM.fileSize,maxMessageLength:LIM.msgLen}});
        io2.emit('users-update',getOnline());
    });

    socket.on('set-status',function(s){if(!users[socket.id])return;if(['online','mesgul','uzakta','rahatsiz_etmeyin'].indexOf(s)===-1)return;users[socket.id].status=s;identities[uid].status=s;hasUnsaved=true;io2.emit('users-update',getOnline())});

    socket.on('join-room',function(data){
        if(!users[socket.id])return;var roomId,password;
        if(typeof data==='string'){roomId=data;password=null}else if(data){roomId=data.roomId;password=data.password||null}else return;
        roomId=sanitize(String(roomId));if(!rooms[roomId]){socket.emit('msg-error','Oda yok!');return}
        if(rooms[roomId].password&&users[socket.id].role==='user'){if(password!==rooms[roomId].password){socket.emit('need-password',{roomId:roomId,roomName:rooms[roomId].name});return}}
        var oldR=users[socket.id].currentRoom;
        if(oldR){socket.leave('room_'+oldR);io2.to('room_'+oldR).emit('room-user-left',{username:users[socket.id].name,users:getRU(oldR),time:getTime()})}
        users[socket.id].currentRoom=roomId;socket.join('room_'+roomId);
        socket.emit('room-joined',{roomId:roomId,roomName:rooms[roomId].name,messages:rooms[roomId].messages,users:getRU(roomId),myRole:getRole(users[socket.id].name),hasPassword:!!rooms[roomId].password,pins:pins[roomId]||[],polls:polls[roomId]||[],games:games[roomId]||{}});
        io2.to('room_'+roomId).emit('room-user-joined',{username:users[socket.id].name,users:getRU(roomId),time:getTime()});
        markRead(roomId,users[socket.id].name);
    });

    socket.on('send-message',function(data){
        if(!users[socket.id]||!flood())return;
        var mc=isMuted(uid);if(mc.muted){socket.emit('msg-error','Mute! ('+mc.remaining+'sn)');return}
        var roomId=users[socket.id].currentRoom;if(!roomId||!rooms[roomId])return;
        if(!data||!isValid(data.message,1,LIM.msgLen))return;
        var raw=sanitize(data.message).substring(0,LIM.msgLen);
        var sc=checkSpam(uid);if(sc.muted){socket.emit('muted',{duration:60,reason:'Spam'});io2.to('room_'+roomId).emit('system-msg',{text:users[socket.id].name+' spam: 1dk mute'});return}
        if(checkRepeat(uid,raw)){socket.emit('muted',{duration:60,reason:'Tekrar'});io2.to('room_'+roomId).emit('system-msg',{text:users[socket.id].name+' tekrar: 1dk mute'});return}

        // KOMUT
        if(raw.startsWith('/')){
            var cmd=processCmd(raw,users[socket.id].name,uid,roomId);
            if(cmd){
                if(cmd.type==='bot'){
                    var bm={id:Date.now()+'_'+rand(),type:'bot',username:'🤖 Bot',role:'bot',message:cmd.text,time:getTime(),date:new Date().toLocaleDateString('tr-TR'),readBy:[]};
                    rooms[roomId].messages.push(bm);hasUnsaved=true;
                    io2.to('room_'+roomId).emit('new-message',bm);
                } else if(cmd.type==='poll'){
                    // Anketi mesaj olarak kaydet (pozisyon korunsun)
                    var pollMsg={id:Date.now()+'_'+rand(),type:'poll',username:users[socket.id].name,role:getRole(users[socket.id].name),message:'📊 '+cmd.poll.question,time:getTime(),date:new Date().toLocaleDateString('tr-TR'),readBy:[],pollId:cmd.poll.id,uid:uid,ip:cIP};
                    rooms[roomId].messages.push(pollMsg);hasUnsaved=true;
                    io2.to('room_'+roomId).emit('new-message',pollMsg);
                    io2.to('room_'+roomId).emit('new-poll',cmd.poll);
                } else if(cmd.type==='tkmk-invite'){
                    io2.to('room_'+roomId).emit('tkmk-invite',{gameId:cmd.gameId,from:cmd.from,to:cmd.to});
                } else if(cmd.type==='sayi-start'){
                    io2.to('room_'+roomId).emit('sayi-start',{gameId:cmd.gameId,min:cmd.min,max:cmd.max,by:cmd.by});
                } else if(cmd.type==='kelime-start'){
                    io2.to('room_'+roomId).emit('kelime-start',{gameId:cmd.gameId,hint:cmd.hint,by:cmd.by,length:cmd.length});
                }
                return;
            }
        }

        // SAYI TAHMIN
        if(!isNaN(parseInt(raw))&&games[roomId]){
            for(var gid in games[roomId]){
                var g=games[roomId][gid];
                if(g.type==='sayi'&&g.status==='active'){
                    var guess=parseInt(raw);
                    g.guesses.push({by:users[socket.id].name,guess:guess});
                    if(guess===g.secret){g.status='won';hasUnsaved=true;io2.to('room_'+roomId).emit('sayi-result',{gameId:gid,winner:users[socket.id].name,secret:g.secret,guesses:g.guesses.length});return}
                    else{var hint2=guess<g.secret?'yukari ⬆️':'asagi ⬇️';io2.to('room_'+roomId).emit('sayi-hint',{gameId:gid,by:users[socket.id].name,guess:guess,hint:hint2,remaining:g.maxGuess-g.guesses.length});if(g.guesses.length>=g.maxGuess){g.status='lost';hasUnsaved=true;io2.to('room_'+roomId).emit('sayi-result',{gameId:gid,winner:null,secret:g.secret,guesses:g.guesses.length})}return}
                }
            }
        }

        // KELIME TAHMIN (duzeltilmis)
        if(games[roomId]){
            var rawLower=raw.toLowerCase().trim();
            for(var gid2 in games[roomId]){
                var g2=games[roomId][gid2];
                if(g2.type==='kelime'&&g2.status==='active'){
                    if(rawLower.length===g2.word.length){
                        g2.guesses.push({by:users[socket.id].name,guess:rawLower});
                        if(rawLower===g2.word){
                            g2.status='won';hasUnsaved=true;
                            io2.to('room_'+roomId).emit('kelime-result',{gameId:gid2,winner:users[socket.id].name,word:g2.word,guesses:g2.guesses.length});
                            return;
                        }
                        for(var ci=0;ci<rawLower.length;ci++){if(rawLower[ci]===g2.word[ci]&&g2.revealed.indexOf(ci)===-1)g2.revealed.push(ci)}
                        var nHint='';for(var hi2=0;hi2<g2.word.length;hi2++)nHint+=g2.revealed.indexOf(hi2)!==-1?g2.word[hi2]:'_';
                        var rem=g2.maxGuess-g2.guesses.length;
                        io2.to('room_'+roomId).emit('kelime-hint',{gameId:gid2,by:users[socket.id].name,guess:rawLower,hint:nHint,remaining:rem});
                        if(rem<=0){g2.status='lost';hasUnsaved=true;io2.to('room_'+roomId).emit('kelime-result',{gameId:gid2,winner:null,word:g2.word,guesses:g2.guesses.length})}
                        return;
                    }
                }
            }
        }

        // NORMAL MESAJ
        var filtered=filterBW(raw);
        var mentions=[];var mr=/@(\w+)/g;var match2;while((match2=mr.exec(filtered))!==null)mentions.push(match2[1]);
        var msg={id:Date.now()+'_'+rand(),type:'text',username:users[socket.id].name,role:getRole(users[socket.id].name),message:filtered,time:getTime(),date:new Date().toLocaleDateString('tr-TR'),readBy:[users[socket.id].name],uid:uid,ip:cIP,replyTo:data.replyTo||null,mentions:mentions,edited:false};
        rooms[roomId].messages.push(msg);hasUnsaved=true;logIDMsg(uid,users[socket.id].name,roomId,msg);
        io2.to('room_'+roomId).emit('new-message',msg);
        if(mentions.length>0){for(var sid in users){for(var mi=0;mi<mentions.length;mi++){if(users[sid].name.toLowerCase()===mentions[mi].toLowerCase()&&sid!==socket.id)io2.to(sid).emit('mentioned',{by:users[socket.id].name,room:roomId,message:filtered.substring(0,100),msgId:msg.id})}}}
    });

    socket.on('vote-poll',function(data){if(!users[socket.id]||!data||!data.pollId||data.optionIndex===undefined)return;var roomId=users[socket.id].currentRoom;if(!roomId||!polls[roomId])return;for(var i=0;i<polls[roomId].length;i++){var p=polls[roomId][i];if(p.id===data.pollId&&p.active){for(var j=0;j<p.options.length;j++)p.options[j].votes=p.options[j].votes.filter(function(v){return v!==uid});if(data.optionIndex>=0&&data.optionIndex<p.options.length)p.options[data.optionIndex].votes.push(uid);hasUnsaved=true;io2.to('room_'+roomId).emit('poll-update',p);return}}});

    socket.on('tkmk-play',function(data){if(!users[socket.id]||!data||!data.gameId||!data.choice)return;var roomId=users[socket.id].currentRoom;if(!roomId||!games[roomId]||!games[roomId][data.gameId])return;var g=games[roomId][data.gameId];if(g.status!=='waiting'||['tas','kagit','makas'].indexOf(data.choice)===-1)return;if(g.player1.uid===uid)g.player1.choice=data.choice;else if(g.player2.uid===uid)g.player2.choice=data.choice;else return;if(g.player1.choice&&g.player2.choice){g.status='done';var w=null;var c1=g.player1.choice,c2=g.player2.choice;if(c1===c2)w='berabere';else if((c1==='tas'&&c2==='makas')||(c1==='kagit'&&c2==='tas')||(c1==='makas'&&c2==='kagit'))w=g.player1.name;else w=g.player2.name;hasUnsaved=true;io2.to('room_'+roomId).emit('tkmk-result',{gameId:data.gameId,player1:g.player1,player2:g.player2,winner:w})}else io2.to('room_'+roomId).emit('tkmk-waiting',{gameId:data.gameId,who:users[socket.id].name})});

    socket.on('edit-message',function(data){if(!users[socket.id]||!data||!data.msgId||!data.newText)return;var r=users[socket.id].currentRoom;if(!r||!rooms[r])return;var nt=filterBW(sanitize(data.newText).substring(0,LIM.msgLen));if(!nt)return;for(var i=0;i<rooms[r].messages.length;i++){var m=rooms[r].messages[i];if(m.id===data.msgId&&m.username===users[socket.id].name){var ts=parseInt(m.id.split('_')[0]);if(Date.now()-ts>300000){socket.emit('msg-error','5dk gecti!');return}m.message=nt;m.edited=true;m.editedAt=getTime();hasUnsaved=true;io2.to('room_'+r).emit('message-edited',{msgId:m.id,newText:nt,editedAt:m.editedAt});return}}});
    socket.on('pin-message',function(data){if(!users[socket.id]||!data||!data.msgId)return;var role=getRole(users[socket.id].name);if(role!=='host'&&role!=='mod')return;var r=users[socket.id].currentRoom;if(!r)return;if(!pins[r])pins[r]=[];var tm=null;for(var i=0;i<rooms[r].messages.length;i++)if(rooms[r].messages[i].id===data.msgId){tm=rooms[r].messages[i];break}if(!tm)return;for(var j=0;j<pins[r].length;j++)if(pins[r][j].id===data.msgId){pins[r].splice(j,1);hasUnsaved=true;io2.to('room_'+r).emit('pin-update',{pins:pins[r]});return}pins[r].push({id:tm.id,username:tm.username,message:tm.message||'['+tm.type+']',pinnedBy:users[socket.id].name,pinnedAt:getTime()});if(pins[r].length>20)pins[r]=pins[r].slice(-20);hasUnsaved=true;io2.to('room_'+r).emit('pin-update',{pins:pins[r]})});
    socket.on('search-messages',function(data){if(!users[socket.id]||!data||!data.query)return;var r=users[socket.id].currentRoom;if(!r||!rooms[r])return;var q=sanitize(data.query).toLowerCase();var res2=[];for(var i=0;i<rooms[r].messages.length;i++){var m=rooms[r].messages[i];if((m.message&&m.message.toLowerCase().indexOf(q)!==-1)||(m.username&&m.username.toLowerCase().indexOf(q)!==-1))res2.push(m)}socket.emit('search-results',{query:data.query,results:res2.slice(-50)})});

    // DM
    socket.on('get-dm-list',function(){if(users[socket.id])socket.emit('dm-list',getDML(uid))});
    socket.on('open-dm',function(data){if(!users[socket.id]||!data||!data.uid)return;markDMR(uid,data.uid);socket.emit('dm-opened',{withUid:data.uid,withName:identities[data.uid]?identities[data.uid].name:'?',messages:loadDM(uid,data.uid).slice(-200),online:!!Object.values(users).find(function(u){return u.uid===data.uid})});socket.emit('dm-list',getDML(uid))});
    socket.on('send-dm',function(data){if(!users[socket.id]||!data||!data.toUid||!isValid(data.message,1,LIM.msgLen))return;var toUid=data.toUid;if(!identities[toUid]||isMuted(uid).muted)return;var mt=filterBW(sanitize(data.message).substring(0,LIM.msgLen));var msg={id:Date.now()+'_'+rand(),from:uid,fromName:users[socket.id].name,to:toUid,toName:identities[toUid].name,message:mt,time:getTime(),date:new Date().toLocaleDateString('tr-TR')};var msgs=loadDM(uid,toUid);msgs.push(msg);if(msgs.length>500)msgs=msgs.slice(-500);saveDM(uid,toUid,msgs);updateDMI(uid,users[socket.id].name,toUid,identities[toUid].name,mt,getTime());socket.emit('dm-new-msg',msg);socket.emit('dm-list',getDML(uid));for(var sid in users)if(users[sid].uid===toUid){io2.to(sid).emit('dm-new-msg',msg);io2.to(sid).emit('dm-list',getDML(toUid));io2.to(sid).emit('dm-notification',{from:users[socket.id].name,message:mt.substring(0,50)});break}});
    socket.on('mark-dm-read',function(data){if(!users[socket.id]||!data||!data.uid)return;markDMR(uid,data.uid);socket.emit('dm-list',getDML(uid))});
    socket.on('send-dm-media',function(data){if(!users[socket.id]||!data||!data.toUid||!data.file)return;try{var b64=data.file.replace(/^data:[^;]+;base64,/,''),buf=Buffer.from(b64,'base64'),sz=buf.length/1048576;if(sz>LIM.fileSize)return;var mt2='image',ext='jpg',ft=sanitize(data.fileType||'');if(ft.indexOf('png')!==-1)ext='png';else if(ft.indexOf('gif')!==-1)ext='gif';else if(ft.indexOf('mp4')!==-1){ext='mp4';mt2='video'}else if(ft.indexOf('webm')!==-1){ext='webm';mt2='video'}var fn=mt2+'_'+Date.now()+'_'+rand()+'.'+ext;fs.writeFileSync(path.join(MD,fn),buf);var msg={id:Date.now()+'_'+rand(),from:uid,fromName:users[socket.id].name,to:data.toUid,toName:identities[data.toUid]?identities[data.toUid].name:'?',type:mt2,mediaFile:fn,fileSize:sz.toFixed(1)+'MB',message:null,time:getTime(),date:new Date().toLocaleDateString('tr-TR')};var msgs=loadDM(uid,data.toUid);msgs.push(msg);if(msgs.length>500)msgs=msgs.slice(-500);saveDM(uid,data.toUid,msgs);updateDMI(uid,users[socket.id].name,data.toUid,identities[data.toUid].name,'[MEDYA]',getTime());socket.emit('dm-new-msg',msg);socket.emit('dm-list',getDML(uid));for(var sid in users)if(users[sid].uid===data.toUid){io2.to(sid).emit('dm-new-msg',msg);io2.to(sid).emit('dm-list',getDML(data.toUid));break}}catch(e){}});
    socket.on('send-dm-file',function(data){if(!users[socket.id]||!data||!data.toUid||!data.file)return;try{var b64=data.file.replace(/^data:[^;]+;base64,/,''),buf=Buffer.from(b64,'base64'),sz=buf.length/1048576;if(sz>LIM.fileSize)return;var on2=sanitize(data.fileName||'dosya').substring(0,200);var ext=path.extname(on2).replace(/[^a-zA-Z0-9.]/g,'')||'.bin';var sn='file_'+Date.now()+'_'+rand()+ext;fs.writeFileSync(path.join(FD,sn),buf);var msg={id:Date.now()+'_'+rand(),from:uid,fromName:users[socket.id].name,to:data.toUid,toName:identities[data.toUid]?identities[data.toUid].name:'?',type:'file',fileName:on2,savedFile:sn,fileSize:sz<1?(buf.length/1024).toFixed(0)+'KB':sz.toFixed(1)+'MB',message:null,time:getTime(),date:new Date().toLocaleDateString('tr-TR')};var msgs=loadDM(uid,data.toUid);msgs.push(msg);if(msgs.length>500)msgs=msgs.slice(-500);saveDM(uid,data.toUid,msgs);updateDMI(uid,users[socket.id].name,data.toUid,identities[data.toUid].name,'[DOSYA]',getTime());socket.emit('dm-new-msg',msg);socket.emit('dm-list',getDML(uid));for(var sid in users)if(users[sid].uid===data.toUid){io2.to(sid).emit('dm-new-msg',msg);io2.to(sid).emit('dm-list',getDML(data.toUid));break}}catch(e){}});

    // MEDYA & DOSYA
    socket.on('send-media',function(data){if(!users[socket.id]||!flood()||isMuted(uid).muted)return;var r=users[socket.id].currentRoom;if(!r||!rooms[r]||!data||!data.file)return;try{var b64=data.file.replace(/^data:[^;]+;base64,/,''),buf=Buffer.from(b64,'base64'),sz=buf.length/1048576;if(sz>LIM.fileSize){socket.emit('msg-error','Max '+LIM.fileSize+'MB!');return}var mt3='image',ext='jpg',ft=sanitize(data.fileType||'');if(ft.indexOf('png')!==-1)ext='png';else if(ft.indexOf('gif')!==-1)ext='gif';else if(ft.indexOf('webp')!==-1)ext='webp';else if(ft.indexOf('mp4')!==-1){ext='mp4';mt3='video'}else if(ft.indexOf('webm')!==-1){ext='webm';mt3='video'}else if(ft.indexOf('mov')!==-1){ext='mov';mt3='video'}var fn=mt3+'_'+Date.now()+'_'+rand()+'.'+ext;fs.writeFileSync(path.join(MD,fn),buf);var msg={id:Date.now()+'_'+rand(),type:mt3,username:users[socket.id].name,role:getRole(users[socket.id].name),mediaFile:fn,mediaType:ft,fileSize:sz.toFixed(1)+'MB',time:getTime(),date:new Date().toLocaleDateString('tr-TR'),readBy:[users[socket.id].name],uid:uid,ip:cIP,replyTo:data.replyTo||null};rooms[r].messages.push(msg);hasUnsaved=true;logIDMsg(uid,users[socket.id].name,r,msg);io2.to('room_'+r).emit('new-message',msg)}catch(e){socket.emit('msg-error','Hata!')}});
    socket.on('send-file',function(data){if(!users[socket.id]||!flood()||isMuted(uid).muted)return;var r=users[socket.id].currentRoom;if(!r||!rooms[r]||!data||!data.file)return;try{var b64=data.file.replace(/^data:[^;]+;base64,/,''),buf=Buffer.from(b64,'base64'),sz=buf.length/1048576;if(sz>LIM.fileSize){socket.emit('msg-error','Max '+LIM.fileSize+'MB!');return}var on3=sanitize(data.fileName||'dosya').substring(0,200);var ext=path.extname(on3).replace(/[^a-zA-Z0-9.]/g,'')||'.bin';var sn='file_'+Date.now()+'_'+rand()+ext;fs.writeFileSync(path.join(FD,sn),buf);var msg={id:Date.now()+'_'+rand(),type:'file',username:users[socket.id].name,role:getRole(users[socket.id].name),fileName:on3,savedFile:sn,fileSize:sz<1?(buf.length/1024).toFixed(0)+'KB':sz.toFixed(1)+'MB',time:getTime(),date:new Date().toLocaleDateString('tr-TR'),readBy:[users[socket.id].name],uid:uid,ip:cIP,replyTo:data.replyTo||null};rooms[r].messages.push(msg);hasUnsaved=true;logIDMsg(uid,users[socket.id].name,r,msg);io2.to('room_'+r).emit('new-message',msg)}catch(e){socket.emit('msg-error','Hata!')}});

    socket.on('mark-read',function(ids){if(!users[socket.id])return;var r=users[socket.id].currentRoom;if(!r||!rooms[r]||!Array.isArray(ids))return;var n=users[socket.id].name,u=[];for(var i=0;i<rooms[r].messages.length;i++){var m=rooms[r].messages[i];if(ids.indexOf(m.id)!==-1){if(!m.readBy)m.readBy=[];if(m.readBy.indexOf(n)===-1){m.readBy.push(n);u.push({id:m.id,readBy:m.readBy})}}}if(u.length>0){hasUnsaved=true;io2.to('room_'+r).emit('read-update',u)}});

    // SIKAYET (web - ban yok)
    socket.on('report-message',function(data){if(!users[socket.id]||!data||!data.msgId||!isValid(data.reason,1,300))return;var r=users[socket.id].currentRoom;if(!r||!rooms[r])return;var tm=null;for(var i=0;i<rooms[r].messages.length;i++)if(rooms[r].messages[i].id===data.msgId){tm=rooms[r].messages[i];break}if(!tm||tm.uid===serverUID||tm.uid===hostUID){socket.emit('msg-error','Yonetici sikayet edilemez!');return}reports.push({id:Date.now()+'_'+rand(),targetUser:tm.username,targetUID:tm.uid||'?',targetIP:tm.ip||'?',messageContent:tm.message||'['+tm.type+']',room:r,reason:sanitize(data.reason).substring(0,300),date:new Date().toLocaleString('tr-TR'),status:'beklemede'});forceSave();socket.emit('msg-success','Sikayet gonderildi.');if(hostSID)io2.to(hostSID).emit('new-report',{targetUser:tm.username})});
    socket.on('get-reports',function(){if(users[socket.id]&&users[socket.id].role==='host')socket.emit('reports-list',reports)});
    socket.on('dismiss-report',function(data){if(!users[socket.id]||users[socket.id].role!=='host'||!data||!data.reportId)return;for(var i=0;i<reports.length;i++)if(reports[i].id===data.reportId){reports[i].status='gormezden_gelindi';break}forceSave();socket.emit('reports-list',reports)});
    socket.on('delete-report',function(data){if(!users[socket.id]||users[socket.id].role!=='host'||!data||!data.reportId)return;reports=reports.filter(function(r){return r.id!==data.reportId});forceSave();socket.emit('reports-list',reports)});

    socket.on('get-audit',function(){if(users[socket.id]&&users[socket.id].role==='host')socket.emit('audit-log',auditLog.slice(-200))});
    socket.on('get-mods',function(){if(!users[socket.id]||users[socket.id].role!=='host')return;var ml=[];for(var o in identities)if(identities[o].role==='mod'&&identities[o].name){var on=false;for(var s in users)if(users[s].uid===o){on=true;break}ml.push({uid:o,name:identities[o].name,online:on,lastSeen:identities[o].lastSeen||'?'})}socket.emit('mods-list',ml)});
    socket.on('remove-mod-panel',function(data){if(!users[socket.id]||users[socket.id].role!=='host'||!data||!data.uid||!identities[data.uid])return;identities[data.uid].role='user';hasUnsaved=true;for(var s in users)if(users[s].uid===data.uid){users[s].role='user';io2.to(s).emit('role-changed',{role:'user'});break}io2.emit('users-update',getOnline());var ml=[];for(var o in identities)if(identities[o].role==='mod'&&identities[o].name){var on=false;for(var s2 in users)if(users[s2].uid===o){on=true;break}ml.push({uid:o,name:identities[o].name,online:on,lastSeen:identities[o].lastSeen||'?'})}socket.emit('mods-list',ml)});

    socket.on('create-room',function(data){if(!users[socket.id]||users[socket.id].role!=='host'||Object.keys(rooms).length>=LIM.maxRooms)return;if(!data||!isValid(data.name,1,30))return;var name=sanitize(data.name).substring(0,30);var id=name.toLowerCase().replace(/[^a-z0-9]/g,'_').replace(/_+/g,'_')||'oda_'+Date.now();if(rooms[id])return;rooms[id]={name:name,createdBy:users[socket.id].name,moderators:[],createdAt:new Date().toISOString(),password:(data.password&&sanitize(data.password).trim())||null,messages:[]};hasUnsaved=true;io2.emit('rooms-update',getRoomList());logAudit(users[socket.id].name,'create-room',name)});
    socket.on('delete-room',function(roomId){if(!users[socket.id]||users[socket.id].role!=='host')return;roomId=sanitize(String(roomId));if(roomId==='genel'||!rooms[roomId])return;for(var s in users)if(users[s].currentRoom===roomId){users[s].currentRoom=null;io2.to(s).emit('kicked-from-room','Silindi!')}delete rooms[roomId];try{fs.unlinkSync(getRF(roomId))}catch(e){}hasUnsaved=true;io2.emit('rooms-update',getRoomList())});
    socket.on('set-mod',function(data){if(!users[socket.id]||users[socket.id].role!=='host'||!data||!data.username)return;var tn=sanitize(data.username);for(var o in identities)if(identities[o].name===tn){identities[o].role='mod';break}hasUnsaved=true;for(var s in users)if(users[s].name===tn){users[s].role='mod';io2.to(s).emit('role-changed',{role:'mod'});break}io2.emit('users-update',getOnline());logAudit(users[socket.id].name,'set-mod',tn)});
    socket.on('remove-mod',function(data){if(!users[socket.id]||users[socket.id].role!=='host'||!data||!data.username)return;var tn=sanitize(data.username);for(var o in identities)if(identities[o].name===tn){identities[o].role='user';break}hasUnsaved=true;for(var s in users)if(users[s].name===tn){users[s].role='user';io2.to(s).emit('role-changed',{role:'user'});break}io2.emit('users-update',getOnline())});
    socket.on('delete-messages',function(data){if(!users[socket.id])return;var r=users[socket.id].currentRoom;if(!r||!rooms[r])return;var rl=getRole(users[socket.id].name);if(rl!=='host'&&rl!=='mod')return;if(!data||!Array.isArray(data.ids))return;var del=0;rooms[r].messages=rooms[r].messages.filter(function(m){if(data.ids.indexOf(m.id)!==-1){del++;return false}return true});if(del>0){hasUnsaved=true;io2.to('room_'+r).emit('messages-deleted',{ids:data.ids,by:users[socket.id].name,count:del})}});
    socket.on('clear-room',function(roomId){if(!users[socket.id]||users[socket.id].role!=='host')return;roomId=sanitize(String(roomId));if(!rooms[roomId])return;rooms[roomId].messages=[];hasUnsaved=true;saveRM(roomId);io2.to('room_'+roomId).emit('room-cleared',{by:users[socket.id].name,time:getTime()})});
    socket.on('manual-save',function(){if(!users[socket.id]||users[socket.id].role!=='host')return;try{saveAll();hasUnsaved=false;socket.emit('save-status',{success:true,time:getTime(),auto:false})}catch(e){}});

    socket.on('typing',function(){if(users[socket.id]){var r=users[socket.id].currentRoom;if(r)socket.to('room_'+r).emit('user-typing',users[socket.id].name)}});
    socket.on('stop-typing',function(){if(users[socket.id]){var r=users[socket.id].currentRoom;if(r)socket.to('room_'+r).emit('user-stop-typing',users[socket.id].name)}});

    socket.on('disconnect',function(){
        if(!users[socket.id])return;var name=users[socket.id].name,roomId=users[socket.id].currentRoom;
        if(identities[uid])identities[uid].lastSeen=new Date().toLocaleString('tr-TR');
        delete users[socket.id];
        if(socket.id===hostSID){hostSID=null;hostName=null;var hasMod=false;for(var s in users)if(users[s].role==='mod'){hasMod=true;break}if(!hasMod){var ids=Object.keys(users);if(ids.length>0){var rs=ids[Math.floor(Math.random()*ids.length)];users[rs].role='mod';if(identities[users[rs].uid])identities[users[rs].uid].role='mod';io2.to(rs).emit('role-changed',{role:'mod'});io2.emit('system-toast',{text:users[rs].name+' gecici mod',type:'info'})}}forceSave()}
        if(roomId&&rooms[roomId])io2.to('room_'+roomId).emit('room-user-left',{username:name,users:getRU(roomId),time:getTime()});
        io2.emit('users-update',getOnline());
    });
});

server.listen(PORT,'0.0.0.0',function(){var ip=getLocalIP();console.log('\n==========================================\n   YEREL SOHBET v8.3\n==========================================\n  http://localhost:'+PORT+'\n  http://'+ip+':'+PORT+'\n  Guc:'+POWER+'/100 | Ban=Admin Panel\n==========================================\n')});