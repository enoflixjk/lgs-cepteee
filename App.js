import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Animated, PanResponder,
  StyleSheet, StatusBar, Alert, Dimensions, Easing, AppState, Image
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline, Line as SvgLine, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  useFonts,
  Baloo2_500Medium, Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';
import { CARDS as RAW_CARDS } from './data/cards';
import {
  House, Library, CircleUser,
  ChevronRight, ChevronLeft, X as XIkon, RotateCcw,
  Square, SquareCheck, Sun, Moon as AyIkon, Search, Settings, Cloud,
  Check, Clock, Layers, ListChecks, Lightbulb,
  Footprints, Flame, CalendarCheck, ShieldCheck, Trophy, Medal, BookMarked,
  Sparkles, Rocket, BrainCircuit, Timer, ChartColumn, Zap, Target, BookOpenCheck, NotebookPen, Plus, Lock,
} from 'lucide-react-native';
import { TemaSaglayici, useTema, FOCUS, FONT, KAGIT } from './lib/tema';
import HesapEkrani from './ekranlar/HesapEkrani';
import { supabase } from './lib/supabase';
import { dersGorseli } from './lib/gorseller';
import { ligoMesaji, bildirimleriPlanla } from './lib/ligo';
import { ligoGorsel, ligoIfadesi } from './lib/ligoGorsel';
import { useIvmeTakip } from './lib/sallama';

const { width: SW } = Dimensions.get('window');

// ============ VERİ SAĞLAMLAŞTIRMA ============
const CARDS = (Array.isArray(RAW_CARDS) ? RAW_CARDS : []).filter(
  c => c && c.id && c.ders && c.soru && c.cevap
).map(c => ({
  ...c,
  unite: c.unite || 'Genel',
  secenekler: Array.isArray(c.secenekler) && c.secenekler.length >= 2 ? c.secenekler : null,
  // Çözüm / formül açıklaması: yanlış cevapta gösterilir
  aciklama: (typeof c.aciklama === 'string' && c.aciklama.trim()) ? c.aciklama.trim() : null,
  // LGS'de sorulmayan (6-7. sınıf) konular denemeye girmez
  lgsKapsam: c.lgsKapsam !== false,
}));

const uniteler = (dersId) => {
  const set = [];
  CARDS.forEach(c => { if (c.ders === dersId && !set.includes(c.unite)) set.push(c.unite); });
  return set;
};

// ============================================================
// YOL HARİTASI — üniteleri ve içlerindeki mini-grupları
// Duolingo tarzı sıralı bir patikaya döker.
//
// Kilitleme kuralı: bir ünite, kendinden önceki ünite %80
// öğrenilmeden açılmaz. Ünite içinde de aynı mantık mini-grup
// seviyesinde işler — önceki grup tamamlanmadan sonraki kilitli.
// ============================================================
const MINI_GRUP_BOYUTU = 5;

function dersUniteSirasi(dersId) {
  return uniteler(dersId).filter(u => CARDS.some(c => c.ders === dersId && c.unite === u && c.lgsKapsam !== false));
}

function unitePct(dersId, unite, srs) {
  const kartlar = CARDS.filter(c => c.ders === dersId && c.unite === unite && c.lgsKapsam !== false);
  if (!kartlar.length) return 0;
  const ogr = kartlar.filter(c => (srs[c.id] || {}).seviye >= 3).length;
  return Math.round((ogr / kartlar.length) * 100);
}

function uniteKilitliMi(dersId, unite, srs) {
  const sira = dersUniteSirasi(dersId);
  const idx = sira.indexOf(unite);
  if (idx <= 0) return false;               // ilk ünite hep açık
  return unitePct(dersId, sira[idx - 1], srs) < 80;
}

// Bir ünitenin kartlarını sabit boyutlu mini-gruplara böler.
// Kart sırası CARDS dizisindeki doğal sıraya göredir — böylece
// aynı ünite her çağrıda aynı gruplamayı üretir.
function miniGruplar(dersId, unite) {
  const kartlar = CARDS.filter(c => c.ders === dersId && c.unite === unite && c.lgsKapsam !== false);
  const gruplar = [];
  for (let i = 0; i < kartlar.length; i += MINI_GRUP_BOYUTU) {
    gruplar.push(kartlar.slice(i, i + MINI_GRUP_BOYUTU));
  }
  return gruplar;
}

function grupDurumu(gruplar, idx, srs) {
  const grup = gruplar[idx];
  const tamam = grup.every(c => (srs[c.id] || {}).seviye >= 3);
  if (tamam) return 'tamam';
  if (idx === 0) return 'acik';
  const oncekiTamam = gruplar[idx - 1].every(c => (srs[c.id] || {}).seviye >= 3);
  return oncekiTamam ? 'acik' : 'kilitli';
}

// Odak modunda tema bağlamı kullanılmadığı için ders adları sabit sözlükten okunur
const DERS_ADLARI = {
  turkce: 'Türkçe', mat: 'Matematik', fen: 'Fen Bilimleri',
  inkilap: 'İnkılap Tarihi', din: 'Din Kültürü', ingilizce: 'İngilizce',
};

// ============ ROZETLER ============
const ROZETLER = [
  { id: 'ilk_adim',      ad: 'İlk Adım',          ikon: Footprints,    kosul: (s) => s.toplamReps >= 1 },
  { id: 'seri_3',        ad: '3 Gün Azim',        ikon: Flame,         kosul: (s) => s.seri >= 3 },
  { id: 'seri_7',        ad: 'Haftalık Disiplin', ikon: CalendarCheck, kosul: (s) => s.seri >= 7 },
  { id: 'seri_30',       ad: 'Demir İrade',       ikon: ShieldCheck,   kosul: (s) => s.seri >= 30 },
  { id: 'yuz_kart',      ad: 'İlk Yüz',          ikon: Sparkles,      kosul: (s) => s.ogrenilen >= 100 },
  { id: 'bes_yuz_kart',  ad: 'Yol Alıyor',          ikon: Rocket,        kosul: (s) => s.ogrenilen >= 500 },
  { id: 'bin_kart',      ad: 'Tam Puan',          ikon: Trophy,        kosul: (s) => s.ogrenilen >= 1000 },
  { id: 'usta_10',       ad: 'Ustalık Yolu',      ikon: BrainCircuit,  kosul: (s) => s.usta >= 10 },
  { id: 'sinav_1',       ad: 'İlk Sınav',         ikon: Timer,         kosul: (s) => s.sinavSayisi >= 1 },
  { id: 'sinav_mukemmel',ad: 'Mükemmel Sınav',    ikon: Medal,         kosul: (s) => s.enIyiSinavPct >= 90 },
];

// ============ SRS ============
const GUN = 86400000;
const ARALIK = [0, 0, 1, 3, 7, 16, 35, 75];
const yeniD = (id) => ({ id, seviye: 0, dueAt: 0, reps: 0, sonYanlis: false });
const srsGuncelle = (d, dogru) => {
  const s = dogru ? Math.min(d.seviye + 1, 7) : Math.max(d.seviye - 1, 0);
  return { ...d, seviye: s, dueAt: Date.now() + ARALIK[s] * GUN, reps: (d.reps || 0) + 1, sonYanlis: !dogru };
};

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const bugunTarihi = () => new Date().toISOString().split('T')[0];

// ============================================================
// ŞIK SIRALAMA
// Veride doğru cevap genelde listenin başında duruyor; olduğu gibi
// gösterilirse doğru şık hep A çıkar. Kart kimliğinden türetilen
// sabit bir tohumla karıştırıyoruz: sıra her karta özel, ama aynı
// kart için her açılışta ve "geri al" sonrasında aynı kalıyor.
// ============================================================
const tohumla = (metin) => {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const sikleriSirala = (secenekler, kartId) => {
  const liste = [...secenekler];
  let t = tohumla(String(kartId)) || 1;
  // Fisher-Yates, tohumlu sözde rastgele sayı üreteciyle
  for (let i = liste.length - 1; i > 0; i--) {
    t = (Math.imul(t, 1664525) + 1013904223) >>> 0;
    // Alt bitler zayıf desenlidir; üst bitlerden oran türetiyoruz
    const j = Math.floor((t / 4294967296) * (i + 1));
    const gecici = liste[i];
    liste[i] = liste[j];
    liste[j] = gecici;
  }
  return liste;
};

// ============================================================
// EN ZAYIF ÜNİTE — ana sayfa ve profil ortak kullanır
// En az 4 kartı olan ve çalışılmış üniteler arasından seçer
// ============================================================
function uniteIstatistigi(srs) {
  const kova = {};
  CARDS.forEach(c => {
    // Günün Önceliği yalnızca LGS kapsamındaki üniteleri önerir.
    // Tekrar konusu için "buraya çalış" demek sınava hazırlanan
    // öğrenciyi yanlış yöne yönlendirir.
    if (c.lgsKapsam === false) return;
    const d = srs[c.id];
    if (!d || !d.reps) return;
    const anahtar = c.ders + '|' + c.unite;
    if (!kova[anahtar]) kova[anahtar] = { ders: c.ders, unite: c.unite, toplam: 0, ogrenilen: 0 };
    kova[anahtar].toplam++;
    if (d.seviye >= 3) kova[anahtar].ogrenilen++;
  });
  // Ders sınav ağırlığı: Türkçe/Mat/Fen 20 soru, İnkılap/Din/İngilizce 10 soru.
  // Öncelik = zayıflık × ağırlık — düşük ağırlıklı derste "en zayıf" olmak
  // yüksek ağırlıklı dersteki eşdeğer zayıflıktan daha az öncelikli olmalı.
  const AGIRLIK = { turkce: 20, mat: 20, fen: 20, inkilap: 10, din: 10, ingilizce: 10 };
  return Object.values(kova)
    .filter(u => u.toplam >= 4)
    .map(u => ({
      ...u,
      pct: Math.round((u.ogrenilen / u.toplam) * 100),
      agirlik: AGIRLIK[u.ders] || 10,
    }))
    .map(u => ({ ...u, oncelik: (100 - u.pct) * u.agirlik }))
    .sort((a, b) => a.pct - b.pct);   // zayıftan güçlüye — profildeki liste bunu bekler
}

// Günün Önceliği için: en zayıf değil, en yüksek öncelikli üniteyi seçer
function enOncelikliUnite(srs) {
  const liste = uniteIstatistigi(srs);
  if (!liste.length) return null;
  return [...liste].sort((a, b) => b.oncelik - a.oncelik)[0];
}

// ============ METİN SADELEŞTİRME (arama için) ============
// Türkçe harfleri sadeleştirip noktalama ve boşlukları atar,
// böylece "gokturk" araması "Göktürk" kartını bulur.
const TR_HARF = {
  'ı': 'i', 'İ': 'i', 'I': 'i', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
  'ş': 's', 'Ş': 's', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u',
};
const sadelestir = (m) => String(m || '')
  .split('').map(c => TR_HARF[c] || c).join('')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

// ============================================================
// LGS SORU DAĞILIMI
//
// Gerçek sınavda ders ve konu ağırlıkları sabittir. Deneme
// bu dağılıma göre kurulur; rastgele seçim gerçek sınavı
// yansıtmıyordu.
// Kaynak: 2018-2024 LGS soru dağılımları
// ============================================================
const LGS_DAGILIM = {
  turkce: {
    soru: 20,
    uniteler: {
      'Parçada Anlam': 6,
      'Sözcükte Anlam': 3,
      'Cümlede Anlam': 3,
      'Metin Türleri': 2,
      'Söz Sanatları': 1,
      'Yazım ve Noktalama': 2,
      'Fiilimsiler': 1,
      'Cümlenin Ögeleri': 2,
    },
  },
  mat: {
    soru: 20,
    uniteler: {
      'Üslü ve Kareköklü İfadeler': 6,
      'Cebirsel İfadeler ve Denklemler': 6,
      'Üçgenler ve Geometri': 5,
      'Veri Analizi ve Olasılık': 2,
      'Çarpanlar ve Katlar': 1,
    },
  },
  fen: {
    soru: 20,
    uniteler: {
      'DNA ve Genetik Kod': 5,
      'Madde ve Endüstri': 5,
      'Basınç': 3,
      'Enerji Dönüşümleri ve Çevre Bilimi': 3,
      'Elektrik Yükleri ve Elektrik Enerjisi': 2,
      'Canlılar ve Enerji İlişkileri': 1,
      'Mevsimler ve İklim': 1,
    },
  },
  inkilap: {
    soru: 10,
    uniteler: {
      'Atatürkçülük ve Çağdaşlaşan Türkiye': 4,
      'Milli Uyanış': 2,
      'Milli Bir Destan': 2,
      'Bir Kahraman Doğuyor': 1,
      'Atatürk Dönemi Dış Politika': 1,
    },
  },
  din: {
    soru: 10,
    uniteler: {
      'Kader İnancı': 3,
      'Din ve Hayat': 3,
      'Zekât ve Sadaka': 2,
      "Hz. Muhammed'in Örnekliği": 1,
      "Kur'an-ı Kerim ve Özellikleri": 1,
    },
  },
  ingilizce: {
    soru: 10,
    uniteler: {
      'Friendship': 2,
      'Teen Life': 2,
      'In the Kitchen': 1,
      'On the Phone': 1,
      'The Internet': 1,
      'Adventures': 1,
      'Tourism': 1,
      'Chores': 1,
    },
  },
};

/**
 * Gerçek LGS dağılımına göre deneme kurar.
 * Bir üniteden yeterli kart yoksa eksik, aynı dersin diğer
 * ünitelerinden tamamlanır; ders kotası her hâlükârda korunur.
 */
function denemeKur(havuz, toplamSoru) {
  const uygun = havuz.filter(c => c.secenekler && c.lgsKapsam);
  const secilen = [];
  const kullanilan = new Set();

  // Sınav 90 soruluk; istenen toplam ona oranlanır
  const tamToplam = Object.values(LGS_DAGILIM).reduce((a, d) => a + d.soru, 0);
  const olcek = toplamSoru / tamToplam;

  Object.keys(LGS_DAGILIM).forEach(dersId => {
    const dersKota = Math.max(1, Math.round(LGS_DAGILIM[dersId].soru * olcek));
    const dersHavuz = uygun.filter(c => c.ders === dersId);
    if (!dersHavuz.length) return;

    const dersSecilen = [];

    // Önce ünite kotalarını doldur
    Object.entries(LGS_DAGILIM[dersId].uniteler).forEach(([unite, adet]) => {
      const kota = Math.round(adet * olcek);
      if (kota <= 0) return;
      const uniteHavuz = shuffle(dersHavuz.filter(c => c.unite === unite && !kullanilan.has(c.id)));
      uniteHavuz.slice(0, kota).forEach(c => {
        dersSecilen.push(c);
        kullanilan.add(c.id);
      });
    });

    // Ders kotası dolmadıysa aynı dersten tamamla
    if (dersSecilen.length < dersKota) {
      const kalan = shuffle(dersHavuz.filter(c => !kullanilan.has(c.id)));
      kalan.slice(0, dersKota - dersSecilen.length).forEach(c => {
        dersSecilen.push(c);
        kullanilan.add(c.id);
      });
    }

    secilen.push(...dersSecilen.slice(0, dersKota));
  });

  // Hedefe ulaşılamadıysa genel havuzdan tamamla
  if (secilen.length < toplamSoru) {
    const kalan = shuffle(uygun.filter(c => !kullanilan.has(c.id)));
    kalan.slice(0, toplamSoru - secilen.length).forEach(c => secilen.push(c));
  }

  return shuffle(secilen.slice(0, toplamSoru));
}

// ============ HAPTİK ============
const titre = {
  dogru: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {} },
  yanlis: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) {} },
  hafif: () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {} },
  orta: () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {} },
};

// ============ BİLDİRİM ============

