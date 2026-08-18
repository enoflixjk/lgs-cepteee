// ============================================================
// LGS MÜFREDAT HİZALAMA
//
// Üç iş yapar:
//   1) Üniteleri resmi LGS adlarına çevirir
//   2) LGS'de sorulmayan kartlara lgsKapsam: false ekler
//   3) İngilizce kartlarını LGS temalarına dağıtır
//
// Kart silmez, soru-cevap içeriğine dokunmaz.
// Kullanım: node lgs-hizala.js
// ============================================================

const fs = require('fs');
const path = require('path');

const KAYNAK = path.join(__dirname, 'data', 'cards.js');
const YEDEK = path.join(__dirname, 'data', 'cards.hizalama-oncesi.js');

// ------------------------------------------------------------
// 1) ÜNİTE HARİTASI
// null  → LGS kapsamı dışı (6-7. sınıf), ünite adı korunur
// metin → resmi LGS ünite adı
// ------------------------------------------------------------
const HARITA = {
  turkce: {
    'Sözcükte Anlam': 'Sözcükte Anlam',
    'Cümle Bilgisi': 'Cümlede Anlam',
    'Paragraf': 'Parçada Anlam',
    'Metin Türleri': 'Metin Türleri',
    'Edebi Türler': 'Metin Türleri',
    'Şiir Bilgisi': 'Söz Sanatları',
    'Yazım ve Noktalama': 'Yazım ve Noktalama',
    'Sözcük Yapısı': 'Fiilimsiler',
    'Sözcük Türleri': 'Cümlenin Ögeleri',
    'Ses Bilgisi': null,                    // LGS'de sorulmuyor
  },

  mat: {
    'Çarpanlar ve Katlar': 'Çarpanlar ve Katlar',
    'Sayılar ve İşlemler': 'Üslü ve Kareköklü İfadeler',
    'Cebir ve Denklemler': 'Cebirsel İfadeler ve Denklemler',
    'Geometri': 'Üçgenler ve Geometri',
    'Veri ve Olasılık': 'Veri Analizi ve Olasılık',
    'Oran, Orantı ve Yüzde': null,          // 7. sınıf
  },

  fen: {
    'Mevsimler ve İklim': 'Mevsimler ve İklim',
    'Evren ve Güneş Sistemi': 'Mevsimler ve İklim',
    'DNA ve Genetik': 'DNA ve Genetik Kod',
    'Kuvvet, Hareket ve Basınç': 'Basınç',
    'Madde ve Özellikleri': 'Madde ve Endüstri',
    'Madde ve Atom': 'Madde ve Endüstri',
    'Periyodik Sistem ve Kimya': 'Madde ve Endüstri',
    'Enerji ve Isı': 'Enerji Dönüşümleri ve Çevre Bilimi',
    'Canlılar ve Çevre': 'Canlılar ve Enerji İlişkileri',
    'Elektrik ve Manyetizma': 'Elektrik Yükleri ve Elektrik Enerjisi',
    'Vücudumuzdaki Sistemler': null,        // 6. sınıf
    'Işık, Ses ve Dalgalar': null,          // 5-7. sınıf
  },

  inkilap: {
    'I. Dünya Savaşı ve İşgaller': 'Bir Kahraman Doğuyor',
    'Milli Mücadele': 'Milli Uyanış',
    'Kurtuluş Savaşı Cepheleri': 'Milli Bir Destan',
    'Savaşlar ve Antlaşmalar': 'Milli Bir Destan',
    'Cumhuriyet ve İnkılaplar': 'Atatürkçülük ve Çağdaşlaşan Türkiye',
    'Devrimler': 'Atatürkçülük ve Çağdaşlaşan Türkiye',
    'Atatürk ve Dış Politika': 'Atatürk Dönemi Dış Politika',
  },

  din: {
    'İnanç Esasları': 'Kader İnancı',
    'İbadetler': 'Zekât ve Sadaka',
    'Din ve Hayat': 'Din ve Hayat',
    'Dini Kavramlar': 'Din ve Hayat',
    "Hz. Muhammed'in Hayatı": "Hz. Muhammed'in Örnekliği",
    'Kur\u2019an-ı Kerim': "Kur'an-ı Kerim ve Özellikleri",
    "Kur'an-ı Kerim": "Kur'an-ı Kerim ve Özellikleri",
  },
};

