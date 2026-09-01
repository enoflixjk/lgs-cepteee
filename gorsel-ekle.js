// gorsel-ekle.js (GÜNCEL — 1. ve 2. tur birleşik, ~90 kart)
//
// ÖNEMLİ — SIRAYI ATLAMA: Bu scripti çalıştırmadan ÖNCE, aşağıda listelenen
// TÜM .png dosyalarının assets/sorular/ klasöründe gerçekten var olması
// gerekiyor. `require('./dosya.png')` bir string değil, Metro'nun BUILD
// ANINDA çözdüğü gerçek bir dosya referansıdır — dosya yoksa uygulama
// "Unable to resolve module" hatasıyla AÇILAMAZ. Önce görselleri
// assets/sorular/ altına koy, SONRA bu scripti çalıştır.
//
// NOT: Daha önce ilk turu (Basit Makineler + bazı Matematik) zaten
// çalıştırdıysan sorun değil — bu script sadece ID'si HENÜZ gorsel
// almamış kartlara dokunur. Zaten "gorsel:" alanı olan bir kart id'si
// tekrar geçse bile script id'yi bulur ama zaten `unite:` kalıbına göre
// eklediği için ikinci kez çalıştırırsan İKİ KERE "gorsel:" eklenmiş
// olabilir — bu yüzden SIFIRDAN başlıyorsan (henüz hiç çalıştırmadıysan)
// bu tam listeyi kullan; ilk turu zaten yaptıysan data/cards.gorsel-oncesi.js
// yedeğinden orijinale dönüp bu güncel scripti sıfırdan çalıştırman en
// temizi.
//
// Kullanım: proje klasöründe (lgs-cards) şunu çalıştır:
//   node gorsel-ekle.js

const fs = require('fs');
const path = require('path');

const DOSYA = path.join(__dirname, 'data', 'cards.js');
const YEDEK = path.join(__dirname, 'data', 'cards.gorsel-oncesi.js');
const GORSEL_KLASORU = path.join(__dirname, 'assets', 'sorular');

