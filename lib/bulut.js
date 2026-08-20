import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// ============================================================
// Yerel (AsyncStorage) <-> Bulut (Supabase) senkronizasyonu
//
// Strateji: "en çok çalışılan kazanır".
// Aynı kart iki cihazda farklıysa, tekrar sayısı (reps) yüksek olan
// kalır. Böylece hiçbir çalışma emeği kaybolmaz.
// ============================================================

const ANAHTARLAR = [
  'lgs_srs', 'lgs_xp', 'lgs_seri', 'lgs_bugun', 'lgs_hedef',
  'lgs_profil', 'lgs_son_aktif', 'lgs_sinav_tarihi',
  'lgs_sinav_sayisi', 'lgs_en_iyi_sinav',
];

async function yereliOku() {
  const ciftler = await AsyncStorage.multiGet(ANAHTARLAR);
  const d = {};
  ciftler.forEach(([k, v]) => { if (v) d[k] = v; });

  let srs = {};
  let profil = {};
  try { srs = d.lgs_srs ? JSON.parse(d.lgs_srs) : {}; } catch (e) { srs = {}; }
  try { profil = d.lgs_profil ? JSON.parse(d.lgs_profil) : {}; } catch (e) { profil = {}; }

  return {
    srs,
    profil,
    xp: Number(d.lgs_xp) || 0,
    seri: Number(d.lgs_seri) || 0,
    bugun: Number(d.lgs_bugun) || 0,
    hedefKart: Number(d.lgs_hedef) || 30,
    sonAktifGun: d.lgs_son_aktif || null,
    sinavTarihi: d.lgs_sinav_tarihi || '2027-06-14',
    sinavSayisi: Number(d.lgs_sinav_sayisi) || 0,
    enIyiSinavPct: Number(d.lgs_en_iyi_sinav) || 0,
  };
}

async function yereleYaz(v) {
  await AsyncStorage.multiSet([
    ['lgs_srs', JSON.stringify(v.srs || {})],
    ['lgs_xp', String(v.xp || 0)],
    ['lgs_seri', String(v.seri || 0)],
    ['lgs_bugun', String(v.bugun || 0)],
    ['lgs_hedef', String(v.hedefKart || 30)],
    ['lgs_profil', JSON.stringify(v.profil || {})],
    ['lgs_son_aktif', v.sonAktifGun || ''],
    ['lgs_sinav_tarihi', v.sinavTarihi || '2027-06-14'],
    ['lgs_sinav_sayisi', String(v.sinavSayisi || 0)],
    ['lgs_en_iyi_sinav', String(v.enIyiSinavPct || 0)],
  ]);
}

// ============================================================
// YÜKLE — yerel veriyi buluta gönder
// ============================================================
export async function buluta_yukle() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Önce giriş yapmalısın.');

  const y = await yereliOku();

  const { error: pHata } = await supabase.from('profiller').upsert({
    id: user.id,
    ad: y.profil.ad || null,
    rumuz: y.profil.rumuz || null,
    hedef_okul: y.profil.hedefOkul || null,
    hedef_net: y.profil.hedefNet || null,
    hedef_kart: y.hedefKart,
    zayif_dersler: y.profil.zayifDersler || [],
    sinav_tarihi: y.sinavTarihi,
  });
  if (pHata) throw pHata;

  const { error: iHata } = await supabase.from('ilerleme').upsert({
    user_id: user.id,
    xp: y.xp,
    seri: y.seri,
    bugun: y.bugun,
    son_aktif_gun: y.sonAktifGun || null,
    sinav_sayisi: y.sinavSayisi,
    en_iyi_sinav_pct: y.enIyiSinavPct,
  });
  if (iHata) throw iHata;

  const satirlar = Object.values(y.srs)
    .filter(k => k && k.id)
    .map(k => ({
      user_id: user.id,
      kart_id: String(k.id),
      seviye: Math.max(0, Math.min(7, Number(k.seviye) || 0)),
      due_at: Number(k.dueAt) || 0,
      reps: Number(k.reps) || 0,
      son_yanlis: !!k.sonYanlis,
    }));

  // Büyük listeyi parçalara böl (tek istekte 1000 satır sınırı aşılmasın)
  for (let i = 0; i < satirlar.length; i += 500) {
    const dilim = satirlar.slice(i, i + 500);
    const { error } = await supabase.from('kart_durumlari').upsert(dilim);
    if (error) throw error;
  }

  return { kartSayisi: satirlar.length };
}