// ------------------------------------------------------------
// 2) İNGİLİZCE TEMA SINIFLANDIRICI
//
// LGS İngilizce tema bazlıdır. Kartların soru/cevap metnindeki
// anahtar kelimelere göre temalara dağıtılır.
// Hiçbirine uymayan gramer kartları "Dil Bilgisi"nde toplanır
// ve kapsam dışı işaretlenir.
// ------------------------------------------------------------
const TEMA = [
  ['Friendship', ['friend', 'arkadaş', 'trust', 'güven', 'share', 'kindness', 'loyal', 'sadık', 'honest', 'dürüst', 'quarrel', 'relationship']],
  ['Teen Life', ['teen', 'ergen', 'hobby', 'hobi', 'free time', 'boş zaman', 'sport', 'spor', 'music', 'müzik', 'club', 'kulüp', 'personality', 'kişilik', 'appearance', 'görünüş']],
  ['In the Kitchen', ['kitchen', 'mutfak', 'recipe', 'tarif', 'cook', 'pişir', 'fry', 'boil', 'kaynat', 'bake', 'slice', 'doğra', 'food', 'yemek', 'meal', 'öğün', 'spoon', 'kaşık', 'fork', 'çatal', 'plate', 'tabak', 'ingredient', 'malzeme']],
  ['On the Phone', ['phone', 'telefon', 'call', 'ara', 'message', 'mesaj', 'hold on', 'speaking', 'dial', 'ring', 'text']],
  ['The Internet', ['internet', 'online', 'website', 'site', 'download', 'indir', 'upload', 'social media', 'sosyal medya', 'password', 'şifre', 'email', 'e-posta', 'browser', 'search engine']],
  ['Adventures', ['adventure', 'macera', 'rafting', 'climb', 'tırman', 'safari', 'camp', 'kamp', 'extreme', 'parachute', 'diving', 'dalış', 'brave', 'cesur', 'risk']],
  ['Tourism', ['tourism', 'turizm', 'travel', 'seyahat', 'holiday', 'tatil', 'hotel', 'otel', 'flight', 'uçuş', 'passport', 'pasaport', 'luggage', 'bavul', 'sightseeing', 'tourist', 'turist', 'booking', 'rezervasyon']],
  ['Chores', ['chore', 'ev işi', 'clean', 'temizle', 'wash', 'yıka', 'iron', 'ütü', 'vacuum', 'süpür', 'tidy', 'topla', 'laundry', 'çamaşır', 'dishes', 'bulaşık', 'housework']],
  ['Science', ['science', 'bilim', 'invention', 'icat', 'invent', 'experiment', 'deney', 'scientist', 'bilim insan', 'discovery', 'keşif', 'technology', 'teknoloji', 'laboratory', 'research']],
  ['Natural Forces', ['earthquake', 'deprem', 'flood', 'sel', 'storm', 'fırtına', 'hurricane', 'kasırga', 'volcano', 'yanardağ', 'avalanche', 'çığ', 'disaster', 'afet', 'tsunami', 'drought', 'kuraklık', 'landslide', 'lightning', 'şimşek']],
];

function ingilizceTema(soru, cevap, secenekler) {
  const metin = (String(soru) + ' ' + String(cevap) + ' ' + String(secenekler || '')).toLowerCase();
  let enIyi = null, enCok = 0;
  TEMA.forEach(([ad, kelimeler]) => {
    let puan = 0;
    kelimeler.forEach(k => { if (metin.includes(k.toLowerCase())) puan++; });
    if (puan > enCok) { enCok = puan; enIyi = ad; }
  });
  return enCok > 0 ? enIyi : null;
}