// id -> görsel dosya adı eşleştirmesi
const GORSELLER = {
  // ================= 1. TUR — Basit Makineler =================
  'lfen-bm006': 'kaldirac-genel.png',
  'lfen-bm007': 'kaldirac-genel.png',
  'lfen-bm008': 'kaldirac-genel.png',
  'lfen-bm009': 'kaldirac-genel.png',
  'lfen-bm010': 'kaldirac-1-tur.png',
  'lfen-bm011': 'kaldirac-1-tur.png',
  'lfen-bm012': 'kaldirac-2-tur.png',
  'lfen-bm013': 'kaldirac-2-tur.png',
  'lfen-bm014': 'kaldirac-3-tur.png',
  'lfen-bm015': 'kaldirac-3-tur.png',
  'lfen-bm016': 'tahterevalli.png',
  'lfen-bm017': 'el-arabasi.png',
  'lfen-bm018': 'supurge.png',
  'lfen-bm019': 'sabit-makara.png',
  'lfen-bm020': 'sabit-makara.png',
  'lfen-bm026': 'sabit-makara.png',
  'lfen-bm037': 'sabit-makara.png',
  'lfen-bm021': 'hareketli-makara.png',
  'lfen-bm022': 'hareketli-makara.png',
  'lfen-bm023': 'hareketli-makara.png',
  'lfen-bm024': 'palanga.png',
  'lfen-bm025': 'palanga.png',
  'lfen-bm027': 'egik-duzlem.png',
  'lfen-bm028': 'egik-duzlem.png',
  'lfen-bm029': 'egik-duzlem.png',
  'lfen-bm036': 'egik-duzlem.png',
  'lfen-bm030': 'vida.png',
  'lfen-bm031': 'vida.png',
  'lfen-bm032': 'kama-ve-cark-dingil.png',
  'lfen-bm033': 'kama-ve-cark-dingil.png',
  'lfen-bm034': 'kama-ve-cark-dingil.png',
  'lfen-bm035': 'kama-ve-cark-dingil.png',
  'lfen-bm038': 'kama-ve-cark-dingil.png',

  // ================= 1. TUR — Matematik =================
  'lmat-0064': 'koordinat-sistemi.png',
  'lmat-0065': 'koordinat-sistemi.png',
  'lmat-0066': 'koordinat-sistemi.png',
  'lmat-0120': 'koordinat-sistemi.png',
  'lmat-0148': 'koordinat-sistemi.png',
  'lmat-0179': 'koordinat-sistemi.png',
  'lmat-0025': 'ucgen-ic-aci-pisagor.png',
  'lmat-0026': 'ucgen-ic-aci-pisagor.png',
  'lmat-0027': 'ucgen-ic-aci-pisagor.png',
  'lmat-0078': 'daire-yaricap.png',
  'lmat-0099': 'daire-yaricap.png',
  'lmat-0111': 'cokgen-kosegenler.png',
  'lmat-0112': 'cokgen-kosegenler.png',
  'lmat-0130': 'orta-dikme-aciortay.png',
  'lmat-0154': 'orta-dikme-aciortay.png',
  'lmat-0172': 'orta-dikme-aciortay.png',
  'lmat-0132': 'teget-yay.png',
  'lmat-0133': 'teget-yay.png',
  'lmat-0173': 'teget-yay.png',
  'lmat-0144': 'dikdortgen-kosegen-yansima.png',
  'lmat-0145': 'dikdortgen-kosegen-yansima.png',
  'lmat-0146': 'dikdortgen-kosegen-yansima.png',

  // ================= 2. TUR — Matematik (3D şekiller, dönüşümler) =================
  'lmat-0046': 'kup-hacim-alan.png',
  'lmat-0161': 'kup-hacim-alan.png',
  'lmat-0047': 'dikdortgenler-prizmasi.png',
  'lmat-0162': 'dikdortgenler-prizmasi.png',
  'lmat-0048': 'silindir-koni-kure.png',
  'lmat-0100': 'silindir-koni-kure.png',
  'lmat-0101': 'silindir-koni-kure.png',
  'lmat-0102': 'silindir-koni-kure.png',
  // NOT: lmat-0112 zaten yukarıda cokgen-kosegenler.png'ye atanmış,
  // burada tekrar etmiyoruz (çakışmayı önlemek için).
  'lmat-0072': 'duzgun-cokgenler.png',
  'lmat-0073': 'duzgun-cokgenler.png',
  'lmat-0165': 'duzgun-cokgenler.png',
  'lmat-0049': 'donusumler.png',
  'lmat-0050': 'donusumler.png',
  'lmat-0122': 'donusumler.png',
  'lmat-0123': 'donusumler.png',
  'lmat-0092': 'ucgen-dis-aci.png',
  'lmat-0093': 'ucgen-dis-aci.png',
  'lmat-0094': 'ucgen-dis-aci.png',
  'lmat-0143': 'ucgen-dis-aci.png',

  // ================= 2. TUR — Fen (Güneş Sistemi, Gökyüzü) =================
  'lfen-0067': 'gunes-sistemi.png',
  'lfen-0068': 'gunes-sistemi.png',
  'lfen-0069': 'gunes-sistemi.png',
  'lfen-0139': 'gunes-sistemi.png',
  'lfen-0140': 'gunes-sistemi.png',
  'lfen-0142': 'gunes-ay-tutulmasi.png',
  'lfen-0143': 'gunes-ay-tutulmasi.png',

  // ================= 2. TUR — Fen (İnsan Vücudu) =================
  'lfen-0038': 'hucre-organelleri.png',
  'lfen-0039': 'hucre-organelleri.png',
  'lfen-0041': 'hucre-organelleri.png',
  'lfen-0104': 'hucre-organelleri.png',
  'lfen-0105': 'hucre-organelleri.png',
  'lfen-0106': 'hucre-organelleri.png',
  'lfen-0047': 'kalp-dolasim.png',
  'lfen-0110': 'kalp-dolasim.png',
  'lfen-0111': 'kalp-dolasim.png',
  'lfen-0108': 'sindirim-sistemi.png',
  'lfen-0109': 'sindirim-sistemi.png',
  'lfen-0164': 'sindirim-sistemi.png',
  'lfen-0114': 'noron-beyin.png',
  'lfen-0115': 'noron-beyin.png',

  // ================= 2. TUR — Fen (Optik) =================
  'lfen-0036': 'isik-kirilma-yansima.png',
  'lfen-0037': 'isik-kirilma-yansima.png',
  'lfen-0101': 'isik-kirilma-yansima.png',
  'lfen-0175': 'isik-kirilma-yansima.png',
  'lfen-0157': 'icbukey-disbukey-ayna.png',
  'lfen-0158': 'icbukey-disbukey-ayna.png',

  // ================= 2. TUR — Fen (Elektrik) =================
  'lfen-0080': 'seri-paralel-devre.png',
  'lfen-0161': 'seri-paralel-devre.png',
  'lfen-0162': 'seri-paralel-devre.png',
  'lfen-0030': 'ohm-kanunu.png',
  'lfen-0095': 'ohm-kanunu.png',

  // ================= 2. TUR — Fen (Mıknatıs) =================
  'lfen-0031': 'miknatis-kutuplar.png',
  'lfen-0032': 'miknatis-kutuplar.png',
  'lfen-0098': 'miknatis-kutuplar.png',
};

