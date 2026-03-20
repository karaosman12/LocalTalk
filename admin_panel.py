import requests
import time
import os
import sys
import json
from datetime import datetime

CHAT_URL = "http://localhost:3000"
REFRESH_RATE = 5

def clear():
    os.system('cls' if os.name == 'nt' else 'clear')

def get(endpoint):
    try:
        r = requests.get(CHAT_URL + endpoint, timeout=5)
        if r.status_code == 200:
            return r.json()
        return None
    except:
        return None

def post(endpoint, data=None):
    try:
        if data:
            r = requests.post(CHAT_URL + endpoint, json=data, timeout=5)
        else:
            r = requests.post(CHAT_URL + endpoint, timeout=5)
        return r.json() if r.status_code == 200 else None
    except:
        return None

def colored(text, color):
    colors = {
        'red': '\033[91m', 'green': '\033[92m', 'yellow': '\033[93m',
        'blue': '\033[94m', 'purple': '\033[95m', 'cyan': '\033[96m',
        'white': '\033[97m', 'gray': '\033[90m', 'bold': '\033[1m',
        'reset': '\033[0m'
    }
    return colors.get(color, '') + str(text) + colors['reset']

def header(title):
    print(colored('=' * 64, 'cyan'))
    print(colored('  ' + title, 'bold'))
    print(colored('=' * 64, 'cyan'))

def divider(title=""):
    if title:
        print(colored('\n-- ' + title + ' --', 'yellow'))

def truncate(text, length):
    text = str(text)
    return text[:length-3] + '...' if len(text) > length else text


# ==========================================
#  DASHBOARD
# ==========================================
def show_dashboard():
    clear()
    header('YEREL SOHBET v8.3 - ADMIN PANELI')
    print(colored('  ' + datetime.now().strftime("%H:%M:%S"), 'gray'))

    status = get('/api/status')
    if status is None:
        print(colored('\n  SUNUCU YOK!', 'red'))
        return

    divider('SUNUCU')
    for k, v, c in [('Online', str(status.get('online', 0)) + ' kisi', 'green'), ('RAM', str(status.get('ram', '?')), 'yellow'), ('Banlar', str(status.get('bans', 0)) + ' kalici / ' + str(status.get('tempBans', 0)) + ' sureli', 'red'), ('Sikayetler', str(status.get('reports', 0)), 'purple')]:
        print('  ' + k.ljust(16) + colored(v, c))

    users_data = get('/api/admin/users')
    if users_data is not None:
        online = [u for u in users_data if u.get('online')]
        if online:
            divider('ONLINE (' + str(len(online)) + ')')
            for u in online:
                role = u.get('role', 'user')
                rc = 'yellow' if role == 'host' else 'blue' if role == 'mod' else 'white'
                ip = (u.get('ips') or ['?'])[-1]
                print('  ' + truncate(u.get('name', '?'), 14).ljust(14) + ' ' + colored(role.ljust(6), rc) + ' ' + colored(truncate(u.get('uidShort', '?'), 14), 'gray') + ' ' + truncate(ip, 16))

    reports_data = get('/api/admin/reports')
    if reports_data is not None:
        pending = [r for r in reports_data if r.get('status') == 'beklemede']
        if pending:
            divider('BEKLEYEN SIKAYETLER (' + str(len(pending)) + ')')
            for r in pending[:5]:
                print('  ' + colored('!', 'red') + ' ' + truncate(r.get('targetUser', '?'), 12) + ' | ' + truncate(r.get('reason', ''), 40))


# ==========================================
#  CANLI IZLEME
# ==========================================
def live_monitor():
    try:
        while True:
            show_dashboard()
            print(colored('\n  ' + str(REFRESH_RATE) + 'sn | Ctrl+C = cik', 'gray'))
            time.sleep(REFRESH_RATE)
    except KeyboardInterrupt:
        pass


