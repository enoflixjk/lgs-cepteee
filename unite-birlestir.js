// ============================================================
// LGS Cepte — Ünite Birleştirme Aracı
//
// Ne yapar: data/cards.js içindeki dağınık ünite adlarını
// LGS müfredatına uygun ana ünitelerde toplar.
// Kart sayısı değişmez, sadece "unite" alanı yeniden yazılır.
//
// Kullanım (proje klasöründe):
//   node unite-birlestir.js
//
// Önce data/cards.yedek.js adıyla yedek alır.
// ============================================================

const fs = require('fs');
const path = require('path');

const KAYNAK = path.join(__dirname, 'data', 'cards.js');
const YEDEK = path.join(__dirname, 'data', 'cards.yedek.js');

// ------------------------------------------------------------
// BİRLEŞTİRME HARİTASI
// Sol taraf: veride geçen dağınık adlar
// Sağ taraf: toplanacağı ana ünite
// ------------------------------------------------------------
const HARITA = {
  // ---------- TÜRKÇE ----------
  turkce: {
    'Yazım ve Noktalama': ['Noktalama', 'Yazım Kuralları', 'Yazım ve Noktalama'],
  },

  // ---------- MATEMATİK ----------
  mat: {
    'Sayılar ve İşlemler': [
      'Sayılar', 'Tam Sayılar', 'Rasyonel Sayılar',
      'Üslü Sayılar', 'Kareköklü İfadeler',
    ],
    'Oran, Orantı ve Yüzde': ['Oran ve Orantı', 'Yüzde ve Oran'],
    'Cebir ve Denklemler': [
      'Denklemler', 'Doğrusal Denklemler', 'Eşitsizlikler',
      'Koordinat Sistemi', 'Cebirsel İfadeler',
    ],
    'Geometri': [
      'Geometri', 'Açılar', 'Dörtgenler', 'Üçgenler',
      'Çember ve Daire', 'Katı Cisimler', 'Dönüşüm Geometrisi',
    ],
    'Veri ve Olasılık': ['İstatistik', 'Olasılık', 'Veri ve Grafik', 'Veri Analizi'],
  },

  // ---------- FEN BİLİMLERİ ----------
  fen: {
    'Vücudumuzdaki Sistemler': [
      'Solunum', 'Solunum Sistemi', 'Dolaşım', 'Dolaşım Sistemi',
      'Sindirim', 'Sindirim Sistemi', 'Boşaltım Sistemi',
      'Sinir Sistemi', 'Üreme ve Gelişim', 'Destek ve Hareket Sistemi',
    ],
    'DNA ve Genetik': ['DNA ve Genetik', 'Genetik', 'Hücre', 'Hücre Bölünmesi'],
    'Madde ve Özellikleri': [
      'Maddenin Halleri', 'Madde Halleri', 'Madde ve Özellikleri',
      'Fiziksel ve Kimyasal Değişim', 'Karışımlar', 'Maddenin Yapısı',
    ],
    'Periyodik Sistem ve Kimya': [
      'Periyodik Tablo', 'Periyodik Sistem', 'Kimyasal Bağlar',
      'Kimyasal Tepkimeler', 'Asit ve Bazlar', 'Asitler ve Bazlar',
    ],
    'Kuvvet, Hareket ve Basınç': [
      'Kuvvet', 'Hareket', 'Kuvvet ve Hareket', 'Basınç', 'Basit Makineler',
    ],
    'Işık, Ses ve Dalgalar': [
      'Işık ve Optik', 'Optik', 'Işık ve Ses', 'Dalgalar', 'Dalgalar ve Ses', 'Ses',
    ],
    'Enerji ve Isı': [
      'Enerji', 'Enerji Dönüşümleri', 'Isı ve Sıcaklık', 'Fotosentez',
    ],
    'Elektrik ve Manyetizma': ['Elektrik', 'Manyetizma', 'Elektrik Yükleri'],
    'Canlılar ve Çevre': ['Canlılar', 'Çevre', 'Sürdürülebilirlik', 'Ekosistem'],
    'Mevsimler ve İklim': ['Mevsimler ve İklim', 'Dünya ve Evren'],
  },

  // ---------- İNKILAP TARİHİ ----------
  inkilap: {
    'I. Dünya Savaşı ve İşgaller': [
      'I. Dünya Savaşı', 'Çanakkale', 'Mondros Ateşkesi ve İşgaller',
      "Osmanlı'nın Son Dönemi", 'Mondros Ateşkesi',
    ],
    'Milli Mücadele': [
      'Milli Mücadele', 'Kurtuluş Savaşı Hazırlık', 'TBMM',
      "TBMM'nin Açılışı", 'Sevr Antlaşması', 'Kongreler',
    ],
    'Savaşlar ve Antlaşmalar': [
      'Mudanya Ateşkesi', 'Lozan Antlaşması', 'Antlaşmalar', 'Cepheler',
    ],
    'Cumhuriyet ve İnkılaplar': [
      'Cumhuriyetin İlanı', 'Hukuk Devrimleri', 'Eğitim Devrimleri',
      'Kültür Devrimleri', 'Dil Devrimi', 'Sosyal Devrimler',
      'Sağlık Devrimleri', 'Ekonomi', 'Çok Partili Hayat',
    ],
    'Atatürk ve Dış Politika': [
      "Atatürk'ün Kişiliği", "Atatürk'ün Ölümü", 'Dış Politika',
      'Atatürk İlkeleri',
    ],
  },

  // ---------- DİN KÜLTÜRÜ ----------
  din: {
    'İnanç Esasları': [
      'İmanın Şartları', "İslam'ın İnanç Esasları", 'Kader İnancı',
      'Melekler', 'Ahiret', 'İman',
    ],
    'İbadetler': [
      "İslam'ın Şartları", "İslam'ın İbadet Esasları", 'İbadet',
      'Namaz', 'Oruç', 'Hac', 'Zekât',
    ],
    'Kur\u2019an-ı Kerim': [
      'Kuran-ı Kerim', "Kur'an-ı Kerim", 'Kur\u2019an-ı Kerim',
      'Kitaplar', 'Kutsal Kitaplar',
    ],
    "Hz. Muhammed'in Hayatı": ["Hz. Muhammed'in Hayatı", 'Hz. Muhammed', 'Peygamberler'],
    'Din ve Hayat': ['Din ve Hayat', 'İslam Medeniyeti', 'Ahlak', 'Din ve Ahlak'],
  },

  // ---------- İNGİLİZCE ----------
  ingilizce: {
    'Zamanlar (Tenses)': [
      'Tenses - Simple Present', 'Tenses - Present Continuous',
      'Tenses - Simple Past', 'Tenses - Past Simple', 'Tenses - Past Continuous',
      'Tenses - Present Perfect', 'Present Perfect', 'Tenses - Future',
      'Tenses - Mixed', 'Tenses',
    ],
    'Modals': ['Modals', 'Modals - Permission', 'Modals - Advice', 'Modals - Ability'],
    'Cümle Yapısı': [
      'Conditionals', 'Conditional', 'Passive Voice', 'Relative Clauses',
      'Reported Speech', 'Indirect Speech', 'Gerunds and Infinitives',
      'Question Tags', 'Connectors', 'Conjunctions', 'Quantifiers',
      'Comparatives', 'Superlatives', 'Adjectives', 'Prepositions',
    ],
    'Kelime Bilgisi': [
      'Vocabulary - Emotions', 'Vocabulary - Adjectives', 'Vocabulary - Verbs',
      'Vocabulary - Daily Life', 'Vocabulary - Jobs', 'Vocabulary - Food',
      'Vocabulary - Clothes', 'Vocabulary - Sport', 'Vocabulary - Media',
      'Vocabulary - Science', 'Vocabulary - Money', 'Vocabulary - City',
      'Vocabulary - Celebrations', 'Vocabulary - Shopping', 'Vocabulary - Travel',
      'Vocabulary - Technology', 'Vocabulary - Nature', 'Vocabulary - Feelings',
      'Vocabulary - Health', 'Vocabulary - Personality', 'Vocabulary - Environment',
      'Vocabulary - Education', 'Phrasal Verbs',
    ],
    'Okuma ve Yazma': [
      'Reading Comprehension', 'Reading Skills', 'Punctuation', 'Writing',
    ],
  },
};

