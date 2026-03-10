var express = require('express');
var http = require('http');
var Server = require('socket.io').Server;
var os = require('os');
var path = require('path');
var fs = require('fs');

var app = express();
var server = http.createServer(app);
var io = new Server(server, { maxHttpBufferSize: 60 * 1024 * 1024 });

var PORT = 3000;
var DATA_DIR = path.join(__dirname, 'data');
var MEDIA_DIR = path.join(DATA_DIR, 'medya');
var FILES_DIR = path.join(DATA_DIR, 'dosyalar');
var ROOMS_FILE = path.join(DATA_DIR, 'odalar.json');
var USERS_FILE = path.join(DATA_DIR, 'kullanicilar.json');
var IP_FILE = path.join(DATA_DIR, 'ip_kayit.json');
var IP_MSGS_DIR = path.join(DATA_DIR, 'ip_mesajlar');
var REPORTS_FILE = path.join(DATA_DIR, 'sikayetler.json');
var BANS_FILE = path.join(DATA_DIR, 'banlar.json');

[DATA_DIR, MEDIA_DIR, FILES_DIR, IP_MSGS_DIR].forEach(function(d) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ==========================================
//  STATIK DOSYALAR & BAN MIDDLEWARE
// ==========================================
var bannedIPs = loadJSON(BANS_FILE, []);

app.use(function(req, res, next) {
    var ip = getReqIP(req);
    if (bannedIPs.indexOf(ip) !== -1) {
        return res.status(403).send('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Engellendi</title><style>body{background:#1a1a2e;color:#ff5252;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;margin:0}.box{padding:40px;border:2px solid #ff5252;border-radius:20px;background:rgba(255,82,82,.08)}</style></head><body><div class="box"><h1>&#128683; Erisim Engellendi</h1><p>IP adresiniz yonetici tarafindan engellenmistir.</p><p style="color:rgba(255,82,82,.5);font-size:.85em">IP: ' + ip + '</p></div></body></html>');
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/medya', express.static(MEDIA_DIR));

// Dosya indirme
app.get('/dosya/:file', function(req, res) {
    var filePath = path.join(FILES_DIR, req.params.file);
    if (!fs.existsSync(filePath)) return res.status(404).send('Bulunamadi');
    var origName = req.query.name || req.params.file;
    res.setHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent(origName) + '"');
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
});

// ==========================================
//  VERI YUKLE / KAYDET
// ==========================================
function loadJSON(fp, fb) {
    try { if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8')); }
    catch (e) { }
    return fb;
}

function saveJSON(fp, d) {
    try { fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8'); return true; }
    catch (e) { return false; }
}

function getRoomFile(id) { return path.join(DATA_DIR, 'oda_' + id + '.json'); }
function loadRoomMsgs(id) { return loadJSON(getRoomFile(id), []); }
function saveRoomMsgs(id) { if (rooms[id]) saveJSON(getRoomFile(id), rooms[id].messages); }

function saveAll() {
    var rd = {};
    for (var id in rooms) {
        rd[id] = {
            name: rooms[id].name, createdBy: rooms[id].createdBy,
            moderators: rooms[id].moderators, createdAt: rooms[id].createdAt,
            password: rooms[id].password || null
        };
        saveRoomMsgs(id);
    }
    saveJSON(ROOMS_FILE, rd);
    saveJSON(USERS_FILE, userRoles);
    saveJSON(IP_FILE, ipLog);
    saveJSON(REPORTS_FILE, reports);
    saveJSON(BANS_FILE, bannedIPs);
    console.log('Tum veriler kaydedildi.');
}

// ==========================================
//  IP BAZLI MESAJ KAYDI
// ==========================================
function logIPMessage(ip, username, roomId, msg) {
    var safeIP = ip.replace(/[^a-zA-Z0-9._-]/g, '_');
    var logFile = path.join(IP_MSGS_DIR, safeIP + '.json');
    var logs = loadJSON(logFile, []);

    logs.push({
        username: username,
        room: roomId,
        message: msg.message || (msg.type === 'image' ? '[FOTO]' : msg.type === 'file' ? '[DOSYA: ' + (msg.fileName || '') + ']' : '[MESAJ]'),
        type: msg.type || 'text',
        time: msg.time,
        date: msg.date,
        id: msg.id
    });

    // Max 5000 kayit tut
    if (logs.length > 5000) logs = logs.slice(-5000);
    saveJSON(logFile, logs);
}

// ==========================================
//  DEGISKENLER
// ==========================================
var users = {};
var userRoles = loadJSON(USERS_FILE, {});
var ipLog = loadJSON(IP_FILE, {});
var reports = loadJSON(REPORTS_FILE, []);
var rooms = {};
var hostSocketId = null;
var hostUsername = null;
var hasUnsaved = false;

var savedRooms = loadJSON(ROOMS_FILE, null);
if (savedRooms && Object.keys(savedRooms).length > 0) {
    for (var rid in savedRooms) {
        rooms[rid] = {
            name: savedRooms[rid].name, createdBy: savedRooms[rid].createdBy,
            moderators: savedRooms[rid].moderators || [],
            createdAt: savedRooms[rid].createdAt,
            password: savedRooms[rid].password || null,
            messages: loadRoomMsgs(rid)
        };
    }
    console.log(Object.keys(rooms).length + ' oda yuklendi.');
} else {
    rooms['genel'] = {
        name: 'Genel', createdBy: 'Sistem', moderators: [],
        createdAt: new Date().toISOString(), password: null, messages: loadRoomMsgs('genel')
    };
}

function getClientIP(socket) {
    var ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '';
    return ip.replace('::ffff:', '').replace('::1', '127.0.0.1') || 'bilinmiyor';
}

function getReqIP(req) {
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
    return ip.replace('::ffff:', '').replace('::1', '127.0.0.1') || 'bilinmiyor';
}

// Otomatik kayit 3dk
setInterval(function() {
    if (hasUnsaved) {
        saveAll(); hasUnsaved = false;
        if (hostSocketId) io.to(hostSocketId).emit('save-status', { success: true, time: getTime(), auto: true });
    }
}, 3 * 60 * 1000);

// ==========================================
//  SOCKET
// ==========================================
io.on('connection', function(socket) {
    var clientIP = getClientIP(socket);

    // Ban kontrolu
    if (bannedIPs.indexOf(clientIP) !== -1) {
        socket.emit('banned', 'IP adresiniz engellenmistir.');
        socket.disconnect(true);
        return;
    }

    console.log('Baglanti: ' + socket.id + ' IP: ' + clientIP);

    // ---- KATILMA ----
    socket.on('join', function(username) {
        if (!username || typeof username !== 'string' || username.trim() === '') {
            socket.emit('join-error', 'Isim bos olamaz!'); return;
        }
        var name = username.trim().substring(0, 20);
        if (name.replace(/\s/g, '').length === 0) { socket.emit('join-error', 'Gecersiz isim!'); return; }
        for (var sid in users) {
            if (users[sid].name === name) { socket.emit('join-error', 'Bu isim kullaniliyor!'); return; }
        }

        var role = 'user';
        if (!hostSocketId) {
            hostSocketId = socket.id; hostUsername = name; role = 'host'; userRoles[name] = 'host';
        } else if (userRoles[name] === 'mod') { role = 'mod'; }
        else if (userRoles[name] === 'host') { role = 'mod'; userRoles[name] = 'mod'; }

        users[socket.id] = { name: name, role: role, currentRoom: null, ip: clientIP };

        // IP log
        if (!ipLog[name]) ipLog[name] = [];
        ipLog[name].push({ ip: clientIP, date: new Date().toLocaleString('tr-TR'), socketId: socket.id });
        if (ipLog[name].length > 50) ipLog[name] = ipLog[name].slice(-50);
        hasUnsaved = true;

        socket.emit('join-success', {
            username: name, role: role, rooms: getRoomList(), onlineUsers: getOnlineUsers()
        });
        io.emit('users-update', getOnlineUsers());
    });

    // ---- ODAYA GIR ----
    socket.on('join-room', function(data) {
        if (!users[socket.id]) return;
        var roomId, password;
        if (typeof data === 'string') { roomId = data; password = null; }
        else { roomId = data.roomId; password = data.password || null; }

        if (!rooms[roomId]) { socket.emit('msg-error', 'Oda bulunamadi!'); return; }

        if (rooms[roomId].password && users[socket.id].role === 'user') {
            if (password !== rooms[roomId].password) {
                socket.emit('need-password', { roomId: roomId, roomName: rooms[roomId].name });
                return;
            }
        }

        var oldRoom = users[socket.id].currentRoom;
        if (oldRoom) {
            socket.leave('room_' + oldRoom);
            io.to('room_' + oldRoom).emit('room-user-left', {
                username: users[socket.id].name, users: getRoomUsers(oldRoom), time: getTime()
            });
        }

        users[socket.id].currentRoom = roomId;
        socket.join('room_' + roomId);

        socket.emit('room-joined', {
            roomId: roomId, roomName: rooms[roomId].name,
            messages: rooms[roomId].messages, users: getRoomUsers(roomId),
            myRole: getUserRole(users[socket.id].name, roomId),
            hasPassword: !!rooms[roomId].password
        });

        io.to('room_' + roomId).emit('room-user-joined', {
            username: users[socket.id].name, users: getRoomUsers(roomId), time: getTime()
        });
        markRead(roomId, users[socket.id].name);
    });

    // ---- TEXT MESAJ ----
    socket.on('send-message', function(data) {
        if (!users[socket.id]) return;
        var roomId = users[socket.id].currentRoom;
        if (!roomId || !rooms[roomId]) { socket.emit('msg-error', 'Oda secin!'); return; }
        if (!data || !data.message || data.message.trim() === '') { socket.emit('msg-error', 'Bos mesaj!'); return; }

        var msg = {
            id: Date.now() + '_' + rand(), type: 'text',
            username: users[socket.id].name,
            role: getUserRole(users[socket.id].name, roomId),
            message: data.message.trim().substring(0, 2000),
            time: getTime(), date: new Date().toLocaleDateString('tr-TR'),
            readBy: [users[socket.id].name],
            ip: clientIP
        };

        rooms[roomId].messages.push(msg);
        hasUnsaved = true;
        logIPMessage(clientIP, users[socket.id].name, roomId, msg);
        io.to('room_' + roomId).emit('new-message', msg);
    });

    // ---- FOTO/VIDEO GONDER ----
    socket.on('send-media', function(data) {
        if (!users[socket.id]) return;
        var roomId = users[socket.id].currentRoom;
        if (!roomId || !rooms[roomId]) return;
        if (!data || !data.file) return;

        var b64 = data.file.replace(/^data:[^;]+;base64,/, '');
        var buf = Buffer.from(b64, 'base64');
        var sizeMB = buf.length / (1024 * 1024);

        if (sizeMB > 30) { socket.emit('msg-error', 'Max 30MB! (' + sizeMB.toFixed(1) + 'MB)'); return; }

        try {
            var mediaType = 'image'; var ext = 'jpg';
            var ft = data.fileType || '';

            if (ft.indexOf('png') !== -1) ext = 'png';
            else if (ft.indexOf('gif') !== -1) ext = 'gif';
            else if (ft.indexOf('webp') !== -1) ext = 'webp';
            else if (ft.indexOf('mp4') !== -1) { ext = 'mp4'; mediaType = 'video'; }
            else if (ft.indexOf('webm') !== -1) { ext = 'webm'; mediaType = 'video'; }
            else if (ft.indexOf('mov') !== -1) { ext = 'mov'; mediaType = 'video'; }

            var fn = mediaType + '_' + Date.now() + '_' + rand() + '.' + ext;
            fs.writeFileSync(path.join(MEDIA_DIR, fn), buf);

            var msg = {
                id: Date.now() + '_' + rand(), type: mediaType,
                username: users[socket.id].name,
                role: getUserRole(users[socket.id].name, roomId),
                mediaFile: fn, mediaType: ft, fileSize: sizeMB.toFixed(1) + 'MB',
                time: getTime(), date: new Date().toLocaleDateString('tr-TR'),
                readBy: [users[socket.id].name], ip: clientIP
            };

            rooms[roomId].messages.push(msg);
            hasUnsaved = true;
            logIPMessage(clientIP, users[socket.id].name, roomId, msg);
            io.to('room_' + roomId).emit('new-message', msg);
        } catch (e) { socket.emit('msg-error', 'Dosya gonderilemedi!'); }
    });

    // ---- DOSYA GONDER ----
    socket.on('send-file', function(data) {
        if (!users[socket.id]) return;
        var roomId = users[socket.id].currentRoom;
        if (!roomId || !rooms[roomId]) return;
        if (!data || !data.file) return;

        var b64 = data.file.replace(/^data:[^;]+;base64,/, '');
        var buf = Buffer.from(b64, 'base64');
        var sizeMB = buf.length / (1024 * 1024);

        if (sizeMB > 30) { socket.emit('msg-error', 'Max 30MB! (' + sizeMB.toFixed(1) + 'MB)'); return; }

        try {
            var origName = data.fileName || 'dosya';
            var ext = path.extname(origName) || '.bin';
            var safeName = 'file_' + Date.now() + '_' + rand() + ext;
            fs.writeFileSync(path.join(FILES_DIR, safeName), buf);

            var msg = {
                id: Date.now() + '_' + rand(), type: 'file',
                username: users[socket.id].name,
                role: getUserRole(users[socket.id].name, roomId),
                fileName: origName, savedFile: safeName,
                fileSize: sizeMB < 1 ? (buf.length / 1024).toFixed(0) + 'KB' : sizeMB.toFixed(1) + 'MB',
                time: getTime(), date: new Date().toLocaleDateString('tr-TR'),
                readBy: [users[socket.id].name], ip: clientIP
            };

            rooms[roomId].messages.push(msg);
            hasUnsaved = true;
            logIPMessage(clientIP, users[socket.id].name, roomId, msg);
            io.to('room_' + roomId).emit('new-message', msg);
        } catch (e) { socket.emit('msg-error', 'Dosya gonderilemedi!'); }
    });

    // ---- OKUNDU ----
    socket.on('mark-read', function(ids) {
        if (!users[socket.id]) return;
        var roomId = users[socket.id].currentRoom;
        if (!roomId || !rooms[roomId] || !Array.isArray(ids)) return;
        var name = users[socket.id].name;
        var upd = [];
        for (var i = 0; i < rooms[roomId].messages.length; i++) {
            var m = rooms[roomId].messages[i];
            if (ids.indexOf(m.id) !== -1) {
                if (!m.readBy) m.readBy = [];
                if (m.readBy.indexOf(name) === -1) { m.readBy.push(name); upd.push({ id: m.id, readBy: m.readBy }); }
            }
        }
        if (upd.length > 0) { hasUnsaved = true; io.to('room_' + roomId).emit('read-update', upd); }
    });

    // ---- SIKAYET ----
    socket.on('report-message', function(data) {
        if (!users[socket.id]) return;
        if (!data || !data.msgId || !data.reason) { socket.emit('msg-error', 'Sikayet bilgisi eksik!'); return; }

        var roomId = users[socket.id].currentRoom;
        if (!roomId || !rooms[roomId]) return;

        // Mesaji bul
        var targetMsg = null;
        for (var i = 0; i < rooms[roomId].messages.length; i++) {
            if (rooms[roomId].messages[i].id === data.msgId) {
                targetMsg = rooms[roomId].messages[i]; break;
            }
        }

        if (!targetMsg) { socket.emit('msg-error', 'Mesaj bulunamadi!'); return; }

        var report = {
            id: Date.now() + '_' + rand(),
            reportedBy: users[socket.id].name,
            reporterIP: clientIP,
            targetUser: targetMsg.username,
            targetIP: targetMsg.ip || 'bilinmiyor',
            messageId: targetMsg.id,
            messageContent: targetMsg.message || (targetMsg.type === 'image' ? '[FOTO]' : targetMsg.type === 'file' ? '[DOSYA]' : '[MEDYA]'),
            messageType: targetMsg.type,
            room: roomId,
            reason: data.reason.trim().substring(0, 300),
            date: new Date().toLocaleString('tr-TR'),
            status: 'beklemede'
        };

        reports.push(report);
        hasUnsaved = true;

        socket.emit('msg-success', 'Sikayet gonderildi. Yonetici inceleyecek.');

        // Hosta bildir
        if (hostSocketId) {
            io.to(hostSocketId).emit('new-report', report);
        }
    });

    // ---- HOST: SIKAYETLERI GOR ----
    socket.on('get-reports', function() {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        socket.emit('reports-list', reports);
    });

    // ---- HOST: SIKAYET ISLEM ----
    socket.on('resolve-report', function(data) {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        if (!data || !data.reportId) return;

        for (var i = 0; i < reports.length; i++) {
            if (reports[i].id === data.reportId) {
                reports[i].status = data.action || 'incelendi';
                reports[i].resolvedBy = users[socket.id].name;
                reports[i].resolvedDate = new Date().toLocaleString('tr-TR');
                break;
            }
        }
        hasUnsaved = true;
        socket.emit('reports-list', reports);
    });

    // ---- HOST: IP BAN ----
    socket.on('ban-ip', function(data) {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        if (!data || !data.ip) return;

        var targetIP = data.ip.trim();
        if (bannedIPs.indexOf(targetIP) === -1) {
            bannedIPs.push(targetIP);
            hasUnsaved = true;

            // Bu IP'deki online kullanicilari at
            for (var sid in users) {
                if (users[sid].ip === targetIP) {
                    io.to(sid).emit('banned', 'IP adresiniz engellenmistir.');
                    var s = io.sockets.sockets.get(sid);
                    if (s) s.disconnect(true);
                }
            }

            socket.emit('msg-success', targetIP + ' engellendi!');
            socket.emit('ban-list', bannedIPs);
        }
    });

    // ---- HOST: IP UNBAN ----
    socket.on('unban-ip', function(data) {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        if (!data || !data.ip) return;

        var idx = bannedIPs.indexOf(data.ip);
        if (idx !== -1) {
            bannedIPs.splice(idx, 1);
            hasUnsaved = true;
            socket.emit('msg-success', data.ip + ' engeli kaldirildi!');
            socket.emit('ban-list', bannedIPs);
        }
    });

    // ---- HOST: BAN LISTESI ----
    socket.on('get-bans', function() {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        socket.emit('ban-list', bannedIPs);
    });

    // ---- HOST: IP MESAJLARI ----
    socket.on('get-ip-logs', function(data) {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        if (!data || !data.ip) return;

        var safeIP = data.ip.replace(/[^a-zA-Z0-9._-]/g, '_');
        var logFile = path.join(IP_MSGS_DIR, safeIP + '.json');
        var logs = loadJSON(logFile, []);
        socket.emit('ip-logs', { ip: data.ip, logs: logs });
    });

    // ---- ODA OLUSTUR ----
    socket.on('create-room', function(data) {
        if (!users[socket.id] || users[socket.id].role !== 'host') { socket.emit('msg-error', 'Sadece yonetici!'); return; }
        if (!data || !data.name || data.name.trim() === '') { socket.emit('msg-error', 'Oda adi bos!'); return; }

        var name = data.name.trim().substring(0, 30);
        var id = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        if (!id) id = 'oda_' + Date.now();
        if (rooms[id]) { socket.emit('msg-error', 'Bu oda var!'); return; }

        rooms[id] = {
            name: name, createdBy: users[socket.id].name, moderators: [],
            createdAt: new Date().toISOString(),
            password: (data.password && data.password.trim()) || null,
            messages: []
        };
        hasUnsaved = true;
        io.emit('rooms-update', getRoomList());
        socket.emit('msg-success', '"' + name + '" olusturuldu!' + (rooms[id].password ? ' (Sifreli)' : ''));
    });

    // ---- ODA SIL ----
    socket.on('delete-room', function(roomId) {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        if (roomId === 'genel') { socket.emit('msg-error', 'Genel silinemez!'); return; }
        if (!rooms[roomId]) return;

        for (var sid in users) {
            if (users[sid].currentRoom === roomId) {
                users[sid].currentRoom = null;
                io.to(sid).emit('kicked-from-room', 'Oda silindi!');
            }
        }
        saveJSON(path.join(DATA_DIR, 'oda_' + roomId + '_yedek_' + Date.now() + '.json'), rooms[roomId].messages);
        delete rooms[roomId];
        var rf = getRoomFile(roomId);
        if (fs.existsSync(rf)) fs.unlinkSync(rf);
        hasUnsaved = true;
        io.emit('rooms-update', getRoomList());
    });

    // ---- MOD ----
    socket.on('set-mod', function(data) {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        if (!data || !data.username) return;
        userRoles[data.username] = 'mod'; hasUnsaved = true;
        for (var sid in users) {
            if (users[sid].name === data.username) {
                users[sid].role = 'mod'; io.to(sid).emit('role-changed', { role: 'mod' }); break;
            }
        }
        io.emit('users-update', getOnlineUsers());
        socket.emit('msg-success', data.username + ' mod yapildi!');
    });

    socket.on('remove-mod', function(data) {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        if (!data || !data.username) return;
        userRoles[data.username] = 'user'; hasUnsaved = true;
        for (var sid in users) {
            if (users[sid].name === data.username) {
                users[sid].role = 'user'; io.to(sid).emit('role-changed', { role: 'user' }); break;
            }
        }
        io.emit('users-update', getOnlineUsers());
    });

    // ---- MESAJ SIL ----
    socket.on('delete-messages', function(data) {
        if (!users[socket.id]) return;
        var roomId = users[socket.id].currentRoom;
        if (!roomId || !rooms[roomId]) return;
        var role = getUserRole(users[socket.id].name, roomId);
        if (role !== 'host' && role !== 'mod') return;
        if (!data || !Array.isArray(data.ids)) return;

        var del = 0;
        rooms[roomId].messages = rooms[roomId].messages.filter(function(m) {
            if (data.ids.indexOf(m.id) !== -1) { del++; return false; }
            return true;
        });
        if (del > 0) {
            hasUnsaved = true;
            io.to('room_' + roomId).emit('messages-deleted', { ids: data.ids, by: users[socket.id].name, count: del, time: getTime() });
        }
    });

    // ---- ODA SIFIRLA ----
    socket.on('clear-room', function(roomId) {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        if (!rooms[roomId]) return;
        saveJSON(path.join(DATA_DIR, 'oda_' + roomId + '_yedek_' + Date.now() + '.json'), rooms[roomId].messages);
        rooms[roomId].messages = []; hasUnsaved = true; saveRoomMsgs(roomId);
        io.to('room_' + roomId).emit('room-cleared', { by: users[socket.id].name, time: getTime() });
    });

    // ---- KAYDET ----
    socket.on('manual-save', function() {
        if (!users[socket.id] || users[socket.id].role !== 'host') return;
        saveAll(); hasUnsaved = false;
        socket.emit('save-status', { success: true, time: getTime(), auto: false });
    });

    // ---- YAZIYOR ----
    socket.on('typing', function() {
        if (!users[socket.id]) return;
        var r = users[socket.id].currentRoom;
        if (r) socket.to('room_' + r).emit('user-typing', users[socket.id].name);
    });
    socket.on('stop-typing', function() {
        if (!users[socket.id]) return;
        var r = users[socket.id].currentRoom;
        if (r) socket.to('room_' + r).emit('user-stop-typing', users[socket.id].name);
    });

    // ---- KOPMA ----
    socket.on('disconnect', function() {
        if (!users[socket.id]) return;
        var name = users[socket.id].name;
        var roomId = users[socket.id].currentRoom;
        delete users[socket.id];

        if (socket.id === hostSocketId) {
            var ids = Object.keys(users);
            if (ids.length > 0) {
                hostSocketId = ids[0]; hostUsername = users[ids[0]].name;
                users[ids[0]].role = 'host'; userRoles[hostUsername] = 'host';
                io.to(ids[0]).emit('role-changed', { role: 'host' });
                io.emit('system-toast', { text: hostUsername + ' yeni yonetici', type: 'info' });
            } else {
                hostSocketId = null; hostUsername = null;
                if (hasUnsaved) { saveAll(); hasUnsaved = false; }
            }
        }

        if (roomId && rooms[roomId]) {
            io.to('room_' + roomId).emit('room-user-left', {
                username: name, users: getRoomUsers(roomId), time: getTime()
            });
        }
        io.emit('users-update', getOnlineUsers());
    });
});

// ==========================================
//  YARDIMCILAR
// ==========================================
function getOnlineUsers() {
    var l = [];
    for (var s in users) l.push({ name: users[s].name, role: users[s].role, currentRoom: users[s].currentRoom, ip: users[s].ip });
    return l;
}

function getRoomList() {
    var l = [];
    for (var id in rooms) {
        l.push({ id: id, name: rooms[id].name, createdBy: rooms[id].createdBy, userCount: getRoomUsers(id).length, messageCount: rooms[id].messages.length, hasPassword: !!rooms[id].password });
    }
    return l;
}

function getRoomUsers(rid) {
    var l = [];
    for (var s in users) {
        if (users[s].currentRoom === rid) l.push({ name: users[s].name, role: getUserRole(users[s].name, rid) });
    }
    return l;
}

function getUserRole(name, rid) {
    if (name === hostUsername) return 'host';
    if (userRoles[name] === 'mod') return 'mod';
    if (rooms[rid] && rooms[rid].moderators.indexOf(name) !== -1) return 'mod';
    return 'user';
}

function markRead(rid, name) {
    if (!rooms[rid]) return;
    for (var i = 0; i < rooms[rid].messages.length; i++) {
        var m = rooms[rid].messages[i];
        if (!m.readBy) m.readBy = [];
        if (m.readBy.indexOf(name) === -1) m.readBy.push(name);
    }
    hasUnsaved = true;
}

function getLocalIP() {
    var ifaces = os.networkInterfaces();
    for (var n of Object.keys(ifaces)) { for (var i of ifaces[n]) { if (i.family === 'IPv4' && !i.internal) return i.address; } }
    return 'localhost';
}

function getTime() { return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
function rand() { return Math.random().toString(36).substr(2, 6); }

process.on('SIGINT', function() { saveAll(); process.exit(); });

server.listen(PORT, '0.0.0.0', function() {
    var ip = getLocalIP();
    console.log('\n==========================================');
    console.log('   YEREL SOHBET v5.0');
    console.log('==========================================');
    console.log('  Bu PC     : http://localhost:' + PORT);
    console.log('  Agdakiler : http://' + ip + ':' + PORT);
    console.log('  Banli IP  : ' + bannedIPs.length);
    console.log('  Sikayetler: ' + reports.length);
    console.log('==========================================\n');
});