// ------------------------------------------------------------
function calistir() {
  if (!fs.existsSync(KAYNAK)) {
    console.error('✗ data/cards.js bulunamadı. Proje kökünde çalıştır.');
    process.exit(1);
  }

  const ham = fs.readFileSync(KAYNAK, 'utf8');
  if (!fs.existsSync(YEDEK)) {
    fs.writeFileSync(YEDEK, ham);
    console.log('✓ Yedek alındı: data/cards.hizalama-oncesi.js\n');
  } else {
    console.log('· Yedek zaten var\n');
  }

  let yenidenAdlandirilan = 0;
  let kapsamDisi = 0;
  let ingSiniflanan = 0;
  let ingGramer = 0;
  const sonuc = {};

  const yeni = ham.split('\n').map(satir => {
    const dm = satir.match(/ders:\s*"([^"]+)"/);
    const um = satir.match(/unite:\s*"([^"]+)"/);
    if (!dm || !um) return satir;

    const ders = dm[1];
    const eskiU = um[1];
    let yeniU = eskiU;
    let disi = false;

    if (ders === 'ingilizce') {
      // Metinden tema çıkar
      const sm = satir.match(/soru:\s*"((?:[^"\\]|\\.)*)"/);
      const cm = satir.match(/cevap:\s*"((?:[^"\\]|\\.)*)"/);
      const km = satir.match(/secenekler:\s*\[([^\]]*)\]/);
      const tema = ingilizceTema(sm ? sm[1] : '', cm ? cm[1] : '', km ? km[1] : '');
      if (tema) { yeniU = tema; ingSiniflanan++; }
      else { yeniU = 'Dil Bilgisi'; disi = true; ingGramer++; }
    } else {
      const harita = HARITA[ders];
      if (harita && eskiU in harita) {
        const hedef = harita[eskiU];
        if (hedef === null) disi = true;
        else yeniU = hedef;
      }
    }

    if (yeniU !== eskiU) yenidenAdlandirilan++;
    if (disi) kapsamDisi++;

    const anahtar = ders + '|' + yeniU + (disi ? ' (kapsam dışı)' : '');
    sonuc[anahtar] = (sonuc[anahtar] || 0) + 1;

    let ciktı = satir;
    if (yeniU !== eskiU) {
      ciktı = ciktı.replace(/unite:\s*"[^"]*"/, 'unite: "' + yeniU + '"');
    }
    // lgsKapsam alanı: yalnızca kapsam dışı olanlara eklenir
    if (disi && !/lgsKapsam:/.test(ciktı)) {
      ciktı = ciktı.replace(/(unite:\s*"[^"]*")/, '$1, lgsKapsam: false');
    }
    return ciktı;
  }).join('\n');

  fs.writeFileSync(KAYNAK, yeni);

  console.log('=== SONUÇ ===');
  console.log('  Ünitesi değişen kart :', yenidenAdlandirilan);
  console.log('  Kapsam dışı işaretli :', kapsamDisi);
  console.log('  İngilizce temaya oturan:', ingSiniflanan);
  console.log('  İngilizce gramer (kapsam dışı):', ingGramer);
  console.log('');
  console.log('=== YENİ ÜNİTE DAĞILIMI ===');
  const AD = { turkce: 'Türkçe', mat: 'Matematik', fen: 'Fen', inkilap: 'İnkılap', din: 'Din', ingilizce: 'İngilizce' };
  ['turkce', 'mat', 'fen', 'inkilap', 'din', 'ingilizce'].forEach(d => {
    const satirlar = Object.entries(sonuc).filter(([k]) => k.startsWith(d + '|'));
    if (!satirlar.length) return;
    console.log('\n  ' + AD[d]);
    satirlar.sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
      console.log('    ' + String(n).padStart(4) + '  ' + k.split('|')[1]);
    });
  });

  console.log('');
  console.log('Geri almak için:');
  console.log('  cp data/cards.hizalama-oncesi.js data/cards.js');
}

calistir();
