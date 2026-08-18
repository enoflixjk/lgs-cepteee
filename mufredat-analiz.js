// ============================================================
// LGS MÜFREDAT UYUM ANALİZİ
//
// MEB'e göre LGS'de yalnızca 8. sınıf konuları çıkar.
// Bu araç, kart verisindeki ünitelerin ne kadarının resmi
// LGS kapsamında olduğunu gösterir. Hiçbir şeyi değiştirmez,
// yalnızca rapor üretir.
//
// Kullanım: node mufredat-analiz.js
// ============================================================

const fs = require('fs');
const path = require('path');

const KAYNAK = path.join(__dirname, 'data', 'cards.js');

// ------------------------------------------------------------
// RESMİ LGS MÜFREDATI (2027, MEB)
// Kaynak: MEB duyuruları + LGS soru dağılımları 2018-2024
// agirlik: son yılların ortalama soru sayısı
// ------------------------------------------------------------
const LGS_MUFREDAT = {
  turkce: {
    toplamSoru: 20,
    uniteler: {
      'Sözcükte Anlam': 2,
      'Cümlede Anlam': 2,
      'Parçada Anlam': 6,
      'Sözel Mantık': 4,
      'Metin Türleri': 1,
      'Söz Sanatları': 1,
      'Yazım Kuralları': 1,
      'Noktalama': 1,
      'Fiilimsiler': 1,
      'Cümlenin Ögeleri': 1,
      'Cümle Türleri': 1,
      'Fiillerde Çatı': 1,
      'Anlatım Bozukluğu': 1,
      'Deyimler ve Atasözleri': 1,
    },
  },
  mat: {
    toplamSoru: 20,
    uniteler: {
      'Çarpanlar ve Katlar': 2,
      'Üslü İfadeler': 3,
      'Kareköklü İfadeler': 3,
      'Veri Analizi': 2,
      'Olasılık': 1,
      'Cebirsel İfadeler': 3,
      'Doğrusal Denklemler': 3,
      'Eşitsizlikler': 1,
      'Üçgenler': 2,
      'Eşlik ve Benzerlik': 1,
      'Geometrik Cisimler': 1,
      'Dönüşüm Geometrisi': 1,
    },
  },
  fen: {
    toplamSoru: 20,
    uniteler: {
      'Mevsimler ve İklim': 2,
      'DNA ve Genetik Kod': 5,
      'Basınç': 3,
      'Madde ve Endüstri': 5,
      'Basit Makineler': 2,
      'Canlılar ve Enerji İlişkileri': 2,
      'Enerji Dönüşümleri ve Çevre Bilimi': 3,
      'Elektrik Yükleri ve Elektrik Enerjisi': 3,
    },
  },
  inkilap: {
    toplamSoru: 10,
    uniteler: {
      'Bir Kahraman Doğuyor': 2,
      'Milli Uyanış': 2,
      'Milli Bir Destan': 2,
      'Atatürkçülük ve Çağdaşlaşan Türkiye': 4,
      'Demokratikleşme Çabaları': 1,
      'Atatürk Dönemi Dış Politika': 1,
      'İkinci Dünya Savaşı ve Sonrası': 1,
    },
  },
  din: {
    toplamSoru: 10,
    uniteler: {
      'Kader İnancı': 3,
      'Zekât ve Sadaka': 2,
      'Din ve Hayat': 3,
      "Hz. Muhammed'in Örnekliği": 2,
      "Kur'an-ı Kerim ve Özellikleri": 2,
    },
  },
  ingilizce: {
    toplamSoru: 10,
    uniteler: {
      'Friendship': 2,
      'Teen Life': 2,
      'In the Kitchen': 1,
      'On the Phone': 1,
      'The Internet': 1,
      'Adventures': 1,
      'Tourism': 1,
      'Chores': 1,
      'Science': 1,
      'Natural Forces': 1,
    },
  },
};