// ============================================================
// İNDİR — buluttaki veriyi yerelle birleştir
// ============================================================
export async function buluttan_indir() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Önce giriş yapmalısın.');

  const yerel = await yereliOku();

  const { data: profil } = await supabase
    .from('profiller').select('*').eq('id', user.id).maybeSingle();
  const { data: ilerleme } = await supabase
    .from('ilerleme').select('*').eq('user_id', user.id).maybeSingle();

  // Kartları sayfalı çek
  let kartlar = [];
  let baslangic = 0;
  const adim = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('kart_durumlari')
      .select('kart_id, seviye, due_at, reps, son_yanlis')
      .eq('user_id', user.id)
      .range(baslangic, baslangic + adim - 1);
    if (error) throw error;
    kartlar = kartlar.concat(data || []);
    if (!data || data.length < adim) break;
    baslangic += adim;
  }

  // --- BİRLEŞTİRME: tekrar sayısı yüksek olan kazanır ---
  const birlesikSrs = { ...yerel.srs };
  kartlar.forEach(k => {
    const bulut = {
      id: k.kart_id,
      seviye: k.seviye,
      dueAt: Number(k.due_at) || 0,
      reps: k.reps,
      sonYanlis: k.son_yanlis,
    };
    const mevcut = birlesikSrs[k.kart_id];
    if (!mevcut || (bulut.reps || 0) > (mevcut.reps || 0)) {
      birlesikSrs[k.kart_id] = bulut;
    }
  });

  const birlesik = {
    srs: birlesikSrs,
    xp: Math.max(yerel.xp, ilerleme?.xp || 0),
    seri: Math.max(yerel.seri, ilerleme?.seri || 0),
    bugun: Math.max(yerel.bugun, ilerleme?.bugun || 0),
    sinavSayisi: Math.max(yerel.sinavSayisi, ilerleme?.sinav_sayisi || 0),
    enIyiSinavPct: Math.max(yerel.enIyiSinavPct, ilerleme?.en_iyi_sinav_pct || 0),
    sonAktifGun: ilerleme?.son_aktif_gun || yerel.sonAktifGun,
    hedefKart: profil?.hedef_kart || yerel.hedefKart,
    sinavTarihi: profil?.sinav_tarihi || yerel.sinavTarihi,
    profil: {
      ad: profil?.ad || yerel.profil.ad || '',
      rumuz: profil?.rumuz || yerel.profil.rumuz || '',
      hedefOkul: profil?.hedef_okul || yerel.profil.hedefOkul || '',
      hedefNet: profil?.hedef_net || yerel.profil.hedefNet || '',
      zayifDersler: (profil?.zayif_dersler && profil.zayif_dersler.length)
        ? profil.zayif_dersler
        : (yerel.profil.zayifDersler || []),
    },
  };

  await yereleYaz(birlesik);
  return birlesik;
}

// ============================================================
// KİMLİK DOĞRULAMA
// ============================================================
export async function kayit_ol(eposta, sifre) {
  const { data, error } = await supabase.auth.signUp({
    email: eposta.trim(),
    password: sifre,
  });
  if (error) throw error;
  return data;
}

export async function giris_yap(eposta, sifre) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: eposta.trim(),
    password: sifre,
  });
  if (error) throw error;
  return data;
}

export async function cikis_yap() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sifre_sifirla(eposta) {
  const { error } = await supabase.auth.resetPasswordForEmail(eposta.trim());
  if (error) throw error;
}

// ============================================================
// HESAP SİLME
// Sunucudaki "hesap-sil" fonksiyonunu çağırır. Hesap ve ona bağlı
// tüm veriler (profil, ilerleme, kart durumları) kalıcı silinir.
// ============================================================
export async function hesabi_sil() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Önce giriş yapmalısın.');

  const { data, error } = await supabase.functions.invoke('hesap-sil', {
    method: 'POST',
  });

  if (error) throw error;
  if (data && data.hata) throw new Error(data.hata);

  // Sunucudaki kayıt silindi; yereldeki oturumu da temizle
  try { await supabase.auth.signOut(); } catch (e) {}
  return true;
}

// Yalnızca bu cihazdaki çalışma verisini siler (hesap durur)
export async function yerel_verileri_sil() {
  await AsyncStorage.multiRemove([...ANAHTARLAR, 'lgs_onboarded', 'lgs_setup', 'lgs_mot_gun']);
}

