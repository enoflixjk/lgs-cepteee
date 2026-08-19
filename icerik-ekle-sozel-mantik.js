// ============================================================
// SÖZEL MANTIK KARTLARINI EKLE
//
// data/cards.js dosyasının sonuna, sozel-mantik.js içindeki 40
// kartı ekler. Yedek alır, id çakışması varsa hiçbir şey
// yazmadan durur.
//
// Kullanım:
//   1) sozel-mantik.js dosyasını proje köküne koy
//   2) node icerik-ekle-sozel-mantik.js
// ============================================================

const fs = require('fs');
const path = require('path');

const KAYNAK = path.join(__dirname, 'data', 'cards.js');
const YEDEK = path.join(__dirname, 'data', 'cards.sozelmantik-oncesi.js');
const YENI_KARTLAR = path.join(__dirname, 'sozel-mantik.js');

function calistir() {
  if (!fs.existsSync(KAYNAK)) {
    console.error('✗ data/cards.js bulunamadı. Proje kökünde çalıştır.');
    process.exit(1);
  }
  if (!fs.existsSync(YENI_KARTLAR)) {
    console.error('✗ sozel-mantik.js bulunamadı. Onu da proje köküne koy.');
    process.exit(1);
  }

  const ham = fs.readFileSync(KAYNAK, 'utf8');

  // Yeni kartları yükle (ESM export'unu CJS'e çevirerek)
  let kaynakMetin = fs.readFileSync(YENI_KARTLAR, 'utf8');
  kaynakMetin = kaynakMetin.replace('export const SOZEL_MANTIK_KARTLARI', 'const YENI');
  kaynakMetin += '\nmodule.exports = YENI;\n';
  fs.writeFileSync('/tmp/_yeni_kartlar.js', kaynakMetin);
  const yeniKartlar = require('/tmp/_yeni_kartlar.js');

  // Mevcut id'lerle çakışma var mı kontrol et
  const mevcutIdler = new Set();
  ham.split('\n').forEach(s => {
    const m = s.match(/id:\s*"([^"]+)"/);
    if (m) mevcutIdler.add(m[1]);
  });

  const cakisan = yeniKartlar.filter(k => mevcutIdler.has(k.id));
  if (cakisan.length) {
    console.error('✗ Şu id\'ler zaten var, hiçbir şey eklenmedi:');
    cakisan.forEach(k => console.error('   ' + k.id));
    process.exit(1);
  }

  if (!fs.existsSync(YEDEK)) {
    fs.writeFileSync(YEDEK, ham);
    console.log('✓ Yedek alındı: data/cards.sozelmantik-oncesi.js');
  }

  // Her yeni kartı, dosyadaki mevcut kart nesnesiyle aynı biçimde yaz
  const satirlar = yeniKartlar.map(k => {
    const sik = JSON.stringify(k.secenekler);
    return `  { id: "${k.id}", ders: "${k.ders}", unite: "${k.unite}", soru: ${JSON.stringify(k.soru)}, cevap: ${JSON.stringify(k.cevap)}, secenekler: ${sik}, lgsKapsam: true },`;
  });

  // "];" ile biten kapanışın hemen öncesine ekle (dizinin sonuna)
  const kapanisIndex = ham.lastIndexOf('];');
  if (kapanisIndex === -1) {
    console.error('✗ data/cards.js içinde dizi kapanışı ("];") bulunamadı, elle kontrol et.');
    process.exit(1);
  }

  const yeni = ham.slice(0, kapanisIndex)
    + '\n  // ---------- Sözel Mantık (eklendi) ----------\n'
    + satirlar.join('\n') + '\n'
    + ham.slice(kapanisIndex);

  fs.writeFileSync(KAYNAK, yeni);

  console.log('');
  console.log('=== SONUÇ ===');
  console.log('  Eklenen kart:', yeniKartlar.length);
  console.log('  Yeni toplam kart sayısını görmek için:');
  console.log('    grep -c \'id: "\' data/cards.js');
  console.log('');
  console.log('Geri almak için:');
  console.log('  cp data/cards.sozelmantik-oncesi.js data/cards.js');
}

calistir();