// ============================================================
// HATA YAKALAYICI (sınıf bileşeni — sabit açık palet kullanır)
// ============================================================
class HataYakalayici extends React.Component {
  constructor(props) { super(props); this.state = { hata: null }; }
  static getDerivedStateFromError(hata) { return { hata }; }
  componentDidCatch(hata, bilgi) { console.log('Yakalanan hata:', hata, bilgi); }
  render() {
    if (this.state.hata) {
      const P = KAGIT;
      return (
        <View style={{ flex: 1, backgroundColor: P.bg, justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 14, color: P.red, letterSpacing: 1, marginBottom: 8 }}>BİR SORUN OLUŞTU</Text>
          <Text style={{ fontSize: 25, color: P.ink, marginBottom: 12 }}>Uygulama beklenmedik şekilde durdu</Text>
          <Text style={{ fontSize: 16, color: P.inkSoft, lineHeight: 22, marginBottom: 24 }}>
            İlerlemen kayıtlı. Tekrar denemek için aşağıdaki düğmeye bas; sorun sürerse verileri sıfırla.
          </Text>
          <TouchableOpacity onPress={() => this.setState({ hata: null })}
            style={{ backgroundColor: P.yesil, borderRadius: 16, borderBottomWidth: 5, borderBottomColor: P.yesilKoyu, paddingVertical: 15, alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, color: '#FFFFFF', fontFamily: FONT.monoBold }}>TEKRAR DENE</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Emin misin?', 'Tüm ilerleme silinecek.', [
            { text: 'İptal' },
            { text: 'Sıfırla', style: 'destructive', onPress: async () => { await AsyncStorage.clear(); this.setState({ hata: null }); } },
          ])} style={{ backgroundColor: P.kirmizi, borderRadius: 16, borderBottomWidth: 5, borderBottomColor: P.kirmiziKoyu, paddingVertical: 15, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#FFFFFF', fontFamily: FONT.monoBold }}>VERİLERİ SIFIRLA</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// DAİRESEL İLERLEME HALKASI
// Ders kartlarının köşesinde ve avatar çevresinde kullanılır
// ============================================================
function Halka({ pct, boyut = 46, kalinlik = 4, renk = '#FFFFFF', zemin = 'rgba(255,255,255,0.28)', children, yaziBoyut = 13 }) {
  const r = (boyut - kalinlik) / 2;
  const cevre = 2 * Math.PI * r;
  const dolu = cevre * (Math.max(0, Math.min(100, pct)) / 100);

  return (
    <View style={{ width: boyut, height: boyut, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={boyut} height={boyut} style={{ position: 'absolute' }}>
        <Circle cx={boyut / 2} cy={boyut / 2} r={r} stroke={zemin} strokeWidth={kalinlik} fill="none" />
        <Circle
          cx={boyut / 2} cy={boyut / 2} r={r}
          stroke={renk} strokeWidth={kalinlik} fill="none"
          strokeDasharray={cevre + ' ' + cevre}
          strokeDashoffset={cevre - dolu}
          strokeLinecap="round"
          transform={'rotate(-90 ' + (boyut / 2) + ' ' + (boyut / 2) + ')'}
        />
      </Svg>
      {children !== undefined ? children : (
        <Text style={{ fontFamily: FONT.monoBold, fontSize: yaziBoyut, color: renk }}>{pct}</Text>
      )}
    </View>
  );
}

// ============================================================
// GÜNLÜK HALKA — merkezdeki ana gösterge
//
// Günlük hedefe göre dolar. Her ders kendi renginde bir yay
// olarak yerini alır; böylece "yeterince çalıştım mı" ve
// "hangi derslere dokundum" tek bakışta görülür.
// ============================================================
function GunlukHalka({ dersDagilim, hedef, toplam, boyut = 200, kalinlik = 18 }) {
  const { P, DERSLER } = useTema();

  // Sallanınca kısa süreliğine mutlu ifadeye geçer, sonra normale döner
  const [sallandi, setSallandi] = useState(false);
  const sallandiZaman = useRef(null);
  const ligoIfadeAdi = sallandi ? 'kutlama' : ligoIfadesi({ bugun: toplam, hedefKart: hedef });
  const ligoRes = ligoGorsel(ligoIfadeAdi);

  // Hafif nefes alma hareketi — durağan durmasın
  const zipla = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dongu = Animated.loop(
      Animated.sequence([
        Animated.timing(zipla, { toValue: -5, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(zipla, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    dongu.start();
    return () => dongu.stop();
  }, []);

  // Sallama tepkisi: telefon sallandığı SÜRECE Ligo hareket eder.
  // Her ivme örneği kendi hedef değerini set eder; spring o hedefe
  // koşar. Sallama durunca hedef 0'a döner, spring kendiliğinden
  // yerine oturur — tek seferlik zıplama değil, sürekli takip.
  const sallamaX = useRef(new Animated.Value(0)).current;
  const sallamaY = useRef(new Animated.Value(0)).current;
  const sallamaDonus = useRef(new Animated.Value(0)).current;
  const sonHaptik = useRef(0);

  const GURULTU_ESIGI = 0.06;    // bu altı sensör gürültüsü sayılır, yok say
  const BUYUK_ESIK = 0.55;       // bu üstü "gerçekten sallanıyor" sayılır
  const OLCEK = 26;               // ivmeyi piksele çeviren katsayı
  const MAX_KAYMA = 30;
  const MAX_DERECE = 16;

  useIvmeTakip(({ dx, dy, siddet }) => {
    if (siddet < GURULTU_ESIGI) return;

    const hedefX = Math.max(-MAX_KAYMA, Math.min(MAX_KAYMA, dx * OLCEK));
    const hedefY = Math.max(-MAX_KAYMA, Math.min(MAX_KAYMA, -Math.abs(dy) * OLCEK * 0.5));
    const hedefDonus = Math.max(-MAX_DERECE, Math.min(MAX_DERECE, dx * OLCEK * 0.7));

    Animated.spring(sallamaX, { toValue: hedefX, useNativeDriver: true, friction: 3.2, tension: 220 }).start();
    Animated.spring(sallamaY, { toValue: hedefY, useNativeDriver: true, friction: 3.2, tension: 220 }).start();
    Animated.spring(sallamaDonus, { toValue: hedefDonus, useNativeDriver: true, friction: 3, tension: 200 }).start();

    if (siddet > BUYUK_ESIK) {
      setSallandi(true);
      const simdi = Date.now();
      if (simdi - sonHaptik.current > 220) {
        titre.hafif();
        sonHaptik.current = simdi;
      }
      if (sallandiZaman.current) clearTimeout(sallandiZaman.current);
      sallandiZaman.current = setTimeout(() => {
        setSallandi(false);
        // Sallama bitince Ligo yumuşakça merkeze dönsün
        Animated.spring(sallamaX, { toValue: 0, useNativeDriver: true, friction: 5, tension: 90 }).start();
        Animated.spring(sallamaY, { toValue: 0, useNativeDriver: true, friction: 5, tension: 90 }).start();
        Animated.spring(sallamaDonus, { toValue: 0, useNativeDriver: true, friction: 5, tension: 90 }).start();
      }, 500);
    }
  });

  const donusDerece = sallamaDonus.interpolate({ inputRange: [-MAX_DERECE, MAX_DERECE], outputRange: [-MAX_DERECE + 'deg', MAX_DERECE + 'deg'] });

  const r = (boyut - kalinlik) / 2;
  const cevre = 2 * Math.PI * r;
  const tamam = hedef > 0 && toplam >= hedef;

  // Yayları sırayla diz: her dersin payı kadar
  const yaylar = [];
  let birikim = 0;
  DERSLER.forEach(d => {
    const sayi = dersDagilim[d.id] || 0;
    if (sayi <= 0) return;
    const oran = Math.min(1, sayi / Math.max(1, hedef));
    if (birikim >= 1) return;
    const kullanilabilir = Math.min(oran, 1 - birikim);
    yaylar.push({
      id: d.id, renk: d.renk,
      uzunluk: cevre * kullanilabilir,
      kayma: cevre * birikim,
    });
    birikim += kullanilabilir;
  });

  const pct = Math.min(100, hedef ? Math.round((toplam / hedef) * 100) : 0);

  return (
    <View style={{ width: boyut, height: boyut, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={boyut} height={boyut} style={{ position: 'absolute' }}>
        {/* Boş kanal */}
        <Circle cx={boyut / 2} cy={boyut / 2} r={r}
          stroke={P.koyu ? 'rgba(255,255,255,0.08)' : 'rgba(16,18,26,0.07)'}
          strokeWidth={kalinlik} fill="none" />

        {/* Ders yayları */}
        {yaylar.map(y => (
          <Circle
            key={y.id}
            cx={boyut / 2} cy={boyut / 2} r={r}
            stroke={y.renk} strokeWidth={kalinlik} fill="none"
            strokeDasharray={y.uzunluk + ' ' + (cevre - y.uzunluk)}
            strokeDashoffset={-y.kayma}
            strokeLinecap="butt"
            transform={'rotate(-90 ' + (boyut / 2) + ' ' + (boyut / 2) + ')'}
          />
        ))}
      </Svg>

      {/* Merkez: Ligo + sayı */}
      <View style={{ alignItems: 'center' }}>
        {ligoRes && (
          <Animated.Image
            source={ligoRes}
            style={{
              width: boyut * 0.40, height: boyut * 0.40,
              resizeMode: 'contain', marginBottom: -4,
              transform: [
                { translateX: sallamaX },
                { translateY: Animated.add(zipla, sallamaY) },
                { rotate: donusDerece },
              ],
            }}
          />
        )}
        {tamam ? (
          <Text style={{ fontFamily: FONT.monoBold, fontSize: 15, color: P.yesil, marginTop: 4 }}>TAMAMLANDI</Text>
        ) : (
          <View style={{ alignItems: 'center', marginTop: 2 }}>
            <Text style={{ fontFamily: FONT.baslik, fontSize: 34, color: P.ink, lineHeight: 38 }}>
              %{pct}
            </Text>
            <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 12, color: P.inkSoft, marginTop: -1 }}>
              GÜNLÜK HEDEF
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================
// SEGMENTLİ NEON İLERLEME BARI
// Tamamlanan parçalar parlar, boşlar sönük kalır
// ============================================================
function SegmentBar({ pct, segment = 5, renk = '#FFFFFF', yukseklik = 10, bosRenk = 'rgba(255,255,255,0.18)' }) {
  const oran = Math.max(0, Math.min(100, pct)) / 100;
  return (
    <View style={{ flexDirection: 'row' }}>
      {Array.from({ length: segment }).map((_, i) => {
        const parcaBas = i / segment;
        const parcaDolu = Math.max(0, Math.min(1, (oran - parcaBas) * segment));
        const yanik = parcaDolu > 0;
        return (
          <View key={i} style={{
            flex: 1, height: yukseklik, borderRadius: 999,
            backgroundColor: bosRenk, overflow: 'hidden',
            marginRight: i === segment - 1 ? 0 : 5,
            ...(yanik ? {
              shadowColor: renk, shadowOpacity: 0.9,
              shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
              elevation: 4,
            } : {}),
          }}>
            <View style={{
              height: '100%', width: (parcaDolu * 100) + '%',
              backgroundColor: renk, borderRadius: 999,
            }} />
          </View>
        );
      })}
    </View>
  );
}

// ============================================================
// KUTLAMA — hedef tamamlandığında tam ekran
// ============================================================
function Kutlama({ tur, seri, xp, hedefKart, onKapat }) {
  const { P } = useTema();
  const olcek = useRef(new Animated.Value(0.7)).current;
  const opak = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    titre.dogru();
    Animated.parallel([
      Animated.spring(olcek, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }),
      Animated.timing(opak, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(8,10,16,0.92)',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 28,
    }}>
      <Animated.View style={{ opacity: opak, transform: [{ scale: olcek }], alignItems: 'center', width: '100%' }}>

        <View style={{
          width: 150, height: 150, borderRadius: 75,
          backgroundColor: P.yesil + '1E',
          borderWidth: 3, borderColor: P.yesil,
          alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          shadowColor: P.yesil, shadowOpacity: 0.6, shadowRadius: 26,
          shadowOffset: { width: 0, height: 0 }, elevation: 12,
        }}>
          {ligoGorsel('kutlama')
            ? <Image source={ligoGorsel('kutlama')} style={{ width: 116, height: 116, resizeMode: 'contain' }} />
            : <Check size={70} color={P.yesil} strokeWidth={3.4} />}
        </View>

        <Text style={{ fontFamily: FONT.baslik, fontSize: 32, color: '#FFFFFF', textAlign: 'center' }}>
          Günlük hedef tamam
        </Text>
        <Text style={{
          fontFamily: FONT.govde, fontSize: 17, color: 'rgba(255,255,255,0.72)',
          textAlign: 'center', marginTop: 8, lineHeight: 25,
        }}>
          {hedefKart} kart bitti. Seri {seri} güne çıktı.
        </Text>

        <View style={{ flexDirection: 'row', marginTop: 28, marginBottom: 30 }}>
          {[
            { v: hedefKart, l: 'KART', renk: P.mavi },
            { v: seri, l: 'GÜN SERİSİ', renk: P.altin },
            { v: xp, l: 'TOPLAM XP', renk: P.mor },
          ].map((it, i) => (
            <View key={it.l} style={{
              flex: 1, alignItems: 'center',
              marginLeft: i === 0 ? 0 : 8, marginRight: i === 2 ? 0 : 8,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
              borderRadius: 18, paddingVertical: 15,
            }}>
              <Text style={{ fontFamily: FONT.baslik, fontSize: 24, color: it.renk }}>{it.v}</Text>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{it.l}</Text>
            </View>
          ))}
        </View>

        <View style={{ width: '100%' }}>
          <Dugme etiket="DEVAM ET" renk={P.yesil} renkKoyu={P.yesilKoyu} tam onPress={onKapat} />
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================================
// BÖLÜM BAŞLIĞI — profildeki kartları renklendirir
// Gradyan ikon rozeti + renkli başlık, kartın kimliğini verir
// ============================================================
function BolumBaslik({ Ikon, baslik, sag, gradyan, renk }) {
  const { P } = useTema();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <View style={[st_golge, { borderRadius: 14, overflow: 'hidden', marginRight: 12 }]}>
        <LinearGradient colors={gradyan} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
          <Ikon size={22} color="#FFFFFF" strokeWidth={2.6} />
        </LinearGradient>
      </View>
      <Text style={{ flex: 1, fontFamily: FONT.monoBold, fontSize: 15, color: renk, letterSpacing: 0.8 }}>
        {baslik}
      </Text>
      {sag ? (
        <Text style={{ fontFamily: FONT.monoBold, fontSize: 14, color: P.inkFaint }}>{sag}</Text>
      ) : null}
    </View>
  );
}

// Bölüm başlığı gölgesi — StyleSheet dışında sabit
const st_golge = {
  shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 }, elevation: 5,
};

// ============================================================
// SINAV NOTLARIM — okul/dershane sınavlarının ders bazında net takibi
//
// Uygulamanın kendi denemesinden ayrı: burası dış dünyada
// yazılan gerçek sınavların kaydı. Yalnızca cihazda tutulur.
// ============================================================
const SINAV_NOTLARI_ANAHTAR = 'lgs_sinav_notlari';

function SinavNotlariEkrani() {
  const { P, s: st, DERSLER } = useTema();
  const [notlar, setNotlar] = useState([]);
  const [yukluyor, setYukluyor] = useState(true);
  const [formAcik, setFormAcik] = useState(false);

  const [ad, setAd] = useState('');
  const [netler, setNetler] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(SINAV_NOTLARI_ANAHTAR);
        if (v) setNotlar(JSON.parse(v));
      } catch (e) {}
      setYukluyor(false);
    })();
  }, []);

  useEffect(() => {
    if (yukluyor) return;
    AsyncStorage.setItem(SINAV_NOTLARI_ANAHTAR, JSON.stringify(notlar)).catch(() => {});
  }, [notlar, yukluyor]);

  const toplamNet = (n) => Object.values(n.netler || {}).reduce((a, v) => a + (Number(v) || 0), 0);

  const kaydet = () => {
    const temizNetler = {};
    let girisVar = false;
    DERSLER.forEach(d => {
      const v = netler[d.id];
      if (v !== undefined && v !== '') {
        const sayi = Math.max(0, Math.min(20, Number(v.replace(',', '.')) || 0));
        temizNetler[d.id] = sayi;
        girisVar = true;
      }
    });
    if (!girisVar) {
      Alert.alert('Boş sınav', 'En az bir dersten net girmen lazım.');
      return;
    }
    const yeni = {
      id: String(Date.now()),
      ad: ad.trim() || 'Sınav',
      tarih: bugunTarihi(),
      netler: temizNetler,
    };
    setNotlar(l => [yeni, ...l]);
    setAd(''); setNetler({}); setFormAcik(false);
    titre.dogru();
  };

  const sil = (id) => {
    Alert.alert('Silinsin mi?', 'Bu sınav kaydı silinecek.', [
      { text: 'Vazgeç' },
      { text: 'Sil', style: 'destructive', onPress: () => setNotlar(l => l.filter(x => x.id !== id)) },
    ]);
  };

  // Gelişim: ilk kayıtla son kayıt arasındaki fark
  const gelisim = notlar.length > 1
    ? +(toplamNet(notlar[0]) - toplamNet(notlar[notlar.length - 1])).toFixed(1)
    : null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

      {/* Özet */}
      {notlar.length > 0 && (
        <View style={[st.golge, { borderRadius: 22, marginBottom: 16, overflow: 'hidden' }]}>
          <LinearGradient colors={['#F7971E', '#FFD200']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20 }}>
            <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 13, color: '#FFFFFFCC', letterSpacing: 1 }}>
              SON SINAV
            </Text>
            <Text style={{ fontFamily: FONT.baslik, fontSize: 40, color: '#FFFFFF', marginTop: 2 }}>
              {toplamNet(notlar[0])} <Text style={{ fontSize: 18, color: '#FFFFFFCC' }}>net</Text>
            </Text>
            {gelisim !== null && (
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 14, color: '#FFFFFFDD', marginTop: 4 }}>
                {gelisim > 0 ? 'İlk sınavına göre ' + gelisim + ' net yükseldin' :
                 gelisim < 0 ? 'İlk sınavına göre ' + Math.abs(gelisim) + ' net düştü' :
                 'İlk sınavınla aynı seviyedesin'}
              </Text>
            )}
          </LinearGradient>
        </View>
      )}

      {/* Yeni sınav ekle */}
      {!formAcik ? (
        <Dugme etiket="YENİ SINAV EKLE" Ikon={Plus} renk={P.altin} renkKoyu={P.altinKoyu} tam
          onPress={() => { titre.hafif(); setFormAcik(true); }} />
      ) : (
        <View style={[st.kart, { marginBottom: 16 }]}>
          <Text style={st.etiket}>SINAV ADI (İSTEĞE BAĞLI)</Text>
          <TextInput
            style={st.girdi}
            value={ad}
            onChangeText={setAd}
            placeholder="Örn. Dershane Denemesi 3"
            placeholderTextColor={P.inkFaint}
          />

          <Text style={st.etiket}>DERS BAZINDA NET</Text>
          {DERSLER.map(d => {
            const DIkon = d.ikon;
            return (
            <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={{
                width: 34, height: 34, borderRadius: 10, backgroundColor: d.acik,
                alignItems: 'center', justifyContent: 'center', marginRight: 11,
              }}>
                <DIkon size={17} color={d.renk} strokeWidth={2.4} />
              </View>
              <Text style={{ flex: 1, fontFamily: FONT.govdeOrta, fontSize: 15, color: P.ink }}>{d.ad}</Text>
              <TextInput
                style={{
                  width: 64, backgroundColor: P.bgAlt, borderWidth: 2, borderColor: P.line,
                  borderRadius: 12, paddingVertical: 8, textAlign: 'center',
                  fontFamily: FONT.monoBold, fontSize: 15, color: P.ink,
                }}
                value={netler[d.id] || ''}
                onChangeText={(v) => setNetler(n => ({ ...n, [d.id]: v }))}
                placeholder="0"
                placeholderTextColor={P.inkFaint}
                keyboardType="decimal-pad"
              />
            </View>
            );
          })}

          <View style={{ flexDirection: 'row', marginTop: 6 }}>
            <TouchableOpacity
              onPress={() => { setFormAcik(false); setAd(''); setNetler({}); }}
              style={{
                flex: 1, marginRight: 10, borderWidth: 2, borderColor: P.line,
                borderRadius: 16, paddingVertical: 14, alignItems: 'center',
              }}>
              <Text style={{ fontFamily: FONT.monoBold, fontSize: 15, color: P.inkSoft }}>VAZGEÇ</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Dugme etiket="KAYDET" renk={P.yesil} renkKoyu={P.yesilKoyu} tam onPress={kaydet} />
            </View>
          </View>
        </View>
      )}

      {/* Geçmiş */}
      {notlar.length > 0 && (
        <>
          <Text style={st.etiket}>GEÇMİŞ</Text>
          {notlar.map(n => {
            const tarihStr = new Date(n.tarih).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
            return (
              <TouchableOpacity
                key={n.id} activeOpacity={0.85}
                onLongPress={() => sil(n.id)}
                style={[st.kart, { marginBottom: 11 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 16, color: P.ink }}>{n.ad}</Text>
                    <Text style={{ fontFamily: FONT.govde, fontSize: 13, color: P.inkFaint, marginTop: 1 }}>{tarihStr}</Text>
                  </View>
                  <Text style={{ fontFamily: FONT.baslik, fontSize: 24, color: P.altin }}>{toplamNet(n)}</Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {DERSLER.filter(d => n.netler[d.id] !== undefined).map(d => (
                    <View key={d.id} style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: d.acik, borderRadius: 999,
                      paddingHorizontal: 10, paddingVertical: 5,
                      marginRight: 7, marginBottom: 6,
                    }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.renk, marginRight: 6 }} />
                      <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 12, color: d.renk }}>
                        {d.ad}: {n.netler[d.id]}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
          <Text style={{ fontFamily: FONT.govde, fontSize: 13, color: P.inkFaint, textAlign: 'center', marginTop: 6 }}>
            Silmek için kayda uzun bas
          </Text>
        </>
      )}

      {notlar.length === 0 && !formAcik && (
        <View style={{ alignItems: 'center', paddingVertical: 30 }}>
          {ligoGorsel('normal') && (
            <Image source={ligoGorsel('normal')} style={{ width: 100, height: 100, resizeMode: 'contain', marginBottom: 16 }} />
          )}
          <Text style={{
            fontFamily: FONT.govde, fontSize: 16, color: P.inkSoft,
            textAlign: 'center', lineHeight: 23,
          }}>
            Okulda veya dershanede yazdığın{'\n'}sınavların netlerini burada tutabilirsin.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================================
// YOL HARİTASI — mini-grupları yılan patikası üzerinde gösterir
//
// Tamamlanan grup dolu yeşil, sıradaki açık mavi ve dokunulabilir,
// kilitli gruplar soluk ve kilit ikonlu. Dokununca o grubun
// kartlarıyla doğrudan Kart Modu başlar.
// ============================================================
function YolHaritasi({ ders, unite, srs, renk, onGrupSec }) {
  const { P } = useTema();
  const gruplar = React.useMemo(() => miniGruplar(ders, unite), [ders, unite]);

  if (gruplar.length <= 1) return null;   // tek gruplu ünitede yol anlamsız

  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={st_etiket(P)}>ÇALIŞMA YOLU</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 4 }}>
        {gruplar.map((grup, i) => {
          const durum = grupDurumu(gruplar, i, srs);
          const kilitli = durum === 'kilitli';
          const tamam = durum === 'tamam';
          // Yılan deseni: çift sıralar hafif aşağı, tek sıralar hafif yukarı kayar
          const dikeyKaydir = (i % 3 === 1) ? 14 : (i % 3 === 2) ? -14 : 0;

          return (
            <View key={i} style={{ alignItems: 'center', marginRight: 14, marginTop: dikeyKaydir + 14 }}>
              <TouchableOpacity
                disabled={kilitli}
                activeOpacity={0.8}
                onPress={() => { titre.orta(); onGrupSec(grup, i); }}
                style={{
                  width: 46, height: 46, borderRadius: 23,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: tamam ? renk : (kilitli ? P.bgAlt : P.yuzey),
                  borderWidth: 2.5,
                  borderColor: tamam ? renk : (kilitli ? P.line : renk),
                  opacity: kilitli ? 0.5 : 1,
                }}>
                {kilitli
                  ? <Lock size={18} color={P.inkFaint} strokeWidth={2.4} />
                  : tamam
                    ? <Check size={20} color="#FFFFFF" strokeWidth={3} />
                    : <Text style={{ fontFamily: FONT.baslik, fontSize: 15, color: renk }}>{i + 1}</Text>}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function st_etiket(P) {
  return { fontFamily: FONT.monoBold, fontSize: 12, color: P.inkSoft, letterSpacing: 1, marginBottom: 4 };
}

// ============================================================
// 3B BUTON — basılabilir görünen, basınca çöken tuş
// Alt kenardaki kalınlık fiziksel derinlik hissi verir.
// ============================================================
function Dugme({ etiket, Ikon, renk, renkKoyu, yazi, onPress, tam, kucuk, pasif, style }) {
  const { P } = useTema();
  const [basili, setBasili] = React.useState(false);

  const anaRenk = pasif ? P.line : (renk || P.yesil);
  const altRenk = pasif ? P.lineKoyu : (renkKoyu || P.yesilKoyu);
  const yaziRenk = yazi || (pasif ? P.inkFaint : '#FFFFFF');
  const derinlik = kucuk ? 4 : 5;

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={pasif}
      onPressIn={() => setBasili(true)}
      onPressOut={() => setBasili(false)}
      onPress={() => { if (!pasif) { titre.orta(); onPress && onPress(); } }}
      style={[
        {
          backgroundColor: anaRenk,
          borderRadius: 16,
          borderBottomWidth: basili ? 1 : derinlik,
          borderBottomColor: altRenk,
          paddingVertical: kucuk ? 12 : 16,
          paddingHorizontal: 20,
          marginTop: basili ? derinlik - 1 : 0,
          alignItems: 'center', justifyContent: 'center',
          flexDirection: 'row',
          alignSelf: tam ? 'stretch' : 'auto',
        },
        style,
      ]}>
      {Ikon ? <Ikon size={kucuk ? 18 : 21} color={yaziRenk} strokeWidth={2.6} style={{ marginRight: 9 }} /> : null}
      <Text style={{
        fontFamily: FONT.monoBold,
        fontSize: kucuk ? 15 : 17,
        color: yaziRenk,
        letterSpacing: 0.6,
      }}>{etiket}</Text>
    </TouchableOpacity>
  );
}

// ============================================================
// YUVARLAK İKON BUTONU — kapat, geri al gibi eylemler
// Küçük dokunma alanı sorununu çözer: 44x44 minimum
// ============================================================
function IkonDugme({ Ikon, renk, renkKoyu, zemin, ikonRenk, onPress, boyut = 52, ikonBoyut = 26, dolu }) {
  const [basili, setBasili] = React.useState(false);
  const derinlik = 4;
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={() => setBasili(true)}
      onPressOut={() => setBasili(false)}
      onPress={() => { titre.hafif(); onPress && onPress(); }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{
        width: boyut, height: boyut, borderRadius: boyut / 2,
        backgroundColor: dolu ? renk : (zemin || 'transparent'),
        borderWidth: dolu ? 0 : 2,
        borderColor: renk,
        borderBottomWidth: basili ? (dolu ? 0 : 2) : derinlik,
        borderBottomColor: dolu ? (renkKoyu || renk) : renk,
        marginTop: basili ? derinlik - (dolu ? 0 : 2) : 0,
        alignItems: 'center', justifyContent: 'center',
      }}>
      <Ikon size={ikonBoyut} color={dolu ? (ikonRenk || '#FFFFFF') : renk} strokeWidth={2.8} />
    </TouchableOpacity>
  );
}

// ============================================================
// İMZA BİLEŞENLER
// ============================================================
// Ders / seviye rozeti: yumuşak köşeli renkli kutu içinde çizgisel ikon.
// Çerçeveli daire yerine tonlu dolgu — modern mobil arayüz standardı.
function Muhur({ Ikon, renk, boyut = 44, kagitRenk }) {
  const { P } = useTema();
  return (
    <View style={{
      width: boyut, height: boyut,
      borderRadius: Math.round(boyut * 0.29),   // squircle hissi
      backgroundColor: kagitRenk || P.vurguZemin,
      alignItems: 'center', justifyContent: 'center',
    }}>
      {Ikon ? <Ikon size={Math.round(boyut * 0.5)} color={renk} strokeWidth={1.8} /> : null}
    </View>
  );
}

// Zemin + kaydırılabilir içerik için ortak sarmalayıcı
function Sayfa({ children, style }) {
  const { P } = useTema();
  return (
    <View style={[{ flex: 1, backgroundColor: P.bg }, style]}>
      {children}
    </View>
  );
}

// ============ ONBOARDING ============
function Onboarding({ onDone }) {
  const { P } = useTema();
  const kenar = useSafeAreaInsets();
  const [sayfa, setSayfa] = useState(0);
  const sayfalar = [
    { harf: '01', baslik: 'Ben Ligo', ifade: 'normal',
      alt: 'LGS yolculuğunda yanındayım.\nAltı dersin tamamı tek yerde.' },
    { harf: '02', baslik: 'Aralıklı Tekrar', ifade: 'mutlu',
      alt: 'Her kartı tam unutmaya başladığın\nanda karşına çıkarırım.' },
    { harf: '03', baslik: 'Günlük Halka', ifade: 'normal',
      alt: 'Her gün bir halka doldurursun.\nÇalıştığın ders rengiyle dolar.' },
    { harf: '04', baslik: 'Hazırsın', ifade: 'kutlama',
      alt: 'Seri kur, rozet topla,\nseviye atla. Hadi başlayalım.' },
  ];
  const s = sayfalar[sayfa];
  const son = sayfa === sayfalar.length - 1;
  const ligoRes = ligoGorsel(s.ifade);
  return (
    <Sayfa>
      <View style={{ flex: 1, justifyContent: 'center', padding: 32, paddingTop: kenar.top + 32, paddingBottom: kenar.bottom + 32 }}>
        <TouchableOpacity onPress={onDone} style={{ position: 'absolute', top: kenar.top + 14, right: 24 }}>
          <Text style={{ color: P.inkSoft, fontSize: 17, fontFamily: FONT.govde }}>geç →</Text>
        </TouchableOpacity>
        {ligoRes && (
          <Image source={ligoRes} style={{
            width: 140, height: 140, resizeMode: 'contain',
            alignSelf: 'center', marginBottom: 22,
          }} />
        )}
        <Text style={{ fontFamily: FONT.mono, fontSize: 14, color: P.neon, marginBottom: 8, letterSpacing: 1.2 }}>
          {s.harf} / 04
        </Text>
        <Text style={{ fontFamily: FONT.baslik, fontSize: 38, color: P.ink, marginBottom: 14 }}>{s.baslik}</Text>
        <Text style={{ fontSize: 18, color: P.inkSoft, lineHeight: 26, fontFamily: FONT.govde }}>{s.alt}</Text>
        <View style={{ flexDirection: 'row', marginTop: 36, marginBottom: 26 }}>
          {sayfalar.map((_, i) => (
            <View key={i} style={{ width: i === sayfa ? 24 : 8, height: 4, borderRadius: 999, backgroundColor: i === sayfa ? P.neon : P.line, marginRight: 6 }} />
          ))}
        </View>
        <Dugme etiket={son ? 'HADİ BAŞLAYALIM' : 'DEVAM'} tam
          onPress={() => { son ? onDone() : setSayfa(x => x + 1); }} />
      </View>
    </Sayfa>
  );
}

// ============ İLK KURULUM ============
// ÖNEMLİ: Bu bileşen PersonalSetup'ın DIŞINDA tanımlıdır.
// İçeride tanımlansaydı her tuş vuruşunda React onu yeni bir bileşen
// sanar, TextInput sıfırdan kurulur ve klavye kapanırdı.
function KurulumCercevesi({ no, baslik, alt, children, devam }) {
  const { P } = useTema();
  const kenar = useSafeAreaInsets();
  return (
    <Sayfa>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, paddingTop: kenar.top + 28, paddingBottom: kenar.bottom + 28 }}
        keyboardShouldPersistTaps="handled">
        <Text style={{ fontFamily: FONT.mono, fontSize: 14, color: P.red, marginBottom: 6 }}>KAYIT FORMU · ADIM {no}/5</Text>
        <Text style={{ fontFamily: FONT.serif, fontSize: 31, color: P.ink, marginBottom: 8 }}>{baslik}</Text>
        <Text style={{ fontSize: 18, color: P.inkSoft, fontFamily: FONT.govde, marginBottom: 22 }}>{alt}</Text>
        {children}
        <TouchableOpacity style={{ borderWidth: 1.5, borderColor: P.ink, paddingVertical: 15, alignItems: 'center', marginTop: 22, backgroundColor: P.yuzey }}
          onPress={() => { titre.hafif(); devam(); }}>
          <Text style={{ fontSize: 17, fontFamily: FONT.monoBold, color: P.ink, letterSpacing: 1 }}>{no === 5 ? 'HAZIRIM' : 'DEVAM'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Sayfa>
  );
}

function PersonalSetup({ onDone }) {
  const { P, s: st, DERSLER } = useTema();
  const kenar = useSafeAreaInsets();
  const [adim, setAdim] = useState(0);
  const [ad, setAd] = useState('');
  const [hedefOkul, setHedefOkul] = useState('');
  const [hedefNet, setHedefNet] = useState('');
  const [hedefKart, setHedefKart] = useState(30);
  const [zayifDersler, setZayifDersler] = useState([]);
  const toggleDers = (id) => { titre.hafif(); setZayifDersler(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

  if (adim === 0) return (
    <KurulumCercevesi no={1} baslik="Adın ne?" alt="Uygulamada sana böyle sesleneceğiz" devam={() => setAdim(1)}>
      <TextInput style={st.girdi} placeholder="Örn. Ahmet" placeholderTextColor={P.inkFaint}
        value={ad} onChangeText={setAd} autoCapitalize="words" />
    </KurulumCercevesi>
  );
  if (adim === 1) return (
    <KurulumCercevesi no={2} baslik="Hedef okulun" alt="Hayalindeki liseyi yaz (isteğe bağlı)" devam={() => setAdim(2)}>
      <TextInput style={st.girdi} placeholder="Örn. Fen Lisesi" placeholderTextColor={P.inkFaint} value={hedefOkul} onChangeText={setHedefOkul} />
    </KurulumCercevesi>
  );
  if (adim === 2) return (
    <KurulumCercevesi no={3} baslik="Net hedefin" alt="LGS'de kaç net hedefliyorsun?" devam={() => setAdim(3)}>
      <TextInput style={st.girdi} placeholder="Örn. 400" placeholderTextColor={P.inkFaint} value={hedefNet} onChangeText={setHedefNet} keyboardType="number-pad" />
    </KurulumCercevesi>
  );
  if (adim === 3) return (
    <KurulumCercevesi no={4} baslik="Günlük hedef" alt="Her gün kaç kart çalışmak istiyorsun?" devam={() => setAdim(4)}>
      {[15, 30, 50, 75].map(n => (
        <TouchableOpacity key={n} onPress={() => { titre.hafif(); setHedefKart(n); }}
          style={[st.secenek, hedefKart === n && st.secenekAktif]}>
          {hedefKart === n
            ? <SquareCheck size={20} color={P.red} strokeWidth={2} style={{ marginRight: 9 }} />
            : <Square size={20} color={P.inkFaint} strokeWidth={2} style={{ marginRight: 9 }} />}
          <Text style={[st.secenekYazi, hedefKart === n && { color: P.red, fontFamily: FONT.monoBold }]}>
            {n === 15 ? 'Hafif' : n === 30 ? 'Normal' : n === 50 ? 'Yoğun' : 'Maraton'}
          </Text>
        </TouchableOpacity>
      ))}
    </KurulumCercevesi>
  );
  return (
    <KurulumCercevesi no={5} baslik="Zayıf dersler" alt="Hangi derslerde eksiksin? (birden fazla seç)" devam={() => onDone({ ad, hedefOkul, hedefNet, hedefKart, zayifDersler })}>
      {DERSLER.map(d => (
        <TouchableOpacity key={d.id} onPress={() => toggleDers(d.id)}
          style={[st.secenek, zayifDersler.includes(d.id) && { borderColor: d.renk, backgroundColor: d.acik }]}>
          {zayifDersler.includes(d.id)
            ? <SquareCheck size={20} color={d.renk} strokeWidth={2} style={{ marginRight: 9 }} />
            : <Square size={20} color={P.inkFaint} strokeWidth={2} style={{ marginRight: 9 }} />}
          <Text style={[st.secenekYazi, zayifDersler.includes(d.id) && { color: d.renk, fontFamily: FONT.monoBold }]}>{d.ad}</Text>
        </TouchableOpacity>
      ))}
    </KurulumCercevesi>
  );
}

// ============ MOD SEÇİMİ ============
function ModSecim({ ders, onBaslat, onGeri, srs }) {
  const { P, s: st, DERSLER } = useTema();
  const kenar = useSafeAreaInsets();
  const OZEL = { yanlislar: { id: 'yanlislar', ad: 'Yanlışlarım', renk: P.red, acik: P.redSoft, ikon: RotateCcw } };
  const d = DERSLER.find(x => x.id === ders) || OZEL[ders] || { ad: ders, renk: P.ink, acik: P.bgAlt, ikon: BookMarked };
  const [secUnite, setSecUnite] = useState(null);
  const dersMi = !!DERSLER.find(x => x.id === ders);
  const uList = dersMi ? uniteler(ders) : [];

  const tumKartlar = ders === 'yanlislar'
    ? CARDS.filter(c => (srs[c.id] || {}).sonYanlis)
    : CARDS.filter(c => c.ders === ders);
  const dk = secUnite ? tumKartlar.filter(c => c.unite === secUnite) : tumKartlar;
  const ogr = dk.filter(c => (srs[c.id] || yeniD(c.id)).seviye >= 3).length;
  const bek = ders === 'yanlislar' ? dk.length : dk.filter(c => (srs[c.id] || yeniD(c.id)).dueAt <= Date.now()).length;
  const quizUygun = dk.filter(c => c.secenekler).length;

  return (
    <Sayfa>
      <View style={{ paddingTop: kenar.top + 12, paddingHorizontal: 20, paddingBottom: 4 }}>
        <TouchableOpacity onPress={onGeri} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ChevronLeft size={20} color={P.inkSoft} strokeWidth={1.8} />
            <Text style={{ fontFamily: FONT.govdeOrta, fontSize: 15, color: P.inkSoft, marginLeft: 2 }}>Geri</Text>
          </View>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center', paddingBottom: kenar.bottom + 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <Muhur Ikon={d.ikon} renk={d.renk} boyut={56} kagitRenk={d.acik} />
          <Text style={{ fontFamily: FONT.serif, fontSize: 26, color: P.ink, marginTop: 10 }}>{d.ad}</Text>
          <Text style={{ fontSize: 14, color: P.inkSoft, fontFamily: FONT.mono, marginTop: 4 }}>
            {ders === 'yanlislar'
              ? 'Bilemediklerin burada'
              : (dk.length ? '%' + Math.round((ogr / dk.length) * 100) + ' öğrenildi' : '') + (bek > 0 ? ' · tekrar zamanı geldi' : '')}
          </Text>
        </View>

        {uList.length > 1 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={st.etiket}>ÜNİTE SEÇ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {/* Kart sayısı yerine ilerleme çubuğu: öğrenciye nerede kaldığını söyler */}
              <TouchableOpacity onPress={() => { titre.hafif(); setSecUnite(null); }}
                style={[st.uniteHap, !secUnite && { borderColor: d.renk, backgroundColor: d.acik }]}>
                <Text style={[st.hapYazi, !secUnite && { color: d.renk, fontFamily: FONT.monoBold }]}>Tümü</Text>
                <View style={{ height: 8, backgroundColor: P.bgAlt, borderRadius: 999, marginTop: 9, overflow: 'hidden' }}>
                  <View style={{
                    height: '100%', backgroundColor: d.renk,
                    borderRadius: 999, width: (tumKartlar.length
                      ? Math.round((tumKartlar.filter(c => (srs[c.id] || yeniD(c.id)).seviye >= 3).length / tumKartlar.length) * 100)
                      : 0) + '%',
                  }} />
                </View>
              </TouchableOpacity>

              {uList.map(u => {
                const uKartlar = tumKartlar.filter(c => c.unite === u);
                const uOgrenilen = uKartlar.filter(c => (srs[c.id] || yeniD(c.id)).seviye >= 3).length;
                const uPct = uKartlar.length ? Math.round((uOgrenilen / uKartlar.length) * 100) : 0;
                const secili = secUnite === u;
                const kapsamDisi = uKartlar.length > 0 && uKartlar.filter(c => c.lgsKapsam === false).length / uKartlar.length > 0.5;
                // Kapsam dışı (tekrar) üniteler kilitlenmez — yalnızca yol
                // üzerindeki gerçek LGS üniteleri sırayla açılır.
                const kilitli = !kapsamDisi && dersMi && uniteKilitliMi(ders, u, srs);
                return (
                  <TouchableOpacity key={u}
                    onPress={() => { if (kilitli) return; titre.hafif(); setSecUnite(u); }}
                    disabled={kilitli}
                    style={[st.uniteHap, secili && { borderColor: d.renk, backgroundColor: d.acik }, kilitli && { opacity: 0.45 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text numberOfLines={1} style={[{ flex: 1 }, st.hapYazi, secili && { color: d.renk, fontFamily: FONT.monoBold }]}>{u}</Text>
                      {kilitli && <Lock size={13} color={P.inkFaint} strokeWidth={2.4} style={{ marginLeft: 6 }} />}
                    </View>
                    {kapsamDisi ? (
                      <View style={{
                        alignSelf: 'flex-start', backgroundColor: P.altinZemin,
                        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 5,
                      }}>
                        <Text style={{ fontFamily: FONT.monoBold, fontSize: 9, color: P.altin, letterSpacing: 0.4 }}>TEKRAR</Text>
                      </View>
                    ) : kilitli ? (
                      <Text style={{ fontFamily: FONT.govde, fontSize: 10, color: P.inkFaint, marginTop: 5 }}>
                        önceki üniteyi bitir
                      </Text>
                    ) : (
                      <View style={{ height: 8, backgroundColor: P.bgAlt, borderRadius: 999, marginTop: 9, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: uPct + '%', backgroundColor: d.renk, borderRadius: 999 }} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {secUnite && dersMi && (
          <YolHaritasi ders={ders} unite={secUnite} srs={srs} renk={d.renk}
            onGrupSec={(grup) => { titre.orta(); onBaslat('kart', secUnite, grup.map(c => c.id)); }} />
        )}

        <TouchableOpacity onPress={() => { titre.orta(); onBaslat('kart', secUnite); }} activeOpacity={0.85}
          disabled={dk.length === 0}
          style={{
            backgroundColor: P.mavi, borderRadius: 20,
            borderBottomWidth: 6, borderBottomColor: P.maviKoyu,
            padding: 18, marginBottom: 14, opacity: dk.length ? 1 : 0.4,
            flexDirection: 'row', alignItems: 'center',
          }}>
          <View style={{
            width: 54, height: 54, borderRadius: 17, backgroundColor: '#FFFFFF33',
            alignItems: 'center', justifyContent: 'center', marginRight: 15,
          }}>
            <Layers size={28} color="#FFFFFF" strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 21, fontFamily: FONT.monoBold, color: '#FFFFFF' }}>Konu Çalış</Text>
            <Text style={{ fontSize: 15, color: '#FFFFFFCC', marginTop: 2, fontFamily: FONT.govde, lineHeight: 20 }}>
              Soru ve cevap bir arada, kaydırarak gözden geçir
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { titre.orta(); onBaslat('quiz', secUnite); }} activeOpacity={0.85}
          disabled={quizUygun === 0}
          style={{
            backgroundColor: P.mor, borderRadius: 20,
            borderBottomWidth: 6, borderBottomColor: P.morKoyu,
            padding: 18, opacity: quizUygun ? 1 : 0.4,
            flexDirection: 'row', alignItems: 'center',
          }}>
          <View style={{
            width: 54, height: 54, borderRadius: 17, backgroundColor: '#FFFFFF33',
            alignItems: 'center', justifyContent: 'center', marginRight: 15,
          }}>
            <ListChecks size={28} color="#FFFFFF" strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 21, fontFamily: FONT.monoBold, color: '#FFFFFF' }}>Quiz Modu</Text>
            <Text style={{ fontSize: 15, color: '#FFFFFFCC', marginTop: 2, fontFamily: FONT.govde, lineHeight: 20 }}>
              {quizUygun ? 'Dört şıktan doğru olanı seç' : 'Bu seçimde teste uygun soru yok'}
            </Text>
          </View>
        </TouchableOpacity>
        {dk.length === 0 && (
          <Text style={{ fontSize: 17, color: P.red, fontFamily: FONT.govde, textAlign: 'center', marginTop: 14 }}>
            Bu seçimde çalışılacak kart yok. Başka bir ünite seç.
          </Text>
        )}
      </ScrollView>
    </Sayfa>
  );
}

// ============ SEKME ÇUBUĞU ============
function TabBar({ tab, setTab }) {
  const { P, s: st } = useTema();
  const tabs = [
    { id: 'home', label: 'Ana Sayfa', Ikon: House },
    { id: 'dersler', label: 'Dersler', Ikon: Library },
    { id: 'profil', label: 'Profil', Ikon: CircleUser },
  ];
  return (
    <View style={st.sekmeCubugu}>
      {tabs.map(t => {
        const SekmeIkon = t.Ikon;
        return (
        <TouchableOpacity key={t.id} style={st.sekme} onPress={() => { titre.hafif(); setTab(t.id); }}
          activeOpacity={0.7}>
          {/* İkon kapsülü: seçili sekmede yumuşak renkli zemin */}
          <View style={st.sekmeKapsul}>
            {/* Aktif ikonun arkasında dairesel neon parlama */}
            {tab === t.id && (
              <View style={{
                position: 'absolute',
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: P.neon + '2E',
                shadowColor: P.neon, shadowOpacity: 0.9,
                shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
                elevation: 6,
              }} />
            )}
            <SekmeIkon
              size={25}
              color={tab === t.id ? P.neon : P.inkFaint}
              strokeWidth={tab === t.id ? 2.7 : 2.1}
            />
          </View>
          <Text style={[st.sekmeYazi, tab === t.id && { color: P.neon, fontFamily: FONT.monoBold }]}>
            {t.label}
          </Text>
        </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============ ANA SAYFA ============
function HomeScreen({
  srs, xp, seri, bugun, hedefKart, onDersBaslat, sinavTarihi, profil,
  onSinavBaslat, onProfil, denemeGecmisi, gunluk, gunlukDers,
}) {
  const { P, s: st, DERSLER, seviyeHesapla, koyu } = useTema();
  const kenar = useSafeAreaInsets();

  const bekleyen = CARDS.filter(c => (srs[c.id] || yeniD(c.id)).dueAt <= Date.now()).length;
  const yanlisSayisi = Object.values(srs).filter(d => d.sonYanlis).length;
  const sev = seviyeHesapla(xp);
  const SeviyeIkon = sev.ikon;
  const tamamlandi = bugun >= hedefKart;

  const sinavZamani = sinavTarihi ? new Date(sinavTarihi).getTime() : NaN;
  const kalanGun = Number.isFinite(sinavZamani)
    ? Math.max(0, Math.ceil((sinavZamani - new Date().setHours(0, 0, 0, 0)) / GUN))
    : null;

  // ---- Karşılama: saate ve duruma göre ----
  const ad = React.useMemo(() => {
    const h = (profil && profil.ad ? String(profil.ad) : '').trim();
    if (!h) return '';
    return h.charAt(0).toLocaleUpperCase('tr-TR') + h.slice(1);
  }, [profil]);

  const selam = React.useMemo(() => {
    const saat = new Date().getHours();
    const kim = ad ? ' ' + ad : '';
    if (saat < 6) return { yazi: 'Gece çalışması' + kim, son: 'Geç saat, kısa tut' };
    if (saat < 12) return { yazi: 'Günaydın' + kim, son: 'Güne erken başladın' };
    if (saat < 18) return { yazi: 'Selam' + kim, son: 'Bugünkü hedefe bakalım' };
    return { yazi: 'İyi akşamlar' + kim, son: 'Hedefe bir adım daha' };
  }, [ad]);

  // ---- En zayıf ünite ----
  const enZayif = React.useMemo(() => enOncelikliUnite(srs), [srs]);
  const zayifDers = enZayif ? DERSLER.find(d => d.id === enZayif.ders) : null;

  const dg = denemeGecmisi || [];
  const sonDeneme = dg.length ? dg[dg.length - 1] : null;
  const enIyiPct = dg.length ? Math.max(...dg.map(d => d.pct)) : 0;
  const hedefPct = hedefKart ? Math.min(100, Math.round((bugun / hedefKart) * 100)) : 0;

  // Bugün hangi dersten kaç kart çalışıldı — merkez halkanın yayları
  const bugunDersler = React.useMemo(() => {
    const g = gunlukDers || {};
    return g[bugunTarihi()] || {};
  }, [gunlukDers]);

  const ligoKartRes = ligoGorsel(ligoIfadesi({ bugun, hedefKart }));

  // Ligo'nun bugünkü sözü — duruma göre seçilir, gün içinde sabit kalır
  const ligoSozu = React.useMemo(
    () => ligoMesaji({ bugun, hedefKart, seri, bekleyen }),
    // bugun/hedefKart eşiği değiştikçe yenilensin, her karede değil
    [Math.floor((bugun / Math.max(1, hedefKart)) * 4), bugun === 0, seri > 0]
  );

  const dokunulanDersler = React.useMemo(() => (
    DERSLER
      .map(d => ({ ...d, sayi: bugunDersler[d.id] || 0 }))
      .filter(d => d.sayi > 0)
      .sort((a, b) => b.sayi - a.sayi)
  ), [bugunDersler, DERSLER]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingTop: kenar.top + 14, paddingBottom: 30 }}>

      {/* ================= HEADER BANNER ================= */}
      <View style={[st.golge, { borderRadius: 24, marginBottom: 16, overflow: 'hidden' }]}>
        <LinearGradient
          colors={koyu ? ['#232852', '#171A32'] : ['#EEF1FF', '#DDE3FA']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ padding: 18 }}>

          {/* Arka plan süsü: seviye renginde yumuşak halkalar */}
          <View pointerEvents="none" style={{
            position: 'absolute', right: -46, top: -46,
            width: 168, height: 168, borderRadius: 84,
            borderWidth: 28, borderColor: sev.renk + (koyu ? '14' : '10'),
          }} />
          <View pointerEvents="none" style={{
            position: 'absolute', right: 22, bottom: -58,
            width: 108, height: 108, borderRadius: 54,
            borderWidth: 18, borderColor: P.neon + (koyu ? '10' : '0D'),
          }} />

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 15, color: P.inkSoft }}>
                {selam.yazi} <Text style={{ fontSize: 14 }}>🚀</Text>
              </Text>
              <Text style={{
                fontFamily: FONT.baslik, fontSize: 21, color: P.ink,
                letterSpacing: 0.3, marginTop: 2, lineHeight: 27,
              }}>
                {selam.son.toLocaleUpperCase('tr-TR')}
              </Text>

              {/* Rütbe rozeti */}
              <View style={{
                flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
                backgroundColor: sev.renk + '24',
                borderWidth: 1, borderColor: sev.renk + '55',
                borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5,
                marginTop: 11,
              }}>
                <SeviyeIkon size={14} color={sev.renk} strokeWidth={2.8} />
                <Text style={{
                  fontFamily: FONT.monoBold, fontSize: 12, color: sev.renk,
                  marginLeft: 6, letterSpacing: 0.6,
                }}>{sev.ad.toLocaleUpperCase('tr-TR')}</Text>
              </View>
            </View>

            {/* Avatar + seviye halkası */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => { titre.hafif(); onProfil && onProfil(); }}>
              <Halka pct={sev.pct} boyut={68} kalinlik={4} renk={sev.renk} zemin={koyu ? 'rgba(255,255,255,0.10)' : 'rgba(16,18,26,0.08)'}>
                <View style={{
                  width: 52, height: 52, borderRadius: 26,
                  backgroundColor: sev.renk + '2E',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {ad
                    ? <Text style={{ fontFamily: FONT.baslik, fontSize: 24, color: sev.renk }}>{ad.charAt(0)}</Text>
                    : <SeviyeIkon size={26} color={sev.renk} strokeWidth={2.6} />}
                </View>
              </Halka>
              <Text style={{
                fontFamily: FONT.monoBold, fontSize: 11, color: P.inkFaint,
                textAlign: 'center', marginTop: 5,
              }}>%{sev.pct}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* ================= SAVAŞ PANOSU ================= */}
      <View style={[st.golge, { borderRadius: 24, marginBottom: 16, overflow: 'hidden' }]}>
        <LinearGradient
          colors={['#00B4DB', '#0083B0']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ padding: 20 }}>

          {/* Seri rozeti */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 13, color: '#FFFFFFB0', letterSpacing: 1.4 }}>
                LGS'YE KALAN
              </Text>
              {kalanGun !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{
                      // Dört haneli sayılarda taşmasın diye punto rakam sayısına göre
                      fontFamily: FONT.baslik,
                      fontSize: String(kalanGun).length >= 4 ? 38 : 46,
                      color: '#FFFFFF',
                      lineHeight: String(kalanGun).length >= 4 ? 46 : 54,
                      includeFontPadding: false,
                    }}>{kalanGun}</Text>
                  <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 17, color: '#FFFFFFCC', marginLeft: 7 }}>gün</Text>
                </View>
              )}
            </View>

            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: 'rgba(255,107,53,0.22)',
              borderWidth: 1, borderColor: 'rgba(255,140,90,0.55)',
              borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
            }}>
              <Flame size={16} color="#FF9A5A" fill="#FF6B35" strokeWidth={2.4} />
              <Text style={{ fontFamily: FONT.monoBold, fontSize: 14, color: '#FFD9C4', marginLeft: 6 }}>
                {seri} GÜN
              </Text>
            </View>
          </View>

          {/* Segmentli neon ilerleme */}
          <View style={{ marginTop: 20 }}>
            <SegmentBar pct={hedefPct} segment={5} yukseklik={11}
              renk={tamamlandi ? '#38EF7D' : '#7FF2FF'}
              bosRenk="rgba(255,255,255,0.16)" />
            <Text style={{ fontFamily: FONT.govde, fontSize: 14, color: '#FFFFFFB0', marginTop: 10 }}>
              {tamamlandi
                ? 'Bugünkü hedefini tamamladın'
                : 'Tekrar zamanı gelen kartların var'}
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* ================= GÜNLÜK HALKA ================= */}
      <View style={[st.golge, { borderRadius: 24, marginBottom: 14, overflow: 'hidden' }]}>
        <LinearGradient
          colors={koyu ? ['#1B2145', '#241C3E', '#171A32'] : ['#EFF1FF', '#F6F0FF', '#FFF6F0']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ alignItems: 'center', paddingVertical: 26 }}>

          {/* Yumuşak ışık halkaları — arka planda derinlik */}
          <View pointerEvents="none" style={{
            position: 'absolute', top: -60, left: -50,
            width: 180, height: 180, borderRadius: 90,
            backgroundColor: P.neon + (koyu ? '12' : '0D'),
          }} />
          <View pointerEvents="none" style={{
            position: 'absolute', bottom: -70, right: -50,
            width: 200, height: 200, borderRadius: 100,
            backgroundColor: P.mor + (koyu ? '10' : '0A'),
          }} />

          <GunlukHalka
            dersDagilim={bugunDersler}
            hedef={hedefKart}
            toplam={bugun}
            boyut={196}
            kalinlik={18}
          />

        {/* Bugün dokunulan dersler */}
        <Text style={{
          fontFamily: FONT.govde, fontSize: 12, color: P.inkFaint,
          marginTop: 10, marginBottom: dokunulanDersler.length > 0 ? 0 : 4,
        }}>
          📳 Telefonu salla, Ligo tepki versin
        </Text>

        {dokunulanDersler.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 18 }}>
            {dokunulanDersler.map(d => (
              <View key={d.id} style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: d.renk + '22',
                borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6,
                marginRight: 7, marginBottom: 7,
              }}>
                <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: d.renk, marginRight: 7 }} />
                <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 13, color: P.ink }}>{d.ad}</Text>
                <Text style={{ fontFamily: FONT.monoBold, fontSize: 13, color: d.renk, marginLeft: 6 }}>{d.sayi}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{
            fontFamily: FONT.govde, fontSize: 15, color: P.inkSoft,
            marginTop: 16, textAlign: 'center', lineHeight: 22,
          }}>
            Bugün henüz başlamadın.{'\n'}Çalıştıkça halka dersin rengiyle dolacak.
          </Text>
        )}
        </LinearGradient>
      </View>

      {/* ================= LIGO ================= */}
      <View style={{
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: P.neonZemin,
        borderWidth: 1, borderColor: P.neon + '44',
        borderRadius: 20, padding: 16, marginBottom: 14,
      }}>
        <View style={{
          width: 50, height: 50, borderRadius: 16,
          backgroundColor: P.neon + '1E',
          alignItems: 'center', justifyContent: 'center', marginRight: 13,
        }}>
          {ligoKartRes
            ? <Image source={ligoKartRes} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
            : <Sparkles size={23} color={P.neon} strokeWidth={2.6} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: FONT.monoBold, fontSize: 13, color: P.neon,
            letterSpacing: 1, marginBottom: 4,
          }}>LIGO</Text>
          <Text style={{
            fontFamily: FONT.govde, fontSize: 16, color: P.ink, lineHeight: 23,
          }}>{ligoSozu}</Text>
        </View>
      </View>