// Bizdeki ünite adlarının resmi müfredattaki karşılığı.
// Eşleşmeyenler LGS kapsamı dışı sayılır.
const ESLESTIRME = {
  turkce: {
    'Sözcükte Anlam': 'Sözcükte Anlam',
    'Cümle Bilgisi': 'Cümlede Anlam',
    'Paragraf': 'Parçada Anlam',
    'Metin Türleri': 'Metin Türleri',
    'Edebi Türler': 'Metin Türleri',
    'Yazım ve Noktalama': 'Yazım Kuralları',
    'Sözcük Yapısı': 'Fiilimsiler',
    'Sözcük Türleri': 'Cümlenin Ögeleri',
    'Ses Bilgisi': null,        // 8. sınıf LGS konusu değil
    'Şiir Bilgisi': null,
  },
  mat: {
    'Çarpanlar ve Katlar': 'Çarpanlar ve Katlar',
    'Sayılar ve İşlemler': 'Üslü İfadeler',
    'Cebir ve Denklemler': 'Cebirsel İfadeler',
    'Geometri': 'Üçgenler',
    'Veri ve Olasılık': 'Veri Analizi',
    'Oran, Orantı ve Yüzde': null,   // 7. sınıf
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
    'Vücudumuzdaki Sistemler': null,   // 6. sınıf
    'Işık, Ses ve Dalgalar': null,     // 5-7. sınıf
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
  },
  ingilizce: {
    'Kelime Bilgisi': null,        // tema bazlı değil, dağınık
    'Zamanlar (Tenses)': null,
    'Cümle Yapısı': null,
    'Modals': null,
  },
};

const DERS_AD = {
  turkce: 'Türkçe', mat: 'Matematik', fen: 'Fen Bilimleri',
  inkilap: 'İnkılap Tarihi', din: 'Din Kültürü', ingilizce: 'İngilizce',
};

function calistir() {
  if (!fs.existsSync(KAYNAK)) {
    console.error('✗ data/cards.js bulunamadı. Proje kökünde çalıştır.');
    process.exit(1);
  }

  const ham = fs.readFileSync(KAYNAK, 'utf8');
  const kartlar = [];
  ham.split('\n').forEach(s => {
    const d = s.match(/ders:\s*"([^"]+)"/);
    const u = s.match(/unite:\s*"([^"]+)"/);
    if (d && u) kartlar.push({ ders: d[1], unite: u[1] });
  });

  console.log('Toplam kart:', kartlar.length);
  console.log('');

  let kapsamIci = 0;
  let kapsamDisi = 0;
  const disiListe = [];

  Object.keys(LGS_MUFREDAT).forEach(dersId => {
    const dk = kartlar.filter(c => c.ders === dersId);
    if (!dk.length) return;

    const harita = ESLESTIRME[dersId] || {};
    const sayac = {};
    let ici = 0, disi = 0;

    dk.forEach(c => {
      const hedef = harita[c.unite];
      if (hedef === null) { disi++; return; }
      if (hedef === undefined) { disi++; return; }
      ici++;
      sayac[hedef] = (sayac[hedef] || 0) + 1;
    });

    kapsamIci += ici;
    kapsamDisi += disi;

    const oran = Math.round((ici / dk.length) * 100);
    console.log('=== ' + DERS_AD[dersId] + ' ===');
    console.log('  Kart: ' + dk.length + ' · LGS kapsamında: %' + oran);

    // Hangi resmi ünitede kaç kart var, sınavda kaç soru çıkıyor
    const resmi = LGS_MUFREDAT[dersId].uniteler;
    const eksikler = [];
    Object.keys(resmi).forEach(u => {
      const kart = sayac[u] || 0;
      const soru = resmi[u];
      if (kart === 0) eksikler.push(u + ' (sınavda ~' + soru + ' soru)');
    });
    if (eksikler.length) {
      console.log('  ⚠ Hiç kartı olmayan LGS üniteleri:');
      eksikler.forEach(e => console.log('      · ' + e));
    }

    // Kapsam dışı üniteler
    const disiU = {};
    dk.forEach(c => {
      const h = harita[c.unite];
      if (h === null || h === undefined) disiU[c.unite] = (disiU[c.unite] || 0) + 1;
    });
    const disiSirali = Object.entries(disiU).sort((a, b) => b[1] - a[1]);
    if (disiSirali.length) {
      console.log('  ✗ LGS kapsamı dışı:');
      disiSirali.forEach(([u, n]) => {
        console.log('      · ' + u + ' (' + n + ' kart)');
        disiListe.push(DERS_AD[dersId] + ' | ' + u + ' | ' + n);
      });
    }
    console.log('');
  });

  const toplam = kapsamIci + kapsamDisi;
  console.log('==================================================');
  console.log('GENEL');
  console.log('  LGS kapsamında  : ' + kapsamIci + ' kart (%' + Math.round((kapsamIci / toplam) * 100) + ')');
  console.log('  LGS kapsamı dışı: ' + kapsamDisi + ' kart (%' + Math.round((kapsamDisi / toplam) * 100) + ')');
  console.log('==================================================');
  console.log('');
  console.log('Not: Kapsam dışı kartlar yanlış değil, sadece LGS\'de');
  console.log('sorulmayan (6-7. sınıf) konular. Silmek zorunda değilsin;');
  console.log('ama denemede kullanılmamaları daha doğru olur.');
}

calistir();