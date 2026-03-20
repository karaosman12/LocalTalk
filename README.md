# 💬 Yerel Ağ Mesajlaşma Uygulaması v8.3

<div align="center">

![Version](https://img.shields.io/badge/Versiyon-8.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-yellow)
![License](https://img.shields.io/badge/Lisans-MIT-purple)
![Platform](https://img.shields.io/badge/Platform-LAN%2FWiFi-orange)

**İnternet gerektirmeyen, aynı yerel ağdaki cihazlar arasında çalışan tam özellikli mesajlaşma platformu.**

</div>

---

## 📋 İçindekiler

- [Ürün Değerlendirmesi](#-ürün-değerlendirmesi)
- [Kullanım Alanları](#-kullanım-alanları)
- [Özellikler](#-özellikler)
- [Kullanılan Teknolojiler](#-kullanılan-teknolojiler)
- [Kurulum](#-kurulum)
- [Kullanım Kılavuzu](#-kullanım-kılavuzu)
- [Admin Panel (Python)](#-admin-panel-python)
- [Bot Komutları](#-bot-komutları)
- [Güvenlik](#-güvenlik)
- [Sistem Gereksinimleri](#-sistem-gereksinimleri)
- [Dosya Yapısı](#-dosya-yapısı)
- [Ekran Görüntüleri](#-ekran-görüntüleri)
- [Yapımcı](#-yapımcı)

---

## 🏆 Ürün Değerlendirmesi

### Güçlü Yönler

| Özellik | Puan | Açıklama |
|---------|------|----------|
| **Bağımsızlık** | ⭐⭐⭐⭐⭐ | İnternet bağlantısı gerektirmez, tamamen LAN üzerinde çalışır |
| **Kurulum Kolaylığı** | ⭐⭐⭐⭐⭐ | 3 komutla kurulup çalışır |
| **Güvenlik** | ⭐⭐⭐⭐ | Çerez tabanlı kimlik, spam koruması, kelime filtresi, crash koruması |
| **Özellik Zenginliği** | ⭐⭐⭐⭐⭐ | Odalar, DM, anket, oyunlar, dosya paylaşımı, şikayet sistemi |
| **Mobil Uyumluluk** | ⭐⭐⭐⭐ | Responsive tasarım, telefon ve tabletten kullanılabilir |
| **Performans** | ⭐⭐⭐⭐⭐ | Donanıma göre dinamik limit ayarlama, bellek izleme |
| **Yönetim** | ⭐⭐⭐⭐⭐ | Web panel + Python admin paneli ile tam kontrol |
| **Veri Güvenliği** | ⭐⭐⭐⭐ | Otomatik kayıt, crash koruması, yedekleme |

### Genel Değerlendirme

> Bu uygulama, yerel ağda iletişim ihtiyacını karşılamak için geliştirilmiş kapsamlı bir çözümdür. 
> Ofis, okul, etkinlik veya ev ortamında internet bağlantısına ihtiyaç duymadan güvenli ve hızlı 
> mesajlaşma imkanı sunar. Dinamik donanım uyumu sayesinde düşük güçlü bilgisayarlarda bile 
> verimli çalışır.

---

## 🎯 Kullanım Alanları

### 🏢 Ofis / İş Yeri
- Dahili iletişim sistemi olarak
- İnternet kesintilerinde iletişim sağlamak için
- Hassas verilerin dışarıya çıkmaması gereken ortamlarda
- Departmanlar arası oda bazlı iletişim

### 🏫 Okul / Eğitim
- Sınıf içi etkileşim (anketler, oyunlar)
- Öğretmen-öğrenci iletişimi
- Grup projeleri için oda oluşturma
- İnternet erişimi olmayan laboratuvar ortamlarında

### 🏠 Ev / Aile
- Aile içi mesajlaşma
- Ev partilerinde etkileşim
- Çocuklar için güvenli mesajlaşma ortamı (internet yok)

### 🎮 Oyun / Etkinlik
- LAN parti organizasyonları
- Turnuva iletişimi
- Etkinlik koordinasyonu

### 🏕️ Açık Alan / Kamp
- WiFi hotspot ile açık alanda iletişim
- İnternet olmayan bölgelerde mesajlaşma
- Acil durum iletişimi

### 🔒 Güvenlik Gerektiren Ortamlar
- Askeri tesisler (kapalı ağ)
- Güvenlik ofisleri
- Veri merkezi iletişimi

---

## ✨ Özellikler

### 💬 Mesajlaşma
- Gerçek zamanlı metin mesajları
- Mesaja yanıtlama (reply)
- Mesaj düzenleme (5dk içinde)
- Mesaj sabitleme (pin)
- @mention ile bahsetme ve bildirim
- Markdown desteği (`**kalın**`, `*italik*`, `` `kod` ``)
- URL otomatik link dönüşümü
- Emoji paneli
- Mesaj arama
- Okundu bilgisi (✓✓)
- "Yazıyor..." göstergesi
- Yeni mesaj ayırıcısı
- En alta inme butonu

### 📁 Dosya Paylaşımı
- Fotoğraf gönderme (JPG, PNG, GIF, WebP)
- Video gönderme (MP4, WebM, MOV)
- Her türlü dosya gönderme
- Dosya indirme butonu
- Fotoğraf tam ekran görüntüleme
- Ctrl+V ile resim yapıştırma
- Dinamik dosya boyutu limiti (donanıma göre)

### 🏠 Oda Sistemi
- Sınırsız oda oluşturma (donanıma göre limit)
- Şifreli oda desteği
- Oda silme ve sıfırlama
- Oda bazlı kullanıcı listesi

### 💬 Özel Mesaj (DM)
- Kullanıcılar arası özel sohbet
- DM listesi (sidebar'da)
- Okunmamış mesaj badge
- DM'de fotoğraf/dosya gönderme
- Online/offline durumu

### 🗳️ Anket Sistemi
- `/anket "Soru?" "A" "B" "C"` ile oluşturma
- Canlı oy güncelleme
- Yüzdelik çubuk grafik
- Mesaj akışında sabit pozisyon

### 🎮 Mini Oyunlar
- **Taş Kağıt Makas**: `/tkmk @kullanici`
- **Sayı Tahmin**: `/sayi 1 100`
- **Kura Çekme**: `/kura Ali Mehmet Ayşe`

### 🤖 Bot Komutları
- `/zar` - Zar atma
- `/yazitura` - Yazı tura
- `/saat` - Şu anki saat
- `/online` - Online kullanıcı sayısı
- `/rastgele 100` - Rastgele sayı
- `/yardim` - Komut listesi

### 👑 Yönetim
- Host = Sunucu PC (asla değişmez)
- Moderatör atama/kaldırma
- Mesaj silme (tekli/toplu)
- Oda oluşturma/silme/sıfırlama
- Manuel/otomatik kayıt
- Denetim logu

### 🛡️ Güvenlik
- Çerez tabanlı benzersiz kimlik
- Spam tespit + otomatik susturma (1dk)
- Tekrar mesaj koruması
- Küfür filtresi
- Sunucu PC ban koruması
- Crash koruması (sunucu kapanmaz)
- Rate limiting (HTTP + Socket)
- Input sanitizasyon
- Bellek izleme
- 24 saat mesaj ömrü
- 10GB depolama limiti

### ⚠️ Şikayet Sistemi
- Kullanıcılar mesaj şikayet edebilir
- Host şikayetleri görüp işleyebilir
- Görmezden gel / Sil seçenekleri
- Ban işlemleri Admin Panel üzerinden

### 📊 Admin Panel (Python)
- Dashboard (genel bakış)
- Canlı izleme (otomatik yenileme)
- Kullanıcı yönetimi (ID ile)
- Mesaj filtreleme (kelime/ID/oda/tip)
- Ban yönetimi (ekle/kaldır)
- Şikayet yönetimi
- Denetim logu
- Hata logları
- DM aktivitesi
- Manuel kayıt

### 🎨 Arayüz
- Karanlık / Aydınlık tema
- Durum mesajları (online, meşgul, uzakta, DND)
- Masaüstü bildirimleri
- Bildirim sesi
- Mobil uyumlu (responsive)
- Klavye kısayolları (Esc, Enter)

---

## 🛠️ Kullanılan Teknolojiler

### Backend (Sunucu)
| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| **Node.js** | 18+ | Çalışma ortamı |
| **Express.js** | 4.18 | HTTP sunucu |
| **Socket.IO** | 4.7 | Gerçek zamanlı iletişim |
| **cookie-parser** | 1.4 | Çerez yönetimi |
| **qrcode** | 1.5 | QR kod oluşturma |
| **crypto** | Built-in | Benzersiz ID üretimi |
| **fs** | Built-in | Dosya sistemi işlemleri |
| **os** | Built-in | Donanım bilgisi |

### Frontend (Arayüz)
| Teknoloji | Kullanım |
|-----------|----------|
| **HTML5** | Sayfa yapısı |
| **CSS3** | Stil ve tasarım (CSS Variables, Flexbox, Animations) |
| **JavaScript (Vanilla)** | Tüm istemci mantığı |
| **Socket.IO Client** | Sunucu ile gerçek zamanlı iletişim |
| **Web Notifications API** | Masaüstü bildirimleri |
| **Clipboard API** | Kopyala/Yapıştır |
| **FileReader API** | Dosya yükleme |

### Admin Panel
| Teknoloji | Kullanım |
|-----------|----------|
| **Python 3.6+** | Çalışma ortamı |
| **requests** | HTTP istekleri |
| **ANSI Colors** | Terminal renkli çıktı |

### Veri Depolama
| Yöntem | Kullanım |
|--------|----------|
| **JSON Dosyaları** | Tüm veriler (mesajlar, kimlikler, banlar, raporlar) |
| **Dosya Sistemi** | Medya ve dosya saklama |
| **Çerezler** | Kullanıcı kimlik yönetimi |

### Mimari
┌──────────────────────────────────────────┐ │ İstemciler │ │ ┌──────┐ ┌──────┐ ┌──────┐ │ │ │ PC │ │Telefon│ │Tablet│ │ │ └──┬───┘ └──┬───┘ └──┬───┘ │ │ │ │ │ │ │ └────────┬┴─────────┘ │ │ │ Socket.IO │ │ ┌────────┴────────┐ │ │ │ WiFi / LAN │ │ │ └────────┬────────┘ │ │ │ │ │ ┌────────┴────────┐ │ │ │ Sunucu (Node) │◄── Admin Panel │ │ │ Express + │ (Python) │ │ │ Socket.IO │ │ │ └────────┬────────┘ │ │ │ │ │ ┌────────┴────────┐ │ │ │ data/ (JSON) │ │ │ │ medya/ dosya/ │ │ │ └─────────────────┘ │ └──────────────────────────────────────────┘

text


---

## 🚀 Kurulum

### Gereksinimler
- **Node.js** 18 veya üstü → [nodejs.org](https://nodejs.org)
- **Python** 3.6+ (admin panel için opsiyonel)

### Adımlar

```bash
# 1. Proje klasörü oluştur
mkdir local-chat
cd local-chat

# 2. Dosyaları oluştur
#    - package.json
#    - server.js
#    - public/index.html
#    - admin_panel.py (opsiyonel)

# 3. Paketleri kur
npm install

# 4. Sunucuyu başlat
npm start

# 5. Admin panel (opsiyonel, ayrı terminal)
pip install requests
python admin_panel.py
Başarılı Çalışma
text

==========================================
   YEREL SOHBET v8.3
==========================================
  http://localhost:3000
  http://192.168.1.42:3000
  Guc: 85/100 | Ban=Admin Panel
==========================================
📖 Kullanım Kılavuzu
İlk Giriş
Tarayıcıdan http://localhost:3000 (sunucu PC) veya http://192.168.x.x:3000 (diğer cihazlar) adresine girin
Kullanıcı adınızı girin → "Kayıt Ol" butonuna tıklayın
Bu isim kalıcıdır, bir daha değiştirilemez
Sonraki girişlerde otomatik olarak "Hoşgeldin, İsim!" ile karşılanırsınız
Oda Kullanımı
İşlem	Nasıl
Odaya giriş	Sol panelden oda adına tıklayın
Oda oluşturma	(Host) Oda adı + şifre (opsiyonel) yazıp + tıklayın
Oda silme	(Host) Oda adının yanındaki ✕ tıklayın
Şifreli oda	Girişte şifre popup'ı çıkar
Mesajlaşma
İşlem	Nasıl
Mesaj gönder	Alt kutucuğa yazıp Enter veya ➤
Yanıtla	Mesaj üstüne gel → ↩ tıkla
Düzenle	Kendi mesajında ✏ tıkla (5dk içinde)
Kopyala	📋 tıkla
Sabitle	(Host/Mod) 📌 tıkla
Şikayet	⚠ tıkla → sebep yaz
@bahsetme	@kullanıcıadı yaz
Markdown	**kalın** *italik* `kod`
Dosya Gönderme
İşlem	Nasıl
Fotoğraf/Video	📷 butonu → dosya seç
Her türlü dosya	📄 butonu → dosya seç
Yapıştır	Ctrl+V ile resim yapıştır
Özel Mesaj (DM)
İşlem	Nasıl
DM aç	Kullanıcı listesinden isme tıkla
DM listesi	Sol panelde "ÖZEL MESAJLAR" bölümü
DM'de dosya	📷 ve 📄 butonları DM'de de var
Tema ve Durum
İşlem	Nasıl
Tema değiştir	Üst barda 🌙 tıkla
Durum değiştir	Rol badge'e tıkla → seç
🖥️ Admin Panel (Python)
Çalıştırma
Bash

pip install requests
python admin_panel.py
Menü
text

  [1]  Dashboard
  [2]  Canlı İzleme
  [3]  Kullanıcılar
  [4]  Mesaj Filtreleme (Kelime/ID/Oda/Tip)
  [5]  Denetim Logu
  [6]  Hatalar
  [7]  DM Aktivitesi
  [8]  Ban Yönetimi (ekle/kaldır)
  [9]  Şikayet Yönetimi (engelle/geç/sil)
  [S]  Manuel Kaydet
  [0]  Çıkış
Ban Yönetimi
text

  [1] Kalıcı ban kaldır
  [2] Süreli ban kaldır
  [3] Yeni kalıcı ban ekle
  [4] Yeni süreli ban ekle (5dk/15dk/30dk/1sa/6sa/1gün/özel)
Şikayet Yönetimi
text

  E1 → 1. şikayetteki kişiyi kalıcı banla
  S2 → 2. şikayete süreli ban ver
  G3 → 3. şikayeti görmezden gel
  D1 → 1. şikayeti sil
  T  → Tüm şikayetleri temizle
Mesaj Filtreleme
text

  [1] Tüm mesajlar
  [2] Kelime ara
  [3] Kullanıcı ID/isim ile
  [4] Oda bazlı
  [5] Tip filtresi (text/image/file/bot)
  [6] Kullanıcı mesaj geçmişi
🤖 Bot Komutları
Komut	Açıklama	Örnek
/zar	1-6 arası zar at	🎲 Ali: 4
/yazitura	Yazı veya tura	🪙 Tura
/saat	Şu anki saat	🕐 14:32
/online	Online sayısı	👥 5 kişi
/rastgele N	1-N arası rastgele	🎯 42
/kura A B C	Rastgele kişi seç	🏆 Mehmet kazandı!
/anket "?" "A" "B"	Anket oluştur	📊 Canlı oylama kartı
/tkmk @kisi	Taş Kağıt Makas	✊✋✌️ Oyun kartı
/sayi 1 100	Sayı tahmin oyunu	🔢 Yukarı/Aşağı ipucu
/yardim	Komut listesi	📋 Tüm komutlar
🛡️ Güvenlik
Kimlik Sistemi
Her kullanıcıya benzersiz UID atanır (çerez)
Her UID'ye benzersiz API Key atanır
İlk girişte isim kaydedilir, değiştirilemez
Aynı isim başka kişi tarafından alınamaz
Her giriş IP ile loglanır
Ban Sistemi
Banlar sadece Admin Panel üzerinden atılır/kaldırılır
Kalıcı ban: Sonsuza kadar engel
Süreli ban: 5dk - 30 gün arası
Sunucu PC asla banlanamaz
Ban anında diske yazılır
Spam Koruması
10 saniyede 8+ mesaj → 1dk otomatik susturma
Aynı mesajı 30sn içinde 3+ kez → 1dk susturma
Susturulan kullanıcı mesaj atamaz ama bağlantısı kopmaz
Kelime Filtresi
12 yasak kelime otomatik yıldızlanır (***)
Kelimeler harf arası boşluk/nokta ile de tespit edilir
Sunucu Koruması
uncaughtException yakalanır → sunucu kapanmaz
unhandledRejection yakalanır
Bellek 500MB üstü → otomatik temizlik
10GB depolama limiti → otomatik eski dosya silme
HTTP rate limiting (saniyede max istek)
Socket flood koruması
💻 Sistem Gereksinimleri
Minimum
Bileşen	Gereksinim
İşlemci	Herhangi bir x86/x64 CPU
RAM	512 MB
Depolama	100 MB (+ veri)
Ağ	WiFi veya LAN bağlantısı
Yazılım	Node.js 18+
Önerilen
Bileşen	Gereksinim
İşlemci	4+ çekirdek
RAM	4 GB+
Depolama	1 GB+
Ağ	100 Mbps LAN veya WiFi 5
Dinamik Limitler
Uygulama donanıma göre otomatik ayarlanır:

Güç Puanı	Örnek Donanım	Max Dosya	Max Mesaj/Oda	Max Oda
25/100	i3 + 4GB RAM	20 MB	1625	16
50/100	i5 + 8GB RAM	30 MB	2750	27
85/100	i7 + 16GB RAM	44 MB	4325	43
100/100	i9 + 32GB RAM	50 MB	5000	50
📁 Dosya Yapısı
text

local-chat/
├── package.json            # Proje tanımı ve bağımlılıklar
├── server.js               # Ana sunucu dosyası
├── admin_panel.py          # Python admin paneli
├── public/
│   └── index.html          # Web arayüzü
└── data/                   # (Otomatik oluşur)
    ├── kimlikler.json      # Kullanıcı kimlikleri
    ├── odalar.json         # Oda bilgileri
    ├── banlar.json         # Kalıcı banlar
    ├── sureli_banlar.json  # Süreli banlar
    ├── sikayetler.json     # Şikayetler
    ├── denetim.json        # Denetim logları
    ├── pinler.json         # Sabitlenmiş mesajlar
    ├── anketler.json       # Anketler
    ├── oyunlar.json        # Aktif oyunlar
    ├── dm_index.json       # DM konuşma indexi
    ├── crash_log.json      # Hata logları
    ├── server_uid.txt      # Sunucu PC kimliği
    ├── oda_genel.json      # Genel oda mesajları
    ├── id_mesajlar/        # Kullanıcı bazlı mesaj arşivi
    ├── dm/                 # Özel mesaj dosyaları
    ├── medya/              # Fotoğraf ve videolar
    └── dosyalar/           # Gönderilen dosyalar
📸 Ekran Görüntüleri
Giriş Ekranı
text

┌─────────────────────────┐
│     Yerel Sohbet v8.3   │
│                         │
│  Kullanıcı adınız: ___  │
│                         │
│      [Kayıt Ol]         │
└─────────────────────────┘
Ana Ekran
text

┌───────────────────────────────────────────┐
│ # Genel          [🔍] [@] [🌙] [Kaydet]  │
├──────────┬────────────────────────────────┤
│ ODALAR   │                                │
│ # Genel  │  Ali: Merhaba!          14:30  │
│ # Oyun   │                                │
│          │       Selam nasılsın?          │
│ DM       │                         14:31  │
│ Mehmet   │                                │
│          │  📊 Anket: En iyi oyun?        │
│ KULLAN.  │  [Minecraft 60%] [GTA 40%]    │
│ 🟢 Ali   │                                │
│ 🟢 Mehmet│──────────────────────────────  │
│          │  [📷] [📄] [😊] [Mesaj...] [➤] │
└──────────┴────────────────────────────────┘
Admin Panel (Python)
text

============================================================
  YEREL SOHBET v8.0 - ADMIN PANELI
============================================================
  Sunucu: AÇIK | Online: 5 | Güç: 85 | RAM: 67MB

  [1]  Dashboard
  [2]  Canlı İzleme
  [3]  Kullanıcılar
  [4]  Mesaj Filtreleme
  [5]  Denetim Logu
  [6]  Hatalar
  [7]  DM Aktivitesi
  [8]  Ban Yönetimi
  [9]  Şikayet Yönetimi
  [S]  Manuel Kaydet
  [0]  Çıkış
⚙️ API Endpointleri
Genel (Herkes)
Endpoint	Açıklama
GET /	Web arayüzü
GET /api/identity	Kimlik bilgisi
GET /api/qr	QR kod (mobil bağlantı)
Admin (Sadece Sunucu IP)
Endpoint	Açıklama
GET /api/status	Sunucu durumu
GET /api/admin/users	Tüm kullanıcılar
GET /api/admin/rooms	Tüm odalar
GET /api/admin/bans	Ban listesi
GET /api/admin/reports	Şikayetler
GET /api/admin/audit	Denetim logları
GET /api/admin/messages?q=&uid=&room=&type=	Mesaj filtreleme
GET /api/admin/user-messages/:uid	Kullanıcı mesaj geçmişi
POST /api/admin/ban	Ban ekle
POST /api/admin/unban	Ban kaldır
POST /api/admin/save	Manuel kaydet
POST /api/admin/resolve-report	Şikayet işle
🔄 Versiyon Geçmişi
Versiyon	Tarih	Değişiklikler
v1.0	-	Temel mesajlaşma
v2.0	-	Oda sistemi, dosya paylaşımı
v3.0	-	Şifreli odalar, moderatör sistemi
v4.0	-	Mobil uyumluluk, ses kaydı
v5.0	-	Çerez/ID sistemi, IP kayıt, şikayet
v6.0	-	Dinamik donanım limitleri, 24 saat mesaj ömrü
v7.0	-	Anket, oyunlar, DM, emoji, mention, markdown
v7.1	-	Host = Sunucu PC, mod paneli
v8.0	-	Anket+Oyun fix, admin panel gelişmiş
v8.2	-	Ban sadece admin panel, forceSave düzeltmesi
v8.3	-	Kelime oyunu kaldırıldı, anket pozisyon fix
📄 Lisans
Bu proje MIT lisansı altında yayınlanmıştır.

👨‍💻 Yapımcı
<div align="center">
Ali Karaosman
Bu proje Ali Karaosman tarafından tasarlanmış ve geliştirilmiştir.

⚠️ Not: Bu projenin geliştirilmesinde AI (Yapay Zeka) asistanından yardım alınmıştır. Kod yazımı, hata düzeltme, özellik geliştirme ve optimizasyon süreçlerinde AI araçları kullanılmıştır. Proje fikri, tasarım kararları ve yönlendirme tamamen Ali Karaosman'a aittir.

Proje Fikri & Yönetimi: Ali Karaosman
Kod Geliştirme: Ali Karaosman + AI Asistan (Claude, Anthropic)
Test & Hata Ayıklama: Ali Karaosman


⭐ Bu projeyi beğendiyseniz yıldız vermeyi unutmayın! ⭐

 ```