# ==========================================
#  KULLANICILAR
# ==========================================
def show_users():
    clear()
    header('KULLANICILAR')
    data = get('/api/admin/users')
    if data is None:
        print(colored('  Alinamadi', 'red'))
        return
    if len(data) == 0:
        print(colored('  Yok', 'gray'))
        return

    print()
    print('  ' + '#'.ljust(4) + 'Isim'.ljust(14) + ' Rol'.ljust(8) + ' Durum'.ljust(10) + ' ID'.ljust(16) + ' IP'.ljust(16) + ' Kayit')
    print('  ' + '-'*4 + '-'*14 + ' ' + '-'*7 + ' ' + '-'*9 + ' ' + '-'*16 + ' ' + '-'*16 + ' ' + '-'*16)

    for i, u in enumerate(sorted(data, key=lambda x: x.get('online', False), reverse=True)):
        idx = str(i + 1).ljust(4)
        name = truncate(u.get('name', '?'), 14).ljust(14)
        role = u.get('role', 'user')
        rc = 'yellow' if role == 'host' else 'blue' if role == 'mod' else 'white'
        st = colored('Online', 'green') if u.get('online') else colored('Offline', 'gray')
        uid = colored(truncate(u.get('uidShort', '?'), 16).ljust(16), 'gray')
        ip = truncate((u.get('ips') or ['?'])[-1], 16).ljust(16)
        cr = truncate(u.get('createdAt', '?'), 16)

        print('  ' + idx + name + ' ' + colored(role.ljust(7), rc) + ' ' + st.ljust(20) + ' ' + uid + ' ' + ip + ' ' + cr)

    print('\n  Toplam: ' + colored(str(len(data)), 'bold'))


# ==========================================
#  MESAJ FILTRELEME
# ==========================================
def show_messages():
    clear()
    header('MESAJ FILTRELEME')
    print()
    print('  ' + colored('[1]', 'cyan') + ' Tum mesajlar')
    print('  ' + colored('[2]', 'cyan') + ' Kelime ara')
    print('  ' + colored('[3]', 'cyan') + ' Kullanici ID/isim ile')
    print('  ' + colored('[4]', 'cyan') + ' Oda bazli')
    print('  ' + colored('[5]', 'cyan') + ' Tip filtre (text/image/file/bot)')
    print('  ' + colored('[6]', 'cyan') + ' Kullanici mesaj gecmisi')
    print('  ' + colored('[0]', 'gray') + ' Geri')
    print()

    c = input(colored('  Secim: ', 'yellow')).strip()

    if c == '1':
        do_filter('', '', '', '', 100)
    elif c == '2':
        q = input(colored('  Kelime: ', 'yellow')).strip()
        if q:
            do_filter(q, '', '', '', 100)
    elif c == '3':
        q = input(colored('  UID veya isim: ', 'yellow')).strip()
        if q:
            users_data = get('/api/admin/users')
            if users_data:
                found = None
                for u in users_data:
                    if q in u.get('uid', '') or q in u.get('uidShort', '') or q.lower() == u.get('name', '').lower():
                        found = u
                        break
                if found:
                    print(colored('  > ' + found.get('name', '?') + ' (' + found.get('uidShort', '') + ')', 'green'))
                    do_filter('', found.get('uid', ''), '', '', 200)
                else:
                    print(colored('  Bulunamadi', 'red'))
                    input(colored('\n  Enter...', 'gray'))
    elif c == '4':
        rooms = get('/api/admin/rooms')
        if rooms and len(rooms) > 0:
            for i, r in enumerate(rooms):
                print('  ' + colored('[' + str(i+1) + ']', 'cyan') + ' #' + r.get('name', '') + ' (' + str(r.get('messageCount', 0)) + ')')
            rc = input(colored('  No: ', 'yellow')).strip()
            try:
                idx = int(rc) - 1
                if 0 <= idx < len(rooms):
                    do_filter('', '', rooms[idx].get('id', ''), '', 100)
            except:
                pass
    elif c == '5':
        t = input(colored('  Tip (text/image/file/bot): ', 'yellow')).strip()
        if t:
            do_filter('', '', '', t, 100)
    elif c == '6':
        show_user_history()


