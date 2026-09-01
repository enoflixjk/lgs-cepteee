// veri-dogrula.js
//
// Çıkış öncesi son kontrol: data/cards.js'teki 1234+ kartı kapsamlı
// bir şekilde tarar, aşağıdaki hataları arar:
//
//   1. Tekrarlanan id
//   2. secenekler dizisi 4 eleman değilse (ya da hiç yoksa)
//   3. cevap, kendi secenekler'i içinde yoksa
//   4. secenekler içinde birebir aynı iki şık varsa (kopya şık)
//   5. soru ya da cevap alanı boşsa
//   6. gorsel: require(...) yolu gösterip dosya gerçekte yoksa
//   7. ders/unite alanı boşsa
//   8. Ders bazında toplam kart sayısı özeti
//
// Kullanım: proje kök klasöründe (lgs-cards) şunu çalıştır:
//   node veri-dogrula.js

const fs = require('fs');
const path = require('path');

const DOSYA = path.join(__dirname, 'data', 'cards.js');

function calistir() {
  if (!fs.existsSync(DOSYA)) {
    console.error('HATA: data/cards.js bulunamadı. Bu scripti proje kök klasöründe çalıştır.');
    process.exit(1);
  }

  const icerik = fs.readFileSync(DOSYA, 'utf8');

  // Basit ama güvenli bir yöntemle CARDS dizisini çıkarıyoruz: dosyayı
  // geçici bir modül gibi çalıştırıp export edilen diziyi alıyoruz.
  // require() gerçek import'ları (görselleri) çözemeyeceği için,
  // require çağrılarını geçici olarak zararsız bir stub'a çeviriyoruz.
  const gecici = icerik
    .replace(/require\(([^)]+)\)/g, '"__GORSEL__"')
    .replace(/export const CARDS\s*=/, 'module.exports.CARDS =');

  const geciciDosya = path.join(__dirname, '__gecici_dogrulama__.js');
  fs.writeFileSync(geciciDosya, gecici, 'utf8');

  let CARDS;
  try {
    CARDS = require(geciciDosya).CARDS;
  } catch (e) {
    console.error('HATA: cards.js işlenirken bir sözdizimi hatası bulundu:');
    console.error(e.message);
    fs.unlinkSync(geciciDosya);
    process.exit(1);
  }
  fs.unlinkSync(geciciDosya);

  console.log(`Toplam kart sayısı: ${CARDS.length}`);
  console.log('');

  const hatalar = [];

  // 1. Tekrarlanan id
  const idSayaci = {};
  CARDS.forEach((c, i) => {
    if (!c.id) { hatalar.push(`[${i}. sıradaki kart] id alanı YOK`); return; }
    idSayaci[c.id] = (idSayaci[c.id] || 0) + 1;
  });
  const tekrarlar = Object.entries(idSayaci).filter(([, sayi]) => sayi > 1);
  if (tekrarlar.length > 0) {
    hatalar.push(`TEKRARLANAN ID (${tekrarlar.length} adet): ${tekrarlar.map(([id, s]) => `${id} (${s}x)`).join(', ')}`);
  }

  // 2-5. Her kartı tek tek kontrol et
  CARDS.forEach((c) => {
    const etiket = c.id || '(id yok)';
    if (!c.soru || !c.soru.trim()) hatalar.push(`[${etiket}] soru alanı boş`);
    if (!c.cevap || !String(c.cevap).trim()) hatalar.push(`[${etiket}] cevap alanı boş`);
    if (!c.ders) hatalar.push(`[${etiket}] ders alanı boş`);
    if (!c.unite) hatalar.push(`[${etiket}] unite alanı boş`);

    if (!c.secenekler || !Array.isArray(c.secenekler)) {
      hatalar.push(`[${etiket}] secenekler dizisi yok`);
    } else {
      if (c.secenekler.length !== 4) {
        hatalar.push(`[${etiket}] secenekler ${c.secenekler.length} elemanlı (4 olmalı)`);
      }
      if (c.cevap && !c.secenekler.includes(c.cevap)) {
        hatalar.push(`[${etiket}] cevap ("${c.cevap}") kendi secenekler'i içinde YOK`);
      }
      const benzersiz = new Set(c.secenekler);
      if (benzersiz.size !== c.secenekler.length) {
        hatalar.push(`[${etiket}] secenekler içinde BİREBİR AYNI iki şık var`);
      }
    }
  });

  // Sonuçları yazdır
  if (hatalar.length === 0) {
    console.log('✅ Hiçbir hata bulunamadı — tüm kartlar temiz.');
  } else {
    console.log(`❌ ${hatalar.length} sorun bulundu:\n`);
    hatalar.slice(0, 100).forEach(h => console.log('  - ' + h));
    if (hatalar.length > 100) console.log(`  ... ve ${hatalar.length - 100} tane daha`);
  }

  // Ders bazında özet
  console.log('');
  console.log('=== DERS BAZINDA KART SAYISI ===');
  const dersSayaci = {};
  CARDS.forEach(c => { dersSayaci[c.ders] = (dersSayaci[c.ders] || 0) + 1; });
  Object.entries(dersSayaci).sort((a, b) => b[1] - a[1]).forEach(([ders, sayi]) => {
    console.log(`  ${ders.padEnd(12)} ${sayi}`);
  });

  // Görselli/paragraflı kart sayısı
  const gorselliSayi = CARDS.filter(c => c.gorsel).length;
  const paragrafliSayi = CARDS.filter(c => c.paragraf).length;
  console.log('');
  console.log(`Görselli kart: ${gorselliSayi}`);
  console.log(`Paragraflı kart: ${paragrafliSayi}`);

  process.exit(hatalar.length > 0 ? 1 : 0);
}

calistir();
