// ============================================================
// EKSİK VİRGÜL DÜZELTİCİ
//
// İçerik ekleme script'leri (sözel mantık, basit makineler,
// ingilizce tema) yeni kartları dosyanın sonuna eklerken, o an
// dosyadaki SON kartın sonunda virgül olmayabilir — çünkü o kart
// eskiden dizinin gerçek son elemanıydı ve virgülsüz yazılmıştı.
// Bu araç, her "// ---------- ... (eklendi) ----------" yorumundan
// hemen önceki "}" karakterini kontrol eder, virgül eksikse ekler.
//
// Kullanım: node virgul-duzelt.js
// ============================================================

const fs = require('fs');
const path = require('path');

const KAYNAK = path.join(__dirname, 'data', 'cards.js');
const YEDEK = path.join(__dirname, 'data', 'cards.virgulduzelt-oncesi.js');

function calistir() {
  if (!fs.existsSync(KAYNAK)) {
    console.error('✗ data/cards.js bulunamadı. Proje kökünde çalıştır.');
    process.exit(1);
  }

  let ham = fs.readFileSync(KAYNAK, 'utf8');
  const oncesi = ham;

  // Her "// ---------- X (eklendi) ----------" yorumundan hemen
  // önceki son "}" karakterini bul. Eğer ondan sonra (boşluk hariç)
  // virgül yoksa, virgül ekle.
  const desen = /\}(\s*\n\s*\n\s*\/\/ -{2,} .+? \(eklendi\) -{2,})/g;
  let sayac = 0;

  ham = ham.replace(desen, (tam, sonrasi) => {
    sayac++;
    return '},' + sonrasi;
  });

  if (sayac === 0) {
    console.log('Düzeltilecek eksik virgül bulunamadı.');
    console.log('Dosya zaten sağlam olabilir ya da yorum formatı beklenenden farklı.');
    return;
  }

  if (!fs.existsSync(YEDEK)) {
    fs.writeFileSync(YEDEK, oncesi);
    console.log('Yedek alindi: data/cards.virgulduzelt-oncesi.js');
  }

  fs.writeFileSync(KAYNAK, ham);
  console.log(sayac + ' eksik virgul duzeltildi.');
  console.log('Simdi dogrulama.js dosyasini calistir.');
}

calistir();