def do_filter(q, uid, room, mtype, limit):
    clear()
    header('MESAJLAR')
    params = '?limit=' + str(limit)
    if q:
        params += '&q=' + q
    if uid:
        params += '&uid=' + uid
    if room:
        params += '&room=' + room
    if mtype:
        params += '&type=' + mtype

    data = get('/api/admin/messages' + params)
    if data is None:
        print(colored('  Alinamadi', 'red'))
        input(colored('\n  Enter...', 'gray'))
        return
    if len(data) == 0:
        print(colored('\n  Sonuc yok', 'gray'))
        input(colored('\n  Enter...', 'gray'))
        return

    print('  ' + colored(str(len(data)) + ' mesaj', 'green'))
    print()
    print('  ' + 'Saat'.ljust(6) + ' Isim'.ljust(13) + ' ID'.ljust(13) + ' IP'.ljust(15) + ' Oda'.ljust(10) + ' Mesaj')
    print('  ' + '-'*6 + '-'*13 + ' ' + '-'*13 + ' ' + '-'*15 + ' ' + '-'*10 + ' ' + '-'*25)

    for m in data:
        t = truncate(m.get('time', '?'), 6).ljust(6)
        n = truncate(m.get('username', '?'), 12).ljust(12)
        u = colored(truncate(m.get('uidShort', '?'), 13).ljust(13), 'gray')
        ip = truncate(m.get('ip', '?'), 15).ljust(15)
        rm = truncate(m.get('room', '?'), 10).ljust(10)
        msg = truncate(m.get('message', ''), 35)
        tp = m.get('type', 'text')

        if tp == 'image':
            msg = colored('[FOTO]', 'blue')
        elif tp == 'file':
            msg = colored('[DOSYA]', 'purple')
        elif tp == 'bot':
            msg = colored('[BOT]', 'green')

        print('  ' + t + ' ' + n + ' ' + u + ' ' + ip + ' ' + rm + ' ' + str(msg))

    input(colored('\n  Enter...', 'gray'))


def show_user_history():
    clear()
    header('KULLANICI GECMISI')
    users_data = get('/api/admin/users')
    if users_data is None or len(users_data) == 0:
        print(colored('  Yok', 'gray'))
        input(colored('\n  Enter...', 'gray'))
        return

    for i, u in enumerate(users_data):
        st = colored('ON', 'green') if u.get('online') else colored('--', 'gray')
        print('  ' + colored('[' + str(i+1) + ']', 'cyan') + ' ' + st + ' ' + u.get('name', '?').ljust(14) + colored(u.get('uidShort', '?'), 'gray'))

    c = input(colored('\n  No veya isim: ', 'yellow')).strip()
    target = None

    try:
        idx = int(c) - 1
        if 0 <= idx < len(users_data):
            target = users_data[idx]
    except:
        for u in users_data:
            if c.lower() == u.get('name', '').lower():
                target = u
                break

    if not target:
        print(colored('  Bulunamadi', 'red'))
        input(colored('\n  Enter...', 'gray'))
        return

    data = get('/api/admin/user-messages/' + target.get('uid', ''))
    if data is None:
        print(colored('  Alinamadi', 'red'))
        input(colored('\n  Enter...', 'gray'))
        return

    clear()
    header(target.get('name', '?') + ' - GECMIS')
    msgs = data.get('messages', [])
    print('  ID: ' + colored(data.get('uidShort', '?'), 'gray'))
    print('  ' + colored(str(len(msgs)), 'green') + ' mesaj')
    print()

    for m in msgs[-50:]:
        t = truncate(m.get('time', '?'), 6).ljust(6)
        rm = truncate(m.get('room', '?'), 10).ljust(10)
        tp = m.get('type', 'text')
        msg = truncate(m.get('message', ''), 40)

        tc = 'blue' if tp == 'image' else 'purple' if tp == 'file' else 'green' if tp == 'bot' else 'white'
        print('  ' + colored(m.get('date', ''), 'gray') + ' ' + t + ' ' + rm + ' ' + colored(tp.ljust(6), tc) + ' ' + str(msg))

    input(colored('\n  Enter...', 'gray'))


