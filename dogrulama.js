// ============================================================
// DOĞRULAMA — data/cards.js dosyasının sözdizimi geçerli mi,
// kaç kart var, kontrol eder. Hiçbir şeyi değiştirmez.
//
// Kullanım: node dogrulama.js
// ============================================================

const fs = require('fs');
const path = require('path');

const KAYNAK = path.join(__dirname, 'data', 'cards.js');

let ham = fs.readFileSync(KAYNAK, 'utf8');
ham = ham.replace('export const CARDS', 'const CARDS') + '\nmodule.exports = CARDS;\n';
fs.writeFileSync('/tmp/_dogrulama_cards.js', ham);

try {
  const CARDS = require('/tmp/_dogrulama_cards.js');
  console.log('SORUNSUZ: data/cards.js gecerli.');
  console.log('Toplam kart sayisi:', CARDS.length);
  console.log('Son kart id:', CARDS[CARDS.length - 1].id);
} catch (e) {
  console.log('HATA VAR:');
  console.log(e.message);
}
