// ============================================================
// SES EFEKTLERİ — güvenli sarmalayıcı
//
// expo-av (Sound API) burada kullanılıyor. Ses dosyaları henüz
// projede yoksa (assets/sesler/ klasörü boşsa) her fonksiyon
// sessizce hiçbir şey yapmaz — uygulamayı çökertmez.
//
// KURULUM (ses dosyaları hazır olduğunda):
//   1) npx expo install expo-av
//   2) assets/sesler/ klasörüne şu üç dosyayı koy:
//      dogru.mp3, yanlis.mp3, seviye.mp3
//   3) Kısa (0.3-1 saniye), net UI ses efektleri olmalı — telifsiz
//      kaynaklar: mixkit.co/free-sound-effects, zapsplat.com
//      Arama önerisi: "correct answer chime", "wrong buzzer short",
//      "level up fanfare short"
// ============================================================

let Audio = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  // expo-av kurulu değilse (Expo Go'da olabilir) sessizce devre dışı
}

const SES_DOSYA = {
  dogru: (() => { try { return require('../assets/sesler/dogru.mp3'); } catch (e) { return null; } })(),
  yanlis: (() => { try { return require('../assets/sesler/yanlis.mp3'); } catch (e) { return null; } })(),
  seviye: (() => { try { return require('../assets/sesler/seviye.mp3'); } catch (e) { return null; } })(),
};

let sesAcikMi = true;
const yukluSesler = {};      // isim -> Audio.Sound nesnesi (önceden yüklenmiş)
let onYuklemeBaslatildi = false;

async function seslerOnYukle() {
  if (!Audio || onYuklemeBaslatildi) return;
  onYuklemeBaslatildi = true;
  try {
    // iOS'ta sessiz moddayken bile ses efektleri duyulsun
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  } catch (e) {}

  await Promise.all(Object.keys(SES_DOSYA).map(async (isim) => {
    if (!SES_DOSYA[isim]) return;
    try {
      const { sound } = await Audio.Sound.createAsync(SES_DOSYA[isim], { volume: 0.7 });
      yukluSesler[isim] = sound;
    } catch (e) {
      // Bir ses dosyası bozuksa/eksikse diğerlerini etkilemesin
    }
  }));
}

// Modül yüklenir yüklenmez (uygulama açılışında) ön yükleme arka planda başlar
seslerOnYukle();

export function sesAyarla(acik) {
  sesAcikMi = acik;
}

/**
 * Bir ses efektini ANINDA çalar — dosya önceden yüklendiği için
 * gecikme olmaz. Ses kapatılmışsa, expo-av kurulu değilse, dosya
 * henüz eklenmemişse ya da hâlâ yükleniyorsa sessizce hiçbir şey
 * yapmaz.
 */
export function sesCal(isim) {
  if (!sesAcikMi) return;
  const ses = yukluSesler[isim];
  if (!ses) return;
  // replayAsync sesi baştan başlatıp hemen çalar — yeniden yüklemez
  ses.replayAsync().catch(() => {});
}

export const sesKullanilabilir = !!Audio;