      {/* ================= İSTATİSTİK ================= */}
      <TouchableOpacity activeOpacity={0.9} onPress={() => { titre.orta(); onProfil && onProfil(); }}
        style={[st.kart, { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }]}>
        <View style={{
          width: 44, height: 44, borderRadius: 14, backgroundColor: P.morZemin,
          alignItems: 'center', justifyContent: 'center', marginRight: 14,
        }}>
          <ChartColumn size={23} color={P.mor} strokeWidth={2.6} />
        </View>
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
          {[
            { v: dg.length, l: 'DENEME' },
            { v: dg.length ? '%' + enIyiPct : '—', l: 'EN İYİ' },
            { v: sonDeneme ? sonDeneme.net : '—', l: 'SON NET' },
          ].map(it => (
            <View key={it.l} style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: FONT.baslik, fontSize: 22, color: '#FFFFFF' }}>{it.v}</Text>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 11, color: P.inkFaint, letterSpacing: 0.6 }}>{it.l}</Text>
            </View>
          ))}
        </View>
        <ChevronRight size={21} color={P.inkFaint} strokeWidth={2.6} />
      </TouchableOpacity>

      {/* ================= GÜNÜN ÖNCELİĞİ ================= */}
      {enZayif && zayifDers && (
        <View style={[st.kart, { borderColor: P.altin + '55' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 12, backgroundColor: P.altinZemin,
              alignItems: 'center', justifyContent: 'center', marginRight: 11,
            }}>
              <Target size={20} color={P.altin} strokeWidth={2.8} />
            </View>
            <Text style={{ fontFamily: FONT.monoBold, fontSize: 14, color: P.altin, letterSpacing: 1.2 }}>
              GÜNÜN ÖNCELİĞİ
            </Text>
          </View>
          <Text style={{ fontFamily: FONT.govde, fontSize: 16, color: P.ink, lineHeight: 24, marginBottom: 15 }}>
            <Text style={{ fontFamily: FONT.monoBold, color: zayifDers.renk }}>{zayifDers.ad}</Text>
            {' dersindeki '}
            <Text style={{ fontFamily: FONT.monoBold }}>{enZayif.unite}</Text>
            {' en zayıf konun. Bugün oradan başla.'}
          </Text>
          <Dugme etiket="BU KONUYA ÇALIŞ" Ikon={Zap} renk={P.altin} renkKoyu={P.altinKoyu} tam
            onPress={() => onDersBaslat(enZayif.ders)} />
        </View>
      )}

      {/* ================= HIZLI BAŞLA ================= */}
      <Text style={st.etiket}>HIZLI BAŞLA</Text>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {[
          { id: 'deneme', ad: 'Deneme', sayi: '', birim: '40 dakika', Ikon: Clock, g: ['#00C6FF', '#0072FF'], git: onSinavBaslat },
          { id: 'yanlis', ad: 'Yanlışlarım', sayi: '', birim: yanlisSayisi > 0 ? 'tekrar et' : 'temiz', Ikon: RotateCcw, g: ['#FF5A5F', '#B31217'], git: () => onDersBaslat('yanlislar'), pasif: yanlisSayisi === 0 },
        ].map((a, i) => {
          const AksiyonIkon = a.Ikon;
          return (
            <View key={a.id} style={[st.golge, {
              flex: 1, marginRight: i === 0 ? 12 : 0,
              borderRadius: 20, overflow: 'hidden', opacity: a.pasif ? 0.45 : 1,
            }]}>
              <TouchableOpacity activeOpacity={0.88} disabled={a.pasif}
                onPress={() => { titre.orta(); a.git(); }}>
                <LinearGradient colors={a.g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ padding: 16, minHeight: 124, justifyContent: 'space-between' }}>
                  <AksiyonIkon size={26} color="#FFFFFF" strokeWidth={2.8} />
                  <View>
                    <Text style={{ fontFamily: FONT.monoBold, fontSize: 17, color: '#FFFFFF' }}>{a.ad}</Text>
                    <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 14, color: '#FFFFFFB0', marginTop: 2 }}>
                      {a.birim}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

    </ScrollView>
  );
}