// ============================================================
// GÜNLÜK AKTİVİTE — dış kaynak soru sayısı, odak süresi, kaçma sayısı
//
// Yalnızca hesaplı kullanıcılar için anlamlıdır; liderlik tablosu
// bulut senkronizasyonu gerektirir. Misafir kullanıcıda bu
// fonksiyonlar sessizce başarısız olur, çağıran taraf bunu yutar.
// ============================================================

function bugunTarihiStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Bugünün dış kaynak soru sayısına ekleme yapar (kümülatif).
 */
export async function disSoruEkle(adet) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const tarih = bugunTarihiStr();

  const { data: mevcut } = await supabase
    .from('gunluk_aktivite')
    .select('dis_soru')
    .eq('user_id', user.id)
    .eq('tarih', tarih)
    .maybeSingle();

  const yeni = (mevcut?.dis_soru || 0) + adet;
  const { error } = await supabase.from('gunluk_aktivite').upsert({
    user_id: user.id, tarih, dis_soru: yeni, guncellendi: new Date().toISOString(),
  });
  return !error;
}

/**
 * Bir odak oturumunun sonucunu bugüne ekler (kümülatif).
 */
export async function odakOturumuKaydet(saniye, kacmaSayisi) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const tarih = bugunTarihiStr();

  const { data: mevcut } = await supabase
    .from('gunluk_aktivite')
    .select('odak_saniye, kacma_sayisi')
    .eq('user_id', user.id)
    .eq('tarih', tarih)
    .maybeSingle();

  const { error } = await supabase.from('gunluk_aktivite').upsert({
    user_id: user.id, tarih,
    odak_saniye: (mevcut?.odak_saniye || 0) + saniye,
    kacma_sayisi: (mevcut?.kacma_sayisi || 0) + kacmaSayisi,
    guncellendi: new Date().toISOString(),
  });
  return !error;
}

/**
 * Bu haftanın toplam odak süresini (dakika) döndürür — kişisel özet için.
 */
export async function haftalikOdakDakika() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const simdi = new Date();
  const gun = (simdi.getDay() + 6) % 7; // Pazartesi=0
  const pazartesi = new Date(simdi);
  pazartesi.setDate(simdi.getDate() - gun);
  pazartesi.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('gunluk_aktivite')
    .select('odak_saniye')
    .eq('user_id', user.id)
    .gte('tarih', pazartesi.toISOString().split('T')[0]);
  if (error || !data) return 0;
  return Math.round(data.reduce((a, r) => a + (r.odak_saniye || 0), 0) / 60);
}

/**
 * Rumuzu ayarlar. Liderlik tablosuna girmenin ön koşuludur.
 * Aynı rumuz başka bir hesapta kullanılıyorsa hata döner.
 */
export async function rumuzAyarla(rumuz) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Önce giriş yapmalısın.');
  const temiz = String(rumuz || '').trim().slice(0, 20);
  if (!temiz) throw new Error('Rumuz boş olamaz.');
  const { error } = await supabase.from('profiller').upsert({ id: user.id, rumuz: temiz });
  if (error) {
    if (String(error.message || '').includes('duplicate') || error.code === '23505') {
      throw new Error('Bu rumuz zaten alınmış, başka bir tane dene.');
    }
    throw error;
  }
  return temiz;
}

/**
 * Haftalık liderlik tablolarını getirir. Yalnızca rumuz ve toplam
 * sayı döner — sunucu tarafında hiçbir kimlik bilgisi paylaşılmaz.
 */
export async function liderlikSoru() {
  const { data, error } = await supabase.rpc('liderlik_soru');
  if (error) return [];
  return data || [];
}

export async function liderlikOdak() {
  const { data, error } = await supabase.rpc('liderlik_odak');
  if (error) return [];
  return data || [];
}

// ============================================================
// İÇERİK BİLDİRİMİ
//
// Bir kartta hata görülürse gönderilir. Misafir kullanıcılar
// dahil herkes gönderebilir — auth şart değil.
// ============================================================
export async function icerikBildir({ kartId, ders, unite, soru, sebep }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('icerik_bildirim').insert({
      kart_id: kartId,
      kart_ders: ders || null,
      kart_unite: unite || null,
      kart_soru: soru || null,
      sebep,
      user_id: user?.id || null,
    });
    return !error;
  } catch (e) {
    // Misafir modda oturum yoksa da bildirim gönderilebilmeli
    try {
      const { error } = await supabase.from('icerik_bildirim').insert({
        kart_id: kartId, kart_ders: ders || null, kart_unite: unite || null,
        kart_soru: soru || null, sebep, user_id: null,
      });
      return !error;
    } catch (e2) {
      return false;
    }
  }
}