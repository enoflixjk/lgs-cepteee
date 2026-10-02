// ============================================================
// ABONELİK — RevenueCat için güvenli sarmalayıcı
//
// react-native-purchases NATIVE bir paket — Expo Go bunu tanımaz.
// Kurulu olmadığı ya da başlatılamadığı her ortamda (Expo Go,
// iOS gibi anahtarı olmayan platformlar vb.) bu dosya sessizce
// "premium değil" davranışına düşer, UYGULAMAYI ÇÖKERTMEZ.
//
// Ürünler (Play Console + RevenueCat 'default' offering):
//   - ligo_premium_aylik      (abonelik, base plan: aylik-plan)
//   - ligo_premium_yillik     (abonelik, base plan: yillik-plan)
//   - ligo_premium_omur_boyu  (tek seferlik, ömür boyu)
// Üçü de RevenueCat'te 'premium' yetkisine (entitlement) bağlı.
// ============================================================
import { Platform } from 'react-native';

let Purchases = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (e) {
  // Paket kurulu değil (Expo Go) — sessizce devre dışı kalır.
}

// RevenueCat panelindeki Android (Google Play) public API anahtarı.
// Bu anahtar uygulamaya gömülmek için tasarlanmıştır, gizli değildir.
const REVENUECAT_ANDROID_KEY = 'goog_nbbMNjYjMIYZUvVKMnJLEyMvUVW';

const API_KEY = Platform.OS === 'android' ? REVENUECAT_ANDROID_KEY : '';

// Play Console'daki ürün kimlikleri.
export const PAKET_ID = {
  AYLIK: 'ligo_premium_aylik',
  YILLIK: 'ligo_premium_yillik',
  OMUR_BOYU: 'ligo_premium_omur_boyu',
};

// "premium" yetkisinin (entitlement) RevenueCat panelindeki adı.
const ENTITLEMENT_ADI = 'premium';

let baslatildiMi = false;

// RevenueCat'i gerekirse başlatır. Giriş yapılmamışsa anonim kullanıcıyla
// başlar; kullanıcı sonra giriş yapınca abonelikBaslat logIn ile bağlar.
function hazirla(kullaniciId) {
  if (!Purchases || !API_KEY) return false;
  if (baslatildiMi) return true;
  try {
    Purchases.configure({ apiKey: API_KEY, appUserID: kullaniciId || null });
    baslatildiMi = true;
    return true;
  } catch (e) {
    console.log('RevenueCat başlatılamadı:', e?.message || e);
    return false;
  }
}

/**
 * Uygulama açılışında / giriş yapıldığında çağrılır.
 */
export async function abonelikBaslat(kullaniciId) {
  const ilkKez = !baslatildiMi;
  if (!hazirla(kullaniciId)) return false;
  if (!ilkKez && kullaniciId) {
    try { await Purchases.logIn(kullaniciId); } catch (e) {}
  }
  return true;
}

/**
 * Kullanıcının premium olup olmadığını döner. Şüphede kalınca false.
 */
export async function premiumMi() {
  if (!hazirla()) return false;
  try {
    const bilgi = await Purchases.getCustomerInfo();
    return !!bilgi?.entitlements?.active?.[ENTITLEMENT_ADI];
  } catch (e) {
    return false;
  }
}

/**
 * Paketin türünü döner: 'aylik' | 'yillik' | 'omur_boyu' | null.
 * Önce mağaza ürün kimliğine (ör. "ligo_premium_yillik:yillik-plan"),
 * sonra RevenueCat paket türüne bakar.
 */
export function paketTuru(paket) {
  const urunId = String(paket?.product?.identifier || '');
  if (urunId.startsWith(PAKET_ID.OMUR_BOYU)) return 'omur_boyu';
  if (urunId.startsWith(PAKET_ID.YILLIK)) return 'yillik';
  if (urunId.startsWith(PAKET_ID.AYLIK)) return 'aylik';
  const tur = paket?.packageType;
  if (tur === 'LIFETIME') return 'omur_boyu';
  if (tur === 'ANNUAL') return 'yillik';
  if (tur === 'MONTHLY') return 'aylik';
  return null;
}

/**
 * Paketin ücretsiz deneme süresini gün olarak döner (yoksa 0).
 * Google Play'de deneme, abonelik seçeneğinin "freePhase" kısmında gelir.
 */
export function ucretsizDenemeGunu(paket) {
  const sure = paket?.product?.defaultOption?.freePhase?.billingPeriod?.iso8601
    || paket?.product?.introPrice?.period;
  if (!sure || typeof sure !== 'string') return 0;
  const m = sure.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/);
  if (!m) return 0;
  const [, y, ay, h, g] = m.map(x => Number(x) || 0);
  return y * 365 + ay * 30 + h * 7 + g;
}

const SIRA = { yillik: 0, aylik: 1, omur_boyu: 2 };

/**
 * 'default' offering'deki paketleri getirir: yıllık, aylık, ömür boyu
 * sırasıyla. Fiyatlar mağazadan gelir (bölgeye göre doğru para birimi).
 */
export async function paketleriGetir() {
  if (!hazirla()) return [];
  try {
    const teklifler = await Purchases.getOfferings();
    const paketler = teklifler?.current?.availablePackages || [];
    return [...paketler].sort((a, b) => (SIRA[paketTuru(a)] ?? 9) - (SIRA[paketTuru(b)] ?? 9));
  } catch (e) {
    return [];
  }
}

/**
 * Bir paketi satın alır. Başarılıysa { basarili: true } döner.
 */
export async function satinAl(paket) {
  if (!hazirla()) {
    return { basarili: false, mesaj: 'Satın alma şu an bu sürümde kullanılamıyor.' };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(paket);
    const aktif = !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ADI];
    return { basarili: aktif, mesaj: aktif ? null : 'Satın alma tamamlanamadı.' };
  } catch (e) {
    if (e?.userCancelled) return { basarili: false, mesaj: null, iptalEdildi: true };
    return { basarili: false, mesaj: 'Bir sorun oluştu, tekrar dener misin?' };
  }
}

/**
 * Daha önceki satın almaları geri yükler.
 */
export async function satinAlmalariGeriYukle() {
  if (!hazirla()) {
    return { basarili: false, mesaj: 'Bu sürümde kullanılamıyor.' };
  }
  try {
    const bilgi = await Purchases.restorePurchases();
    const aktif = !!bilgi?.entitlements?.active?.[ENTITLEMENT_ADI];
    return { basarili: aktif, mesaj: aktif ? null : 'Aktif bir abonelik bulunamadı.' };
  } catch (e) {
    return { basarili: false, mesaj: 'Geri yükleme başarısız oldu.' };
  }
}

export const abonelikKullanilabilir = !!Purchases && !!API_KEY;