# ==========================================
#  DENETIM LOGU
# ==========================================
def show_audit():
    clear()
    header('DENETIM LOGU')
    data = get('/api/admin/audit')
    if data is None:
        print(colored('  Alinamadi', 'red'))
        return
    if len(data) == 0:
        print(colored('  Log yok', 'gray'))
        return

    for l in reversed(data[-40:]):
        a = l.get('action', '?')
        ac = 'red' if 'ban' in a else 'yellow' if 'mod' in a else 'blue' if 'room' in a else 'purple' if 'mute' in a else 'white'
        print('  ' + colored(l.get('date', '?'), 'gray') + ' ' + colored(truncate(l.get('who', '?'), 12).ljust(12), 'cyan') + ' ' + colored(a.ljust(15), ac) + ' ' + truncate(l.get('detail', ''), 25))


# ==========================================
#  HATA LOGLARI
# ==========================================
def show_crashes():
    clear()
    header('HATALAR')
    data = get('/api/admin/crashes')
    if data is None:
        print(colored('  Alinamadi', 'red'))
        return
    if len(data) == 0:
        print(colored('  Hata yok!', 'green'))
        return
    for c in reversed(data[-20:]):
        print('  ' + colored(c.get('date', '?'), 'gray') + ' ' + colored(c.get('type', '?'), 'red') + ' ' + truncate(c.get('msg', ''), 45))


# ==========================================
#  DM
# ==========================================
def show_dm():
    clear()
    header('DM AKTIVITESI')
    data = get('/api/admin/dm-index')
    if data is None:
        print(colored('  Alinamadi', 'red'))
        return
    if len(data) == 0:
        print(colored('  DM yok', 'gray'))
        return

    seen = set()
    for d in data:
        key = tuple(sorted([d.get('fromUid', ''), d.get('toUid', '')]))
        if key in seen:
            continue
        seen.add(key)
        print('  ' + truncate(d.get('from', '?'), 12).ljust(12) + ' <-> ' + truncate(d.get('to', '?'), 12).ljust(12) + ' ' + truncate(d.get('lastMsg', ''), 25).ljust(25) + ' ' + d.get('lastTime', ''))


