// kart-ekle.js
//
// 156 yeni kartı (6 derse 26'şar) data/cards.js'e ekler.
//
// Kullanım: proje klasöründe (lgs-cards) şunu çalıştır:
//   node kart-ekle.js
//
// Ne yapar:
// 1. data/cards.js'in yedeğini alır (data/cards.kart-ekleme-oncesi.js)
// 2. Eklenecek 156 kartın id'lerinden HERHANGİ BİRİ zaten dosyada varsa
//    (çakışma), HİÇBİR ŞEY EKLEMEDEN durur ve hangi id'lerin çakıştığını
//    listeler.
// 3. Çakışma yoksa, kartları CARDS dizisinin sonuna, kapanış "];"
//    parantezinin hemen önüne ekler.

const fs = require('fs');
const path = require('path');

const DOSYA = path.join(__dirname, 'data', 'cards.js');
const YEDEK = path.join(__dirname, 'data', 'cards.kart-ekleme-oncesi.js');
const YENI_KARTLAR_DOSYASI = path.join(__dirname, 'yeni-kartlar.js');

function calistir() {
  if (!fs.existsSync(DOSYA)) {
    console.error('HATA: data/cards.js bulunamadı. Bu scripti proje kök klasöründe çalıştır.');
    process.exit(1);
  }
  if (!fs.existsSync(YENI_KARTLAR_DOSYASI)) {
    console.error('HATA: yeni-kartlar.js bulunamadı. Onu da proje kök klasörüne koy.');
    process.exit(1);
  }

  const yeniKartlarIcerik = fs.readFileSync(YENI_KARTLAR_DOSYASI, 'utf8');

  // yeni-kartlar.js içindeki id'leri çıkar (basit regex ile — dosya
  // sadece düz veri içerdiği için yeterli).
  const idRegex = /id:\s*"([^"]+)"/g;
  const yeniIdler = [];
  let m;
  while ((m = idRegex.exec(yeniKartlarIcerik)) !== null) yeniIdler.push(m[1]);

  if (yeniIdler.length === 0) {
    console.error('HATA: yeni-kartlar.js içinde hiç id bulunamadı, dosya bozuk olabilir.');
    process.exit(1);
  }

  let cardsIcerik = fs.readFileSync(DOSYA, 'utf8');

  // Çakışma kontrolü — eklenecek id'lerden biri zaten cards.js'te var mı?
  const cakisanlar = yeniIdler.filter(id => cardsIcerik.includes(`id: "${id}"`));
  if (cakisanlar.length > 0) {
    console.error('HATA: Aşağıdaki id\'ler zaten data/cards.js içinde mevcut — çakışma riski var.');
    console.error('Hiçbir değişiklik yapılmadı. Bu id\'leri elle kontrol et.');
    cakisanlar.forEach(id => console.error('  - ' + id));
    process.exit(1);
  }

  // yeni-kartlar.js'teki "{ id: ... }," satırlarının tamamını (dizinin
  // gövdesini) çıkarıp, mevcut CARDS dizisinin kapanışından hemen önce
  // ekliyoruz. "export const YENI_KARTLAR = [" ve son "];" satırlarını
  // atlayıp sadece içindeki kart nesnelerini alıyoruz.
  const gövdeBaslangic = yeniKartlarIcerik.indexOf('[') + 1;
  const gövdeBitis = yeniKartlarIcerik.lastIndexOf('];');
  const yeniKartGövdesi = yeniKartlarIcerik.slice(gövdeBaslangic, gövdeBitis).trim();

  const kapanisIndex = cardsIcerik.lastIndexOf('];');
  if (kapanisIndex === -1) {
    console.error('HATA: data/cards.js içinde beklenen "];" kapanışı bulunamadı — dosya beklenenden farklı yapıda.');
    process.exit(1);
  }

  fs.writeFileSync(YEDEK, cardsIcerik, 'utf8');
  console.log('Yedek alındı: data/cards.kart-ekleme-oncesi.js');

  const yeniIcerik =
    cardsIcerik.slice(0, kapanisIndex) +
    '\n  // ---------- Yeni eklenen kartlar (156 adet) ----------\n  ' +
    yeniKartGövdesi +
    '\n' +
    cardsIcerik.slice(kapanisIndex);

  fs.writeFileSync(DOSYA, yeniIcerik, 'utf8');

  console.log('');
  console.log(`Tamamlandı: ${yeniIdler.length} yeni kart eklendi.`);
  console.log('');
  console.log('Bir sorun görürsen data/cards.kart-ekleme-oncesi.js yedeğinden geri dönebilirsin:');
  console.log('  cp data/cards.kart-ekleme-oncesi.js data/cards.js');
}

calistir();