function DerslerScreen({ srs, onDersBaslat }) {
  const { P, s: st, DERSLER } = useTema();
  const kenar = useSafeAreaInsets();
  const [arama, setArama] = useState('');
  const [acikKart, setAcikKart] = useState(null);

  const sonuclar = React.useMemo(() => {
    const q = sadelestir(arama);
    if (q.length < 2) return [];
    return CARDS.filter(c => sadelestir(c.soru).includes(q) || sadelestir(c.cevap).includes(q)).slice(0, 40);
  }, [arama]);

  const aramaAcik = sadelestir(arama).length >= 2;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingTop: kenar.top + 12, paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled">

      <Text style={st.sayfaBaslik}>Dersler</Text>

      {/* ---------- ARAMA ---------- */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', backgroundColor: P.bgAlt,
        borderWidth: 2, borderColor: P.line, borderRadius: 16,
        paddingHorizontal: 14, marginBottom: 18,
      }}>
        <Search size={20} color={P.inkFaint} strokeWidth={2.4} />
        <TextInput
          value={arama}
          onChangeText={setArama}
          placeholder="Kartlarda ara"
          placeholderTextColor={P.inkFaint}
          style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 16, color: P.ink, fontFamily: FONT.govde }}
        />
        {arama.length > 0 && (
          <TouchableOpacity onPress={() => { setArama(''); setAcikKart(null); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <XIkon size={20} color={P.inkFaint} strokeWidth={2.4} />
          </TouchableOpacity>
        )}
      </View>

      {/* ---------- ARAMA SONUÇLARI ---------- */}
      {aramaAcik && (
        <View style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={st.etiket}>{sonuclar.length === 0 ? 'SONUÇ YOK' : sonuclar.length + ' SONUÇ'}</Text>
            <TouchableOpacity onPress={() => { setArama(''); setAcikKart(null); }}>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 15, color: P.mavi }}>temizle</Text>
            </TouchableOpacity>
          </View>

          {sonuclar.map(c => {
            const d = DERSLER.find(x => x.id === c.ders) || { renk: P.ink, acik: P.bgAlt, ad: c.ders };
            const acik = acikKart === c.id;
            const durum = srs[c.id] || yeniD(c.id);
            return (
              <TouchableOpacity key={c.id} activeOpacity={0.85}
                onPress={() => { titre.hafif(); setAcikKart(acik ? null : c.id); }}
                style={{
                  backgroundColor: P.yuzey, borderWidth: 2,
                  borderColor: acik ? d.renk : P.line,
                  borderBottomWidth: 4, borderBottomColor: acik ? d.renkKoyu : P.lineKoyu,
                  borderRadius: 16, padding: 14, marginBottom: 11,
                }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ backgroundColor: d.acik, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 12, color: d.renk }}>{d.ad}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {[0, 1, 2, 3, 4].map(n => (
                      <View key={n} style={{
                        width: 8, height: 8, borderRadius: 999, marginLeft: 3,
                        backgroundColor: n < Math.round((durum.seviye / 7) * 5) ? d.renk : P.line,
                      }} />
                    ))}
                  </View>
                </View>
                <Text style={{ fontSize: 16, fontFamily: FONT.govdeOrta, color: P.ink, lineHeight: 23 }}>{c.soru}</Text>
                {acik ? (
                  <View style={{ marginTop: 11, backgroundColor: d.acik, borderRadius: 12, padding: 12 }}>
                    <Text style={{ fontSize: 16, fontFamily: FONT.govdeKalin, color: d.renk, lineHeight: 23 }}>{c.cevap}</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 14, fontFamily: FONT.govde, color: P.inkFaint, marginTop: 7 }}>cevabı görmek için dokun</Text>
                )}
              </TouchableOpacity>
            );
          })}

          {sonuclar.length === 40 && (
            <Text style={{ fontFamily: FONT.govde, fontSize: 15, color: P.inkFaint, textAlign: 'center', marginTop: 6 }}>
              İlk 40 sonuç gösteriliyor. Aramayı daralt.
            </Text>
          )}
        </View>
      )}

      {/* ---------- DERS KUTULARI ---------- */}
      {DERSLER.map(d => {
        const dk = CARDS.filter(c => c.ders === d.id);
        const ogr = dk.filter(c => (srs[c.id] || yeniD(c.id)).seviye >= 3).length;
        const bek = dk.filter(c => (srs[c.id] || yeniD(c.id)).dueAt <= Date.now()).length;
        const uSayi = uniteler(d.id).length;
        const dPct = dk.length ? Math.round((ogr / dk.length) * 100) : 0;
        const DersIkon = d.ikon;
        return (
          <TouchableOpacity key={d.id} activeOpacity={0.85}
            onPress={() => { titre.orta(); onDersBaslat(d.id); }}
            style={[st.golge, {
              borderRadius: 22, marginBottom: 14, overflow: 'hidden',
            }]}>
            <LinearGradient colors={d.gradyan} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ padding: 18, minHeight: 118, justifyContent: 'center' }}>

            {/* Filigran görsel — sağ altta, karttan hafif taşar */}
            {dersGorseli(d.id) && (
              <Image
                source={dersGorseli(d.id)}
                style={{
                  position: 'absolute', right: -16, bottom: -20,
                  width: 128, height: 128, opacity: 0.15, resizeMode: 'contain',
                }}
              />
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontFamily: FONT.baslik, fontSize: 22, color: '#FFFFFF' }}>{d.ad}</Text>
                <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 14, color: '#FFFFFFB8', marginTop: 3 }}>
                  {uSayi} ünite{bek > 0 ? ' · tekrar zamanı' : ''}
                </Text>
              </View>
              <Halka pct={dPct} boyut={54} kalinlik={4.5} renk="#FFFFFF" zemin="rgba(255,255,255,0.26)">
                <Text style={{ fontFamily: FONT.monoBold, fontSize: 14, color: '#FFFFFF' }}>%{dPct}</Text>
              </Halka>
            </View>

            <View style={{ height: 11, backgroundColor: '#00000030', borderRadius: 999, marginTop: 14, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: dPct + '%', backgroundColor: '#FFFFFF', borderRadius: 999 }} />
            </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ============================================================
