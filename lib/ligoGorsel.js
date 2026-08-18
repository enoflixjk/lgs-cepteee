// ============================================================
// LIGO GÖRSELLERİ
//
// Metro require() çağrılarını derleme anında çözer; dinamik yol
// kullanılamaz, tek tek yazılması gerekir.
// Görseller eksikse uygulama çökmesin diye try/catch içinde.
// ============================================================

let LIGO = {};

try {
  LIGO = {
    normal: require('../assets/ligo/ligo-normal.png'),
    mutlu: require('../assets/ligo/ligo-mutlu.png'),
    uykulu: require('../assets/ligo/ligo-uykulu.png'),
    kutlama: require('../assets/ligo/ligo-kutlama.png'),
  };
} catch (e) {
  console.log('Ligo görselleri bulunamadı.');
  LIGO = {};
}

/**
 * Duruma göre Ligo'nun ifadesini seçer.
 * oran: günlük hedefin tamamlanma oranı (0-1)
 */
export function ligoGorsel(ifade) {
  return LIGO[ifade] || LIGO.normal || null;
}

export function ligoIfadesi({ bugun, hedefKart }) {
  const oran = hedefKart > 0 ? bugun / hedefKart : 0;
  if (oran >= 1) return 'kutlama';
  if (bugun === 0) return 'uykulu';
  if (oran >= 0.5) return 'mutlu';
  return 'normal';
}