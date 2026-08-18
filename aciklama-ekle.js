// ============================================================
// AÇIKLAMA EKLEME ARACI
//
// data/cards.js içindeki kartlara "aciklama" alanı ekler.
// Uygulama, yanlış cevaptan sonra bu metni "NEDEN?" kutusunda
// gösterir. Alanı olmayan kartlarda kutu hiç görünmez.
//
// KULLANIM
//   1) aciklamalar.json dosyası oluştur (aşağıdaki biçimde)
//   2) node aciklama-ekle.js
//
// aciklamalar.json biçimi:
// {
//   "lmat-0001": "Üslü sayılarda taban aynıysa üsler toplanır: 2³ × 2² = 2⁵ = 32",
//   "lfen-0012": "Fotosentez klorofilde gerçekleşir; ışık enerjisi kimyasal enerjiye çevrilir."
// }
// ============================================================

const fs = require('fs');
const path = require('path');

const KAYNAK = path.join(__dirname, 'data', 'cards.js');
const YEDEK = path.join(__dirname, 'data', 'cards.aciklama-oncesi.js');
const ACIKLAMA = path.join(__dirname, 'aciklamalar.json');

function calistir() {
  if (!fs.existsSync(KAYNAK)) {
    console.error('✗ data/cards.js bulunamadı. Proje kökünde çalıştır.');
    process.exit(1);
  }
  if (!fs.existsSync(ACIKLAMA)) {
    console.error('✗ aciklamalar.json bulunamadı.');
    console.error('  Örnek içerik:');
    console.error('  { "lmat-0001": "Açıklama metni buraya" }');
    process.exit(1);
  }

  const ham = fs.readFileSync(KAYNAK, 'utf8');
  let aciklamalar;
  try {
    aciklamalar = JSON.parse(fs.readFileSync(ACIKLAMA, 'utf8'));
  } catch (e) {
    console.error('✗ aciklamalar.json geçerli JSON değil:', e.message);
    process.exit(1);
  }

  if (!fs.existsSync(YEDEK)) {
    fs.writeFileSync(YEDEK, ham);
    console.log('✓ Yedek alındı: data/cards.aciklama-oncesi.js');
  }

  let eklenen = 0;
  let guncellenen = 0;
  const bulunamayan = [];
  const kullanilan = new Set();

  const yeni = ham.split('\n').map(satir => {
    const m = satir.match(/\{\s*id:\s*"([^"]+)"/);
    if (!m) return satir;

    const kid = m[1];
    const metin = aciklamalar[kid];
    if (metin === undefined) return satir;

    kullanilan.add(kid);
    // Metindeki tırnak ve ters bölü işaretlerini kaçır
    const guvenli = String(metin)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, ' ')
      .trim();

    if (/aciklama:\s*"/.test(satir)) {
      guncellenen++;
      return satir.replace(/aciklama:\s*"(?:[^"\\]|\\.)*"/, 'aciklama: "' + guvenli + '"');
    }

    eklenen++;
    // cevap alanından hemen sonra ekle
    if (/cevap:\s*"(?:[^"\\]|\\.)*"/.test(satir)) {
      return satir.replace(/(cevap:\s*"(?:[^"\\]|\\.)*")/, '$1, aciklama: "' + guvenli + '"');
    }
    // cevap bulunamazsa satır sonuna ekle
    return satir.replace(/\}\s*,?\s*$/, ', aciklama: "' + guvenli + '" },');
  }).join('\n');

  Object.keys(aciklamalar).forEach(k => {
    if (!kullanilan.has(k)) bulunamayan.push(k);
  });

  fs.writeFileSync(KAYNAK, yeni);

  // Kaç kartta açıklama var
  const toplam = (yeni.match(/\{\s*id:\s*"/g) || []).length;
  const aciklamali = (yeni.match(/aciklama:\s*"/g) || []).length;

  console.log('');
  console.log('=== SONUÇ ===');
  console.log('  Yeni eklenen    :', eklenen);
  console.log('  Güncellenen     :', guncellenen);
  console.log('  Toplam kart     :', toplam);
  console.log('  Açıklamalı kart :', aciklamali, '(%' + Math.round((aciklamali / toplam) * 100) + ')');

  if (bulunamayan.length) {
    console.log('');
    console.log('=== KARTTA BULUNAMAYAN ID\'LER ===');
    bulunamayan.forEach(k => console.log('  ' + k));
    console.log('  Bu id\'ler data/cards.js içinde yok. Yazımı kontrol et.');
  }

  console.log('');
  console.log('Geri almak için:');
  console.log('  cp data/cards.aciklama-oncesi.js data/cards.js');
}

calistir();