// KONU ÇALIŞMA — kaydırmalı okuma modu
//
// Doğru/yanlış yok, puan yok. Amaç konuyu gözden geçirmek.
// Soru ve cevap aynı yüzde; sağa veya sola kaydırıp geçilir.
// SRS'e dokunmaz: kartı görmek bildiğinin kanıtı değildir.
// Günlük hedefe sayılmaz — o yalnızca quiz ve denemeden dolar.
// ============================================================
function KonuCalisma({ kartlar, onBitti }) {
  const kenar = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const kaydir = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const idxRef = useRef(0);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  const kart = kartlar[idx];
  const ESIK = 90;

  const gec = (yon) => {
    if (idxRef.current >= kartlar.length) return;
    titre.hafif();
    Animated.timing(kaydir, {
      toValue: { x: yon * SW * 1.2, y: 0 },
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      kaydir.setValue({ x: 0, y: 0 });
      setIdx(i => i + 1);
    });
  };

  const geriGel = () => {
    if (idxRef.current === 0) return;
    titre.hafif();
    kaydir.setValue({ x: -SW, y: 0 });
    setIdx(i => Math.max(0, i - 1));
    Animated.spring(kaydir, {
      toValue: { x: 0, y: 0 }, useNativeDriver: true, bounciness: 6,
    }).start();
  };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => kaydir.setValue({ x: g.dx, y: g.dy * 0.08 }),
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > ESIK) gec(g.dx > 0 ? 1 : -1);
      else Animated.spring(kaydir, { toValue: { x: 0, y: 0 }, useNativeDriver: true, bounciness: 8 }).start();
    },
  })).current;

  const donus = kaydir.x.interpolate({
    inputRange: [-SW, 0, SW], outputRange: ['-7deg', '0deg', '7deg'],
  });
  const opak = kaydir.x.interpolate({
    inputRange: [-SW * 0.7, 0, SW * 0.7], outputRange: [0.25, 1, 0.25], extrapolate: 'clamp',
  });

  // ---- TUR BİTTİ ----
  if (!kart) {
    return (
      <View style={{ flex: 1, backgroundColor: FOCUS.bg, paddingTop: kenar.top, paddingBottom: kenar.bottom }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          {ligoGorsel('mutlu') && (
            <Image source={ligoGorsel('mutlu')} style={{ width: 128, height: 128, resizeMode: 'contain', marginBottom: 22 }} />
          )}
          <Text style={{ fontFamily: FONT.baslik, fontSize: 28, color: FOCUS.text, textAlign: 'center' }}>
            Tur tamam
          </Text>
          <Text style={{
            fontFamily: FONT.govde, fontSize: 17, color: FOCUS.textSoft,
            textAlign: 'center', marginTop: 10, lineHeight: 25,
          }}>
            Bu turu tamamladın.{String.fromCharCode(10)}Quizle kendini test etmeye ne dersin?
          </Text>
          <View style={{ width: '100%', marginTop: 30 }}>
            <Dugme etiket="BİTİR" renk={FOCUS.green} renkKoyu={FOCUS.greenDark} tam onPress={() => onBitti()} />
            <View style={{ height: 12 }} />
            <TouchableOpacity
              onPress={() => { titre.hafif(); setIdx(0); }}
              style={{
                borderWidth: 2, borderColor: FOCUS.line, borderRadius: 16,
                paddingVertical: 14, alignItems: 'center',
              }}>
              <Text style={{ fontFamily: FONT.monoBold, fontSize: 16, color: FOCUS.textSoft }}>BAŞTAN AL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const kalan = kartlar.length - idx;

  return (
    <View style={{ flex: 1, backgroundColor: FOCUS.bg, paddingTop: kenar.top, paddingBottom: kenar.bottom }}>

      {/* Üst şerit */}
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 12,
      }}>
        <IkonDugme Ikon={XIkon} dolu renk={FOCUS.panel2} renkKoyu={FOCUS.line}
          ikonRenk={FOCUS.textSoft} onPress={() => onBitti()} boyut={50} ikonBoyut={25} />

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: FONT.monoBold, fontSize: 14, color: FOCUS.text, letterSpacing: 1.4 }}>
            KONU ÇALIŞMA
          </Text>
        </View>

        <View style={{ opacity: idx > 0 ? 1 : 0.3 }}>
          <IkonDugme Ikon={ChevronLeft} dolu renk={FOCUS.panel2} renkKoyu={FOCUS.line}
            ikonRenk={FOCUS.text} onPress={geriGel} boyut={50} ikonBoyut={25} />
        </View>
      </View>

      {/* İlerleme — tek gösterge, sayı yok */}
      <View style={{ height: 12, backgroundColor: FOCUS.line, marginHorizontal: 20, borderRadius: 999, overflow: 'hidden' }}>
        <View style={{
          height: '100%', backgroundColor: FOCUS.blue, borderRadius: 999,
          width: (kartlar.length ? ((idx + 1) / kartlar.length) * 100 : 0) + '%',
        }} />
      </View>

      {/* Kart alanı */}
      <View style={{ flex: 1, padding: 18, justifyContent: 'center' }}>

        {/* Arkadaki deste */}
        {kalan > 1 && (
          <View style={{ position: 'absolute', left: 18, right: 18, top: 18, bottom: 18 }} pointerEvents="none">
            {kalan > 2 && (
              <View style={{
                position: 'absolute', left: 14, right: 14, top: 22, bottom: 22,
                backgroundColor: FOCUS.panel, borderRadius: 26,
                borderWidth: 2, borderColor: FOCUS.line, opacity: 0.3,
              }} />
            )}
            <View style={{
              position: 'absolute', left: 7, right: 7, top: 11, bottom: 11,
              backgroundColor: FOCUS.panel, borderRadius: 26,
              borderWidth: 2, borderColor: FOCUS.line, opacity: 0.55,
            }} />
          </View>
        )}

        <Animated.View
          {...pan.panHandlers}
          style={{
            flex: 1,
            opacity: opak,
            transform: [
              { translateX: kaydir.x },
              { translateY: kaydir.y },
              { rotate: donus },
            ],
          }}>
          <ScrollView
            style={{
              flex: 1,
              backgroundColor: FOCUS.panelKati,
              borderRadius: 26,
              borderWidth: 2, borderColor: FOCUS.line,
            }}
            contentContainerStyle={{ padding: 26, paddingTop: 52, paddingBottom: 52, flexGrow: 1, justifyContent: 'center' }}>

            {/* Ünite etiketi + LGS kapsam bilgisi */}
            <View style={{ position: 'absolute', top: 22, left: 26, right: 26, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{
                flex: 1, fontFamily: FONT.monoBold, fontSize: 12, color: FOCUS.blue,
                letterSpacing: 1.2,
              }} numberOfLines={1}>{kart.unite}</Text>
              {kart.lgsKapsam === false && (
                <View style={{
                  backgroundColor: FOCUS.emberSoft, borderRadius: 7,
                  paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8,
                }}>
                  <Text style={{ fontFamily: FONT.monoBold, fontSize: 10, color: FOCUS.ember, letterSpacing: 0.4 }}>
                    TEKRAR · LGS'DE ÇIKMAZ
                  </Text>
                </View>
              )}
            </View>

            {/* Soru */}
            <Text style={{
              fontFamily: FONT.baslik, fontSize: 24, color: FOCUS.text,
              lineHeight: 33, marginBottom: 22,
            }}>{kart.soru}</Text>

            {/* Cevap */}
            <View style={{
              backgroundColor: FOCUS.panel2, borderRadius: 18, padding: 20,
              borderLeftWidth: 4, borderLeftColor: FOCUS.green,
            }}>
              <Text style={{
                fontFamily: FONT.monoBold, fontSize: 11, color: FOCUS.textSoft,
                letterSpacing: 1.2, marginBottom: 8,
              }}>CEVAP</Text>
              <Text style={{
                fontFamily: FONT.govdeKalin, fontSize: 21, color: FOCUS.green, lineHeight: 29,
              }}>{kart.cevap}</Text>
            </View>

            {/* Açıklama varsa */}
            {kart.aciklama ? (
              <View style={{
                marginTop: 16, backgroundColor: FOCUS.emberSoft, borderRadius: 16,
                borderWidth: 1.5, borderColor: FOCUS.ember + '4D', padding: 16,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
                  <Lightbulb size={17} color={FOCUS.ember} strokeWidth={2.6} />
                  <Text style={{
                    fontFamily: FONT.monoBold, fontSize: 12, color: FOCUS.ember,
                    letterSpacing: 1, marginLeft: 7,
                  }}>AÇIKLAMA</Text>
                </View>
                <Text style={{ fontFamily: FONT.govde, fontSize: 16, color: FOCUS.text, lineHeight: 24 }}>
                  {kart.aciklama}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Alt ipucu */}
          <View style={{ position: 'absolute', bottom: 18, left: 0, right: 0, alignItems: 'center' }} pointerEvents="none">
            <Text style={{ fontFamily: FONT.govde, fontSize: 13, color: FOCUS.textSoft }}>
              sonraki kart için kaydır
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}


function KartModu({ kartlar, mod, onBitti, onUpdate, onGeriAl, srs, sinavMod }) {
  const kenar = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [acik, setAcik] = useState(false);
  const [dogru, setDogru] = useState(0);
  const [xpKazanim, setXpKazanim] = useState(0);
  const [erkenBitti, setErkenBitti] = useState(false);
  const [kalanSaniye, setKalanSaniye] = useState(sinavMod ? 2400 : null);
  const [secilen, setSecilen] = useState(null);
  const [gecmis, setGecmis] = useState([]);
  // Bu oturumda geri alınan kartlar: tekrar cevaplansa da ilk sonuç korunur
  const geriAlinan = useRef({});
  // Oturum başına sınırlı geri alma — sınırsız olması SRS'i anlamsızlaştırıyordu
  const GERI_AL_HAKKI = 3;
  const [geriAlKalan, setGeriAlKalan] = useState(GERI_AL_HAKKI);
  // 5 yanlışta bir mola önerisi
  const [molaUyari, setMolaUyari] = useState(false);
  const yanlisSayaci = useRef(0);
  const [dersSayac, setDersSayac] = useState({});     // sınav sonu ders kırılımı
  const isQuiz = mod === 'quiz';

  const flip = useRef(new Animated.Value(0)).current;
  const kaydir = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const acikRef = useRef(false);
  const kartRef = useRef(null);

  useEffect(() => { acikRef.current = acik; }, [acik]);

  const kart = kartlar[idx];
  const durum = kart ? (srs[kart.id] || yeniD(kart.id)) : null;
  useEffect(() => { kartRef.current = { kart, durum }; });

  // Şık sırası kart başına bir kez hesaplanır; yeniden çizimde değişmez
  const sikSirasi = React.useMemo(() => {
    if (!kart) return [];
    const ham = (kart.secenekler && kart.secenekler.length >= 2) ? kart.secenekler : [kart.cevap];
    return sikleriSirala(ham, kart.id);
  }, [kart ? kart.id : null]);

  const cevirtme = () => {
    titre.hafif();
    Animated.timing(flip, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    setTimeout(() => setAcik(true), 150);
  };
  const sifirlaAnim = () => { flip.setValue(0); kaydir.setValue({ x: 0, y: 0 }); };

  useEffect(() => {
    if (!sinavMod) return;
    const t = setInterval(() => setKalanSaniye(s => {
      if (s === null) return s;
      if (s <= 1) { clearInterval(t); setErkenBitti(true); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [sinavMod]);

  const cevapla = (dogruMu, animYon) => {
    const ref = kartRef.current;
    if (!ref || !ref.kart) return;

    // Geri alınmış bir kart yeniden cevaplanıyorsa, ilk denemedeki sonuç geçerlidir.
    // Böylece "yanlış yap → geri al → doğru yap" ile SRS kandırılamaz.
    const ilkSonuc = geriAlinan.current[ref.kart.id];
    const gercekSonuc = (ilkSonuc === undefined) ? dogruMu : (ilkSonuc && dogruMu);

    dogruMu ? titre.dogru() : titre.yanlis();
    setGecmis(g => [...g, { kartId: ref.kart.id, oncekiDurum: ref.durum, dogruMu: gercekSonuc, ders: ref.kart.ders }]);
    onUpdate(ref.kart.id, srsGuncelle(ref.durum, gercekSonuc), gercekSonuc);

    // Ders bazında sayaç (sınav sonu kırılımı için)
    const dersId = ref.kart.ders;
    setDersSayac(p => ({
      ...p,
      [dersId]: {
        dogru: (p[dersId]?.dogru || 0) + (gercekSonuc ? 1 : 0),
        toplam: (p[dersId]?.toplam || 0) + 1,
      },
    }));

    if (gercekSonuc) {
      setDogru(d => d + 1);
      setXpKazanim(x => x + 10);
      yanlisSayaci.current = 0;   // doğru cevap seriyi sıfırlar
    } else {
      yanlisSayaci.current += 1;
      if (yanlisSayaci.current >= 5) {
        yanlisSayaci.current = 0;
        setTimeout(() => setMolaUyari(true), 500);
      }
    }
    const bitis = animYon ? animYon * SW * 1.2 : 0;
    Animated.timing(kaydir, { toValue: { x: bitis, y: 0 }, duration: animYon ? 200 : 0, useNativeDriver: true })
      .start(() => { setAcik(false); setSecilen(null); sifirlaAnim(); setIdx(i => i + 1); });
  };

  const geriAl = () => {
    if (gecmis.length === 0) return;
    titre.orta();
    if (geriAlKalan <= 0) return;
    const son = gecmis[gecmis.length - 1];
    setGeriAlKalan(k => k - 1);
    setGecmis(g => g.slice(0, -1));
    // Bu kartın ilk sonucunu sakla; yeniden cevaplansa da bu sonuç geçerli kalır
    if (geriAlinan.current[son.kartId] === undefined) {
      geriAlinan.current[son.kartId] = son.dogruMu;
    }
    onGeriAl(son.kartId, son.oncekiDurum, son.dogruMu);
    if (son.dogruMu) { setDogru(d => Math.max(0, d - 1)); setXpKazanim(x => Math.max(0, x - 10)); }
    if (son.ders) {
      setDersSayac(p => ({
        ...p,
        [son.ders]: {
          dogru: Math.max(0, (p[son.ders]?.dogru || 0) - (son.dogruMu ? 1 : 0)),
          toplam: Math.max(0, (p[son.ders]?.toplam || 0) - 1),
        },
      }));
    }
    setAcik(false); setSecilen(null); sifirlaAnim();
    setIdx(i => Math.max(0, i - 1));
  };


  // ---- SONUÇ ----
  if (!kart || idx >= kartlar.length || erkenBitti) {
    const toplam = Math.min(idx, kartlar.length);
    const pct = toplam > 0 ? Math.round((dogru / toplam) * 100) : 0;
    const renk = pct >= 80 ? FOCUS.green : pct >= 50 ? FOCUS.ember : FOCUS.red;
    return (
      <View style={{ flex: 1, backgroundColor: FOCUS.bg }}>
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', justifyContent: 'center', flexGrow: 1, paddingTop: kenar.top + 24, paddingBottom: kenar.bottom + 24 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: FOCUS.textSoft, letterSpacing: 2, marginBottom: 8 }}>
            {erkenBitti ? 'OTURUM SONLANDIRILDI' : 'SONUÇ RAPORU'}
          </Text>
          <Text style={{ fontFamily: FONT.monoBold, fontSize: 58, color: renk }}>%{pct}</Text>
          <Text style={{ fontSize: 15, color: FOCUS.textSoft, marginTop: 4, fontFamily: FONT.mono }}>doğruluk oranı</Text>
          <View style={{ flexDirection: 'row', width: '100%', marginTop: 32, marginBottom: 28 }}>
            <View style={{ flex: 1, marginRight: 6, backgroundColor: FOCUS.panel, borderRadius: 8, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONT.mono, fontSize: 21, color: FOCUS.green }}>{dogru}</Text>
              <Text style={{ fontSize: 12, color: FOCUS.textSoft, fontFamily: FONT.mono }}>doğru</Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 6, backgroundColor: FOCUS.panel, borderRadius: 8, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONT.mono, fontSize: 21, color: FOCUS.red }}>{toplam - dogru}</Text>
              <Text style={{ fontSize: 12, color: FOCUS.textSoft, fontFamily: FONT.mono }}>yanlış</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 6, backgroundColor: FOCUS.panel, borderRadius: 8, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONT.mono, fontSize: 21, color: FOCUS.ember }}>+{xpKazanim}</Text>
              <Text style={{ fontSize: 12, color: FOCUS.textSoft, fontFamily: FONT.mono }}>xp</Text>
            </View>
          </View>
          {/* Gerçek LGS puanlaması: 3 yanlış 1 doğruyu götürür */}
          {sinavMod && toplam > 0 && (
            <View style={{ width: '100%', backgroundColor: FOCUS.panel, borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: FOCUS.textSoft, letterSpacing: 1.5, marginBottom: 10 }}>NET HESABI</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ fontFamily: FONT.monoBold, fontSize: 33, color: FOCUS.ember }}>
                  {(dogru - (toplam - dogru) / 3).toFixed(2)}
                </Text>
                <Text style={{ fontSize: 14, color: FOCUS.textSoft, marginLeft: 8, fontFamily: FONT.mono }}>/ {toplam} net</Text>
              </View>
              <Text style={{ fontSize: 13, color: FOCUS.textSoft, marginTop: 6, fontFamily: FONT.mono, lineHeight: 17 }}>
                LGS'de 3 yanlış 1 doğruyu götürür.
              </Text>
            </View>
          )}

          {/* Ders bazında kırılım — asıl işe yarayan bilgi */}
          {sinavMod && Object.keys(dersSayac).length > 0 && (
            <View style={{ width: '100%', backgroundColor: FOCUS.panel, borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: FOCUS.textSoft, letterSpacing: 1.5, marginBottom: 12 }}>DERS BAZINDA</Text>
              {Object.keys(dersSayac)
                .map(id => ({ id, ...dersSayac[id], pct: Math.round((dersSayac[id].dogru / Math.max(1, dersSayac[id].toplam)) * 100) }))
                .sort((a, b) => a.pct - b.pct)
                .map(d => {
                  const ad = (DERS_ADLARI[d.id] || d.id);
                  const renk = d.pct >= 70 ? FOCUS.green : d.pct >= 40 ? FOCUS.ember : FOCUS.red;
                  return (
                    <View key={d.id} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, color: FOCUS.text, fontFamily: FONT.mono }}>{ad}</Text>
                        <Text style={{ fontSize: 14, color: renk, fontFamily: FONT.monoBold }}>{d.dogru}/{d.toplam} · %{d.pct}</Text>
                      </View>
                      <View style={{ height: 3, backgroundColor: FOCUS.line }}>
                        <View style={{ height: '100%', backgroundColor: renk, width: d.pct + '%' }} />
                      </View>
                    </View>
                  );
                })}
              <Text style={{ fontSize: 13, color: FOCUS.textSoft, marginTop: 6, fontFamily: FONT.mono, lineHeight: 17 }}>
                En zayıf ders en üstte. Çalışmaya oradan başla.
              </Text>
            </View>
          )}

          <View style={{ width: '100%' }}>
            <Dugme etiket="DEVAM ET" renk={FOCUS.green} renkKoyu={FOCUS.greenDark}
              onPress={() => onBitti(dogru, toplam, dersSayac)} tam />
          </View>
          {sinavMod && kalanSaniye !== null && (
            <Text style={{ fontSize: 13, color: FOCUS.textSoft, marginTop: 14, fontFamily: FONT.mono }}>
              kullanılan süre: {Math.floor((2400 - kalanSaniye) / 60)}:{String((2400 - kalanSaniye) % 60).padStart(2, '0')}
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }

  const dakika = kalanSaniye !== null ? Math.floor(kalanSaniye / 60) : null;
  const saniye = kalanSaniye !== null ? kalanSaniye % 60 : null;
  const zamanAz = kalanSaniye !== null && kalanSaniye <= 300;

  // 3B çevirme yerine solma + hafif ölçek: Android'de metin keskin kalır.
  // (rotateY ile çevrilen katman rasterize edilip bulanıklaşıyordu.)
  const kartOpak = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.35, 1] });
  const kartOlcek = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.97, 1] });
  const kaydirDonus = kaydir.x.interpolate({ inputRange: [-SW, 0, SW], outputRange: ['-9deg', '0deg', '9deg'] });

  return (
    <View style={{ flex: 1, backgroundColor: FOCUS.bg, paddingTop: kenar.top, paddingBottom: kenar.bottom }}>

      {/* 5 yanlış üst üste: zorlanıyor olabilir, mola öner */}
      {molaUyari && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(8,10,16,0.94)',
          alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 30,
        }}>
          {ligoGorsel('uykulu') && (
            <Image source={ligoGorsel('uykulu')} style={{ width: 116, height: 116, resizeMode: 'contain', marginBottom: 20 }} />
          )}
          <Text style={{ fontFamily: FONT.baslik, fontSize: 26, color: FOCUS.text, textAlign: 'center' }}>
            Zorlandın galiba
          </Text>
          <Text style={{
            fontFamily: FONT.govde, fontSize: 16, color: FOCUS.textSoft,
            textAlign: 'center', marginTop: 10, lineHeight: 24,
          }}>
            Üst üste 5 yanlış yaptın. Bu konu biraz ağır geliyorsa
            mola vermek de bir yöntem.
          </Text>

          <View style={{ width: '100%', marginTop: 28 }}>
            <Dugme etiket="DEVAM EDİYORUM" renk={FOCUS.green} renkKoyu={FOCUS.greenDark} tam
              onPress={() => setMolaUyari(false)} />
            <View style={{ height: 12 }} />
            <TouchableOpacity
              onPress={() => { titre.hafif(); setMolaUyari(false); onBitti(dogru, idx, dersSayac); }}
              style={{
                borderWidth: 2, borderColor: FOCUS.line, borderRadius: 16,
                paddingVertical: 14, alignItems: 'center',
              }}>
              <Text style={{ fontFamily: FONT.monoBold, fontSize: 16, color: FOCUS.textSoft }}>
                ANA SAYFAYA DÖN
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}>
        <IkonDugme Ikon={XIkon} dolu renk={FOCUS.panel2} renkKoyu={FOCUS.line}
          ikonRenk={FOCUS.textSoft} onPress={() => onBitti(dogru, idx)} boyut={50} ikonBoyut={25} />
        <View style={{ alignItems: 'center' }}>
          {sinavMod && dakika !== null ? (
            <Text style={{ fontSize: 21, fontFamily: FONT.monoBold, color: zamanAz ? FOCUS.red : FOCUS.ember }}>{dakika}:{String(saniye).padStart(2, '0')}</Text>
          ) : (
            <Text style={{ fontSize: 13, color: FOCUS.textSoft, fontFamily: FONT.mono, letterSpacing: 1 }}>{isQuiz ? 'QUIZ' : 'KART'} MODU</Text>
          )}

        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: 12, opacity: (gecmis.length && geriAlKalan > 0) ? 1 : 0.32 }}>
            <IkonDugme
              Ikon={RotateCcw} dolu
              renk={FOCUS.panel2} renkKoyu={FOCUS.line}
              ikonRenk={geriAlKalan > 0 ? FOCUS.text : FOCUS.textSoft}
              onPress={() => gecmis.length && geriAlKalan > 0 && geriAl()}
              boyut={50} ikonBoyut={24}
            />
            {/* Kalan geri alma hakkı */}
            <View style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 21, height: 21, borderRadius: 11,
              backgroundColor: geriAlKalan > 0 ? FOCUS.blue : FOCUS.line,
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 5,
              borderWidth: 2, borderColor: FOCUS.bg,
            }}>
              <Text style={{ fontFamily: FONT.monoBold, fontSize: 11, color: '#FFFFFF' }}>{geriAlKalan}</Text>
            </View>
          </View>
          {/* Can yerine anlık doğru/yanlış sayacı — cezalandırmadan geri bildirim */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Check size={14} color={FOCUS.green} strokeWidth={2.4} />
            <Text style={{ fontFamily: FONT.monoBold, fontSize: 13, color: FOCUS.green, marginLeft: 3 }}>{dogru}</Text>
            <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: FOCUS.line, marginHorizontal: 6 }}>·</Text>
            <XIkon size={14} color={FOCUS.red} strokeWidth={2.4} />
            <Text style={{ fontFamily: FONT.monoBold, fontSize: 13, color: FOCUS.red, marginLeft: 3 }}>{idx - dogru}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 14, backgroundColor: FOCUS.line, marginHorizontal: 20, borderRadius: 999, overflow: 'hidden' }}>
        <View style={{
          height: '100%', backgroundColor: FOCUS.green, borderRadius: 999,
          width: (kartlar.length ? (idx / kartlar.length) * 100 : 0) + '%',
        }} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
        keyboardShouldPersistTaps="handled">


        <Animated.View
          style={{
            opacity: kartOpak,
            transform: [
              { translateX: kaydir.x }, { translateY: kaydir.y },
              { rotate: kaydirDonus },
              { scale: kartOlcek },
            ],
          }}>
          <View style={{
            backgroundColor: FOCUS.panel, borderRadius: 20, padding: 24,
            borderWidth: 2, borderColor: FOCUS.line,
          }}>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ flex: 1, fontFamily: FONT.mono, fontSize: 12, color: FOCUS.ember, letterSpacing: 1 }}>{kart.unite}</Text>
              {kart.lgsKapsam === false && (
                <View style={{
                  backgroundColor: FOCUS.emberSoft, borderRadius: 7,
                  paddingHorizontal: 8, paddingVertical: 3,
                }}>
                  <Text style={{ fontFamily: FONT.monoBold, fontSize: 10, color: FOCUS.ember, letterSpacing: 0.4 }}>
                    TEKRAR · LGS'DE ÇIKMAZ
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 18, fontFamily: FONT.serif, color: FOCUS.text, lineHeight: 26 }}>{kart.soru}</Text>


            {isQuiz && (
              <View style={{ marginTop: 18 }}>
                {sikSirasi.map((sec, i) => {
                  const dogruMu = sec === kart.cevap;
                  const secildi = sec === secilen;
                  // Cevap açılmadan önce nötr; açılınca doğru yeşil, seçilen yanlış kırmızı
                  const cerceve = !acik ? FOCUS.line : (dogruMu ? FOCUS.green : (secildi ? FOCUS.red : FOCUS.line));
                  const altCerceve = !acik ? FOCUS.line : (dogruMu ? FOCUS.greenDark : (secildi ? FOCUS.redDark : FOCUS.line));
                  const zemin = !acik ? FOCUS.panel2 : (dogruMu ? '#1E3A1A' : (secildi ? '#3B2226' : FOCUS.panel2));
                  const yazi = !acik ? FOCUS.text : (dogruMu ? FOCUS.green : (secildi ? FOCUS.red : FOCUS.textSoft));

                  return (
                    <TouchableOpacity key={i} disabled={acik} activeOpacity={0.85}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingVertical: 15, paddingHorizontal: 15,
                        borderRadius: 16, marginBottom: 11,
                        backgroundColor: zemin,
                        borderWidth: 2, borderColor: cerceve,
                        borderBottomWidth: 4, borderBottomColor: altCerceve,
                      }}
                      onPress={() => {
                        titre.hafif(); setSecilen(sec); setAcik(true);
                        // Yanlışsa açıklamayı okumak için daha uzun bekle
                        const bekle = dogruMu ? 850 : (kart.aciklama ? 2600 : 1300);
                        setTimeout(() => cevapla(dogruMu, 0), bekle);
                      }}>
                      {/* Şık harfi rozeti */}
                      <View style={{
                        width: 30, height: 30, borderRadius: 9, marginRight: 13,
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2, borderColor: cerceve,
                      }}>
                        <Text style={{ fontFamily: FONT.monoBold, fontSize: 15, color: yazi }}>
                          {String.fromCharCode(65 + i)}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 16, color: yazi, fontFamily: FONT.govdeOrta, lineHeight: 22 }}>{sec}</Text>
                      {acik && dogruMu && <Check size={20} color={FOCUS.green} strokeWidth={3} />}
                      {acik && secildi && !dogruMu && <XIkon size={20} color={FOCUS.red} strokeWidth={3} />}
                    </TouchableOpacity>
                  );
                })}

                {/* Çözüm açıklaması — yalnızca yanlış cevaptan sonra */}
                {acik && secilen !== kart.cevap && kart.aciklama && (
                  <View style={{
                    marginTop: 6, backgroundColor: FOCUS.emberSoft,
                    borderRadius: 16, borderWidth: 1.5, borderColor: FOCUS.ember + '55',
                    padding: 15,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Lightbulb size={18} color={FOCUS.ember} strokeWidth={2.6} />
                      <Text style={{
                        fontFamily: FONT.monoBold, fontSize: 13, color: FOCUS.ember,
                        letterSpacing: 1, marginLeft: 7,
                      }}>NEDEN?</Text>
                    </View>
                    <Text style={{
                      fontSize: 16, color: FOCUS.text,
                      fontFamily: FONT.govde, lineHeight: 24,
                    }}>{kart.aciklama}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Kart modunda da açıklama varsa göster */}
            {!isQuiz && acik && kart.aciklama && (
              <View style={{
                marginTop: 14, backgroundColor: FOCUS.emberSoft,
                borderRadius: 16, borderWidth: 1.5, borderColor: FOCUS.ember + '55',
                padding: 15,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Lightbulb size={18} color={FOCUS.ember} strokeWidth={2.6} />
                  <Text style={{
                    fontFamily: FONT.monoBold, fontSize: 13, color: FOCUS.ember,
                    letterSpacing: 1, marginLeft: 7,
                  }}>NEDEN?</Text>
                </View>
                <Text style={{
                  fontSize: 16, color: FOCUS.text,
                  fontFamily: FONT.govde, lineHeight: 24,
                }}>{kart.aciklama}</Text>
              </View>
            )}
          </View>
        </Animated.View>
        <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: FOCUS.ember, textAlign: 'center', marginTop: 16 }}>+{xpKazanim} XP</Text>
      </ScrollView>
    </View>
  );
}

// ============================================================
// ÇALIŞMA TAKVİMİ — son 18 haftanın ızgarası
// Her kare bir gün; koyuluk o gün çevrilen kart sayısını gösterir.
// ============================================================
function CalismaTakvimi({ gunluk, hedefKart }) {
  const { P } = useTema();
  const HAFTA = 18;
  const bugunD = new Date();
  bugunD.setHours(0, 0, 0, 0);

  // Izgara pazartesi başlasın diye bugünün haftasının sonuna hizala
  const haftaGunu = (bugunD.getDay() + 6) % 7; // 0 = pazartesi
  const son = new Date(bugunD);
  son.setDate(son.getDate() + (6 - haftaGunu));

  const sutunlar = [];
  for (let h = HAFTA - 1; h >= 0; h--) {
    const sutun = [];
    for (let g = 0; g < 7; g++) {
      const t = new Date(son);
      t.setDate(son.getDate() - (h * 7) + (g - 6));
      const anahtar = t.toISOString().split('T')[0];
      sutun.push({
        anahtar,
        sayi: gunluk[anahtar] || 0,
        gelecek: t.getTime() > bugunD.getTime(),
        bugun: t.getTime() === bugunD.getTime(),
      });
    }
    sutunlar.push(sutun);
  }

  const yogunluk = (sayi) => {
    if (sayi === 0) return 0;
    const oran = sayi / Math.max(1, hedefKart);
    if (oran >= 1) return 4;
    if (oran >= 0.6) return 3;
    if (oran >= 0.3) return 2;
    return 1;
  };
  const renkler = [P.line, P.red + '40', P.red + '70', P.red + 'AA', P.red];

  const toplamGun = Object.values(gunluk).filter(v => v > 0).length;
  const toplamKart = Object.values(gunluk).reduce((a, b) => a + b, 0);

  return (
    <View style={{ marginBottom: 12 }}>
      <BolumBaslik Ikon={CalendarCheck} baslik="ÇALIŞMA TAKVİMİ" renk={P.yesil}
        gradyan={['#11998E', '#38EF7D']} sag={toplamGun + ' gün'} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row' }}>
          {sutunlar.map((sutun, i) => (
            <View key={i} style={{ marginRight: 3 }}>
              {sutun.map(g => (
                <View key={g.anahtar} style={{
                  width: 11, height: 11, marginBottom: 3, borderRadius: 2,
                  backgroundColor: g.gelecek ? 'transparent' : renkler[yogunluk(g.sayi)],
                  borderWidth: g.bugun ? 1.2 : 0,
                  borderColor: P.ink,
                  opacity: g.gelecek ? 0 : 1,
                }} />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.inkFaint, marginRight: 6 }}>az</Text>
        {renkler.map((r, i) => (
          <View key={i} style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: r, marginRight: 3 }} />
        ))}
        <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.inkFaint, marginLeft: 3 }}>çok</Text>
      </View>
    </View>
  );
}

// ============================================================
// HAFTALIK ÇALIŞMA GRAFİĞİ — son 7 gün, dikey çubuk
// Takvimden farkı: sayıyı gösterir, günü adlandırır, hedefi işaretler
// ============================================================
function HaftalikGrafik({ gunluk, hedefKart }) {
  const { P } = useTema();
  const GUN_AD = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const bugunD = new Date();
  bugunD.setHours(0, 0, 0, 0);
  const gunler = [];
  for (let i = 6; i >= 0; i--) {
    const t = new Date(bugunD);
    t.setDate(bugunD.getDate() - i);
    const anahtar = t.toISOString().split('T')[0];
    gunler.push({
      ad: GUN_AD[(t.getDay() + 6) % 7],
      sayi: gunluk[anahtar] || 0,
      bugun: i === 0,
    });
  }

  const enYuksek = Math.max(hedefKart, ...gunler.map(g => g.sayi), 1);
  const YUKSEKLIK = 96;
  const calisilanGun = gunler.filter(g => g.sayi > 0).length;

  return (
    <View>
      <BolumBaslik Ikon={ChartColumn} baslik="SON 7 GÜN" renk={P.mavi}
        gradyan={['#00C6FF', '#0072FF']} sag={calisilanGun + '/7 gün'} />

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: YUKSEKLIK }}>
        {gunler.map((g, i) => {
          const h = Math.max(3, Math.round((g.sayi / enYuksek) * YUKSEKLIK));
          const hedefTuttu = g.sayi >= hedefKart;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              {hedefTuttu && (
                <Check size={13} color={P.yesil} strokeWidth={3} style={{ marginBottom: 3 }} />
              )}
              <View style={{
                width: '58%', height: h, borderRadius: 3,
                backgroundColor: g.sayi === 0 ? P.line : (hedefTuttu ? P.yesil : P.red),
                opacity: g.sayi === 0 ? 0.4 : 1,
              }} />
            </View>
          );
        })}
      </View>

      {/* Hedef çizgisi */}
      <View style={{ height: 1, backgroundColor: P.line, marginTop: 8 }} />

      <View style={{ flexDirection: 'row', marginTop: 7 }}>
        {gunler.map((g, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{
              fontFamily: g.bugun ? FONT.monoBold : FONT.mono,
              fontSize: 11, color: g.bugun ? P.red : P.inkFaint,
            }}>{g.ad}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontFamily: FONT.govde, fontSize: 14, color: P.inkSoft, marginTop: 12, lineHeight: 20 }}>
        {calisilanGun === 7 ? 'Bu hafta hiç ara vermedin.'
          : calisilanGun === 0 ? 'Bu hafta henüz çalışmadın.'
          : calisilanGun + ' gün çalıştın. Fena değil.'}
      </Text>
    </View>
  );
}