function kacIleGec(str, aranan) {
  let sayi = 0, i = 0;
  while ((i = str.indexOf(aranan, i)) !== -1) { sayi++; i += aranan.length; }
  return sayi;
}

function calistir() {
  if (!fs.existsSync(DOSYA)) {
    console.error('HATA: data/cards.js bulunamadı. Bu scripti proje kök klasöründe çalıştır.');
    process.exit(1);
  }

  const eksikDosyalar = [];
  const benzersizDosyalar = [...new Set(Object.values(GORSELLER))];
  for (const dosyaAdi of benzersizDosyalar) {
    if (!fs.existsSync(path.join(GORSEL_KLASORU, dosyaAdi))) {
      eksikDosyalar.push(dosyaAdi);
    }
  }
  if (eksikDosyalar.length > 0) {
    console.error('HATA: Aşağıdaki görsel dosyaları assets/sorular/ klasöründe bulunamadı:');
    eksikDosyalar.forEach(d => console.error('  - ' + d));
    console.error('Önce bu dosyaları assets/sorular/ altına koy, sonra scripti tekrar çalıştır.');
    console.error('Hiçbir değişiklik yapılmadı.');
    process.exit(1);
  }

  let icerik = fs.readFileSync(DOSYA, 'utf8');

  // Daha önce "gorsel:" eklenmiş kartları tespit et — bu id'lere ikinci
  // kez ekleme yapmayı atlıyoruz, çift "gorsel:" alanı oluşmasın diye.
  let atlananZatenVar = 0;

  fs.writeFileSync(YEDEK, icerik, 'utf8');
  console.log('Yedek alındı: data/cards.gorsel-oncesi.js');
  console.log('');

  let basarili = 0, atlanan = [];

  for (const [id, dosyaAdi] of Object.entries(GORSELLER)) {
    const idArandi = `id: "${id}"`;
    const kacTane = kacIleGec(icerik, idArandi);

    if (kacTane === 0) {
      console.warn(`  ATLANDI (${id}): kart bulunamadı`);
      atlanan.push(id);
      continue;
    }
    if (kacTane > 1) {
      console.warn(`  ATLANDI (${id}): id ${kacTane} kez geçiyor, çakışma riski var — elle kontrol et`);
      atlanan.push(id);
      continue;
    }

    const idIndex = icerik.indexOf(idArandi);
    const satirSonu = icerik.indexOf('\n', idIndex);
    const satir = icerik.slice(idIndex, satirSonu === -1 ? icerik.length : satirSonu);

    // Bu kartta zaten "gorsel:" varsa (önceki bir çalıştırmadan kalma),
    // tekrar eklemiyoruz.
    if (/gorsel:\s*require\(/.test(satir)) {
      console.warn(`  ATLANDI (${id}): zaten bir görsel bağlı, üzerine yazılmadı`);
      atlananZatenVar++;
      continue;
    }

    const uniteMatch = satir.match(/unite:\s*"[^"]*",\s*/);
    if (!uniteMatch) {
      console.warn(`  ATLANDI (${id}): 'unite:' alanı satırda bulunamadı, elle kontrol et`);
      atlanan.push(id);
      continue;
    }

    const eklemeNoktasi = idIndex + uniteMatch.index + uniteMatch[0].length;
    const eklenecek = `gorsel: require('../assets/sorular/${dosyaAdi}'), `;

    icerik = icerik.slice(0, eklemeNoktasi) + eklenecek + icerik.slice(eklemeNoktasi);
    basarili++;
    console.log(`  OK (${id}): ${dosyaAdi} bağlandı`);
  }

  fs.writeFileSync(DOSYA, icerik, 'utf8');

  console.log('');
  console.log(`Tamamlandı: ${basarili} kart güncellendi, ${atlanan.length} kart bulunamadı, ${atlananZatenVar} kartta zaten görsel vardı.`);
  if (atlanan.length > 0) {
    console.log('Bulunamayan id\'ler:', atlanan.join(', '));
  }
  console.log('');
  console.log('Bir sorun görürsen data/cards.gorsel-oncesi.js yedeğinden geri dönebilirsin:');
  console.log('  cp data/cards.gorsel-oncesi.js data/cards.js');
}

calistir();