// Ters harita: "eski ad" -> "yeni ad" (ders bazında)
const ters = {};
for (const ders of Object.keys(HARITA)) {
  ters[ders] = {};
  for (const [yeni, eskiler] of Object.entries(HARITA[ders])) {
    for (const eski of eskiler) ters[ders][eski] = yeni;
  }
}

// ------------------------------------------------------------
function calistir() {
  if (!fs.existsSync(KAYNAK)) {
    console.error('✗ data/cards.js bulunamadı. Bu betiği proje kökünde çalıştır.');
    process.exit(1);
  }

  const ham = fs.readFileSync(KAYNAK, 'utf8');

  // Yedek al (varsa üzerine yazma)
  if (!fs.existsSync(YEDEK)) {
    fs.writeFileSync(YEDEK, ham);
    console.log('✓ Yedek alındı: data/cards.yedek.js');
  } else {
    console.log('· Yedek zaten var, dokunulmadı.');
  }

  // Önce mevcut durumu ölç
  const oncesi = sayUnite(ham);

  // unite: "..." alanlarını satır satır yeniden yaz
  let degisen = 0;
  const eslesmeyen = new Set();

  const yeni = ham.split('\n').map(satir => {
    const dersM = satir.match(/ders:\s*"([^"]+)"/);
    const uniteM = satir.match(/unite:\s*"([^"]+)"/);
    if (!dersM || !uniteM) return satir;

    const ders = dersM[1];
    const unite = uniteM[1];
    const harita = ters[ders];
    if (!harita) return satir;

    const hedef = harita[unite];
    if (!hedef) {
      eslesmeyen.add(ders + ' | ' + unite);
      return satir;
    }
    if (hedef === unite) return satir;

    degisen++;
    return satir.replace(/unite:\s*"[^"]+"/, 'unite: "' + hedef + '"');
  }).join('\n');

  fs.writeFileSync(KAYNAK, yeni);

  const sonrasi = sayUnite(yeni);

  console.log('');
  console.log('=== SONUÇ ===');
  console.log('  Değiştirilen kart :', degisen);
  console.log('  Ünite sayısı      :', oncesi.adet, '->', sonrasi.adet);
  console.log('  En küçük ünite    :', oncesi.min, '->', sonrasi.min, 'kart');
  console.log('  5 kart altı ünite :', oncesi.kucuk, '->', sonrasi.kucuk);
  console.log('');
  console.log('=== YENİ ÜNİTE DAĞILIMI ===');
  for (const [k, v] of sonrasi.liste) {
    console.log('  ' + String(v).padStart(4) + '  ' + k);
  }

  if (eslesmeyen.size) {
    console.log('');
    console.log('=== HARİTADA OLMAYAN (dokunulmadı) ===');
    [...eslesmeyen].sort().forEach(x => console.log('  ' + x));
    console.log('');
    console.log('Bunlar zaten yeterince büyükse sorun yok.');
    console.log('Küçükse bana bildir, haritaya eklerim.');
  }

  console.log('');
  console.log('Geri almak istersen:');
  console.log('  cp data/cards.yedek.js data/cards.js');
}

function sayUnite(metin) {
  const say = {};
  metin.split('\n').forEach(s => {
    const d = s.match(/ders:\s*"([^"]+)"/);
    const u = s.match(/unite:\s*"([^"]+)"/);
    if (d && u) {
      const k = d[1] + ' | ' + u[1];
      say[k] = (say[k] || 0) + 1;
    }
  });
  const liste = Object.entries(say).sort((a, b) => a[1] - b[1]);
  return {
    adet: liste.length,
    min: liste.length ? liste[0][1] : 0,
    kucuk: liste.filter(x => x[1] < 5).length,
    liste,
  };
}

calistir();