# ==========================================
#  BAN YONETIMI (GELISMIS)
# ==========================================
def show_bans():
    while True:
        clear()
        header('BAN YONETIMI')

        bans_data = get('/api/admin/bans')
        if bans_data is None:
            print(colored('  Alinamadi', 'red'))
            input(colored('\n  Enter...', 'gray'))
            return

        perm = bans_data.get('permanent', [])
        temp = bans_data.get('temporary', [])

        divider('KALICI BANLAR (' + str(len(perm)) + ')')
        if len(perm) == 0:
            print(colored('  Yok', 'gray'))
        for i, b in enumerate(perm):
            print('  ' + colored('[K' + str(i+1) + ']', 'red') + ' ' + truncate(b.get('name', '?'), 15).ljust(15) + ' ID: ' + colored(b.get('uidShort', '?'), 'gray'))

        divider('SURELI BANLAR (' + str(len(temp)) + ')')
        if len(temp) == 0:
            print(colored('  Yok', 'gray'))
        for i, b in enumerate(temp):
            print('  ' + colored('[S' + str(i+1) + ']', 'yellow') + ' ' + truncate(b.get('name', '?'), 15).ljust(15) + ' Kalan: ' + colored(str(b.get('remaining', '?')), 'yellow') + ' | ' + b.get('bannedBy', '?'))

        print()
        print('  ' + colored('[1]', 'cyan') + ' Kalici ban kaldir')
        print('  ' + colored('[2]', 'cyan') + ' Sureli ban kaldir')
        print('  ' + colored('[3]', 'cyan') + ' Yeni kalici ban ekle')
        print('  ' + colored('[4]', 'cyan') + ' Yeni sureli ban ekle')
        print('  ' + colored('[0]', 'gray') + ' Geri')
        print()

        c = input(colored('  Secim: ', 'yellow')).strip()

        if c == '1':
            # KALICI BAN KALDIR
            if len(perm) == 0:
                print(colored('  Kalici ban yok', 'gray'))
                input(colored('\n  Enter...', 'gray'))
                continue

            print()
            for i, b in enumerate(perm):
                print('  ' + colored('[' + str(i+1) + ']', 'cyan') + ' ' + b.get('name', '?') + ' (' + b.get('uidShort', '?') + ')')

            bc = input(colored('\n  Kaldirilacak no: ', 'yellow')).strip()
            try:
                idx = int(bc) - 1
                if 0 <= idx < len(perm):
                    uid = perm[idx].get('uid', '')
                    name = perm[idx].get('name', '?')
                    confirm = input(colored('  ' + name + ' kalici bani kaldirilsin mi? (e/h): ', 'red')).strip().lower()
                    if confirm == 'e':
                        result = post('/api/admin/unban', {'uid': uid})
                        if result and result.get('success'):
                            print(colored('  ' + name + ' bani kaldirildi!', 'green'))
                        else:
                            print(colored('  Hata: ' + str(result.get('error', '?')), 'red'))
                    else:
                        print(colored('  Iptal', 'gray'))
                    input(colored('\n  Enter...', 'gray'))
            except:
                pass

        elif c == '2':
            # SURELI BAN KALDIR
            if len(temp) == 0:
                print(colored('  Sureli ban yok', 'gray'))
                input(colored('\n  Enter...', 'gray'))
                continue

            print()
            for i, b in enumerate(temp):
                print('  ' + colored('[' + str(i+1) + ']', 'cyan') + ' ' + b.get('name', '?') + ' (Kalan: ' + str(b.get('remaining', '?')) + ')')

            bc = input(colored('\n  Kaldirilacak no: ', 'yellow')).strip()
            try:
                idx = int(bc) - 1
                if 0 <= idx < len(temp):
                    uid = temp[idx].get('uid', '')
                    name = temp[idx].get('name', '?')
                    confirm = input(colored('  ' + name + ' sureli bani kaldirilsin mi? (e/h): ', 'yellow')).strip().lower()
                    if confirm == 'e':
                        result = post('/api/admin/unban', {'uid': uid})
                        if result and result.get('success'):
                            print(colored('  ' + name + ' bani kaldirildi!', 'green'))
                        else:
                            print(colored('  Hata!', 'red'))
                    input(colored('\n  Enter...', 'gray'))
            except:
                pass

        elif c == '3':
            # YENI KALICI BAN
            users_data = get('/api/admin/users')
            if users_data is None or len(users_data) == 0:
                print(colored('  Kullanici yok', 'gray'))
                input(colored('\n  Enter...', 'gray'))
                continue

            print()
            for i, u in enumerate(users_data):
                st = colored('ON', 'green') if u.get('online') else '  '
                print('  ' + colored('[' + str(i+1) + ']', 'cyan') + ' ' + st + ' ' + u.get('name', '?').ljust(14) + colored(u.get('uidShort', '?'), 'gray'))

            bc = input(colored('\n  Banlanacak no veya isim: ', 'yellow')).strip()
            target = None

            try:
                idx = int(bc) - 1
                if 0 <= idx < len(users_data):
                    target = users_data[idx]
            except:
                for u in users_data:
                    if bc.lower() == u.get('name', '').lower():
                        target = u
                        break

            if target:
                name = target.get('name', '?')
                uid = target.get('uid', '')
                confirm = input(colored('  ' + name + ' KALICI banlansin mi? (e/h): ', 'red')).strip().lower()
                if confirm == 'e':
                    result = post('/api/admin/ban', {'uid': uid, 'duration': 'permanent'})
                    if result and result.get('success'):
                        print(colored('  ' + name + ' kalici banlandi!', 'green'))
                    else:
                        print(colored('  Hata: ' + str(result.get('error', '?')), 'red'))
                input(colored('\n  Enter...', 'gray'))
            else:
                print(colored('  Bulunamadi', 'red'))
                input(colored('\n  Enter...', 'gray'))

        elif c == '4':
            # YENI SURELI BAN
            users_data = get('/api/admin/users')
            if users_data is None or len(users_data) == 0:
                print(colored('  Kullanici yok', 'gray'))
                input(colored('\n  Enter...', 'gray'))
                continue

            print()
            for i, u in enumerate(users_data):
                st = colored('ON', 'green') if u.get('online') else '  '
                print('  ' + colored('[' + str(i+1) + ']', 'cyan') + ' ' + st + ' ' + u.get('name', '?').ljust(14) + colored(u.get('uidShort', '?'), 'gray'))

            bc = input(colored('\n  Banlanacak no veya isim: ', 'yellow')).strip()
            target = None

            try:
                idx = int(bc) - 1
                if 0 <= idx < len(users_data):
                    target = users_data[idx]
            except:
                for u in users_data:
                    if bc.lower() == u.get('name', '').lower():
                        target = u
                        break

            if target:
                name = target.get('name', '?')
                uid = target.get('uid', '')
                print()
                print('  Sure secin:')
                print('  ' + colored('[1]', 'cyan') + ' 5dk')
                print('  ' + colored('[2]', 'cyan') + ' 15dk')
                print('  ' + colored('[3]', 'cyan') + ' 30dk')
                print('  ' + colored('[4]', 'cyan') + ' 1 saat')
                print('  ' + colored('[5]', 'cyan') + ' 6 saat')
                print('  ' + colored('[6]', 'cyan') + ' 1 gun')
                print('  ' + colored('[7]', 'cyan') + ' Ozel (dakika)')

                sc = input(colored('\n  Sure: ', 'yellow')).strip()
                durations = {'1': 5, '2': 15, '3': 30, '4': 60, '5': 360, '6': 1440}

                dk = None
                if sc in durations:
                    dk = durations[sc]
                elif sc == '7':
                    custom = input(colored('  Dakika: ', 'yellow')).strip()
                    try:
                        dk = int(custom)
                    except:
                        pass

                if dk and dk > 0:
                    confirm = input(colored('  ' + name + ' ' + str(dk) + 'dk banlansin mi? (e/h): ', 'yellow')).strip().lower()
                    if confirm == 'e':
                        result = post('/api/admin/ban', {'uid': uid, 'duration': str(dk)})
                        if result and result.get('success'):
                            print(colored('  ' + name + ' ' + str(dk) + 'dk banlandi!', 'green'))
                        else:
                            print(colored('  Hata!', 'red'))
                    input(colored('\n  Enter...', 'gray'))
                else:
                    print(colored('  Gecersiz', 'red'))
                    input(colored('\n  Enter...', 'gray'))
            else:
                print(colored('  Bulunamadi', 'red'))
                input(colored('\n  Enter...', 'gray'))

        elif c == '0':
            return


