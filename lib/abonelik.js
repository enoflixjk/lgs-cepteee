// ============================================================
// ABONELİK — RevenueCat için güvenli sarmalayıcı
//
// react-native-purchases NATIVE bir paket — Expo Go bunu tanımaz.
// Kurulu olmadığı ya da başlatılamadığı her ortamda (Expo Go,
// eksik yapılandırma vb.) bu dosya sessizce "premium değil"
// davranışına düşer, UYGULAMAYI ÇÖKERTMEZ.
//
// Gerçek bir build (eas build / yerel build) alıp react-native-purchases
// paketini kurduğunda ve aşağıdaki API_KEY'i doldurduğunda, aynı
// fonksiyonlar otomatik olarak gerçek ödeme akışına geçer — App.js'te
// hiçbir şey değiştirmen gerekmez.
//
// KURULUM (native build hazır olduğunda):
//   1) npx expo install react-native-purchases
//   2) RevenueCat panelinden Android API key'i al, aşağıya yapıştır
//   3) Play Console'da oluşturduğun ürün ID'lerini PAKET_ID'lere yaz
// ============================================================

let Purchases = null;
try {
  Purchases = require('react-native-purchases').default;
} catch (e) {
  // Paket kurulu değil (Expo Go ya da henüz native build alınmadı) —
  // sessizce devre dışı kalır, üstteki try/catch bunu güvenle yutuyor.
}

// RevenueCat panelinden alınacak Android API anahtarı.
// Boş bıraktığın sürece abonelik sistemi "devre dışı" modda kalır.
const REVENUECAT_ANDROID_KEY = '';

// Play Console'da oluşturacağın ürün ID'leri — panelde ne yazdıysan
// birebir aynısını buraya yaz.
export const PAKET_ID = {
  AYLIK: 'ligo_premium_aylik',
  UC_AYLIK: 'ligo_premium_3ay',
};

// "premium" yetkisinin (entitlement) RevenueCat panelindeki adı.
const ENTITLEMENT_ADI = 'premium';

let baslatildiMi = false;

/**
 * Uygulama açılışında bir kere çağrılır. Paket kurulu değilse ya da
 * API anahtarı boşsa hiçbir şey yapmaz — güvenli no-op.
 */
export async function abonelikBaslat(kullaniciId) {
  if (!Purchases || !REVENUECAT_ANDROID_KEY) return false;
  try {
    if (!baslatildiMi) {
      Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY, appUserID: kullaniciId || null });
      baslatildiMi = true;
    } else if (kullaniciId) {
      await Purchases.logIn(kullaniciId);
    }
    return true;
  } catch (e) {
    console.log('RevenueCat başlatılamadı:', e?.message || e);
    return false;
  }
}

/**
 * Kullanıcının premium olup olmadığını döner. RevenueCat kullanılamıyorsa
 * (Expo Go, yapılandırılmamış anahtar vb.) her zaman false döner —
 * yani sistem güvenli tarafta hata yapar: şüphede kalınca "ücretsiz" say.
 */
export async function premiumMi() {
  if (!Purchases || !REVENUECAT_ANDROID_KEY || !baslatildiMi) return false;
  try {
    const bilgi = await Purchases.getCustomerInfo();
    return !!bilgi?.entitlements?.active?.[ENTITLEMENT_ADI];
  } catch (e) {
    return false;
  }
}

/**
 * Satın alınabilir paketleri getirir (fiyatlar mağazadan gelir,
 * elle yazılmaz — bölgeye göre otomatik doğru para birimini gösterir).
 * Kullanılamıyorsa boş dizi döner.
 */
export async function paketleriGetir() {
  if (!Purchases || !REVENUECAT_ANDROID_KEY) return [];
  try {
    const teklifler = await Purchases.getOfferings();
    return teklifler?.current?.availablePackages || [];
  } catch (e) {
    return [];
  }
}

/**
 * Bir paketi satın alır. Başarılıysa { basarili: true } döner.
 * RevenueCat kullanılamıyorsa kullanıcıya net bir mesajla başarısız döner
 * (uygulamayı çökertmez, sahte bir "satın aldın" da söylemez).
 */
export async function satinAl(paket) {
  if (!Purchases || !REVENUECAT_ANDROID_KEY) {
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
 * Daha önceki satın almaları geri yükler (telefon değiştirme, uygulama
 * silip yeniden kurma senaryoları için).
 */
export async function satinAlmalariGeriYukle() {
  if (!Purchases || !REVENUECAT_ANDROID_KEY) {
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

export const abonelikKullanilabilir = !!Purchases && !!REVENUECAT_ANDROID_KEY;
