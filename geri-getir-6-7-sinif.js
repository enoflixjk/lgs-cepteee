// ============================================================
// 6-7. SINIF KONULARINI GERİ GETİR
//
// Daha önce lgsKapsam:false ile işaretlenmiş kartları normal
// çalışma/quiz havuzuna geri döndürür (artık "TEKRAR" etiketi
// taşımazlar, ünite yüzdesine normal katılırlar).
//
// AMA deneme sınavı (LGS simülasyonu) dağılımını BOZMAZ — bunun
// için ayrı bir "denemeDahil: false" bayrağı ekliyoruz. Yani:
//   - lgsKapsam: false  ->  lgsKapsam: true, denemeDahil: false
//
// Bu, iki farklı şeyi ayırıyor:
//   lgsKapsam    = kart normal çalışma havuzunda mı görünsün?
//   denemeDahil  = kart deneme sınavı dağılımına girsin mi?
//
// Kullanım: node geri-getir-6-7-sinif.js
// ============================================================

const fs = require('fs');
const path = require('path');

const KAYNAK = path.join(__dirname, 'data', 'cards.js');
const YEDEK = path.join(__dirname, 'data', 'cards.genidonusum-oncesi.js');

function calistir() {
  if (!fs.existsSync(KAYNAK)) {
    console.error('✗ data/cards.js bulunamadı. Proje kökünde çalıştır.');
    process.exit(1);
  }

  let ham = fs.readFileSync(KAYNAK, 'utf8');
  const oncesi = ham;

  // "lgsKapsam: false" geçen her satırı bul ve dönüştür:
  //   lgsKapsam: false  ->  lgsKapsam: true, denemeDahil: false
  //
  // Regex, satırın başka yerlerini bozmadan yalnızca bu alanı hedefler.
  let sayac = 0;
  ham = ham.replace(/lgsKapsam:\s*false/g, () => {
    sayac++;
    return 'lgsKapsam: true, denemeDahil: false';
  });

  if (sayac === 0) {
    console.log('Hiç "lgsKapsam: false" bulunamadı — belki zaten dönüştürülmüş,');
    console.log('ya da alan adı farklı. data/cards.js dosyasını elle kontrol et.');
    return;
  }

  if (!fs.existsSync(YEDEK)) {
    fs.writeFileSync(YEDEK, oncesi);
    console.log('Yedek alındı: data/cards.genidonusum-oncesi.js');
  }

  fs.writeFileSync(KAYNAK, ham);
  console.log(sayac + ' kart normal havuza döndürüldü (deneme sınavı hariç).');
  console.log('');
  console.log('Doğrulamak için: node dogrulama.js');
  console.log('Geri almak için : cp data/cards.genidonusum-oncesi.js data/cards.js');
}

calistir();