# ==========================================
#  SIKAYET YONETIMI (YENI)
# ==========================================
def show_reports():
    while True:
        clear()
        header('SIKAYET YONETIMI')

        data = get('/api/admin/reports')
        if data is None:
            print(colored('  Alinamadi', 'red'))
            input(colored('\n  Enter...', 'gray'))
            return
        if len(data) == 0:
            print(colored('\n  Sikayet yok', 'gray'))
            input(colored('\n  Enter...', 'gray'))
            return

        pending = [r for r in data if r.get('status') == 'beklemede']
        resolved = [r for r in data if r.get('status') != 'beklemede']

        divider('BEKLEYEN (' + str(len(pending)) + ')')
        for i, r in enumerate(pending):
            print()
            print('  ' + colored('[' + str(i+1) + ']', 'red') + ' Hedef: ' + colored(r.get('targetUser', '?'), 'bold') + ' (ID: ' + colored(truncate(r.get('targetUID', '?'), 10), 'gray') + ')')
            print('      Mesaj: ' + truncate(r.get('messageContent', ''), 50))
            print('      Sebep: ' + colored(truncate(r.get('reason', ''), 50), 'yellow'))
            print('      Tarih: ' + colored(r.get('date', '?'), 'gray'))

        if resolved:
            divider('ISLEM YAPILMIS (' + str(len(resolved)) + ')')
            for r in resolved[-5:]:
                st = r.get('status', '?')
                sc = 'red' if 'engel' in st else 'yellow' if 'sureli' in st else 'gray'
                print('  ' + truncate(r.get('targetUser', '?'), 12).ljust(12) + ' ' + colored(truncate(st, 20), sc) + ' ' + colored(r.get('date', ''), 'gray'))

        print()
        print('  ' + colored('[E]', 'red') + ' Engelle (kalici ban)')
        print('  ' + colored('[S]', 'yellow') + ' Sureli ban')
        print('  ' + colored('[G]', 'gray') + ' Gormezden gel')
        print('  ' + colored('[D]', 'gray') + ' Sikayet sil')
        print('  ' + colored('[T]', 'purple') + ' Tum sikayetleri temizle')
        print('  ' + colored('[0]', 'gray') + ' Geri')
        print()

        c = input(colored('  Secim (harf+no, ornegin E1): ', 'yellow')).strip().upper()

        if c == '0':
            return
        elif c == 'T':
            confirm = input(colored('  Tum sikayetler silinsin mi? (e/h): ', 'red')).strip().lower()
            if confirm == 'e':
                for r in data:
                    post('/api/admin/resolve-report', {'reportId': r.get('id'), 'action': 'delete'})
                print(colored('  Temizlendi!', 'green'))
            input(colored('\n  Enter...', 'gray'))
            continue

        if len(c) < 2:
            continue

        action = c[0]
        try:
            num = int(c[1:]) - 1
        except:
            continue

        if num < 0 or num >= len(pending):
            print(colored('  Gecersiz numara', 'red'))
            input(colored('\n  Enter...', 'gray'))
            continue

        report = pending[num]
        target_uid = report.get('targetUID', '')
        target_name = report.get('targetUser', '?')
        report_id = report.get('id', '')

        if action == 'E':
            confirm = input(colored('  ' + target_name + ' KALICI banlansin mi? (e/h): ', 'red')).strip().lower()
            if confirm == 'e':
                post('/api/admin/ban', {'uid': target_uid, 'duration': 'permanent'})
                post('/api/admin/resolve-report', {'reportId': report_id, 'action': 'engellendi'})
                print(colored('  Banlandi + sikayet kapandi!', 'green'))
            input(colored('\n  Enter...', 'gray'))

        elif action == 'S':
            print('  Sure: ' + colored('[1]5dk [2]15dk [3]30dk [4]1sa [5]6sa [6]1gun', 'cyan'))
            sc = input(colored('  : ', 'yellow')).strip()
            durations = {'1': 5, '2': 15, '3': 30, '4': 60, '5': 360, '6': 1440}
            dk = durations.get(sc)
            if dk:
                post('/api/admin/ban', {'uid': target_uid, 'duration': str(dk)})
                post('/api/admin/resolve-report', {'reportId': report_id, 'action': 'sureli_' + str(dk) + 'dk'})
                print(colored('  ' + str(dk) + 'dk ban + sikayet kapandi!', 'green'))
            input(colored('\n  Enter...', 'gray'))

        elif action == 'G':
            post('/api/admin/resolve-report', {'reportId': report_id, 'action': 'gormezden_gelindi'})
            print(colored('  Gecildi', 'gray'))
            input(colored('\n  Enter...', 'gray'))

        elif action == 'D':
            post('/api/admin/resolve-report', {'reportId': report_id, 'action': 'delete'})
            print(colored('  Silindi', 'gray'))
            input(colored('\n  Enter...', 'gray'))


