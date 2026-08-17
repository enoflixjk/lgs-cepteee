// ============================================================
// LGS Cepte — Kalan İki Küçük Üniteyi Birleştirme
//
// Birinci turdan sonra iki ünite küçük kaldı:
//   fen | Mevsimler ve İklim (2 kart)
//   ingilizce | Okuma ve Yazma (4 kart)
//
// Bunlar en yakın anlamlı komşularına katılıyor.
// Kullanım: node unite-birlestir2.js
// ============================================================

const fs = require('fs');
const path = require('path');

const KAYNAK = path.join(__dirname, 'data', 'cards.js');

const TASI = {
  // "Mevsimler ve İklim" zaten Dünya/Evren konusu — oraya katılıyor
  fen: { 'Mevsimler ve İklim': 'Evren ve Güneş Sistemi' },
  // Okuma-yazma becerileri kelime bilgisiyle birlikte çalışılır
  ingilizce: { 'Okuma ve Yazma': 'Kelime Bilgisi' },
};

if (!fs.existsSync(KAYNAK)) {
  console.error('✗ data/cards.js bulunamadı. Proje kökünde çalıştır.');
  process.exit(1);
}

let degisen = 0;
const yeni = fs.readFileSync(KAYNAK, 'utf8').split('\n').map(satir => {
  const d = satir.match(/ders:\s*"([^"]+)"/);
  const u = satir.match(/unite:\s*"([^"]+)"/);
  if (!d || !u) return satir;
  const hedef = TASI[d[1]] && TASI[d[1]][u[1]];
  if (!hedef) return satir;
  degisen++;
  return satir.replace(/unite:\s*"[^"]+"/, 'unite: "' + hedef + '"');
}).join('\n');

fs.writeFileSync(KAYNAK, yeni);

// Yeni durum
const say = {};
yeni.split('\n').forEach(s => {
  const d = s.match(/ders:\s*"([^"]+)"/);
  const u = s.match(/unite:\s*"([^"]+)"/);
  if (d && u) { const k = d[1] + ' | ' + u[1]; say[k] = (say[k] || 0) + 1; }
});
const liste = Object.entries(say).sort((a, b) => a[1] - b[1]);

console.log('  Taşınan kart      :', degisen);
console.log('  Ünite sayısı      :', liste.length);
console.log('  En küçük ünite    :', liste[0][1], 'kart ·', liste[0][0]);
console.log('  10 kart altı      :', liste.filter(x => x[1] < 10).length);
console.log('');
console.log('=== EN KÜÇÜK 8 ÜNİTE ===');
liste.slice(0, 8).forEach(([k, v]) => console.log('  ' + String(v).padStart(4) + '  ' + k));
console.log('');
console.log('Toplam kart:', Object.values(say).reduce((a, b) => a + b, 0));
