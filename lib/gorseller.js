// ============================================================
// DERS FİLİGRAN GÖRSELLERİ
//
// assets/dersler/ klasöründeki beyaz PNG'ler.
// Metro require() çağrılarını derleme anında çözer; bu yüzden
// dinamik yol kullanılamaz, tek tek yazılması gerekir.
//
// Görsel bulunamazsa uygulama çökmesin diye try/catch içinde.
// ============================================================

let DERS_GORSEL = {};

try {
  DERS_GORSEL = {
    turkce: require('../assets/dersler/turkce.png'),
    mat: require('../assets/dersler/matematik.png'),
    fen: require('../assets/dersler/fen.png'),
    inkilap: require('../assets/dersler/inkilap.png'),
    din: require('../assets/dersler/din.png'),
    ingilizce: require('../assets/dersler/ingilizce.png'),
  };
} catch (e) {
  // Görseller henüz eklenmediyse filigran gösterilmez, uygulama çalışmaya devam eder
  console.log('Ders görselleri bulunamadı, filigransız devam ediliyor.');
  DERS_GORSEL = {};
}

export function dersGorseli(dersId) {
  return DERS_GORSEL[dersId] || null;
}