# ==========================================
#  KAYDET
# ==========================================
def force_save():
    print(colored('\n  Kaydediliyor...', 'yellow'))
    result = post('/api/admin/save')
    if result and result.get('success'):
        print(colored('  Kaydedildi!', 'green'))
    else:
        print(colored('  Hata!', 'red'))
    input(colored('\n  Enter...', 'gray'))


# ==========================================
#  ANA MENU
# ==========================================
def main_menu():
    while True:
        clear()
        header('ADMIN PANELI v8.3')

        status = get('/api/status')
        if status is not None:
            reports = get('/api/admin/reports')
            pending = 0
            if reports is not None:
                pending = len([r for r in reports if r.get('status') == 'beklemede'])

            info = 'ACIK | Online: ' + str(status.get('online', 0))
            if pending > 0:
                info += ' | ' + colored(str(pending) + ' sikayet!', 'red')
            print(colored('  ' + info, 'green'))
        else:
            print(colored('  KAPALI', 'red'))

        print()
        print('  ' + colored('[1]', 'cyan') + '  Dashboard')
        print('  ' + colored('[2]', 'cyan') + '  Canli Izleme')
        print('  ' + colored('[3]', 'cyan') + '  Kullanicilar')
        print('  ' + colored('[4]', 'cyan') + '  ' + colored('Mesaj Filtreleme', 'yellow'))
        print('  ' + colored('[5]', 'cyan') + '  Denetim Logu')
        print('  ' + colored('[6]', 'cyan') + '  Hatalar')
        print('  ' + colored('[7]', 'cyan') + '  DM Aktivitesi')
        print('  ' + colored('[8]', 'cyan') + '  ' + colored('Ban Yonetimi', 'red') + ' (ekle/kaldir)')
        print('  ' + colored('[9]', 'cyan') + '  ' + colored('Sikayet Yonetimi', 'purple') + ' (engelle/gec/sil)')
        print('  ' + colored('[S]', 'cyan') + '  Manuel Kaydet')
        print('  ' + colored('[0]', 'red') + '  Cikis')
        print()

        c = input(colored('  Secim: ', 'yellow')).strip().upper()

        if c == '1':
            show_dashboard()
            input(colored('\n  Enter...', 'gray'))
        elif c == '2':
            live_monitor()
        elif c == '3':
            show_users()
            input(colored('\n  Enter...', 'gray'))
        elif c == '4':
            show_messages()
        elif c == '5':
            show_audit()
            input(colored('\n  Enter...', 'gray'))
        elif c == '6':
            show_crashes()
            input(colored('\n  Enter...', 'gray'))
        elif c == '7':
            show_dm()
            input(colored('\n  Enter...', 'gray'))
        elif c == '8':
            show_bans()
        elif c == '9':
            show_reports()
        elif c == 'S':
            force_save()
        elif c == '0':
            print(colored('\n  Gule gule!', 'green'))
            sys.exit(0)


if __name__ == '__main__':
    clear()
    header('ADMIN PANELI v8.3')
    print(colored('  ' + CHAT_URL, 'gray'))

    status = get('/api/status')
    if status is not None:
        print(colored('  Baglanti OK!', 'green'))
    else:
        print(colored('  Baglanti YOK!', 'yellow'))

    input(colored('\n  Enter...', 'gray'))
    main_menu()