// ============================================================
// DENEME GEÇMİŞİ — son denemeler ve gelişim çizgisi
// ============================================================
function DenemeGecmisi({ gecmis }) {
  const { P, s: st } = useTema();
  if (!gecmis || gecmis.length === 0) {
    return (
      <View>
        <BolumBaslik Ikon={Timer} baslik="DENEME SINAVLARI" renk={P.mor} gradyan={['#834D9B', '#D04ED6']} />
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          {ligoGorsel('uykulu') && (
            <Image source={ligoGorsel('uykulu')} style={{ width: 90, height: 90, resizeMode: 'contain', opacity: 0.85, marginBottom: 12 }} />
          )}
          <Text style={{ fontFamily: FONT.govde, fontSize: 16, color: P.inkSoft, lineHeight: 23, textAlign: 'center' }}>
            Henüz deneme çözmedin.{'\n'}Ana sayfadan başlayabilirsin.
          </Text>
        </View>
      </View>
    );
  }

  const son = gecmis[gecmis.length - 1];
  const enIyi = gecmis.reduce((a, b) => (b.pct > a.pct ? b : a), gecmis[0]);
  const ortalama = Math.round(gecmis.reduce((a, b) => a + b.pct, 0) / gecmis.length);
  // Gelişim: son deneme ile ilk denemenin farkı
  const fark = gecmis.length > 1 ? son.pct - gecmis[0].pct : null;

  const gorunen = gecmis.slice(-8);
  const YUKSEKLIK = 68;

  return (
    <View>
      <BolumBaslik Ikon={Timer} baslik="DENEME SINAVLARI" renk={P.mor}
        gradyan={['#834D9B', '#D04ED6']} sag={gecmis.length + ' deneme'} />

      {/* Gelişim çizgisi */}
      <View style={{ height: YUKSEKLIK + 20, marginBottom: 12 }}>
        <Svg width="100%" height={YUKSEKLIK + 20} viewBox={'0 0 100 ' + (YUKSEKLIK + 20)} preserveAspectRatio="none">
          {/* %50 ve %100 kılavuz çizgileri */}
          {[0, 50, 100].map(g => {
            const gy = 10 + YUKSEKLIK - (g / 100) * YUKSEKLIK;
            return <SvgLine key={g} x1="0" y1={gy} x2="100" y2={gy} stroke={P.line} strokeWidth="1" />;
          })}
          {/* Gelişim çizgisi */}
          {gorunen.length > 1 && (
            <Polyline
              points={gorunen.map((d, i) => {
                const x = (i / (gorunen.length - 1)) * 100;
                const y = 10 + YUKSEKLIK - (d.pct / 100) * YUKSEKLIK;
                return x + ',' + y;
              }).join(' ')}
              fill="none" stroke={P.mavi} strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </Svg>

        {/* Noktalar — SVG ölçeklenmesinden etkilenmesin diye ayrı katman */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: YUKSEKLIK + 20 }}>
          {gorunen.map((d, i) => {
            const solPct = gorunen.length > 1 ? (i / (gorunen.length - 1)) * 100 : 50;
            const ustPx = 10 + YUKSEKLIK - (d.pct / 100) * YUKSEKLIK;
            const sonuncu = i === gorunen.length - 1;
            const renk = d.pct >= 80 ? P.yesil : d.pct >= 50 ? P.mavi : P.kirmizi;
            return (
              <View key={i} style={{
                position: 'absolute',
                left: solPct + '%', top: ustPx,
                marginLeft: sonuncu ? -8 : -6, marginTop: sonuncu ? -8 : -6,
                width: sonuncu ? 16 : 12, height: sonuncu ? 16 : 12,
                borderRadius: 999, backgroundColor: renk,
                borderWidth: 3, borderColor: P.yuzey,
              }} />
            );
          })}
        </View>
      </View>

      {/* Özet üçlü */}
      <View style={{ flexDirection: 'row' }}>
        {[
          { l: 'SON', v: '%' + son.pct, r: P.ink },
          { l: 'EN İYİ', v: '%' + enIyi.pct, r: P.yesil },
          { l: 'ORTALAMA', v: '%' + ortalama, r: P.inkSoft },
        ].map((it, i) => (
          <View key={it.l} style={{ flex: 1, alignItems: i === 0 ? 'flex-start' : i === 1 ? 'center' : 'flex-end' }}>
            <Text style={{ fontFamily: FONT.serif, fontSize: 21, color: it.r }}>{it.v}</Text>
            <Text style={{ fontFamily: FONT.mono, fontSize: 10, color: P.inkFaint, marginTop: 2 }}>{it.l}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontFamily: FONT.govde, fontSize: 14, color: P.inkSoft, marginTop: 14, lineHeight: 20 }}>
        Son denemende <Text style={{ fontFamily: FONT.monoBold, color: P.ink }}>{son.net} net</Text> yaptın
        ({son.dogru}/{son.toplam} doğru).
        {fark !== null && fark !== 0
          ? (fark > 0 ? ' İlk denemene göre ' + fark + ' puan yükseldin.' : ' İlk denemene göre ' + Math.abs(fark) + ' puan düştün.')
          : ''}
      </Text>
    </View>
  );
}

// ============================================================
// ÜNİTE ANALİZİ — en zayıf ve en güçlü üniteler
// Öğrenciye "nereye çalışayım" sorusunu doğrudan cevaplar
// ============================================================
function UniteAnalizi({ srs }) {
  const { P, DERSLER } = useTema();

  const veri = React.useMemo(() => {
    const liste = uniteIstatistigi(srs);
    return { zayif: liste.slice(0, 3), guclu: liste.slice(-3).reverse() };
  }, [srs]);

  if (veri.zayif.length === 0) {
    return (
      <View>
        <BolumBaslik Ikon={Target} baslik="ÜNİTE ANALİZİ" renk={P.kirmizi} gradyan={['#E52D27', '#B31217']} />
        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
          {ligoGorsel('normal') && (
            <Image source={ligoGorsel('normal')} style={{ width: 90, height: 90, resizeMode: 'contain', opacity: 0.85, marginBottom: 12 }} />
          )}
          <Text style={{ fontFamily: FONT.govde, fontSize: 16, color: P.inkSoft, lineHeight: 23, textAlign: 'center' }}>
            Biraz daha çalış, zayıf konularını{'\n'}burada listeleyeyim.
          </Text>
        </View>
      </View>
    );
  }

  const Satir = ({ u, vurgu }) => {
    const d = DERSLER.find(x => x.id === u.ders) || { ad: u.ders, renk: P.ink };
    return (
      <View style={{ marginBottom: 11 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: d.renk, marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: FONT.govde, fontSize: 15, color: P.ink }}>{u.unite}</Text>
            <Text style={{ fontFamily: FONT.mono, fontSize: 10, color: P.inkFaint, marginTop: 1 }}>{d.ad}</Text>
          </View>
          <Text style={{ fontFamily: FONT.monoBold, fontSize: 14, color: vurgu }}>%{u.pct}</Text>
        </View>
        <View style={{ height: 8, backgroundColor: P.bgAlt, borderRadius: 999, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: u.pct + '%', backgroundColor: vurgu, borderRadius: 999 }} />
        </View>
      </View>
    );
  };

  return (
    <View>
      <BolumBaslik Ikon={Target} baslik="ÖNCE BURAYA ÇALIŞ" renk={P.kirmizi} gradyan={['#E52D27', '#B31217']} />
      {veri.zayif.map(u => <Satir key={u.ders + u.unite} u={u} vurgu={P.red} />)}

      <View style={{ height: 1, backgroundColor: P.line, marginVertical: 14 }} />

      <BolumBaslik Ikon={Trophy} baslik="EN İYİ OLDUĞUN ÜNİTELER" renk={P.yesil} gradyan={['#11998E', '#38EF7D']} />
      {veri.guclu.map(u => <Satir key={u.ders + u.unite} u={u} vurgu={P.yesil} />)}
    </View>
  );
}

// ============ İSTATİSTİK ============
function RozetRow({ istatistikler }) {
  const { P } = useTema();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {ROZETLER.map(r => {
        const acik = r.kosul(istatistikler);
        const RozetIkon = r.ikon;
        return (
          <View key={r.id} style={{ width: '33.33%', alignItems: 'center', marginBottom: 14 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: acik ? P.vurguZemin : P.bgAlt,
            }}>
              <RozetIkon size={24} color={acik ? P.red : P.inkFaint} strokeWidth={2} opacity={acik ? 1 : 0.4} />
            </View>
            <Text style={{ fontSize: 12, fontFamily: FONT.govdeKalin, color: acik ? P.ink : P.inkFaint, marginTop: 7, textAlign: 'center' }}>{r.ad}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ProfilScreen(props) {
  const {
    srs, xp, seri, profil, setProfil, sinavSayisi, enIyiSinavPct,
    hedefKart, setHedefKart, sinavTarihi, setSinavTarihi,
    bildirimAcik, setBildirimAcik, bildirimSaat, setBildirimSaat,
    gunluk, denemeGecmisi, onVeriDegisti,
  } = props;
  const { P, s: st, DERSLER, seviyeHesapla } = useTema();
  const kenar = useSafeAreaInsets();
  const [altSayfa, setAltSayfa] = useState(null); // null | 'ayarlar' | 'hesap'

  // ---- Alt sayfalar: üstte geri şeridi, altında ilgili ekran ----
  if (altSayfa) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{
          paddingTop: kenar.top + 12, paddingHorizontal: 20, paddingBottom: 10,
          borderBottomWidth: 1, borderBottomColor: P.line, flexDirection: 'row', alignItems: 'center',
        }}>
          <TouchableOpacity onPress={() => { titre.hafif(); setAltSayfa(null); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ChevronLeft size={20} color={P.inkSoft} strokeWidth={1.8} />
              <Text style={{ fontFamily: FONT.govdeOrta, fontSize: 15, color: P.inkSoft, marginLeft: 2 }}>Profil</Text>
            </View>
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONT.serif, fontSize: 20, color: P.ink, marginRight: 60 }}>
            {altSayfa === 'ayarlar' ? 'Ayarlar' : altSayfa === 'notlar' ? 'Sınav Notlarım' : 'Hesap'}
          </Text>
        </View>
        {altSayfa === 'ayarlar' ? (
          <AyarlarScreen
            profil={profil} setProfil={setProfil}
            hedefKart={hedefKart} setHedefKart={setHedefKart}
            sinavTarihi={sinavTarihi} setSinavTarihi={setSinavTarihi}
            bildirimAcik={bildirimAcik} setBildirimAcik={setBildirimAcik}
            bildirimSaat={bildirimSaat} setBildirimSaat={setBildirimSaat}
            basliksiz
          />
        ) : altSayfa === 'notlar' ? (
          <SinavNotlariEkrani />
        ) : (
          <HesapEkrani onVeriDegisti={onVeriDegisti} basliksiz />
        )}
      </View>
    );
  }
  const sev = seviyeHesapla(xp);
  const ogrenilenler = Object.values(srs).filter(d => d.seviye >= 3).length;
  const usta = Object.values(srs).filter(d => d.seviye === 7).length;
  const toplamReps = Object.values(srs).reduce((a, d) => a + (d.reps || 0), 0);
  const istatistikler = { seri, ogrenilen: ogrenilenler, usta, toplamReps, sinavSayisi, enIyiSinavPct };
  const acikRozetSayisi = ROZETLER.filter(r => r.kosul(istatistikler)).length;
  const SeviyeIkon = sev.ikon;
  const toplamGun = Object.values(gunluk || {}).filter(v => v > 0).length;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: kenar.top + 12, paddingBottom: 28 }}>

      {/* ---------- KÜNYE ---------- */}
      <View style={{
        backgroundColor: sev.renk, borderRadius: 22,
        borderBottomWidth: 6, borderBottomColor: sev.renkKoyu,
        alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, marginBottom: 16,
      }}>
        <View style={{
          width: 76, height: 76, borderRadius: 24, backgroundColor: '#FFFFFF33',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <SeviyeIkon size={40} color="#FFFFFF" strokeWidth={2.4} />
        </View>
        <Text style={{ fontFamily: FONT.baslik, fontSize: 26, color: '#FFFFFF', marginTop: 12 }}>{sev.ad}</Text>
        <Text style={{ fontSize: 15, color: '#FFFFFFCC', fontFamily: FONT.govdeKalin, marginTop: 1 }}>{xp} XP</Text>

        <View style={{ width: '100%', marginTop: 18 }}>
          <View style={{ height: 14, backgroundColor: '#00000026', borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: sev.pct + '%', backgroundColor: '#FFFFFF', borderRadius: 999 }} />
          </View>
          {sev.siradaki && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 }}>
              <Text style={{ fontSize: 13, color: '#FFFFFFCC', fontFamily: FONT.govdeKalin }}>%{sev.pct}</Text>
              <Text style={{ fontSize: 13, color: '#FFFFFFCC', fontFamily: FONT.govdeKalin }}>
                {sev.siradaki.ad} için {sev.siradaki.minXp - xp} XP
              </Text>
            </View>
          )}
        </View>

        {profil && (profil.hedefOkul || profil.hedefNet) ? (
          <View style={{
            marginTop: 18, width: '100%', alignItems: 'center',
            backgroundColor: '#FFFFFF26', borderRadius: 14, paddingVertical: 12,
          }}>
            <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 12, color: '#FFFFFFCC', letterSpacing: 1 }}>HEDEF</Text>
            <Text style={{ fontSize: 19, fontFamily: FONT.monoBold, color: '#FFFFFF', marginTop: 3 }}>
              {profil.hedefOkul || (profil.hedefNet + ' net')}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ---------- ÖZET SAYILAR: renkli kutular ---------- */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
        {[
          { label: 'ÖĞRENİLEN', val: ogrenilenler, Ikon: BookOpenCheck, renk: P.yesil, koyu: P.yesilKoyu },
          { label: 'GÜN SERİSİ', val: seri, Ikon: Flame, renk: P.altin, koyu: P.altinKoyu },
          { label: 'EZBERLENEN', val: usta, Ikon: Trophy, renk: P.mor, koyu: P.morKoyu },
          { label: 'TEKRAR', val: toplamReps, Ikon: RotateCcw, renk: P.mavi, koyu: P.maviKoyu },
        ].map((it, i) => {
          const KutuIkon = it.Ikon;
          return (
            <View key={it.label} style={{
              width: '48%', marginRight: i % 2 === 0 ? '4%' : 0, marginBottom: 13,
              backgroundColor: it.renk, borderRadius: 20,
              borderBottomWidth: 6, borderBottomColor: it.koyu, padding: 15,
            }}>
              <KutuIkon size={24} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={{ fontFamily: FONT.baslik, fontSize: 30, color: '#FFFFFF', marginTop: 8 }}>{it.val}</Text>
              <Text style={{ fontSize: 12, color: '#FFFFFFCC', fontFamily: FONT.govdeKalin, letterSpacing: 0.6 }}>{it.label}</Text>
            </View>
          );
        })}
      </View>

      {/* ---------- HAFTALIK GRAFİK ---------- */}
      <View style={st.kart}>
        <HaftalikGrafik gunluk={gunluk || {}} hedefKart={hedefKart || 30} />
      </View>

      {/* ---------- DENEME GEÇMİŞİ ---------- */}
      <View style={st.kart}>
        <DenemeGecmisi gecmis={denemeGecmisi} />
      </View>

      {/* ---------- ÜNİTE ANALİZİ ---------- */}
      <View style={st.kart}>
        <UniteAnalizi srs={srs} />
      </View>

      {/* ---------- DERS BAZINDA ---------- */}
      <View style={st.kart}>
        <BolumBaslik Ikon={Library} baslik="DERS BAZINDA" renk={P.neon} gradyan={['#00B4DB', '#0083B0']} />
        {DERSLER.map(d => {
          const dk = CARDS.filter(c => c.ders === d.id);
          const og = dk.filter(c => (srs[c.id] || yeniD(c.id)).seviye >= 3).length;
          const pct = dk.length ? Math.round((og / dk.length) * 100) : 0;
          const DersIkon = d.ikon;
          return (
            <View key={d.id} style={{ marginBottom: 13 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <DersIkon size={16} color={d.renk} strokeWidth={1.8} />
                <Text style={{ flex: 1, marginLeft: 9, fontSize: 15, fontFamily: FONT.govde, color: P.ink }}>{d.ad}</Text>
                <Text style={{ fontSize: 14, fontFamily: FONT.monoBold, color: d.renk, width: 42, textAlign: 'right' }}>%{pct}</Text>
              </View>
              <View style={{ height: 10, backgroundColor: P.bgAlt, borderRadius: 999, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: pct + '%', backgroundColor: d.renk, borderRadius: 999 }} />
              </View>
            </View>
          );
        })}
      </View>

      {/* ---------- ÇALIŞMA TAKVİMİ ---------- */}
      <View style={st.kart}>
        <CalismaTakvimi gunluk={gunluk || {}} hedefKart={hedefKart || 30} />
      </View>

      {/* ---------- ROZETLER ---------- */}
      <View style={st.kart}>
        <BolumBaslik Ikon={Medal} baslik="ROZETLER" renk={P.altin}
          gradyan={['#F7971E', '#FFD200']} sag={acikRozetSayisi + ' / ' + ROZETLER.length} />
        <RozetRow istatistikler={istatistikler} />
      </View>

      {/* ---------- AYARLAR / HESAP ---------- */}
      {[
        { id: 'ayarlar', ad: 'Ayarlar', alt: 'Hedefler, bildirimler, görünüm',
          Ikon: Settings, gradyan: ['#4776E6', '#8E54E9'] },
        { id: 'notlar', ad: 'Sınav Notlarım', alt: 'Okul ve dershane sınavlarını kaydet',
          Ikon: NotebookPen, gradyan: ['#F7971E', '#FFD200'] },
        { id: 'hesap', ad: 'Hesap', alt: 'Yedekleme, çıkış, hesabı silme',
          Ikon: Cloud, gradyan: ['#00B4DB', '#0083B0'] },
      ].map(b => {
        const GirisIkon = b.Ikon;
        return (
          <View key={b.id} style={[st.golge, { borderRadius: 20, marginBottom: 13, overflow: 'hidden' }]}>
            <TouchableOpacity activeOpacity={0.88}
              onPress={() => { titre.orta(); setAltSayfa(b.id); }}>
              <LinearGradient colors={b.gradyan} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                <View style={{
                  width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFFFFF2E',
                  alignItems: 'center', justifyContent: 'center', marginRight: 14,
                }}>
                  <GirisIkon size={24} color="#FFFFFF" strokeWidth={2.6} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 19, fontFamily: FONT.monoBold, color: '#FFFFFF' }}>{b.ad}</Text>
                  <Text style={{ fontSize: 14, fontFamily: FONT.govde, color: '#FFFFFFC0', marginTop: 1 }}>{b.alt}</Text>
                </View>
                <ChevronRight size={22} color="#FFFFFF" strokeWidth={2.8} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={{ alignItems: 'center', marginTop: 6 }}>
        <Text style={{ fontSize: 12, color: P.inkFaint, fontFamily: FONT.mono }}>Ligo LGS Cepte · v4.5.1 · 6 ders</Text>
      </View>
    </ScrollView>
  );
}

function AyarlarScreen({ profil, setProfil, hedefKart, setHedefKart, sinavTarihi, setSinavTarihi, bildirimAcik, setBildirimAcik, bildirimSaat, setBildirimSaat, basliksiz }) {
  const { P, s: st, DERSLER, koyu, setKoyu } = useTema();
  const kenar = useSafeAreaInsets();
  const toggleZayif = (id) => {
    titre.hafif();
    setProfil(prev => {
      const liste = prev.zayifDersler || [];
      const yeni = liste.includes(id) ? liste.filter(x => x !== id) : [...liste, id];
      return { ...prev, zayifDersler: yeni };
    });
  };
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: basliksiz ? 16 : kenar.top + 12, paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled">
      {!basliksiz && <Text style={st.sayfaBaslik}>Ayarlar</Text>}

      <Text style={st.etiket}>GÖRÜNÜM</Text>
      <View style={{ flexDirection: 'row', marginBottom: 18 }}>
        <TouchableOpacity onPress={() => { titre.hafif(); setKoyu(false); }}
          style={[st.hap, !koyu && st.hapAktif, { marginRight: 8, flex: 1, alignItems: 'center' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Sun size={16} color={!koyu ? P.red : P.inkSoft} strokeWidth={1.8} />
            <Text style={[st.hapYazi, { marginLeft: 6 }, !koyu && { color: P.red, fontFamily: FONT.govdeKalin }]}>Aydınlık</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { titre.hafif(); setKoyu(true); }}
          style={[st.hap, koyu && st.hapAktif, { flex: 1, alignItems: 'center' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AyIkon size={16} color={koyu ? P.red : P.inkSoft} strokeWidth={1.8} />
            <Text style={[st.hapYazi, { marginLeft: 6 }, koyu && { color: P.red, fontFamily: FONT.govdeKalin }]}>Gece</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={st.etiket}>SINAV TARİHİ (YYYY-AA-GG)</Text>
      <TextInput style={st.girdi} value={sinavTarihi} onChangeText={setSinavTarihi} placeholder="2027-06-14" placeholderTextColor={P.inkFaint} />

      <Text style={st.etiket}>ADIN</Text>
      <TextInput style={st.girdi} value={profil.ad || ''} onChangeText={(t) => setProfil(p => ({ ...p, ad: t }))}
        placeholder="Örn. Ahmet" placeholderTextColor={P.inkFaint} autoCapitalize="words" />

      <Text style={st.etiket}>HEDEF OKUL</Text>
      <TextInput style={st.girdi} value={profil.hedefOkul || ''} onChangeText={(t) => setProfil(p => ({ ...p, hedefOkul: t }))} placeholder="Örn. Fen Lisesi" placeholderTextColor={P.inkFaint} />

      <Text style={st.etiket}>NET HEDEFİ</Text>
      <TextInput style={st.girdi} value={profil.hedefNet || ''} onChangeText={(t) => setProfil(p => ({ ...p, hedefNet: t }))} keyboardType="number-pad" placeholder="Örn. 400" placeholderTextColor={P.inkFaint} />

      <Text style={st.etiket}>GÜNLÜK HEDEF</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
        {[15, 30, 50, 75].map(n => (
          <TouchableOpacity key={n} onPress={() => { titre.hafif(); setHedefKart(n); }}
            style={[st.hap, hedefKart === n && st.hapAktif, { marginRight: 8, marginBottom: 8 }]}>
            <Text style={[st.hapYazi, hedefKart === n && { color: P.neon, fontFamily: FONT.monoBold }]}>
              {n === 15 ? 'Hafif' : n === 30 ? 'Normal' : n === 50 ? 'Yoğun' : 'Maraton'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={st.etiket}>ZAYIF DERSLER · ÖNCELİKLENDİRME</Text>
      <View style={{ marginBottom: 16 }}>
        {DERSLER.map(d => {
          const secili = (profil.zayifDersler || []).includes(d.id);
          return (
            <TouchableOpacity key={d.id} onPress={() => toggleZayif(d.id)}
              style={[st.secenek, secili && { borderColor: d.renk, backgroundColor: d.acik }]}>
              {secili
                ? <SquareCheck size={20} color={d.renk} strokeWidth={2} style={{ marginRight: 9 }} />
                : <Square size={20} color={P.inkFaint} strokeWidth={2} style={{ marginRight: 9 }} />}
              <Text style={[st.secenekYazi, secili && { color: d.renk, fontFamily: FONT.monoBold }]}>{d.ad}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={st.etiket}>GÜNLÜK HATIRLATMA BİLDİRİMİ</Text>
      <TouchableOpacity onPress={() => { titre.hafif(); setBildirimAcik(a => !a); }}
        style={[st.hap, bildirimAcik && st.hapAktif, { marginBottom: 10, alignSelf: 'flex-start' }]}>
        <Text style={[st.hapYazi, bildirimAcik && { color: P.red, fontFamily: FONT.monoBold }]}>{bildirimAcik ? '☑ AÇIK' : '☐ KAPALI'}</Text>
      </TouchableOpacity>
      {bildirimAcik && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
          {[18, 19, 20, 21, 22].map(sa => (
            <TouchableOpacity key={sa} onPress={() => { titre.hafif(); setBildirimSaat(sa); }}
              style={[st.hap, bildirimSaat === sa && st.hapAktif, { marginRight: 8, marginBottom: 8 }]}>
              <Text style={[st.hapYazi, bildirimSaat === sa && { color: P.red, fontFamily: FONT.monoBold }]}>{sa}:00</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ marginTop: 10 }}>
        <Dugme etiket="TÜM VERİLERİ SIFIRLA" renk={P.kirmizi} renkKoyu={P.kirmiziKoyu} tam
          onPress={() => Alert.alert('Emin misin?', 'Tüm ilerleme silinecek.', [
            { text: 'İptal' },
            { text: 'Sıfırla', style: 'destructive', onPress: async () => { await AsyncStorage.clear(); } },
          ])} />
      </View>
    </ScrollView>
  );
}

// ============ ANA UYGULAMA (tema içinde) ============
function Icerik() {
  const { P, koyu } = useTema();
  const kenar = useSafeAreaInsets();
  const [tab, setTab] = useState('home');
  const [srs, setSrs] = useState({});
  const [xp, setXp] = useState(0);
  const [seri, setSeri] = useState(0);
  const [bugun, setBugun] = useState(0);
  const [sonAktifGun, setSonAktifGun] = useState(null);
  const [gunluk, setGunluk] = useState({});        // { 'YYYY-MM-DD': kartSayisi }
  const [gunlukDers, setGunlukDers] = useState({}); // { 'YYYY-MM-DD': { dersId: sayi } }
  const [kutlama, setKutlama] = useState(null);     // { tur, veri } — tam ekran kutlama
  const [hedefKart, setHedefKart] = useState(30);
  const [sinavTarihi, setSinavTarihi] = useState('2027-06-14');
  const [sinavSayisi, setSinavSayisi] = useState(0);
  const [enIyiSinavPct, setEnIyiSinavPct] = useState(0);
  const [denemeGecmisi, setDenemeGecmisi] = useState([]); // [{tarih, dogru, toplam, pct, net}]
  const [bildirimAcik, setBildirimAcik] = useState(false);
  const [bildirimSaat, setBildirimSaat] = useState(19);
  const [aktifDers, setAktifDers] = useState(null);
  const [mod, setMod] = useState(null);
  const [aktifUnite, setAktifUnite] = useState(null);
  const [aktifGrup, setAktifGrup] = useState(null); // Yol haritasından seçilen mini-grup kart id'leri
  const [sinavMod, setSinavMod] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [profil, setProfil] = useState({});
  const [yukluyor, setYukluyor] = useState(true);
  const [oturum, setOturum] = useState(null);
  const [oturumOkundu, setOturumOkundu] = useState(false);
  const [misafir, setMisafir] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const keys = ['lgs_srs', 'lgs_xp', 'lgs_seri', 'lgs_bugun', 'lgs_hedef', 'lgs_onboarded', 'lgs_setup', 'lgs_profil',
          'lgs_son_aktif', 'lgs_sinav_tarihi', 'lgs_sinav_sayisi', 'lgs_en_iyi_sinav', 'lgs_bildirim_acik', 'lgs_bildirim_saat', 'lgs_gunluk', 'lgs_misafir', 'lgs_deneme_gecmisi', 'lgs_gunluk_ders'];
        const pairs = await AsyncStorage.multiGet(keys);
        const d = {};
        pairs.forEach(([k, v]) => { if (v) d[k] = v; });

        if (d.lgs_srs) { try { setSrs(JSON.parse(d.lgs_srs)); } catch (e) { setSrs({}); } }
        if (d.lgs_xp) setXp(Number(d.lgs_xp) || 0);
        if (d.lgs_hedef) setHedefKart(Number(d.lgs_hedef) || 30);
        if (d.lgs_onboarded) setOnboarded(true);
        if (d.lgs_setup) setSetupDone(true);
        if (d.lgs_profil) { try { setProfil(JSON.parse(d.lgs_profil)); } catch (e) { setProfil({}); } }
        if (d.lgs_sinav_tarihi) setSinavTarihi(d.lgs_sinav_tarihi);
        if (d.lgs_sinav_sayisi) setSinavSayisi(Number(d.lgs_sinav_sayisi) || 0);
        if (d.lgs_en_iyi_sinav) setEnIyiSinavPct(Number(d.lgs_en_iyi_sinav) || 0);
        if (d.lgs_bildirim_acik) setBildirimAcik(d.lgs_bildirim_acik === '1');
        if (d.lgs_bildirim_saat) setBildirimSaat(Number(d.lgs_bildirim_saat) || 19);
        if (d.lgs_gunluk) { try { setGunluk(JSON.parse(d.lgs_gunluk)); } catch (e) { setGunluk({}); } }
        if (d.lgs_deneme_gecmisi) { try { setDenemeGecmisi(JSON.parse(d.lgs_deneme_gecmisi)); } catch (e) { setDenemeGecmisi([]); } }
        if (d.lgs_gunluk_ders) { try { setGunlukDers(JSON.parse(d.lgs_gunluk_ders)); } catch (e) { setGunlukDers({}); } }
        if (d.lgs_misafir === '1') setMisafir(true);

        let seriYuklendi = d.lgs_seri ? Number(d.lgs_seri) : 0;
        let bugunYuklendi = d.lgs_bugun ? Number(d.lgs_bugun) : 0;
        const bugunStr = bugunTarihi();
        if (d.lgs_son_aktif) {
          const fark = Math.round((new Date(bugunStr) - new Date(d.lgs_son_aktif)) / GUN);
          if (fark >= 1) bugunYuklendi = 0;
          if (fark > 1) seriYuklendi = 0;
          setSonAktifGun(d.lgs_son_aktif);
        }
        setSeri(seriYuklendi);
        setBugun(bugunYuklendi);
      } catch (e) { console.log('Load error:', e); }

      setYukluyor(false);
    })();
  }, []);

  useEffect(() => {
    if (yukluyor) return;
    (async () => {
      try {
        await AsyncStorage.multiSet([
          ['lgs_srs', JSON.stringify(srs)],
          ['lgs_xp', String(xp)],
          ['lgs_seri', String(seri)],
          ['lgs_bugun', String(bugun)],
          ['lgs_hedef', String(hedefKart)],
          ['lgs_onboarded', onboarded ? '1' : ''],
          ['lgs_setup', setupDone ? '1' : ''],
          ['lgs_profil', JSON.stringify(profil)],
          ['lgs_son_aktif', sonAktifGun || ''],
          ['lgs_sinav_tarihi', sinavTarihi],
          ['lgs_sinav_sayisi', String(sinavSayisi)],
          ['lgs_en_iyi_sinav', String(enIyiSinavPct)],
          ['lgs_bildirim_acik', bildirimAcik ? '1' : ''],
          ['lgs_bildirim_saat', String(bildirimSaat)],
          ['lgs_gunluk', JSON.stringify(gunluk)],
          ['lgs_deneme_gecmisi', JSON.stringify(denemeGecmisi)],
          ['lgs_gunluk_ders', JSON.stringify(gunlukDers)],
        ]);
      } catch (e) { console.log('Save error:', e); }
    })();
  }, [srs, xp, seri, bugun, hedefKart, yukluyor, onboarded, setupDone, profil, sonAktifGun, sinavTarihi, sinavSayisi, enIyiSinavPct, bildirimAcik, bildirimSaat, gunluk, denemeGecmisi, gunlukDers]);

  // Bildirimler duruma göre planlanır: bugün çalışıldı mı, seri
  // risk altında mı, hedefe az mı kaldı. Durum değiştikçe yenilenir.
  useEffect(() => {
    if (yukluyor) return;
    const denemeBugun = (denemeGecmisi || []).some(d => d.tarih === bugunTarihi());
    bildirimleriPlanla({
      acik: bildirimAcik,
      saat: bildirimSaat,
      bugun,
      hedefKart,
      seri,
      denemeBugun,
    });
  }, [bildirimAcik, bildirimSaat, yukluyor, bugun, hedefKart, seri, denemeGecmisi]);

  // Uygulama açıkken gece yarısı geçilirse günlük sayaç tazelensin.
  // (Yükleme anındaki kontrol yalnızca uygulama kapanıp açılırsa çalışıyordu.)
  useEffect(() => {
    const dinleyici = AppState.addEventListener('change', (durum) => {
      if (durum !== 'active' || !sonAktifGun) return;
      const bugunStr = bugunTarihi();
      if (sonAktifGun === bugunStr) return;
      const fark = Math.round((new Date(bugunStr) - new Date(sonAktifGun)) / GUN);
      setBugun(0);
      if (fark > 1) setSeri(0);
    });
    return () => dinleyici.remove();
  }, [sonAktifGun]);

  // Oturum takibi — giriş yapılmadan uygulamaya geçilmez
  useEffect(() => {
    let canli = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (canli) { setOturum(data.session); setOturumOkundu(true); } })
      .catch(() => { if (canli) setOturumOkundu(true); });
    const { data: dinleyici } = supabase.auth.onAuthStateChange((_e, s) => setOturum(s));
    return () => { canli = false; dinleyici.subscription.unsubscribe(); };
  }, []);

  const guncelle = (id, nd, dogruMu) => {
    setSrs(prev => ({ ...prev, [id]: nd }));
    const gun = bugunTarihi();

    // Günlük hedef tamamlanma anını yakala (kutlama için)
    setBugun(b => {
      const yeni = b + 1;
      if (b < hedefKart && yeni >= hedefKart) {
        setTimeout(() => setKutlama({ tur: 'hedef' }), 400);
      }
      return yeni;
    });

    // Çalışma takvimi
    setGunluk(g => ({ ...g, [gun]: (g[gun] || 0) + 1 }));

    // Ders bazında günlük sayaç — merkez halkanın yayları için
    const kart = CARDS.find(c => c.id === id);
    if (kart) {
      setGunlukDers(g => {
        const bugunku = { ...(g[gun] || {}) };
        bugunku[kart.ders] = (bugunku[kart.ders] || 0) + 1;
        return { ...g, [gun]: bugunku };
      });
    }
    // XP yalnızca doğru cevapta verilir; sonuç ekranındaki sayıyla birebir uyumlu
    if (dogruMu) setXp(x => x + 10);
    const bugunStr = bugunTarihi();
    setSonAktifGun(prev => {
      if (prev !== bugunStr) { setSeri(s => s + 1); return bugunStr; }
      return prev;
    });
  };

  const geriAl = (id, oncekiDurum, dogruMuydu) => {
    setSrs(prev => ({ ...prev, [id]: oncekiDurum }));
    setBugun(b => Math.max(0, b - 1));
    const gun = bugunTarihi();
    setGunluk(g => ({ ...g, [gun]: Math.max(0, (g[gun] || 0) - 1) }));
    const kart = CARDS.find(c => c.id === id);
    if (kart) {
      setGunlukDers(g => {
        const bugunku = { ...(g[gun] || {}) };
        bugunku[kart.ders] = Math.max(0, (bugunku[kart.ders] || 0) - 1);
        return { ...g, [gun]: bugunku };
      });
    }
    if (dogruMuydu) setXp(x => Math.max(0, x - 10));
  };

  const yereldenTazele = async () => {
    try {
      const keys = ['lgs_srs', 'lgs_xp', 'lgs_seri', 'lgs_bugun', 'lgs_hedef', 'lgs_profil',
        'lgs_son_aktif', 'lgs_sinav_tarihi', 'lgs_sinav_sayisi', 'lgs_en_iyi_sinav', 'lgs_gunluk', 'lgs_deneme_gecmisi', 'lgs_gunluk_ders'];
      const pairs = await AsyncStorage.multiGet(keys);
      const d = {};
      pairs.forEach(([k, v]) => { if (v) d[k] = v; });
      if (d.lgs_srs) { try { setSrs(JSON.parse(d.lgs_srs)); } catch (e) {} }
      if (d.lgs_profil) { try { setProfil(JSON.parse(d.lgs_profil)); } catch (e) {} }
      setXp(Number(d.lgs_xp) || 0);
      setSeri(Number(d.lgs_seri) || 0);
      setBugun(Number(d.lgs_bugun) || 0);
      setHedefKart(Number(d.lgs_hedef) || 30);
      setSonAktifGun(d.lgs_son_aktif || null);
      setSinavTarihi(d.lgs_sinav_tarihi || '2027-06-14');
      setSinavSayisi(Number(d.lgs_sinav_sayisi) || 0);
      setEnIyiSinavPct(Number(d.lgs_en_iyi_sinav) || 0);
      if (d.lgs_gunluk) { try { setGunluk(JSON.parse(d.lgs_gunluk)); } catch (e) {} }
      if (d.lgs_deneme_gecmisi) { try { setDenemeGecmisi(JSON.parse(d.lgs_deneme_gecmisi)); } catch (e) {} }
      if (d.lgs_gunluk_ders) { try { setGunlukDers(JSON.parse(d.lgs_gunluk_ders)); } catch (e) {} }
    } catch (e) { console.log('Tazeleme hatası:', e); }
  };

  const sinavBaslat = () => { setSinavMod(true); setAktifDers('sinav'); setMod('quiz'); setAktifUnite(null); };
  const cikis = () => { setAktifDers(null); setMod(null); setSinavMod(false); setAktifUnite(null); setAktifGrup(null); };

  if (yukluyor || !oturumOkundu) return (
    <View style={{ flex: 1, backgroundColor: P.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 15, color: P.red, letterSpacing: 2, marginBottom: 10, fontFamily: FONT.mono }}>LİGO</Text>
      <Text style={{ fontSize: 31, color: P.ink, fontFamily: FONT.serif }}>Liseye Doğru</Text>
    </View>
  );

  if (!onboarded) return <Onboarding onDone={() => setOnboarded(true)} />;

  // Giriş kapısı: hesap açılır, giriş yapılır ya da hesapsız devam edilir
  if (!oturum && !misafir) return (
    <HesapEkrani
      kapiModu
      onGec={() => {
        setMisafir(true);
        AsyncStorage.setItem('lgs_misafir', '1').catch(() => {});
      }}
    />
  );

  if (!setupDone) return <PersonalSetup onDone={(data) => { setProfil(data); setHedefKart(data.hedefKart || 30); setSetupDone(true); }} />;

  if (aktifDers && !mod) return (
    <ModSecim ders={aktifDers} srs={srs} onGeri={cikis}
      onBaslat={(m, u, grupIdler) => { setAktifUnite(u); setAktifGrup(grupIdler || null); setMod(m); }} />
  );

  if (aktifDers && mod) {
    const quizMi = mod === 'quiz';
    // Quiz modunda şıkkı olmayan kart tek seçenek gösterir; bu da doğru
    // cevabın kendisidir. Bu yüzden quizde yalnızca şıklı kartlar kullanılır.
    const uygun = (liste) => quizMi ? liste.filter(c => c.secenekler) : liste;

    let kartlar;
    if (sinavMod) kartlar = denemeKur(CARDS, 30);
    else if (aktifDers === 'yanlislar') kartlar = shuffle(uygun(CARDS.filter(c => (srs[c.id] || {}).sonYanlis)));
    else if (aktifGrup) kartlar = uygun(CARDS.filter(c => aktifGrup.includes(c.id)));
    else kartlar = shuffle(uygun(CARDS.filter(c => c.ders === aktifDers && (!aktifUnite || c.unite === aktifUnite))));

    // Quizde hiç şıklı kart yoksa kullanıcıyı boş ekranda bırakma
    if (kartlar.length === 0) {
      Alert.alert('Kart bulunamadı', 'Bu seçimde teste uygun soru yok. Konu çalışmayı deneyebilirsin.');
      cikis();
      return null;
    }
    // Kart modu artık ölçme değil okuma: ayrı bileşen, SRS'e dokunmaz
    if (mod === 'kart') {
      return (
        <React.Fragment>
          <StatusBar barStyle="light-content" backgroundColor={FOCUS.bg} />
          <KonuCalisma kartlar={kartlar} onBitti={cikis} />
        </React.Fragment>
      );
    }

    return (
      <React.Fragment>
        <StatusBar barStyle="light-content" backgroundColor={FOCUS.bg} />
        <KartModu kartlar={kartlar} mod={mod} sinavMod={sinavMod} srs={srs}
          onUpdate={guncelle} onGeriAl={geriAl}
          onBitti={(dogru, toplam) => {
            if (sinavMod && toplam > 0) {
              const pct = Math.round((dogru / toplam) * 100);
              const net = +(dogru - (toplam - dogru) / 3).toFixed(2);
              setSinavSayisi(s => s + 1);
              setEnIyiSinavPct(p => Math.max(p, pct));
              // Son 20 denemeyi sakla; grafik ve gelişim için yeterli
              setDenemeGecmisi(g => [...g, {
                tarih: bugunTarihi(), dogru, toplam, pct, net,
              }].slice(-20));
            }
            cikis();
          }} />
      </React.Fragment>
    );
  }

  return (
    <Sayfa>
      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen srs={srs} xp={xp} seri={seri} bugun={bugun} hedefKart={hedefKart} onDersBaslat={setAktifDers} sinavTarihi={sinavTarihi} profil={profil} onSinavBaslat={sinavBaslat} onProfil={() => setTab('profil')} denemeGecmisi={denemeGecmisi} gunluk={gunluk} gunlukDers={gunlukDers} />}
        {tab === 'dersler' && <DerslerScreen srs={srs} onDersBaslat={setAktifDers} />}
        {tab === 'profil' && (
          <ProfilScreen
            srs={srs} xp={xp} seri={seri} profil={profil} setProfil={setProfil}
            sinavSayisi={sinavSayisi} enIyiSinavPct={enIyiSinavPct}
            hedefKart={hedefKart} setHedefKart={setHedefKart}
            sinavTarihi={sinavTarihi} setSinavTarihi={setSinavTarihi}
            bildirimAcik={bildirimAcik} setBildirimAcik={setBildirimAcik}
            bildirimSaat={bildirimSaat} setBildirimSaat={setBildirimSaat}
            gunluk={gunluk} denemeGecmisi={denemeGecmisi}
            onVeriDegisti={yereldenTazele}
          />
        )}
      </View>


      {/* Hedef tamamlandığında tam ekran kutlama */}
      {kutlama && (
        <Kutlama
          tur={kutlama.tur}
          seri={seri}
          xp={xp}
          hedefKart={hedefKart}
          onKapat={() => setKutlama(null)}
        />
      )}

      <StatusBar barStyle={koyu ? 'light-content' : 'dark-content'} backgroundColor={P.bg} />
      <TabBar tab={tab} setTab={setTab} />
    </Sayfa>
  );
}

// ============ KÖK ============
function Kok() {
  const [fontsLoaded] = useFonts({
    Baloo2_500Medium, Baloo2_600SemiBold, Baloo2_700Bold, Baloo2_800ExtraBold,
  });
  // Gece Panosu varsayılan: karanlık tema
  const [koyu, setKoyuState] = useState(true);
  const [temaOkundu, setTemaOkundu] = useState(false);
  const kenar = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('lgs_tema');
        if (v === 'acik') setKoyuState(false);
      } catch (e) {}
      setTemaOkundu(true);
    })();
  }, []);

  const setKoyu = (v) => {
    setKoyuState(v);
    AsyncStorage.setItem('lgs_tema', v ? 'koyu' : 'acik').catch(() => {});
  };

  if (!fontsLoaded || !temaOkundu) {
    return <View style={{ flex: 1, backgroundColor: KAGIT.bg }} />;
  }

  // Android'de gezinme çubuğu için en az 12px, jest çubuğu varsa gerçek değeri kullan
  const altBosluk = Math.max(kenar.bottom, 12);

  return (
    <TemaSaglayici koyu={koyu} setKoyu={setKoyu} altBosluk={altBosluk}>
      <Icerik />
    </TemaSaglayici>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <HataYakalayici>
        <Kok />
      </HataYakalayici>
    </SafeAreaProvider>
  );
}