import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Animated, PanResponder,
  StyleSheet, StatusBar, Alert, Dimensions, Easing, AppState, Image, Modal
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline, Line as SvgLine, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

// Genel amaçlı küçük yükleniyor göstergesi.
function YukleniyorGostergesi({ boyut = 70, metin }) {
  const { P } = useTema();
  return <Text style={{ textAlign: 'center', color: P.inkFaint, fontFamily: FONT.govde }}>{metin || 'Yükleniyor...'}</Text>;
}

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
  Sparkles, Rocket, BrainCircuit, Timer, ChartColumn, Zap, Target, BookOpenCheck, NotebookPen, Plus, Lock, Crown,
} from 'lucide-react-native';
import { TemaSaglayici, useTema, FOCUS, FONT, KAGIT } from './lib/tema';
import HesapEkrani from './ekranlar/HesapEkrani';
import { supabase } from './lib/supabase';
import { dersGorseli } from './lib/gorseller';
import { ligoMesaji, bildirimleriPlanla } from './lib/ligo';
import { ligoGorsel, ligoIfadesi } from './lib/ligoGorsel';
import { disSoruEkle, odakOturumuKaydet, rumuzAyarla, liderlikSoru } from './lib/bulut';
import { abonelikBaslat, premiumMi, paketleriGetir, satinAl, satinAlmalariGeriYukle, abonelikKullanilabilir } from './lib/abonelik';
import { sesCal, sesAyarla } from './lib/sesler';
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
// Seri (streak) uzadıkça alevin görseli büyüyüp güçlenir — küçük bir
// "seviye atladın" hissi, üç kademe: normal, sıcak, altın.
function seriKademesi(seri) {
  if (seri >= 100) return { boyut: 22, renk: '#FFD966', dolgu: '#FFB020', parlamaZemin: 'rgba(255,217,102,0.28)', parlamaKenar: 'rgba(255,217,102,0.7)', metin: '#FFEFC2' };
  if (seri >= 30) return { boyut: 19, renk: '#FF7A45', dolgu: '#FF4D1C', parlamaZemin: 'rgba(255,107,53,0.28)', parlamaKenar: 'rgba(255,140,90,0.65)', metin: '#FFD9C4' };
  if (seri >= 7) return { boyut: 17, renk: '#FF9A5A', dolgu: '#FF6B35', parlamaZemin: 'rgba(255,107,53,0.24)', parlamaKenar: 'rgba(255,140,90,0.6)', metin: '#FFD9C4' };
  return { boyut: 16, renk: '#FF9A5A', dolgu: '#FF6B35', parlamaZemin: 'rgba(255,107,53,0.22)', parlamaKenar: 'rgba(255,140,90,0.55)', metin: '#FFD9C4' };
}

// Seri uzadıkça alevin görseli kademeli olarak büyüyüp güçlenir.
function SeriAlevi({ seri }) {
  const k = seriKademesi(seri);
  return <Flame size={k.boyut} color={k.renk} fill={k.dolgu} strokeWidth={2.4} />;
}

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
// Bu haftanın (Pazartesi'den bugüne) kaç deneme sınavı çözüldüğünü sayar.
// Ücretsiz kullanıcı için haftada 1 hak var, birikmez — her Pazartesi
// otomatik sıfırlanır çünkü hesap yeni haftanın başından itibaren yapılır.
function buHaftaDenemeSayisi(denemeGecmisi) {
  if (!denemeGecmisi || !denemeGecmisi.length) return 0;
  const simdi = new Date();
  const gun = (simdi.getDay() + 6) % 7; // Pazartesi = 0
  const pazartesi = new Date(simdi);
  pazartesi.setDate(simdi.getDate() - gun);
  pazartesi.setHours(0, 0, 0, 0);
  return denemeGecmisi.filter(d => new Date(d.tarih || 0) >= pazartesi).length;
}

function denemeKur(havuz, toplamSoru) {
  // denemeDahil: false ile işaretli kartlar (geri getirilen 6-7. sınıf
  // konuları) normal çalışma havuzunda kalsın diye lgsKapsam:true oldu,
  // ama deneme sınavının gerçek LGS ağırlığını bozmasınlar diye ayrı
  // bir bayrakla burada hâlâ hariç tutuluyorlar.
  const uygun = havuz.filter(c => c.secenekler && c.lgsKapsam && c.denemeDahil !== false);
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

/**
 * Tek bir ders için deneme kurar — genel denemenin ağırlıklı ünite
 * mantığını aynen kullanır, ama yalnızca seçilen dersin havuzundan.
 */
function denemeKurTekDers(havuz, dersId, toplamSoru) {
  const uygun = havuz.filter(c => c.ders === dersId && c.secenekler && c.lgsKapsam && c.denemeDahil !== false);
  const dagilim = LGS_DAGILIM[dersId];
  if (!dagilim || !uygun.length) return shuffle(uygun).slice(0, toplamSoru);

  const olcek = toplamSoru / dagilim.soru;
  const secilen = [];
  const kullanilan = new Set();

  Object.entries(dagilim.uniteler).forEach(([unite, adet]) => {
    const kota = Math.round(adet * olcek);
    if (kota <= 0) return;
    const uniteHavuz = shuffle(uygun.filter(c => c.unite === unite && !kullanilan.has(c.id)));
    uniteHavuz.slice(0, kota).forEach(c => { secilen.push(c); kullanilan.add(c.id); });
  });

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
// Ligo aksesuarları — Usta/Efsane rütbesine ulaşınca kazanılan görsel
// ödüller. Dosyalar henüz yoksa (Flow'da üretilmeden önce) sessizce
// hiçbir şey göstermez, çökme olmaz.
const LIGO_AKSESUAR = {
  Usta: (() => { try { return require('./assets/ligo/aksesuar-pelerin.png'); } catch (e) { return null; } })(),
  Efsane: (() => { try { return require('./assets/ligo/aksesuar-mezuniyet.png'); } catch (e) { return null; } })(),
};
function ligoAksesuarGetir(seviyeAdi) {
  return LIGO_AKSESUAR[seviyeAdi] || null;
}

function GunlukHalka({ dersDagilim, hedef, toplam, boyut = 200, kalinlik = 18, premium, seviyeAdi }) {
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
          <View>
            {ligoAksesuarGetir(seviyeAdi) && (
              <Image
                source={ligoAksesuarGetir(seviyeAdi)}
                style={{
                  position: 'absolute', width: boyut * 0.52, height: boyut * 0.52,
                  top: -(boyut * 0.06), left: -(boyut * 0.06),
                  resizeMode: 'contain', zIndex: -1,
                }}
              />
            )}
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
            {premium && (
              <View style={{
                position: 'absolute', top: -4, right: -2,
                width: 26, height: 26, borderRadius: 13,
                backgroundColor: '#B8860B', alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: P.bg,
              }}>
                <Crown size={13} color="#FFD966" strokeWidth={2.4} />
              </View>
            )}
          </View>
        )}
        {tamam ? (
          <Text style={{ fontFamily: FONT.monoBold, fontSize: 15, color: P.yesil, marginTop: 4 }}>TAMAMLANDI</Text>
        ) : (
          <View style={{ alignItems: 'center', marginTop: 2 }}>
            <SayacMetin deger={pct} onEk="%" style={{ fontFamily: FONT.baslik, fontSize: 34, color: P.ink, lineHeight: 38 }} />
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
// ============================================================
// ROZET BİLDİRİMİ — üstten kayan, kendiliğinden kapanan bildirim
//
// Tam ekran kutlama yerine bunu seçtim çünkü rozet ne zaman
// açılacağı belli değil — quiz ortasında, deneme sırasında,
// herhangi bir anda olabilir. Tam ekran bir engelleme rahatsız
// edici olurdu, bu yüzden dikkat çekici ama akışı bölmeyen bir
// üst bildirim tercih ettim.
// ============================================================
function RozetBildirimi({ rozet, onKapat }) {
  const { P } = useTema();
  const kenar = useSafeAreaInsets();
  const kayma = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    Animated.spring(kayma, { toValue: 0, useNativeDriver: true, friction: 7, tension: 60 }).start();
  }, []);

  if (!rozet) return null;
  const RozetIkon = rozet.ikon;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute', top: kenar.top + 8, left: 16, right: 16, zIndex: 9998,
        transform: [{ translateY: kayma }],
      }}>
      <TouchableOpacity onPress={onKapat} activeOpacity={0.9} style={[st_golge, {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1D2E',
        borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: '#FFD96655',
      }]}>
        <View style={{
          width: 48, height: 48, borderRadius: 15, backgroundColor: '#FFD96626',
          alignItems: 'center', justifyContent: 'center', marginRight: 13,
          borderWidth: 1.5, borderColor: '#FFD966',
        }}>
          <RozetIkon size={24} color="#FFD966" strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONT.monoBold, fontSize: 11, color: '#FFD966', letterSpacing: 1 }}>YENİ ROZET</Text>
          <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 16, color: '#FFFFFF', marginTop: 1 }}>{rozet.ad}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================
// HOLOGRAFİK PARILTI — köşeden köşeye kayan ışık şeridi
//
// Premium'da ve mükemmel sonuçlarda kullanılan, sürekli tekrarlayan
// bir "hologram sticker" parıltısı. Ebeveyn View'ın overflow:hidden
// olması ve position:relative taşıması gerekir.
// ============================================================
// ============================================================
// KONFETİ — %100 (kusursuz) sonuçta bir kez patlayıp düşen
// renkli kağıt parçacıkları. Dışarıdan görsel/dosya gerektirmez,
// tamamen kod ile üretilir.
// ============================================================
function Konfeti({ adet = 34 }) {
  // Tek bir useRef içinde tüm parçacıkların sabit (render'lar arası
  // değişmeyen) verisi üretiliyor — her parçacığın kendi Animated.Value'su
  // ayrı bir useRef değil, bu tek dizinin içindeki düz bir alan.
  const parcaciklar = useRef(
    Array.from({ length: adet }).map(() => ({
      x: Math.random() * SW,
      renk: ['#FF6B35', '#FFD966', '#5EE6A0', '#7FD8FF', '#D04ED6'][Math.floor(Math.random() * 5)],
      gecikme: Math.random() * 350,
      sure: 1700 + Math.random() * 900,
      yatayKayma: (Math.random() - 0.5) * 140,
      donus: 180 + Math.random() * 360,
      genislik: 6 + Math.random() * 5,
      dusme: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Animated.parallel(
      parcaciklar.map(p => Animated.timing(p.dusme, {
        toValue: 1, duration: p.sure, delay: p.gecikme,
        easing: Easing.in(Easing.quad), useNativeDriver: true,
      }))
    ).start();
  }, []);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420, overflow: 'hidden', zIndex: 30 }}>
      {parcaciklar.map((p, i) => {
        const translateY = p.dusme.interpolate({ inputRange: [0, 1], outputRange: [-20, 440] });
        const translateX = p.dusme.interpolate({ inputRange: [0, 1], outputRange: [0, p.yatayKayma] });
        const rotate = p.dusme.interpolate({ inputRange: [0, 1], outputRange: ['0deg', p.donus + 'deg'] });
        const opacity = p.dusme.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View key={i} style={{
            position: 'absolute', left: p.x, top: 0,
            width: p.genislik, height: p.genislik * 1.6, backgroundColor: p.renk, borderRadius: 2,
            opacity,
            transform: [{ translateY }, { translateX }, { rotate }],
          }} />
        );
      })}
    </View>
  );
}

function HolografikParilti({ boyut = 300 }) {
  const kayma = useRef(new Animated.Value(-boyut)).current;

  useEffect(() => {
    const dongu = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(kayma, { toValue: boyut * 1.6, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(kayma, { toValue: -boyut, duration: 0, useNativeDriver: true }),
      ])
    );
    dongu.start();
    return () => dongu.stop();
  }, []);

  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', top: -60, bottom: -60, width: 70,
      transform: [{ translateX: kayma }, { rotate: '18deg' }],
    }}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

function Kutlama({ tur, seri, xp, hedefKart, veri, onKapat }) {
  const { P } = useTema();
  const olcek = useRef(new Animated.Value(0.7)).current;
  const opak = useRef(new Animated.Value(0)).current;
  const seviyeMi = tur === 'seviye';

  useEffect(() => {
    titre.dogru();
    Animated.parallel([
      Animated.spring(olcek, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }),
      Animated.timing(opak, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, []);

  const vurgu = seviyeMi ? '#FFD966' : P.yesil;

  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(8,10,16,0.92)',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 28,
    }}>
      <Animated.View style={{ opacity: opak, transform: [{ scale: olcek }], alignItems: 'center', width: '100%' }}>

        <View style={{
          width: 150, height: 150, borderRadius: 75,
          backgroundColor: vurgu + '1E',
          borderWidth: 3, borderColor: vurgu,
          alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          shadowColor: vurgu, shadowOpacity: 0.6, shadowRadius: 26,
          shadowOffset: { width: 0, height: 0 }, elevation: 12,
        }}>
          {ligoGorsel('kutlama')
            ? <Image source={ligoGorsel('kutlama')} style={{ width: 116, height: 116, resizeMode: 'contain' }} />
            : (seviyeMi ? <Crown size={70} color={vurgu} strokeWidth={2.6} /> : <Check size={70} color={vurgu} strokeWidth={3.4} />)}
        </View>

        {seviyeMi ? (
          <>
            <Text style={{ fontFamily: FONT.monoBold, fontSize: 14, color: vurgu, letterSpacing: 2, marginBottom: 4 }}>
              SEVİYE ATLADIN
            </Text>
            <Text style={{ fontFamily: FONT.baslik, fontSize: 34, color: '#FFFFFF', textAlign: 'center' }}>
              {veri?.yeniSev}
            </Text>
            <Text style={{
              fontFamily: FONT.govde, fontSize: 17, color: 'rgba(255,255,255,0.72)',
              textAlign: 'center', marginTop: 8, lineHeight: 25,
            }}>
              Artık yeni bir rütbedesin, böyle devam!
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: FONT.baslik, fontSize: 32, color: '#FFFFFF', textAlign: 'center' }}>
              Günlük hedef tamam
            </Text>
            <Text style={{
              fontFamily: FONT.govde, fontSize: 17, color: 'rgba(255,255,255,0.72)',
              textAlign: 'center', marginTop: 8, lineHeight: 25,
            }}>
              {hedefKart} kart bitti. Seri {seri} güne çıktı.
            </Text>
          </>
        )}

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
          <Dugme etiket="DEVAM ET" renk={vurgu} renkKoyu={seviyeMi ? '#C98E1A' : P.yesilKoyu} tam onPress={onKapat} />
        </View>
      </Animated.View>
    </View>
  );
}

// ============================================================
// BÖLÜM BAŞLIĞI — profildeki kartları renklendirir
// Gradyan ikon rozeti + renkli başlık, kartın kimliğini verir
// ============================================================
// Hafif bölüm başlığı: renkli ikon + metin, kutu/gölge yok.
// Profilde 9 kez tekrarlandığı için ağır bir kutu göz yorar —
// sade bir çizgi (ikon + metin) aynı renk kimliğini kutu
// olmadan taşır.
function BolumBaslik({ Ikon, baslik, sag, renk }) {
  const { P } = useTema();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
      <Ikon size={17} color={renk} strokeWidth={2.4} style={{ marginRight: 8 }} />
      <Text style={{ flex: 1, fontFamily: FONT.monoBold, fontSize: 13, color: renk, letterSpacing: 1 }}>
        {baslik}
      </Text>
      {sag ? (
        <Text style={{ fontFamily: FONT.monoBold, fontSize: 13, color: P.inkFaint }}>{sag}</Text>
      ) : null}
    </View>
  );
}

// Bölüm başlığı gölgesi — StyleSheet dışında sabit (başka yerlerde de kullanılıyor)
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

// Gerçek LGS soru sayılarına göre ders başına girilebilecek en yüksek
// net. Toplamı 90 (50 sözel + 40 sayısal) — LGS'de bundan fazlası hiç
// mümkün değil, o yüzden hem yazarken hem kaydederken buna göre
// sınırlıyoruz. LGS_DAGILIM zaten bu sayıları tutuyor, tekrar
// yazmak yerine oradan türetiyoruz.
const DERS_MAKS_NET = Object.fromEntries(
  Object.entries(LGS_DAGILIM).map(([id, d]) => [id, d.soru])
);

function SinavNotlariEkrani() {
  const { P, s: st, DERSLER, koyu } = useTema();
  const kenar = useSafeAreaInsets();
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
        const maks = DERS_MAKS_NET[d.id] ?? 20;
        const sayi = Math.max(0, Math.min(maks, Number(v.replace(',', '.')) || 0));
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
    <View style={{ flex: 1 }}>
      {NOTLAR_ARKAPLAN && (
        <>
          <Image source={NOTLAR_ARKAPLAN} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
          <View pointerEvents="none" style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: koyu ? 'rgba(16,18,26,0.72)' : 'rgba(255,255,255,0.55)' }} />
        </>
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: kenar.top + 12, paddingBottom: 28 }}>

      <Text style={st.sayfaBaslik}>Sınav Notlarım</Text>
      <Text style={{ fontFamily: FONT.govde, fontSize: 14, color: P.inkSoft, marginBottom: 18 }}>
        Okulda veya dershanede yazdığın sınavların netleri
      </Text>

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
              <Text style={{ flex: 1, fontFamily: FONT.govdeOrta, fontSize: 15, color: P.ink }}>
                {d.ad}
                <Text style={{ fontSize: 11, color: P.inkFaint, fontFamily: FONT.mono }}>  ·  maks {DERS_MAKS_NET[d.id] ?? 20}</Text>
              </Text>
              <TextInput
                style={{
                  width: 64, backgroundColor: P.bgAlt, borderWidth: 2, borderColor: P.line,
                  borderRadius: 12, paddingVertical: 8, textAlign: 'center',
                  fontFamily: FONT.monoBold, fontSize: 15, color: P.ink,
                }}
                value={netler[d.id] || ''}
                onChangeText={(v) => {
                  // Ders başına gerçek LGS soru sayısını aşan bir değer
                  // hiç yazılamasın — sonradan kaydederken uyarmak yerine
                  // en baştan kabul etmiyoruz.
                  const maks = DERS_MAKS_NET[d.id] ?? 20;
                  const temiz = v.replace(',', '.');
                  if (temiz !== '' && (Number(temiz) > maks || Number(temiz) < 0)) {
                    titre.yanlis();
                    return;
                  }
                  setNetler(n => ({ ...n, [d.id]: v }));
                }}
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
    </View>
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
// ODAK MODU — kronometre + kaçma tespiti
//
// Uygulama gerçekten başka uygulamaları engelleyemez (iOS/Android
// izin vermez). Bunun yerine dürüst bir alternatif sunar: süreyi
// tutar, ana ekrana çıkıp çıkmadığını sayar, oturum sonunda ikisini
// de kaydeder. Zorlama değil, farkındalık.
// ============================================================
// ============================================================
// ODAK MODU — Bedtime tarzı dairesel kadran + tam ekran sayaç
//
// Üç ekran: 'ayar' (süreyi kadrandan sürükleyerek seç) ->
// 'aktif' (tam ekran, yalnızca sayaç ve küçük bir çıkış düğmesi) ->
// 'ozet' (bitiş kartı).
//
// Uygulama gerçekten başka uygulamaları engelleyemez (iOS/Android
// izin vermez). Bunun yerine dürüst bir alternatif sunar: süreyi
// tutar, ana ekrana çıkıp çıkmadığını sayar, oturum sonunda kaydeder.
// ============================================================
const ODAK_MIN_DK = 5;
const ODAK_MAX_DK = 120;
const ODAK_VARSAYILAN_DK = 25;
const KADRAN_BOYUT = 260;

function dakikadanAci(dk) {
  const oran = (dk - ODAK_MIN_DK) / (ODAK_MAX_DK - ODAK_MIN_DK);
  return Math.max(0, Math.min(1, oran)) * 360;
}
function aciDanDakika(aciDeg) {
  const oran = aciDeg / 360;
  const ham = ODAK_MIN_DK + oran * (ODAK_MAX_DK - ODAK_MIN_DK);
  return Math.round(ham / 5) * 5; // 5 dakikaya yuvarla — kadran "snap" hissi versin
}

// Dairesel süre kadranı: Bedtime saatindeki gibi sürükleyerek ayarlanır
function OdakKadrani({ dakika, onDegis, renk, renkKoyu }) {
  const { P } = useTema();
  const boyut = KADRAN_BOYUT;
  const r = boyut / 2 - 22;
  const merkez = boyut / 2;
  const cevre = 2 * Math.PI * r;
  const aciDeg = dakikadanAci(dakika);
  const dolu = cevre * (aciDeg / 360);

  const konumRef = useRef(null);

  const dokunuslaGuncelle = (px, py) => {
    const dx = px - merkez, dy = py - merkez;
    let aci = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (aci < 0) aci += 360;
    onDegis(aciDanDakika(aci));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => dokunuslaGuncelle(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e) => dokunuslaGuncelle(e.nativeEvent.locationX, e.nativeEvent.locationY),
    })
  ).current;

  // Sürükleme tutamacının konumu (açının ucunda)
  const aciRad = ((aciDeg - 90) * Math.PI) / 180;
  const tutX = merkez + r * Math.cos(aciRad);
  const tutY = merkez + r * Math.sin(aciRad);

  return (
    <View
      ref={konumRef}
      {...pan.panHandlers}
      style={{ width: boyut, height: boyut, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={boyut} height={boyut} style={{ position: 'absolute' }}>
        <Circle cx={merkez} cy={merkez} r={r} stroke={P.koyu ? 'rgba(255,255,255,0.09)' : 'rgba(16,18,26,0.08)'} strokeWidth={16} fill="none" />
        <Circle
          cx={merkez} cy={merkez} r={r}
          stroke={renk} strokeWidth={16} fill="none"
          strokeDasharray={dolu + ' ' + (cevre - dolu)}
          strokeLinecap="round"
          transform={'rotate(-90 ' + merkez + ' ' + merkez + ')'}
        />
      </Svg>

      {/* Sürükleme tutamacı */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute', left: tutX - 14, top: tutY - 14,
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: renk, borderWidth: 3, borderColor: '#FFFFFF',
          shadowColor: renk, shadowOpacity: 0.7, shadowRadius: 8, elevation: 6,
        }}
      />

      <View style={{ alignItems: 'center' }} pointerEvents="none">
        <Text style={{ fontFamily: FONT.baslik, fontSize: 52, color: P.ink, lineHeight: 58 }}>{dakika}</Text>
        <Text style={{ fontFamily: FONT.monoBold, fontSize: 13, color: P.inkSoft, letterSpacing: 1.5, marginTop: -4 }}>DAKİKA</Text>
      </View>
    </View>
  );
}

// ============================================================
// PREMIUM EKRANI (Paywall)
//
// RevenueCat henüz native build'e bağlanmadıysa (Expo Go, ya da
// API anahtarı boş) "abonelikKullanilabilir" false döner — bu
// durumda ekran kendini dürüstçe açıklar, sahte bir satın alma
// akışı göstermez.
// ============================================================
function PremiumEkrani({ onKapat, onSatinAlindi }) {
  const { P } = useTema();
  const kenar = useSafeAreaInsets();
  const [paketler, setPaketler] = useState([]);
  const [secili, setSecili] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [islemde, setIslemde] = useState(false);
  const [mesaj, setMesaj] = useState('');

  useEffect(() => {
    paketleriGetir().then(p => {
      setPaketler(p);
      setSecili(p[0]?.identifier || null);
      setYukleniyor(false);
    });
  }, []);

  const OZELLIKLER = [
    'Günlük kart sınırı kalksın',
    'Haftalık deneme sınırı kalksın',
    'Sınırsız Quiz ve deneme sınavı',
  ];

  const satinAlBaslat = async () => {
    const paket = paketler.find(p => p.identifier === secili);
    if (!paket) return;
    setIslemde(true);
    setMesaj('');
    const sonuc = await satinAl(paket);
    setIslemde(false);
    if (sonuc.basarili) {
      titre.dogru();
      onSatinAlindi();
    } else if (sonuc.mesaj) {
      setMesaj(sonuc.mesaj);
    }
  };

  const geriYukle = async () => {
    setIslemde(true);
    const sonuc = await satinAlmalariGeriYukle();
    setIslemde(false);
    if (sonuc.basarili) { titre.dogru(); onSatinAlindi(); }
    else setMesaj(sonuc.mesaj || 'Aktif bir abonelik bulunamadı.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: FOCUS.bg, paddingTop: kenar.top, paddingBottom: kenar.bottom }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingVertical: 12 }}>
        <IkonDugme Ikon={XIkon} dolu renk={FOCUS.panel2} renkKoyu={FOCUS.line}
          ikonRenk={FOCUS.textSoft} onPress={onKapat} boyut={44} ikonBoyut={20} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
        <View style={{
          width: 84, height: 84, borderRadius: 26, backgroundColor: '#FFB02026',
          alignItems: 'center', justifyContent: 'center', marginBottom: 18,
        }}>
          <Sparkles size={40} color="#FFB020" strokeWidth={2} />
        </View>

        <Text style={{ fontFamily: FONT.baslik, fontSize: 26, color: FOCUS.text, textAlign: 'center' }}>
          Ligo Premium
        </Text>
        <Text style={{ fontFamily: FONT.govde, fontSize: 15, color: FOCUS.textSoft, textAlign: 'center', marginTop: 8, marginBottom: 26, lineHeight: 21 }}>
          Sınırsız çalışıp LGS'ye tam gaz hazırlan
        </Text>

        <View style={{ width: '100%', marginBottom: 22 }}>
          {OZELLIKLER.map(o => (
            <View key={o} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{
                width: 22, height: 22, borderRadius: 11, backgroundColor: '#5EE6A026',
                alignItems: 'center', justifyContent: 'center', marginRight: 10,
              }}>
                <Check size={13} color="#5EE6A0" strokeWidth={3} />
              </View>
              <Text style={{ fontFamily: FONT.govde, fontSize: 15, color: FOCUS.text, flex: 1 }}>{o}</Text>
            </View>
          ))}
        </View>

        {!abonelikKullanilabilir ? (
          <View style={{
            width: '100%', backgroundColor: FOCUS.panel, borderRadius: 16,
            padding: 18, borderWidth: 1, borderColor: FOCUS.line,
          }}>
            <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 14, color: FOCUS.text, marginBottom: 6 }}>
              Bu özellik yakında aktif olacak
            </Text>
            <Text style={{ fontFamily: FONT.govde, fontSize: 13, color: FOCUS.textSoft, lineHeight: 19 }}>
              Abonelik sistemi şu an test aşamasında. Bu sürümde satın alma
              yapılamıyor — sen bunu görüyorsan geliştirici olarak
              erişimin zaten sınırsız demektir.
            </Text>
          </View>
        ) : yukleniyor ? (
          <YukleniyorGostergesi boyut={64} metin="Paketler yükleniyor..." />
        ) : (
          <>
            {paketler.map(p => (
              <TouchableOpacity key={p.identifier} onPress={() => { titre.hafif(); setSecili(p.identifier); }}
                style={{
                  width: '100%', flexDirection: 'row', alignItems: 'center',
                  backgroundColor: secili === p.identifier ? '#FFB02018' : FOCUS.panel,
                  borderWidth: 1.5, borderColor: secili === p.identifier ? '#FFB020' : FOCUS.line,
                  borderRadius: 14, padding: 16, marginBottom: 10,
                }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 15, color: FOCUS.text }}>
                    {p.product?.title || p.identifier}
                  </Text>
                </View>
                <Text style={{ fontFamily: FONT.baslik, fontSize: 17, color: FOCUS.text }}>
                  {p.product?.priceString || ''}
                </Text>
              </TouchableOpacity>
            ))}

            {mesaj ? (
              <Text style={{ color: FOCUS.red, fontFamily: FONT.govde, fontSize: 13, marginTop: 6, marginBottom: 6, textAlign: 'center' }}>{mesaj}</Text>
            ) : null}

            <View style={{ width: '100%', marginTop: 12 }}>
              <Dugme etiket={islemde ? 'İŞLENİYOR...' : '3 GÜN ÜCRETSİZ DENE'}
                renk="#FFB020" renkKoyu="#C98E1A" tam
                onPress={islemde || !secili ? undefined : satinAlBaslat} />
            </View>

            <TouchableOpacity onPress={geriYukle} disabled={islemde} style={{ marginTop: 16, paddingVertical: 8 }}>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 14, color: FOCUS.textSoft }}>
                Satın almalarımı geri yükle
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function OdakModu({ onKapat }) {
  const { P, s: st } = useTema();
  const kenar = useSafeAreaInsets();

  const [ekran, setEkran] = useState('ayar'); // 'ayar' | 'aktif' | 'ozet'
  const [dakika, setDakika] = useState(ODAK_VARSAYILAN_DK);
  const [kalanSaniye, setKalanSaniye] = useState(0);
  const [gecenSaniye, setGecenSaniye] = useState(0);
  const [kacma, setKacma] = useState(0);
  const [izinliListe, setIzinliListe] = useState([]);
  const [izinliGirdi, setIzinliGirdi] = useState('');
  const [tamamlandi, setTamamlandi] = useState(false);

  const zamanRef = useRef(null);
  const arkaPlandaMi = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem('lgs_izinli_uygulamalar').then(v => {
      if (v) { try { setIzinliListe(JSON.parse(v)); } catch (e) {} }
    });
  }, []);

  // Aktif ekranda geri sayım
  useEffect(() => {
    if (ekran !== 'aktif') return;
    zamanRef.current = setInterval(() => {
      setKalanSaniye(s => {
        if (s <= 1) {
          clearInterval(zamanRef.current);
          setTamamlandi(true);
          setEkran('ozet');
          titre.dogru();
          return 0;
        }
        return s - 1;
      });
      setGecenSaniye(s => s + 1);
    }, 1000);
    return () => clearInterval(zamanRef.current);
  }, [ekran]);

  // Uygulamadan ayrılma tespiti — sayaç durmaz, sadece kaçma sayılır
  // ve geri dönünce otomatik devam eder (akışı bozmasın diye).
  useEffect(() => {
    if (ekran !== 'aktif') return;
    const dinleyici = AppState.addEventListener('change', (durum) => {
      if (durum !== 'active' && !arkaPlandaMi.current) {
        arkaPlandaMi.current = true;
        setKacma(k => k + 1);
      } else if (durum === 'active') {
        arkaPlandaMi.current = false;
      }
    });
    return () => dinleyici.remove();
  }, [ekran]);

  const izinliEkle = () => {
    const t = izinliGirdi.trim();
    if (!t || izinliListe.includes(t)) return;
    const yeni = [...izinliListe, t].slice(0, 6);
    setIzinliListe(yeni);
    setIzinliGirdi('');
    AsyncStorage.setItem('lgs_izinli_uygulamalar', JSON.stringify(yeni)).catch(() => {});
  };
  const izinliSil = (t) => {
    const yeni = izinliListe.filter(x => x !== t);
    setIzinliListe(yeni);
    AsyncStorage.setItem('lgs_izinli_uygulamalar', JSON.stringify(yeni)).catch(() => {});
  };

  const baslat = () => {
    titre.orta();
    setKalanSaniye(dakika * 60);
    setGecenSaniye(0);
    setKacma(0);
    setTamamlandi(false);
    setEkran('aktif');
  };

  const erkenBitir = () => {
    Alert.alert('Odağı bitir', 'Oturumu şimdi sonlandırmak istiyor musun?', [
      { text: 'Devam et' },
      {
        text: 'Bitir', style: 'destructive',
        onPress: () => {
          clearInterval(zamanRef.current);
          setTamamlandi(false);
          setEkran('ozet');
        },
      },
    ]);
  };

  useEffect(() => {
    if (ekran !== 'ozet') return;
    if (gecenSaniye >= 30) {
      odakOturumuKaydet(gecenSaniye, kacma).catch(() => {});
    }
  }, [ekran]);

  // ---------- EKRAN: AKTİF — yalnızca sayaç ve küçük çıkış düğmesi ----------
  if (ekran === 'aktif') {
    const toplamSaniye = dakika * 60;
    const r = 150;
    const cevre = 2 * Math.PI * r;
    const ilerlemeOran = 1 - kalanSaniye / toplamSaniye;
    const dolu = cevre * ilerlemeOran;
    const dk = Math.floor(kalanSaniye / 60);
    const sn = kalanSaniye % 60;

    return (
      <View style={{ flex: 1, backgroundColor: FOCUS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={erkenBitir}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={{
            position: 'absolute', top: kenar.top + 16, right: 22, zIndex: 10,
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.06)',
            alignItems: 'center', justifyContent: 'center',
          }}>
          <XIkon size={18} color={FOCUS.textSoft} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={{ width: r * 2 + 32, height: r * 2 + 32, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={r * 2 + 32} height={r * 2 + 32} style={{ position: 'absolute' }}>
            <Circle cx={r + 16} cy={r + 16} r={r} stroke={FOCUS.line} strokeWidth={10} fill="none" />
            <Circle
              cx={r + 16} cy={r + 16} r={r}
              stroke={FOCUS.blue} strokeWidth={10} fill="none"
              strokeDasharray={dolu + ' ' + (cevre - dolu)}
              strokeLinecap="round"
              transform={'rotate(-90 ' + (r + 16) + ' ' + (r + 16) + ')'}
            />
          </Svg>
          <Text style={{ fontFamily: FONT.baslik, fontSize: 64, color: FOCUS.text, letterSpacing: 1 }}>
            {String(dk).padStart(2, '0')}:{String(sn).padStart(2, '0')}
          </Text>
        </View>
      </View>
    );
  }

  // ---------- EKRAN: ÖZET ----------
  if (ekran === 'ozet') {
    const dk = Math.floor(gecenSaniye / 60);
    return (
      <View style={{ flex: 1, backgroundColor: FOCUS.bg, paddingTop: kenar.top, paddingBottom: kenar.bottom }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          {ligoGorsel(tamamlandi ? 'kutlama' : 'mutlu') && (
            <Image source={ligoGorsel(tamamlandi ? 'kutlama' : 'mutlu')} style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 20 }} />
          )}
          <Text style={{ fontFamily: FONT.baslik, fontSize: 28, color: FOCUS.text, textAlign: 'center' }}>
            {dk} dakika odaklandın
          </Text>
          <Text style={{ fontFamily: FONT.govde, fontSize: 16, color: FOCUS.textSoft, textAlign: 'center', marginTop: 10 }}>
            {kacma === 0 ? 'Hiç dikkatin dağılmadı, çok iyi.' : kacma + ' kere uygulamadan çıktın.'}
          </Text>
          <View style={{ width: '100%', marginTop: 30 }}>
            <Dugme etiket="TEKRAR ODAKLAN" renk={FOCUS.blue} renkKoyu={FOCUS.blueDark} tam
              onPress={() => setEkran('ayar')} />
            <View style={{ height: 12 }} />
            <TouchableOpacity onPress={onKapat} style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 15, color: FOCUS.textSoft }}>Profile dön</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ---------- EKRAN: AYAR — kadran + hazır süreler + izinli liste ----------
  return (
    <View style={{ flex: 1, backgroundColor: FOCUS.bg, paddingTop: kenar.top, paddingBottom: kenar.bottom }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
        <IkonDugme Ikon={XIkon} dolu renk={FOCUS.panel2} renkKoyu={FOCUS.line}
          ikonRenk={FOCUS.textSoft} onPress={onKapat} boyut={44} ikonBoyut={20} />
        <Text style={{ fontFamily: FONT.monoBold, fontSize: 14, color: FOCUS.text, letterSpacing: 1 }}>ODAK MODU</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', flexGrow: 1 }}>

        <Text style={{ fontFamily: FONT.govde, fontSize: 14, color: FOCUS.textSoft, textAlign: 'center', marginBottom: 22, marginTop: 4 }}>
          Kadranı çevirerek süreni ayarla
        </Text>

        <OdakKadrani dakika={dakika} onDegis={setDakika} renk={FOCUS.blue} renkKoyu={FOCUS.blueDark} />

        {/* Hazır süreler — kadranla uğraşmak istemeyenler için */}
        <View style={{ flexDirection: 'row', marginTop: 26, marginBottom: 8 }}>
          {[15, 25, 45, 60].map(n => (
            <TouchableOpacity key={n} onPress={() => { titre.hafif(); setDakika(n); }}
              style={{
                paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, marginRight: 9,
                backgroundColor: dakika === n ? FOCUS.blue : FOCUS.panel2,
                borderWidth: 1, borderColor: dakika === n ? FOCUS.blue : FOCUS.line,
              }}>
              <Text style={{
                fontFamily: FONT.govdeKalin, fontSize: 13,
                color: dakika === n ? '#FFFFFF' : FOCUS.textSoft,
              }}>{n} dk</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ width: '100%', marginTop: 22 }}>
          <Dugme etiket="ODAĞA BAŞLA" renk={FOCUS.blue} renkKoyu={FOCUS.blueDark} tam onPress={baslat} />
        </View>

        {/* İzinli uygulamalar — kendi kendine verdiğin söz, teknik olarak zorlanmaz */}
        <View style={{ width: '100%', backgroundColor: FOCUS.panel, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: FOCUS.line, marginTop: 22 }}>
          <Text style={{ fontFamily: FONT.monoBold, fontSize: 12, color: FOCUS.textSoft, letterSpacing: 1, marginBottom: 4 }}>
            BU OTURUMDA YALNIZCA
          </Text>
          <Text style={{ fontFamily: FONT.govde, fontSize: 13, color: FOCUS.textSoft, marginBottom: 14, lineHeight: 19 }}>
            Bunları uygulama açıp kilitleyemeyiz, sana bir hatırlatma bırakıyoruz.
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: izinliListe.length ? 14 : 0 }}>
            {izinliListe.map(t => (
              <TouchableOpacity key={t} onPress={() => izinliSil(t)}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: FOCUS.emberSoft, borderRadius: 999,
                  paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, marginBottom: 8,
                }}>
                <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 13, color: FOCUS.ember }}>{t}</Text>
                <XIkon size={13} color={FOCUS.ember} strokeWidth={2.6} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ))}
          </View>

          {izinliListe.length < 6 && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                value={izinliGirdi}
                onChangeText={setIzinliGirdi}
                onSubmitEditing={izinliEkle}
                placeholder="Örn. Quizlet"
                placeholderTextColor={FOCUS.textSoft}
                style={{
                  flex: 1, backgroundColor: FOCUS.panel2, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 10, color: FOCUS.text,
                  fontFamily: FONT.govde, fontSize: 14, marginRight: 8,
                }}
              />
              <TouchableOpacity onPress={izinliEkle}
                style={{ backgroundColor: FOCUS.panel2, borderRadius: 12, padding: 10 }}>
                <Plus size={18} color={FOCUS.text} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================
// LİDERLİK TABLOSU — haftalık, yalnızca rumuz görünür
// ============================================================
function LiderlikEkrani({ profil, setProfil, hesapVarMi }) {
  const { P, s: st } = useTema();
  const [soruListe, setSoruListe] = useState(null);
  const [rumuzGirdi, setRumuzGirdi] = useState(profil?.rumuz || '');
  const [kayitEdiliyor, setKayitEdiliyor] = useState(false);
  const [hata, setHata] = useState('');

  const yukle = React.useCallback(async () => {
    const s = await liderlikSoru();
    setSoruListe(s);
  }, []);

  useEffect(() => { if (hesapVarMi && profil?.rumuz) yukle(); }, [hesapVarMi, profil?.rumuz, yukle]);

  const rumuzKaydet = async () => {
    setHata(''); setKayitEdiliyor(true);
    try {
      const t = await rumuzAyarla(rumuzGirdi);
      setProfil(p => ({ ...p, rumuz: t }));
      titre.dogru();
      yukle();
    } catch (e) {
      setHata(e.message || 'Bir sorun oldu.');
    } finally {
      setKayitEdiliyor(false);
    }
  };

  if (!hesapVarMi) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 30 }}>
        {ligoGorsel('normal') && (
          <Image source={ligoGorsel('normal')} style={{ width: 96, height: 96, resizeMode: 'contain', marginBottom: 16 }} />
        )}
        <Text style={{ fontFamily: FONT.govde, fontSize: 16, color: P.inkSoft, textAlign: 'center', lineHeight: 23 }}>
          Liderlik tablosuna girmek için{'\n'}hesap açman gerekiyor.
        </Text>
      </View>
    );
  }

  if (!profil?.rumuz) {
    return (
      <View style={st.kart}>
        <Text style={st.etiket}>RUMUZUNU SEÇ</Text>
        <Text style={{ fontFamily: FONT.govde, fontSize: 14, color: P.inkSoft, marginBottom: 14, lineHeight: 20 }}>
          Liderlik tablosunda gerçek adın değil, seçtiğin rumuz görünür.
        </Text>
        <TextInput
          style={st.girdi}
          value={rumuzGirdi}
          onChangeText={setRumuzGirdi}
          placeholder="Örn. GeceKartali"
          placeholderTextColor={P.inkFaint}
          maxLength={20}
          autoCapitalize="none"
        />
        {hata ? <Text style={{ color: P.kirmizi, fontFamily: FONT.govde, fontSize: 13, marginBottom: 10 }}>{hata}</Text> : null}
        <Dugme etiket={kayitEdiliyor ? 'KAYDEDİLİYOR...' : 'RUMUZU KAYDET'}
          renk={P.altin} renkKoyu={P.altinKoyu} tam
          onPress={kayitEdiliyor ? undefined : rumuzKaydet} />
      </View>
    );
  }

  const liste = soruListe;

  return (
    <View>
      <Text style={{ fontFamily: FONT.govde, fontSize: 13, color: P.inkFaint, marginBottom: 14, textAlign: 'center' }}>
        Bu hafta · Pazartesi sıfırlanır
      </Text>

      {liste === null ? (
        <YukleniyorGostergesi boyut={64} />
      ) : liste.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontFamily: FONT.govde, fontSize: 15, color: P.inkSoft, textAlign: 'center' }}>
            Bu hafta henüz kimse veri girmemiş.{'\n'}İlk sen ol.
          </Text>
        </View>
      ) : (
        liste.map((k, i) => (
          <View key={k.rumuz} style={[st.dersSatir, {
            paddingVertical: 13,
            borderColor: k.rumuz === profil.rumuz ? P.altin : P.line,
          }]}>
            <View style={{
              width: 30, height: 30, borderRadius: 15, marginRight: 12,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: i < 3 ? P.altinZemin : P.bgAlt,
            }}>
              <Text style={{ fontFamily: FONT.baslik, fontSize: 13, color: i < 3 ? P.altin : P.inkFaint }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontFamily: FONT.govdeKalin, fontSize: 15, color: P.ink }} numberOfLines={1}>
              {k.rumuz}{k.rumuz === profil.rumuz ? ' (sen)' : ''}
            </Text>
            <Text style={{ fontFamily: FONT.baslik, fontSize: 17, color: P.mavi }}>
              {sekme === 'soru' ? k.toplam : k.toplam_dakika + ' dk'}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

// ============================================================
// DIŞ KAYNAK GİRİŞİ — kitap/dershane sorularını sayan mini widget
// ============================================================
function DisKaynakGiris() {
  const { P } = useTema();
  const [deger, setDeger] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [basari, setBasari] = useState(false);

  const gonder = async () => {
    const n = parseInt(deger, 10);
    if (!n || n <= 0) return;
    setGonderiliyor(true);
    const ok = await disSoruEkle(n);
    setGonderiliyor(false);
    if (ok) {
      setDeger('');
      setBasari(true);
      titre.dogru();
      setTimeout(() => setBasari(false), 1800);
    }
  };

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: P.yuzey, borderWidth: 1, borderColor: P.line,
      borderRadius: 18, padding: 14, marginBottom: 14,
    }}>
      <View style={{
        width: 40, height: 40, borderRadius: 13, backgroundColor: P.altinZemin,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
      }}>
        <BookOpenCheck size={20} color={P.altin} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 13, color: P.ink }}>
          {basari ? 'Eklendi, liderlik güncellendi' : 'Dışarıda kaç soru çözdün?'}
        </Text>
        {!basari && (
          <Text style={{ fontFamily: FONT.govde, fontSize: 12, color: P.inkFaint, marginTop: 1 }}>
            Kitap, dershane, defter — hepsi sayılır
          </Text>
        )}
      </View>
      {!basari && (
        <>
          <TextInput
            value={deger}
            onChangeText={setDeger}
            placeholder="0"
            placeholderTextColor={P.inkFaint}
            keyboardType="number-pad"
            style={{
              width: 56, backgroundColor: P.bgAlt, borderWidth: 1.5, borderColor: P.line,
              borderRadius: 10, paddingVertical: 8, textAlign: 'center',
              fontFamily: FONT.monoBold, fontSize: 15, color: P.ink, marginRight: 8,
            }}
          />
          <TouchableOpacity onPress={gonder} disabled={gonderiliyor}
            style={{ backgroundColor: P.altin, borderRadius: 10, padding: 9, opacity: gonderiliyor ? 0.5 : 1 }}>
            <Plus size={18} color="#FFFFFF" strokeWidth={2.6} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ============================================================
// KENARDAN GERİ KAYDIR — iOS'taki gibi ekranın en sol kenarından
// başlayan bir sürükleme bir önceki ekrana döner.
//
// Yalnızca dokunuş SOL KENARDA (~24px) başlarsa yakalanır; ekranın
// geri kalanı serbest kalır. Böylece Konu Çalış gibi kendi yatay
// kaydırmasını kullanan ekranlarla çakışmaz — kart kaydırma ekranın
// ortasından başlar, geri kaydırma yalnızca kenardan.
// ============================================================
function KenardanGeriKaydir({ onGeri, children, aktif = true }) {
  const kaydir = useRef(new Animated.Value(0)).current;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (e) => aktif && e.nativeEvent.pageX < 24,
      onMoveShouldSetPanResponderCapture: (e, g) =>
        aktif && e.nativeEvent.pageX < 24 && g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => { if (g.dx > 0) kaydir.setValue(g.dx * 0.35); },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 65) {
          titre.hafif();
          onGeri && onGeri();
        }
        Animated.spring(kaydir, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      },
    })
  ).current;

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateX: kaydir }] }} {...pan.panHandlers}>
      {children}
    </Animated.View>
  );
}

// ============================================================
// 3B BUTON — basılabilir görünen, basınca çöken tuş
// Alt kenardaki kalınlık fiziksel derinlik hissi verir.
// ============================================================
// ============================================================
// SAYAÇ METNİ — sayı değiştiğinde eskisinden yenisine doğru sayarak
// artar/azalır. Anlık zıplama yerine "kazanıyorum" hissi verir.
// ============================================================
function SayacMetin({ deger, style, onEk = '', sonEk = '' }) {
  const anim = useRef(new Animated.Value(deger)).current;
  const [gosterilen, setGosterilen] = useState(deger);
  const ilkMi = useRef(true);

  useEffect(() => {
    if (ilkMi.current) { ilkMi.current = false; return; } // ilk render'da animasyon olmasın
    const dinleyici = anim.addListener(({ value }) => setGosterilen(Math.round(value)));
    Animated.timing(anim, {
      toValue: deger, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
    return () => anim.removeListener(dinleyici);
  }, [deger]);

  return <Text style={style}>{onEk}{gosterilen}{sonEk}</Text>;
}

function Dugme({ etiket, Ikon, renk, renkKoyu, yazi, onPress, tam, kucuk, pasif, style }) {
  const { P } = useTema();
  const [basili, setBasili] = React.useState(false);
  const olcek = useRef(new Animated.Value(1)).current;

  const anaRenk = pasif ? P.line : (renk || P.yesil);
  const altRenk = pasif ? P.lineKoyu : (renkKoyu || P.yesilKoyu);
  const yaziRenk = yazi || (pasif ? P.inkFaint : '#FFFFFF');
  const derinlik = kucuk ? 4 : 5;

  const basildi = () => {
    setBasili(true);
    Animated.spring(olcek, { toValue: 0.95, useNativeDriver: true, friction: 6, tension: 200 }).start();
  };
  const birakildi = () => {
    setBasili(false);
    Animated.spring(olcek, { toValue: 1, useNativeDriver: true, friction: 4, tension: 180 }).start();
  };

  return (
    <AnimatedTouchable
      activeOpacity={1}
      disabled={pasif}
      onPressIn={basildi}
      onPressOut={birakildi}
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
          transform: [{ scale: olcek }],
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
    </AnimatedTouchable>
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
  const [hata, setHata] = useState('');
  const toggleDers = (id) => { titre.hafif(); setZayifDersler(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

  // Her adım değişiminde uyarıyı temizle — bir önceki adımın hatası
  // yeni adıma taşınıp kafa karıştırmasın.
  const adimGec = (yeniAdim) => { setHata(''); setAdim(yeniAdim); };

  const HataMetni = () => hata ? (
    <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 14, color: P.red, marginTop: -10, marginBottom: 16 }}>
      {hata}
    </Text>
  ) : null;

  if (adim === 0) return (
    <KurulumCercevesi no={1} baslik="Adın ne?" alt="Uygulamada sana böyle sesleneceğiz" devam={() => {
      if (!ad.trim()) { titre.yanlis(); setHata('Hop, adını yazmayı unuttun 😊 Sana ne diyelim?'); return; }
      adimGec(1);
    }}>
      <TextInput style={st.girdi} placeholder="Örn. Ahmet" placeholderTextColor={P.inkFaint}
        value={ad} onChangeText={setAd} autoCapitalize="words" />
      <HataMetni />
    </KurulumCercevesi>
  );
  if (adim === 1) return (
    <KurulumCercevesi no={2} baslik="Hedef okulun" alt="Hayalindeki liseyi yaz (isteğe bağlı)" devam={() => adimGec(2)}>
      <TextInput style={st.girdi} placeholder="Örn. Fen Lisesi" placeholderTextColor={P.inkFaint} value={hedefOkul} onChangeText={setHedefOkul} />
    </KurulumCercevesi>
  );
  if (adim === 2) return (
    <KurulumCercevesi no={3} baslik="Net hedefin" alt="LGS'de kaç net hedefliyorsun?" devam={() => {
      const sayi = parseInt(hedefNet, 10);
      if (!hedefNet.trim() || !sayi || sayi <= 0) { titre.yanlis(); setHata('Bir hedef koymadan yola çıkamayız! Kaç net istiyorsun, yaz bakalım 🎯'); return; }
      if (sayi > 90) { titre.yanlis(); setHata('LGS\'de en fazla 90 net olur — biraz daha gerçekçi bir hedef yazalım 🙂'); return; }
      adimGec(3);
    }}>
      <TextInput
        style={st.girdi} placeholder="Örn. 75" placeholderTextColor={P.inkFaint}
        value={hedefNet}
        onChangeText={(t) => setHedefNet(t.replace(/[^0-9]/g, '').slice(0, 2))}
        keyboardType="number-pad" maxLength={2}
      />
      <HataMetni />
    </KurulumCercevesi>
  );
  if (adim === 3) return (
    <KurulumCercevesi no={4} baslik="Günlük hedef" alt="Her gün kaç kart çalışmak istiyorsun?" devam={() => adimGec(4)}>
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
    <KurulumCercevesi no={5} baslik="Zayıf dersler" alt="Hangi derslerde eksiksin? (birden fazla seç)" devam={() => {
      if (zayifDersler.length === 0) { titre.yanlis(); setHata('En az bir ders seç ki nereden başlayacağını bilelim 📚'); return; }
      onDone({ ad, hedefOkul, hedefNet, hedefKart, zayifDersler });
    }}>
      {DERSLER.map(d => (
        <TouchableOpacity key={d.id} onPress={() => { toggleDers(d.id); setHata(''); }}
          style={[st.secenek, zayifDersler.includes(d.id) && { borderColor: d.renk, backgroundColor: d.acik }]}>
          {zayifDersler.includes(d.id)
            ? <SquareCheck size={20} color={d.renk} strokeWidth={2} style={{ marginRight: 9 }} />
            : <Square size={20} color={P.inkFaint} strokeWidth={2} style={{ marginRight: 9 }} />}
          <Text style={[st.secenekYazi, zayifDersler.includes(d.id) && { color: d.renk, fontFamily: FONT.monoBold }]}>{d.ad}</Text>
        </TouchableOpacity>
      ))}
      <HataMetni />
    </KurulumCercevesi>
  );
}

// ============ MOD SEÇİMİ ============
function ModSecim({ ders, onBaslat, onGeri, srs, premium, bugun, onLimitAsildi }) {
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
          {!premium && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', marginTop: 10,
              backgroundColor: bugun >= GUNLUK_UCRETSIZ_LIMIT ? P.redSoft : P.bgAlt,
              borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
            }}>
              <Sparkles size={13} color={bugun >= GUNLUK_UCRETSIZ_LIMIT ? P.red : P.inkFaint} strokeWidth={2.2} />
              <Text style={{
                fontFamily: FONT.monoBold, fontSize: 12, marginLeft: 6,
                color: bugun >= GUNLUK_UCRETSIZ_LIMIT ? P.red : P.inkFaint,
              }}>
                {bugun >= GUNLUK_UCRETSIZ_LIMIT
                  ? 'Bugünlük ücretsiz hakkın doldu'
                  : `Bugün ${bugun}/${GUNLUK_UCRETSIZ_LIMIT} kart`}
              </Text>
            </View>
          )}
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

        <TouchableOpacity onPress={() => {
            if (!premium && bugun >= GUNLUK_UCRETSIZ_LIMIT) { titre.hafif(); onLimitAsildi(); return; }
            titre.orta(); onBaslat('quiz', secUnite);
          }} activeOpacity={0.85}
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

// Dock ikonları — Flow'da üretilen özel görseller. Herhangi biri eksikse
// (henüz yüklenmediyse) çökme olmadan lucide ikonuna geri düşer.
const DOCK_GORSEL = {
  dersler: (() => { try { return require('./assets/dock/dock-dersler.png'); } catch (e) { return null; } })(),
  deneme: (() => { try { return require('./assets/dock/dock-deneme.png'); } catch (e) { return null; } })(),
  notlar: (() => { try { return require('./assets/dock/dock-notlar.png'); } catch (e) { return null; } })(),
  profil: (() => { try { return require('./assets/dock/dock-profil.png'); } catch (e) { return null; } })(),
};

// ============ SEKME ÇUBUĞU (DOCK) ============
// Yeni düzen: Dersler solda, Deneme sekmesi, ortada büyütülmüş
// Ligo maskotu (Ana Sayfa), Notlar ve Profil sağda. Tamamen ikon —
// yazı yok.
// YanSekme, TabBar'ın DIŞINDA sabit bir bileşen olarak tanımlı.
// İçeride tanımlansaydı, her sekme değişiminde TabBar yeniden render
// olunca YanSekme de "sıfırdan yeni bir bileşen" sayılır, React içindeki
// Image'ı söküp yeniden kurar — işte görsellerin kaybolup yavaşça
// yeniden yüklenmesinin sebebi tam olarak buydu. Dışarı taşıyınca React
// aynı bileşen örneğini tanıyor, yalnızca prop değişiyor, native görsel
// katmanı hiç yıkılıp yeniden kurulmuyor.
const YanSekme = React.memo(({ id, Ikon, aktif, vurgu, inkFaint, onBas }) => {
  const ozelGorsel = DOCK_GORSEL[id];
  return (
    <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      onPress={onBas} activeOpacity={0.7}>
      <View style={{
        width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
        backgroundColor: aktif ? vurgu + '1E' : 'transparent',
      }}>
        {ozelGorsel ? (
          <Image source={ozelGorsel} style={{ width: 22, height: 22, resizeMode: 'contain', opacity: aktif ? 1 : 0.5 }} />
        ) : (
          <Ikon size={21} color={aktif ? vurgu : inkFaint} strokeWidth={aktif ? 2.5 : 2} />
        )}
      </View>
      <View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 4, backgroundColor: aktif ? vurgu : 'transparent' }} />
    </TouchableOpacity>
  );
});

function TabBar({ tab, setTab, premium }) {
  const { P, koyu } = useTema();
  const kenar = useSafeAreaInsets();
  const vurgu = premium ? '#FFD966' : P.neon;
  const ligoRes = ligoGorsel('normal');
  const zeminRengi = koyu ? '#1B1E33' : '#FFFFFF';
  const cerceveRengi = koyu ? '#2A2E4C' : '#EDEBF7';

  return (
    <View style={{ paddingHorizontal: 18, paddingBottom: kenar.bottom + 12, paddingTop: 28, alignItems: 'center' }}>
      {/* Kapsül — düz zemin, ince çerçeve, hafif gölge. Ortada Ligo için boşluk bırakır. */}
      <View style={[st_golge, {
        width: '100%', height: 62, borderRadius: 31, overflow: 'hidden',
        borderWidth: 1, borderColor: cerceveRengi,
      }]}>
        {(() => {
          const Kapsulic = (
            <>
              <YanSekme id="dersler" Ikon={Library} aktif={tab === 'dersler'} vurgu={vurgu} inkFaint={P.inkFaint}
                onBas={() => { titre.hafif(); setTab('dersler'); }} />
              <YanSekme id="deneme" Ikon={Timer} aktif={tab === 'deneme'} vurgu={vurgu} inkFaint={P.inkFaint}
                onBas={() => { titre.hafif(); setTab('deneme'); }} />

              <View style={{ flex: 1.4 }} />

              <YanSekme id="notlar" Ikon={NotebookPen} aktif={tab === 'notlar'} vurgu={vurgu} inkFaint={P.inkFaint}
                onBas={() => { titre.hafif(); setTab('notlar'); }} />
              <YanSekme id="profil" Ikon={CircleUser} aktif={tab === 'profil'} vurgu={vurgu} inkFaint={P.inkFaint}
                onBas={() => { titre.hafif(); setTab('profil'); }} />
            </>
          );
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', height: '100%', paddingHorizontal: 6, backgroundColor: zeminRengi }}>
              {Kapsulic}
            </View>
          );
        })()}
      </View>

      {/* Ligo — kapsülün üstünde yüzen ayrı bir daire, kutulu/kare hissi yok */}
      <TouchableOpacity onPress={() => { titre.hafif(); setTab('home'); }} activeOpacity={0.85}
        style={{ position: 'absolute', top: 0, alignSelf: 'center' }}>
        <View style={[st_golge, {
          width: 66, height: 66, borderRadius: 33,
          backgroundColor: tab === 'home' ? vurgu : zeminRengi,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 4, borderColor: koyu ? '#12142A' : '#F7F5FF',
        }]}>
          {ligoRes ? (
            <Image source={ligoRes} style={{ width: 44, height: 44, resizeMode: 'contain' }} />
          ) : (
            <House size={26} color={tab === 'home' ? '#FFFFFF' : P.inkFaint} strokeWidth={2.4} />
          )}
        </View>
        {premium && (
          <View style={{
            position: 'absolute', top: -4, right: -2,
            width: 21, height: 21, borderRadius: 11,
            backgroundColor: '#B8860B', alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: koyu ? '#12142A' : '#FFFFFF',
          }}>
            <Crown size={10} color="#FFD966" strokeWidth={2.6} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Sekme sırası: kaydırmalı gezinme bu sırayı takip eder
// Dock'un yeni görsel sırasına uygun: Dersler solda, Ana Sayfa ortada,
// Notlar ve Profil sağda. Kaydırma yönü de bu sıraya göre işler.
const SEKME_SIRASI = ['dersler', 'deneme', 'home', 'notlar', 'profil'];

// Ücretsiz sürümde günde cevaplanabilecek Quiz kartı sınırı. Uygulamanın
// kendi "Hafif" tempo önerisinin (15) biraz üstü, "Normal" tempodan (30)
// düşük — hafif çalışan hiç sınıra takılmaz, düzenli çalışan doğal olarak
// premium'a yönelir. Konu Çalış (okuma modu) bu sınıra hiç dahil değildir.
const GUNLUK_UCRETSIZ_LIMIT = 20;

// ============ ANA SAYFA ============
function HomeScreen({
  srs, xp, seri, bugun, hedefKart, onDersBaslat, sinavTarihi, profil,
  onProfil, denemeGecmisi, gunluk, gunlukDers, hesapVarMi, premium, onDenemeSekmesi,
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
    <View style={{ flex: 1 }}>
      {ANASAYFA_ARKAPLAN && (
        <>
          <Image source={ANASAYFA_ARKAPLAN} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
          <View pointerEvents="none" style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: koyu ? 'rgba(16,18,26,0.72)' : 'rgba(255,255,255,0.55)' }} />
        </>
      )}
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
              backgroundColor: seriKademesi(seri).parlamaZemin,
              borderWidth: 1, borderColor: seriKademesi(seri).parlamaKenar,
              borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
            }}>
              <SeriAlevi seri={seri} />
              <Text style={{ fontFamily: FONT.monoBold, fontSize: 14, color: seriKademesi(seri).metin, marginLeft: 6 }}>
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
            premium={premium}
            seviyeAdi={sev.ad}
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

      {hesapVarMi && <DisKaynakGiris />}

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
          { id: 'deneme', ad: 'Deneme', sayi: '', birim: '40 dakika', Ikon: Clock, g: ['#00C6FF', '#0072FF'], git: onDenemeSekmesi },
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
    </View>
  );
}

// ============================================================
// DENEME EKRANI — ayrı bir sekme, anlık başlamıyor
//
// Kullanıcı önce Genel Deneme mi yoksa tek bir ders mi istediğini
// seçer, sonra Başlat'a basar. Haftalık ücretsiz sınır ve premium
// kontrolü burada da (sinavBaslat üzerinden) aynen işler.
// ============================================================
// Deneme sekmesi arka planı — Flow'da üretilecek, henüz yoksa
// güvenli şekilde gradyan zemine düşer, çökme olmaz.
const DENEME_ARKAPLAN = (() => {
  try { return require('./assets/deneme/deneme-arkaplan.png'); } catch (e) { return null; }
})();
const ANASAYFA_ARKAPLAN = (() => {
  try { return require('./assets/anasayfa/anasayfa-arkaplan.png'); } catch (e) { return null; }
})();
const DERSLER_ARKAPLAN = (() => {
  try { return require('./assets/dersler/dersler-arkaplan.png'); } catch (e) { return null; }
})();
const NOTLAR_ARKAPLAN = (() => {
  try { return require('./assets/notlar/notlar-arkaplan.png'); } catch (e) { return null; }
})();
const PROFIL_ARKAPLAN = (() => {
  try { return require('./assets/profil/profil-arkaplan.png'); } catch (e) { return null; }
})();

function DenemeEkrani({ srs, denemeGecmisi, premium, onBaslat }) {
  const { P, s: st, DERSLER, koyu } = useTema();
  const kenar = useSafeAreaInsets();
  const [secim, setSecim] = useState(null); // null = Genel Deneme, yoksa dersId

  const kalanHak = premium ? null : Math.max(0, 1 - buHaftaDenemeSayisi(denemeGecmisi));
  const genelSecili = !secim;
  const secilenDers = secim ? DERSLER.find(d => d.id === secim) : null;

  return (
    <View style={{ flex: 1 }}>
      {DENEME_ARKAPLAN ? (
        <Image source={DENEME_ARKAPLAN} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={koyu ? ['#181225', '#10121A', '#1A1220'] : ['#FFF3ED', '#F7F5FF', '#FFF0F0']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
        />
      )}

      <ScrollView contentContainerStyle={{ padding: 22, paddingTop: kenar.top + 20, paddingBottom: kenar.bottom + 24 }}>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <View style={{
            width: 42, height: 42, borderRadius: 14, backgroundColor: '#E5342526',
            alignItems: 'center', justifyContent: 'center', marginRight: 12,
          }}>
            <Timer size={22} color="#E53425" strokeWidth={2.2} />
          </View>
          <Text style={{ fontFamily: FONT.baslik, fontSize: 27, color: P.ink }}>Deneme Sınavı</Text>
        </View>
        <Text style={{ fontSize: 14, color: P.inkSoft, fontFamily: FONT.govde, marginBottom: 14, lineHeight: 20 }}>
          Süreli, gerçek sınav havasında — istersen karışık, istersen tek bir dersten.
        </Text>

        {!premium && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
            backgroundColor: kalanHak > 0 ? P.bgAlt : '#E5342522',
            borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7, marginBottom: 18,
          }}>
            <Sparkles size={13} color={kalanHak > 0 ? P.inkFaint : '#E53425'} strokeWidth={2.2} />
            <Text style={{
              fontSize: 12, color: kalanHak > 0 ? P.inkSoft : '#E53425', fontFamily: FONT.monoBold, marginLeft: 6,
            }}>
              {kalanHak > 0 ? 'Bu hafta 1 ücretsiz hakkın var' : 'Bu haftaki ücretsiz hakkını kullandın'}
            </Text>
          </View>
        )}

        {/* ---------- GENEL DENEME — öne çıkan büyük kart ---------- */}
        <TouchableOpacity onPress={() => { titre.orta(); setSecim(null); }} activeOpacity={0.88}
          style={[st_golge, { borderRadius: 24, overflow: 'hidden', marginBottom: 18 }]}>
          <LinearGradient colors={['#E53425', '#FF7A45']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              padding: 20, flexDirection: 'row', alignItems: 'center', borderRadius: 24,
              borderWidth: genelSecili ? 3 : 0, borderColor: '#FFFFFF',
            }}>
            <View style={{
              width: 58, height: 58, borderRadius: 18, backgroundColor: '#FFFFFF2A',
              alignItems: 'center', justifyContent: 'center', marginRight: 16,
            }}>
              <Zap size={30} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.baslik, fontSize: 25, color: '#FFFFFF' }}>Genel Deneme</Text>
              <Text style={{ fontFamily: FONT.govde, fontSize: 13, color: '#FFFFFFDD', marginTop: 3 }}>
                30 soru · 40 dakika · tüm dersler
              </Text>
            </View>
            {genelSecili && (
              <View style={{
                width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={18} color="#E53425" strokeWidth={3.2} />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={{ fontSize: 12, color: P.inkFaint, fontFamily: FONT.monoBold, letterSpacing: 1.2, marginBottom: 10 }}>
          YA DA TEK BİR DERSTEN ÇALIŞ
        </Text>

        {/* ---------- DERS IZGARASI — her ders kendi renginde büyük kart ---------- */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 }}>
          {DERSLER.map(d => {
            const DersIkon = d.ikon;
            const secili = secim === d.id;
            return (
              <TouchableOpacity key={d.id} onPress={() => { titre.orta(); setSecim(d.id); }} activeOpacity={0.85}
                style={[st_golge, {
                  width: '48%', borderRadius: 20, overflow: 'hidden', marginBottom: 12,
                }]}>
                <LinearGradient colors={[d.renk, d.renk + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{
                    padding: 16, alignItems: 'center', minHeight: 118, borderRadius: 20,
                    borderWidth: secili ? 3 : 0, borderColor: '#FFFFFF',
                  }}>
                  {secili && (
                    <View style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={14} color={d.renk} strokeWidth={3.2} />
                    </View>
                  )}
                  <View style={{
                    width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFFFFF2A',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                  }}>
                    <DersIkon size={24} color="#FFFFFF" strokeWidth={2.2} />
                  </View>
                  <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 15, color: '#FFFFFF', textAlign: 'center' }}>{d.ad}</Text>
                  <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: '#FFFFFFCC', marginTop: 3 }}>20 soru · 25 dk</Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <Dugme
          etiket={genelSecili ? 'GENEL DENEMEYİ BAŞLAT' : (secilenDers?.ad.toUpperCase() + ' DENEMESİNİ BAŞLAT')}
          Ikon={Rocket}
          renk={genelSecili ? '#E53425' : secilenDers?.renk}
          renkKoyu={genelSecili ? '#B31217' : secilenDers?.renk}
          tam
          onPress={() => {
            // Ücretsiz kullanıcı için tek hafta hakkı olduğundan, yanlışlıkla
            // dokunup hakkını harcamasın diye önce onay isteniyor. Premium'da
            // sınır olmadığı için direkt başlıyor.
            if (premium) { onBaslat(secim); return; }
            Alert.alert(
              'Bu haftaki tek hakkın',
              'Başlarsan bu senin bu haftaki ücretsiz denemen olarak sayılır. Emin misin?',
              [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Başlat', style: 'destructive', onPress: () => onBaslat(secim) },
              ]
            );
          }}
        />

        {denemeGecmisi && denemeGecmisi.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Text style={{ fontSize: 12, color: P.inkFaint, fontFamily: FONT.monoBold, letterSpacing: 1.2, marginBottom: 10 }}>
              GEÇMİŞ PERFORMANSIN
            </Text>
            <View style={st.kart}>
              <DenemeGecmisi gecmis={denemeGecmisi} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DerslerScreen({ srs, onDersBaslat }) {
  const { P, s: st, DERSLER, koyu } = useTema();
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
    <View style={{ flex: 1 }}>
      {DERSLER_ARKAPLAN && (
        <>
          <Image source={DERSLER_ARKAPLAN} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
          <View pointerEvents="none" style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: koyu ? 'rgba(16,18,26,0.72)' : 'rgba(255,255,255,0.55)' }} />
        </>
      )}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 18, paddingTop: kenar.top + 12, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled">

      <Text style={st.sayfaBaslik}>Dersler</Text>

      {/* ---------- ARAMA ---------- */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', backgroundColor: P.bgAlt,
        borderRadius: 14, paddingHorizontal: 14, marginBottom: 20,
      }}>
        <Search size={18} color={P.inkFaint} strokeWidth={2.2} />
        <TextInput
          value={arama}
          onChangeText={setArama}
          placeholder="Kartlarda ara"
          placeholderTextColor={P.inkFaint}
          style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 10, fontSize: 15, color: P.ink, fontFamily: FONT.govde }}
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
                  backgroundColor: P.yuzey, borderRadius: 14,
                  borderLeftWidth: 3, borderLeftColor: d.renk,
                  padding: 14, marginBottom: 10,
                }}>
                <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 11, color: d.renk, letterSpacing: 0.4, marginBottom: 6 }}>
                  {d.ad}
                </Text>
                <Text style={{ fontSize: 15, fontFamily: FONT.govdeOrta, color: P.ink, lineHeight: 22 }}>{c.soru}</Text>
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

      {/* ---------- DERS LİSTESİ — yumuşak renkli kimlik, tek bakışta okunur ---------- */}
      {DERSLER.map(d => {
        const dk = CARDS.filter(c => c.ders === d.id);
        const ogr = dk.filter(c => (srs[c.id] || yeniD(c.id)).seviye >= 3).length;
        const bek = dk.filter(c => (srs[c.id] || yeniD(c.id)).dueAt <= Date.now()).length;
        const uSayi = uniteler(d.id).length;
        const dPct = dk.length ? Math.round((ogr / dk.length) * 100) : 0;
        const DersIkon = d.ikon;
        return (
          <TouchableOpacity key={d.id} activeOpacity={0.8}
            onPress={() => { titre.orta(); onDersBaslat(d.id); }}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: d.acik, borderRadius: 18,
              padding: 15, marginBottom: 11,
            }}>
            <View style={{
              width: 44, height: 44, borderRadius: 14, backgroundColor: d.renk,
              alignItems: 'center', justifyContent: 'center', marginRight: 14,
            }}>
              <DersIkon size={22} color="#FFFFFF" strokeWidth={2.4} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 17, color: P.ink }}>{d.ad}</Text>
              <Text style={{ fontFamily: FONT.govde, fontSize: 13, color: d.renk, marginTop: 2 }}>
                {uSayi} ünite{bek > 0 ? ' · tekrar zamanı' : ''}
              </Text>
            </View>

            <Halka pct={dPct} boyut={46} kalinlik={4} renk={d.renk} zemin={P.koyu ? 'rgba(255,255,255,0.18)' : 'rgba(16,18,26,0.10)'}>
              <Text style={{ fontFamily: FONT.baslik, fontSize: 13, color: d.renk }}>%{dPct}</Text>
            </Halka>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
    </View>
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
  const { DERSLER } = useTema();
  const kenar = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const kaydir = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const idxRef = useRef(0);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  const kart = kartlar[idx];
  const ESIK = 90;
  // Kartın rengi kendi dersinin kimliğine bağlı — Türkçe kırmızımsı,
  // Matematik yeşilimsi vb. Böylece okuma modu da ders rengiyle konuşur.
  const dersRenk = (DERSLER.find(d => d.id === kart?.ders) || {}).renk || FOCUS.blue;

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
          height: '100%', backgroundColor: dersRenk, borderRadius: 999,
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
                flex: 1, fontFamily: FONT.monoBold, fontSize: 12, color: dersRenk,
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
              borderLeftWidth: 4, borderLeftColor: dersRenk,
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


function KartModu({ kartlar, mod, onBitti, onUpdate, onGeriAl, srs, sinavMod, sinavSuresi }) {
  const kenar = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [acik, setAcik] = useState(false);
  const [dogru, setDogru] = useState(0);
  const [xpKazanim, setXpKazanim] = useState(0);
  const [erkenBitti, setErkenBitti] = useState(false);
  const [kalanSaniye, setKalanSaniye] = useState(sinavMod ? (sinavSuresi || 2400) : null);
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
  // Kombo — art arda doğru sayısı. Belirli eşiklerde kısa bir rozet gösterir.
  const [kombo, setKombo] = useState(0);
  const [komboGoster, setKomboGoster] = useState(null);
  const komboOlcek = useRef(new Animated.Value(0)).current;
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
    sesCal(dogruMu ? 'dogru' : 'yanlis');

    // Kombo takibi: geri al/tekrar dene numarasıyla kandırılmasın diye
    // gerçek sonuca (gercekSonuc) göre sayılır, ekrandaki anlık dogruMu'ya değil.
    if (gercekSonuc) {
      setKombo(k => {
        const yeni = k + 1;
        const esikMi = yeni === 3 || yeni === 5 || (yeni >= 10 && yeni % 5 === 0);
        if (esikMi) {
          setKomboGoster(yeni);
          titre.dogru();
          komboOlcek.setValue(0);
          Animated.sequence([
            Animated.spring(komboOlcek, { toValue: 1, useNativeDriver: true, friction: 4, tension: 140 }),
            Animated.delay(900),
            Animated.timing(komboOlcek, { toValue: 0, duration: 220, useNativeDriver: true }),
          ]).start(() => setKomboGoster(null));
        }
        return yeni;
      });
    } else {
      setKombo(0);
    }
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
        {pct === 100 && <Konfeti />}
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', justifyContent: 'center', flexGrow: 1, paddingTop: kenar.top + 24, paddingBottom: kenar.bottom + 24 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: FOCUS.textSoft, letterSpacing: 2, marginBottom: 8 }}>
            {erkenBitti ? 'OTURUM SONLANDIRILDI' : 'SONUÇ RAPORU'}
          </Text>
          {pct >= 90 ? (
            <View style={{ borderRadius: 20, overflow: 'hidden', paddingHorizontal: 28, paddingVertical: 10 }}>
              <HolografikParilti boyut={160} />
              <SayacMetin deger={pct} style={{ fontFamily: FONT.monoBold, fontSize: 58, color: renk }} onEk="%" />
            </View>
          ) : (
            <SayacMetin deger={pct} style={{ fontFamily: FONT.monoBold, fontSize: 58, color: renk }} onEk="%" />
          )}
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

      {/* Kombo rozeti — art arda doğru eşiklerinde kısa süreliğine belirir */}
      {komboGoster !== null && (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: kenar.top + 66, alignSelf: 'center', zIndex: 9997,
          transform: [{ scale: komboOlcek }], opacity: komboOlcek,
        }}>
          <LinearGradient colors={['#FF6B35', '#FFB020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row', alignItems: 'center', borderRadius: 999,
              paddingHorizontal: 18, paddingVertical: 10,
              shadowColor: '#FF6B35', shadowOpacity: 0.7, shadowRadius: 14, elevation: 8,
            }}>
            <Flame size={20} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
            <Text style={{ fontFamily: FONT.baslik, fontSize: 18, color: '#FFFFFF', marginLeft: 8 }}>
              KOMBO ×{komboGoster}
            </Text>
          </LinearGradient>
        </Animated.View>
      )}

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
function CalismaTakvimi({ gunluk, hedefKart, seri }) {
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
      const gunFarki = Math.round((bugunD.getTime() - t.getTime()) / 86400000);
      sutun.push({
        anahtar,
        sayi: gunluk[anahtar] || 0,
        gelecek: t.getTime() > bugunD.getTime(),
        bugun: t.getTime() === bugunD.getTime(),
        // Güncel seriye dahil mi: bugünden geriye doğru son "seri" gün içinde mi
        seriIcinde: !!seri && gunFarki >= 0 && gunFarki < seri,
        tarihMetni: t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }),
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
  const GUN_HARF = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P']; // Pzt Sal Çar Per Cum Cmt Paz

  const toplamGun = Object.values(gunluk).filter(v => v > 0).length;

  const hucreyeDokun = (g) => {
    if (g.gelecek) return;
    titre.hafif();
    Alert.alert(g.tarihMetni, g.sayi > 0 ? `${g.sayi} kart çalıştın 🎯` : 'Bu gün çalışma yok.');
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <BolumBaslik Ikon={CalendarCheck} baslik="ÇALIŞMA TAKVİMİ" renk={P.yesil}
        sag={toplamGun + ' gün'} />

      <View style={{ flexDirection: 'row' }}>
        {/* Sabit gün etiketleri — yatay kaydırmadan bağımsız, hep görünür */}
        <View style={{ marginRight: 5 }}>
          {GUN_HARF.map((h, i) => (
            <Text key={i} style={{
              width: 11, height: 11, marginBottom: 3, fontSize: 8, lineHeight: 11,
              textAlign: 'center', fontFamily: FONT.mono, color: P.inkFaint,
            }}>{i % 2 === 0 ? h : ''}</Text>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {sutunlar.map((sutun, i) => (
              <View key={i} style={{ marginRight: 3 }}>
                {sutun.map(g => (
                  <TouchableOpacity key={g.anahtar} onPress={() => hucreyeDokun(g)} disabled={g.gelecek} activeOpacity={0.6}>
                    <View style={{
                      width: 11, height: 11, marginBottom: 3, borderRadius: 2,
                      backgroundColor: g.gelecek ? 'transparent' : renkler[yogunluk(g.sayi)],
                      borderWidth: g.bugun ? 1.2 : (g.seriIcinde ? 1 : 0),
                      borderColor: g.bugun ? P.ink : '#FFD966',
                      opacity: g.gelecek ? 0 : 1,
                    }} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
        <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.inkFaint, marginRight: 6 }}>az</Text>
        {renkler.map((r, i) => (
          <View key={i} style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: r, marginRight: 3 }} />
        ))}
        <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.inkFaint, marginLeft: 3 }}>çok</Text>
        {seri > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 14 }}>
            <View style={{ width: 9, height: 9, borderRadius: 2, borderWidth: 1.2, borderColor: '#FFD966', marginRight: 5 }} />
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.inkFaint }}>güncel seri</Text>
          </View>
        )}
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
        sag={calisilanGun + '/7 gün'} />

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
        <BolumBaslik Ikon={Timer} baslik="DENEME SINAVLARI" renk={P.mor} />
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
        sag={gecmis.length + ' deneme'} />

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
// UniteAnalizi'nin dışında sabit — içeride tanımlansaydı, ünite analizi
// her srs güncellemesinde (yani her doğru/yanlış cevapta) yeniden render
// olunca Satir de "yeni bileşen" sayılır, tüm satırlar sökülüp yeniden
// kurulurdu. Bu da listenin gözle görülür şekilde takılmasına sebep olurdu.
const Satir = React.memo(({ u, vurgu, dersler, P }) => {
  const d = dersler.find(x => x.id === u.ders) || { ad: u.ders, renk: P.ink };
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
});

function UniteAnalizi({ srs }) {
  const { P, DERSLER } = useTema();

  const veri = React.useMemo(() => {
    const liste = uniteIstatistigi(srs);
    return { zayif: liste.slice(0, 3), guclu: liste.slice(-3).reverse() };
  }, [srs]);

  if (veri.zayif.length === 0) {
    return (
      <View>
        <BolumBaslik Ikon={Target} baslik="ÜNİTE ANALİZİ" renk={P.kirmizi} />
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

  return (
    <View>
      <BolumBaslik Ikon={Target} baslik="ÜNİTE ANALİZİ" renk={P.kirmizi} />

      <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 12, color: P.red, letterSpacing: 0.6, marginBottom: 8 }}>
        ÖNCE BURAYA ÇALIŞ
      </Text>
      {veri.zayif.map(u => <Satir key={u.ders + u.unite} u={u} vurgu={P.red} dersler={DERSLER} P={P} />)}

      <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 12, color: P.yesil, letterSpacing: 0.6, marginTop: 12, marginBottom: 8 }}>
        EN İYİ OLDUĞUN ÜNİTELER
      </Text>
      {veri.guclu.map(u => <Satir key={u.ders + u.unite} u={u} vurgu={P.yesil} dersler={DERSLER} P={P} />)}
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

// Bu haftanın (Pazartesi'den bugüne) özet istatistiklerini çıkarır.
function haftalikOzetHesapla(gunluk, gunlukDers, denemeGecmisi, seri) {
  const simdi = new Date();
  const gun = (simdi.getDay() + 6) % 7;
  const pazartesi = new Date(simdi);
  pazartesi.setDate(simdi.getDate() - gun);
  pazartesi.setHours(0, 0, 0, 0);

  const gunAnahtarlari = [];
  for (let i = 0; i < 7; i++) {
    const t = new Date(pazartesi);
    t.setDate(pazartesi.getDate() + i);
    gunAnahtarlari.push(t.toISOString().split('T')[0]);
  }

  const toplamKart = gunAnahtarlari.reduce((a, k) => a + (gunluk[k] || 0), 0);
  const aktifGun = gunAnahtarlari.filter(k => (gunluk[k] || 0) > 0).length;

  const dersToplam = {};
  gunAnahtarlari.forEach(k => {
    const g = (gunlukDers || {})[k] || {};
    Object.entries(g).forEach(([ders, adet]) => { dersToplam[ders] = (dersToplam[ders] || 0) + adet; });
  });
  const enCokDersGirdisi = Object.entries(dersToplam).sort((a, b) => b[1] - a[1])[0];

  const ilkGun = gunAnahtarlari[0];
  const buHaftaDenemeler = (denemeGecmisi || []).filter(d => d.tarih >= ilkGun);
  const enIyiDeneme = buHaftaDenemeler.length ? Math.max(...buHaftaDenemeler.map(d => d.pct)) : null;

  return {
    toplamKart, aktifGun, seri,
    enCokDers: enCokDersGirdisi ? enCokDersGirdisi[0] : null,
    enCokDersSayi: enCokDersGirdisi ? enCokDersGirdisi[1] : 0,
    denemeSayisi: buHaftaDenemeler.length,
    enIyiDeneme,
  };
}

// ============================================================
// HAFTALIK ÖZET — Spotify Wrapped tarzı, renkli kartlar halinde
// bu haftanın çalışma özetini gösterir.
// ============================================================
function HaftalikOzet({ gunluk, gunlukDers, denemeGecmisi, seri, onKapat }) {
  const { P, DERSLER } = useTema();
  const kenar = useSafeAreaInsets();
  const veri = React.useMemo(
    () => haftalikOzetHesapla(gunluk, gunlukDers, denemeGecmisi, seri),
    [gunluk, gunlukDers, denemeGecmisi, seri]
  );
  const ders = DERSLER.find(d => d.id === veri.enCokDers);

  return (
    <View style={{ flex: 1, backgroundColor: FOCUS.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: kenar.top + 12, paddingHorizontal: 20, paddingBottom: 4 }}>
        <IkonDugme Ikon={XIkon} dolu renk={FOCUS.panel2} renkKoyu={FOCUS.line}
          ikonRenk={FOCUS.textSoft} onPress={onKapat} boyut={44} ikonBoyut={20} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: kenar.bottom + 30 }}>
        <Text style={{ fontFamily: FONT.baslik, fontSize: 30, color: FOCUS.text, marginBottom: 4 }}>Bu Haftan</Text>
        <Text style={{ fontFamily: FONT.govde, fontSize: 15, color: FOCUS.textSoft, marginBottom: 24 }}>
          Pazartesi'den bugüne neler yaptın
        </Text>

        <View style={[st_golge, { borderRadius: 22, overflow: 'hidden', marginBottom: 14 }]}>
          <LinearGradient colors={['#4776E6', '#8E54E9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 26, alignItems: 'center' }}>
            {ligoGorsel('mutlu') && (
              <Image source={ligoGorsel('mutlu')} style={{ width: 64, height: 64, resizeMode: 'contain', marginBottom: 10 }} />
            )}
            <SayacMetin deger={veri.toplamKart} style={{ fontFamily: FONT.baslik, fontSize: 52, color: '#FFFFFF' }} />
            <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 15, color: '#FFFFFFCC', marginTop: 2 }}>kart çalıştın</Text>
          </LinearGradient>
        </View>

        <View style={[st_golge, { borderRadius: 22, overflow: 'hidden', marginBottom: 14 }]}>
          <LinearGradient colors={['#11998E', '#38EF7D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 26, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <SayacMetin deger={veri.aktifGun} style={{ fontFamily: FONT.baslik, fontSize: 52, color: '#FFFFFF' }} />
              <Text style={{ fontFamily: FONT.baslik, fontSize: 26, color: '#FFFFFFAA' }}>/7</Text>
            </View>
            <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 15, color: '#FFFFFFCC', marginTop: 2 }}>gün çalıştın</Text>
          </LinearGradient>
        </View>

        {ders && (
          <View style={[st_golge, { borderRadius: 22, overflow: 'hidden', marginBottom: 14 }]}>
            <LinearGradient colors={[ders.renk, ders.renk + 'AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 26, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 12, color: '#FFFFFFCC', letterSpacing: 1.2 }}>EN ÇOK ÇALIŞTIĞIN DERS</Text>
              <Text style={{ fontFamily: FONT.baslik, fontSize: 30, color: '#FFFFFF', marginTop: 8 }}>{ders.ad}</Text>
              <Text style={{ fontFamily: FONT.govde, fontSize: 14, color: '#FFFFFFCC', marginTop: 4 }}>{veri.enCokDersSayi} kart</Text>
            </LinearGradient>
          </View>
        )}

        {veri.enIyiDeneme !== null && (
          <View style={[st_golge, { borderRadius: 22, overflow: 'hidden', marginBottom: 14 }]}>
            <LinearGradient colors={['#E52D27', '#B31217']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 26, alignItems: 'center' }}>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 12, color: '#FFFFFFCC', letterSpacing: 1.2 }}>
                {veri.denemeSayisi} DENEME ÇÖZDÜN
              </Text>
              <SayacMetin deger={veri.enIyiDeneme} onEk="" sonEk="%" style={{ fontFamily: FONT.baslik, fontSize: 44, color: '#FFFFFF', marginTop: 8 }} />
              <Text style={{ fontFamily: FONT.govde, fontSize: 14, color: '#FFFFFFCC', marginTop: 2 }}>en iyi sonucun</Text>
            </LinearGradient>
          </View>
        )}

        <View style={[st_golge, { borderRadius: 22, overflow: 'hidden', marginBottom: 14 }]}>
          <LinearGradient colors={['#B8860B', '#FFD966']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 26, alignItems: 'center' }}>
            <Flame size={34} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} style={{ marginBottom: 8 }} />
            <SayacMetin deger={veri.seri} style={{ fontFamily: FONT.baslik, fontSize: 44, color: '#FFFFFF' }} />
            <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 15, color: '#FFFFFFCC', marginTop: 2 }}>günlük serin</Text>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

function ProfilScreen(props) {
  const {
    srs, xp, seri, profil, setProfil, sinavSayisi, enIyiSinavPct,
    hedefKart, setHedefKart, sinavTarihi, setSinavTarihi,
    bildirimAcik, setBildirimAcik, bildirimSaat, setBildirimSaat,
    gunluk, gunlukDers, denemeGecmisi, onVeriDegisti, hesapVarMi, premium, onPremiumAc, sesAcik, setSesAcik,
  } = props;
  const { P, s: st, DERSLER, seviyeHesapla, koyu } = useTema();
  const kenar = useSafeAreaInsets();
  const [altSayfa, setAltSayfa] = useState(null); // null | 'ayarlar' | 'hesap'
  const [rozetModalAcik, setRozetModalAcik] = useState(false);

  // ---- Alt sayfalar: üstte geri şeridi, altında ilgili ekran ----
  if (altSayfa) {
    return (
      <KenardanGeriKaydir onGeri={() => setAltSayfa(null)}>
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
            {altSayfa === 'ayarlar' ? 'Ayarlar'
              : altSayfa === 'liderlik' ? 'Liderlik'
              : altSayfa === 'ozet' ? 'Haftalık Özet'
              : 'Hesap'}
          </Text>
        </View>
        {altSayfa === 'ayarlar' ? (
          <AyarlarScreen
            profil={profil} setProfil={setProfil}
            hedefKart={hedefKart} setHedefKart={setHedefKart}
            sinavTarihi={sinavTarihi} setSinavTarihi={setSinavTarihi}
            bildirimAcik={bildirimAcik} setBildirimAcik={setBildirimAcik}
            bildirimSaat={bildirimSaat} setBildirimSaat={setBildirimSaat}
            premium={premium} onPremiumAc={onPremiumAc}
            sesAcik={sesAcik} setSesAcik={setSesAcik}
            basliksiz
          />
        ) : altSayfa === 'liderlik' ? (
          <LiderlikEkrani profil={profil} setProfil={setProfil} hesapVarMi={hesapVarMi} />
        ) : altSayfa === 'ozet' ? (
          <HaftalikOzet gunluk={gunluk || {}} gunlukDers={gunlukDers || {}} denemeGecmisi={denemeGecmisi} seri={seri} onKapat={() => setAltSayfa(null)} />
        ) : (
          <HesapEkrani onVeriDegisti={onVeriDegisti} basliksiz />
        )}
      </KenardanGeriKaydir>
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
    <View style={{ flex: 1 }}>
      {/* Sabit üst şerit — kaydırılınca kaybolmaz, Ayarlar her zaman bir dokunuş uzakta */}
      <View style={{
        flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
        paddingTop: kenar.top + 10, paddingHorizontal: 20, paddingBottom: 4,
      }}>
        <TouchableOpacity onPress={() => { titre.hafif(); setAltSayfa('ayarlar'); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 40, height: 40, borderRadius: 14, backgroundColor: P.bgAlt,
            alignItems: 'center', justifyContent: 'center',
          }}>
          <Settings size={20} color={P.inkSoft} strokeWidth={2.1} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 28 }}>

      {/* ---------- HAFTALIK ÖZETİM: takibi kolay olsun diye en üstte ---------- */}
      <TouchableOpacity onPress={() => { titre.hafif(); setAltSayfa('ozet'); }} activeOpacity={0.85}
        style={[{ borderRadius: 18, overflow: 'hidden', marginBottom: 14 }, st_golge]}>
        <LinearGradient colors={['#B8860B', '#FFD966']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 15 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF33',
            alignItems: 'center', justifyContent: 'center', marginRight: 12,
          }}>
            <Sparkles size={20} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <Text style={{ flex: 1, fontFamily: FONT.govdeKalin, fontSize: 15, color: '#FFFFFF' }}>Haftalık Özetim</Text>
          <ChevronRight size={20} color="#FFFFFFCC" strokeWidth={2.4} />
        </LinearGradient>
      </TouchableOpacity>

      {/* ---------- KÜNYE: kompakt tek satır (eskisinin ~1/3'ü) ---------- */}
      <View style={[{ borderRadius: 18, overflow: 'hidden', marginBottom: 14 }, st_golge]}>
        <LinearGradient
          colors={premium ? ['#B8860B', '#FFD966'] : [sev.renk, sev.renk]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
          {premium && <HolografikParilti boyut={220} />}
          <View style={{
            width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF33',
            alignItems: 'center', justifyContent: 'center', marginRight: 12,
          }}>
            {premium ? <Crown size={22} color="#FFFFFF" strokeWidth={2.4} /> : <SeviyeIkon size={22} color="#FFFFFF" strokeWidth={2.4} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.baslik, fontSize: 17, color: '#FFFFFF' }}>{sev.ad}</Text>
            <View style={{ height: 5, backgroundColor: '#00000026', borderRadius: 999, marginTop: 5, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: sev.pct + '%', backgroundColor: '#FFFFFF', borderRadius: 999 }} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
            <SayacMetin deger={xp} style={{ fontFamily: FONT.monoBold, fontSize: 15, color: '#FFFFFF' }} sonEk=" XP" />
            {profil && profil.hedefNet ? (
              <Text style={{ fontSize: 11, color: '#FFFFFFCC', fontFamily: FONT.govde, marginTop: 2 }}>{profil.hedefNet} net hedef</Text>
            ) : null}
          </View>
        </LinearGradient>
      </View>

      {/* ---------- ÖZET SAYILAR: tek satır, nötr ---------- */}
      <View style={[st.kart, { flexDirection: 'row', paddingVertical: 16 }]}>
        {[
          { label: 'Öğrenilen', val: ogrenilenler, renk: P.yesil },
          { label: 'Gün Serisi', val: seri, renk: P.altin },
          { label: 'Ezberlenen', val: usta, renk: P.mor },
          { label: 'Tekrar', val: toplamReps, renk: P.mavi },
        ].map((it, i) => (
          <View key={it.label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: FONT.baslik, fontSize: 22, color: it.renk }}>{it.val}</Text>
            <Text style={{ fontSize: 11, color: P.inkFaint, fontFamily: FONT.govdeOrta, marginTop: 2 }}>{it.label}</Text>
          </View>
        ))}
      </View>

      {/* ---------- 7 GÜN İSTATİSTİĞİ ---------- */}
      <View style={st.kart}>
        <HaftalikGrafik gunluk={gunluk || {}} hedefKart={hedefKart || 30} />
      </View>

      {/* ---------- ÜNİTE ANALİZİ ---------- */}
      <View style={st.kart}>
        <UniteAnalizi srs={srs} />
      </View>

      {/* ---------- DERS BAZINDA ---------- */}
      <View style={st.kart}>
        <BolumBaslik Ikon={Library} baslik="DERS BAZINDA" renk={P.neon} />
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

      {/* ---------- ROZETLER: dokununca tam liste açılır ---------- */}
      <TouchableOpacity onPress={() => { titre.hafif(); setRozetModalAcik(true); }} activeOpacity={0.85}
        style={[st.kart, { flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{
          width: 42, height: 42, borderRadius: 14, backgroundColor: P.altin + '22',
          alignItems: 'center', justifyContent: 'center', marginRight: 13,
        }}>
          <Medal size={22} color={P.altin} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 15, color: P.ink }}>Rozetler</Text>
          <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.inkFaint, marginTop: 2 }}>
            {acikRozetSayisi} / {ROZETLER.length} kazanıldı
          </Text>
        </View>
        <ChevronRight size={20} color={P.inkFaint} strokeWidth={2.2} />
      </TouchableOpacity>

      {/* Rozet detay modalı */}
      <Modal visible={rozetModalAcik} animationType="slide" transparent onRequestClose={() => setRozetModalAcik(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: P.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26,
            paddingTop: 18, paddingHorizontal: 20, paddingBottom: 34, maxHeight: '82%',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ flex: 1, fontFamily: FONT.baslik, fontSize: 22, color: P.ink }}>Rozetlerin</Text>
              <TouchableOpacity onPress={() => setRozetModalAcik(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: P.bgAlt, alignItems: 'center', justifyContent: 'center' }}>
                <XIkon size={18} color={P.inkSoft} strokeWidth={2.2} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <RozetRow istatistikler={istatistikler} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ---------- AYARLAR / HESAP ---------- */}
      {[
        { id: 'ayarlar', ad: 'Ayarlar', alt: 'Hedefler, bildirimler, görünüm',
          Ikon: Settings, gradyan: ['#4776E6', '#8E54E9'] },
        { id: 'liderlik', ad: 'Liderlik', alt: 'Rumuzunla haftalık yarış',
          Ikon: Trophy, gradyan: ['#E52D27', '#F7971E'] },
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
        <Text style={{ fontSize: 12, color: P.inkFaint, fontFamily: FONT.mono }}>Ligo LGS Cepte · v4.17.0 · 6 ders</Text>
      </View>
      </ScrollView>
    </View>
  );
}

function AyarlarScreen({ profil, setProfil, hedefKart, setHedefKart, sinavTarihi, setSinavTarihi, bildirimAcik, setBildirimAcik, bildirimSaat, setBildirimSaat, basliksiz, premium, onPremiumAc, sesAcik, setSesAcik }) {
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

      {/* Ligo+ — her zaman erişilebilir giriş noktası, limite takılmayı beklemez */}
      {onPremiumAc && (
        <TouchableOpacity onPress={() => { titre.hafif(); onPremiumAc(); }} activeOpacity={0.85}
          style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 20 }}>
          <LinearGradient
            colors={premium ? ['#B8860B', '#FFD966'] : ['#4776E6', '#8E54E9']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
            <View style={{
              width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF33',
              alignItems: 'center', justifyContent: 'center', marginRight: 13,
            }}>
              <Crown size={22} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.govdeKalin, fontSize: 16, color: '#FFFFFF' }}>
                {premium ? 'Ligo+ Üyesin' : 'Ligo+\'a Yükselt'}
              </Text>
              <Text style={{ fontFamily: FONT.govde, fontSize: 12, color: '#FFFFFFCC', marginTop: 2 }}>
                {premium ? 'Aboneliğini yönet' : 'Sınırsız kart ve deneme sınavı'}
              </Text>
            </View>
            <ChevronRight size={20} color="#FFFFFFCC" strokeWidth={2.2} />
          </LinearGradient>
        </TouchableOpacity>
      )}

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

      <Text style={st.etiket}>SES EFEKTLERİ</Text>
      <TouchableOpacity onPress={() => { titre.hafif(); setSesAcik(a => !a); }}
        style={[st.hap, sesAcik && st.hapAktif, { marginBottom: 16, alignSelf: 'flex-start' }]}>
        <Text style={[st.hapYazi, sesAcik && { color: P.red, fontFamily: FONT.monoBold }]}>{sesAcik ? '☑ AÇIK' : '☐ KAPALI'}</Text>
      </TouchableOpacity>

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
// ============================================================
// AÇILIŞ EKRANI — Clash Royale tarzı hareketli yükleme
//
// Native splash (statik) kapandıktan hemen sonra devreye girer.
// Ligo zıplayarak büyür, halka döner, arka plan parıltıları
// yumuşakça belirir. Gerçek veri yüklenmesi bitince (en az
// MIN_SURE kadar beklendikten sonra) üstüne biner ve kaybolur.
// ============================================================
const AcilisEkrani_ARKAPLAN = (() => {
  try { return require('./assets/acilis/acilis-arkaplan.png'); } catch (e) { return null; }
})();
const AcilisEkrani_LIGO = (() => {
  try { return require('./assets/acilis/acilis-ligo.png'); } catch (e) { return null; }
})();

// Eski acilis-yukleniyor.png kaldırıldı: içine sahte şeffaflık dama deseni
// çizilmiş bir JPEG'ti ve halkanın kendi lacivert rengiyle bu dama deseni
// neredeyse aynı olduğundan güvenilir biçimde şeffaf PNG'ye çevrilemiyordu.
// Onun yerine halka doğrudan react-native-svg ile çiziliyor (bkz. AnimatedCircle,
// AcilisHalkasi) — hiçbir zaman PNG/JPEG sorunu yaşanmaz, her boyutta keskin kalır.
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function AcilisHalkasi({ boyut = 40, kalinlik = 4, trackRenk = 'rgba(255,255,255,0.18)', arkRenk = '#00D3FE', arkOrani = 0.72 }) {
  const r = (boyut - kalinlik) / 2;
  const cevre = 2 * Math.PI * r;
  const arkUzunluk = cevre * arkOrani;
  return (
    <Svg width={boyut} height={boyut}>
      <Circle cx={boyut / 2} cy={boyut / 2} r={r} stroke={trackRenk} strokeWidth={kalinlik} fill="none" />
      <AnimatedCircle
        cx={boyut / 2} cy={boyut / 2} r={r}
        stroke={arkRenk} strokeWidth={kalinlik} fill="none"
        strokeDasharray={arkUzunluk + ' ' + (cevre - arkUzunluk)}
        strokeLinecap="round"
        transform={'rotate(-90 ' + (boyut / 2) + ' ' + (boyut / 2) + ')'}
      />
    </Svg>
  );
}

function AcilisEkrani({ hazirMi, onBitti }) {
  const MIN_SURE = 1800; // en az bu kadar göster, veri hemen yüklense bile göz kırpıştırma hissi olmasın

  const ligoOlcek = useRef(new Animated.Value(0.4)).current;
  const ligoOpak = useRef(new Animated.Value(0)).current;
  const arkaplanOpak = useRef(new Animated.Value(0)).current;
  const donus = useRef(new Animated.Value(0)).current;
  const cikisOpak = useRef(new Animated.Value(1)).current;

  const [gecerliZaman, setGecerliZaman] = useState(false);
  const [cikiyor, setCikiyor] = useState(false);

  useEffect(() => {
    // Giriş animasyonu: arka plan yumuşak belirir, Ligo zıplayarak büyür
    Animated.timing(arkaplanOpak, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(ligoOpak, { toValue: 1, duration: 350, delay: 150, useNativeDriver: true }),
      Animated.spring(ligoOlcek, { toValue: 1, delay: 150, useNativeDriver: true, friction: 5, tension: 90 }),
    ]).start();

    // Yükleniyor halkasının sürekli dönüşü
    Animated.loop(
      Animated.timing(donus, { toValue: 1, duration: 950, easing: Easing.linear, useNativeDriver: true })
    ).start();

    const zamanlayici = setTimeout(() => setGecerliZaman(true), MIN_SURE);
    return () => clearTimeout(zamanlayici);
  }, []);

  useEffect(() => {
    if (!hazirMi || !gecerliZaman || cikiyor) return;
    setCikiyor(true);
    Animated.parallel([
      Animated.timing(cikisOpak, { toValue: 0, duration: 380, useNativeDriver: true }),
      Animated.timing(ligoOlcek, { toValue: 1.08, duration: 380, useNativeDriver: true }),
    ]).start(() => onBitti());
  }, [hazirMi, gecerliZaman]);

  const donusDerece = donus.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ flex: 1, backgroundColor: '#10121A', opacity: cikisOpak }}>
      {AcilisEkrani_ARKAPLAN && (
        <Animated.Image
          source={AcilisEkrani_ARKAPLAN}
          style={{ position: 'absolute', width: '100%', height: '100%', opacity: arkaplanOpak }}
          resizeMode="cover"
        />
      )}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {AcilisEkrani_LIGO && (
          <Animated.Image
            source={AcilisEkrani_LIGO}
            style={{
              width: 200, height: 200, resizeMode: 'contain',
              opacity: ligoOpak, transform: [{ scale: ligoOlcek }],
              marginBottom: 36,
            }}
          />
        )}

        <Animated.View style={{ transform: [{ rotate: donusDerece }] }}>
          <AcilisHalkasi boyut={40} kalinlik={4} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function Icerik() {
  const { P, koyu, seviyeHesapla } = useTema();
  const kenar = useSafeAreaInsets();
  const [tab, setTab] = useState('home');
  // sekmePan yalnızca ilk render'da donup kalıyor (useRef); içindeki
  // sekmeGec de o ilk render'ın "tab" değerini sonsuza dek hatırlıyor
  // olurdu. Bunun yerine güncel sekmeyi bu ref üzerinden okuyoruz —
  // ref nesnesinin kendisi paylaşıldığı için hangi eski kapanış
  // çağırırsa çağırsın .current her zaman en güncel sekmeyi taşır.
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const [srs, setSrs] = useState({});
  const [xp, setXp] = useState(0);
  const [seri, setSeri] = useState(0);
  const [bugun, setBugun] = useState(0);
  const [sonAktifGun, setSonAktifGun] = useState(null);
  const [gunluk, setGunluk] = useState({});        // { 'YYYY-MM-DD': kartSayisi }
  const [gunlukDers, setGunlukDers] = useState({}); // { 'YYYY-MM-DD': { dersId: sayi } }
  const [kutlama, setKutlama] = useState(null);     // { tur, veri } — tam ekran kutlama
  const [yeniRozet, setYeniRozet] = useState(null); // yeni açılan rozet — üstten kayan bildirim
  const rozetIlkKontrol = useRef(false);
  const [hedefKart, setHedefKart] = useState(30);
  const [sinavTarihi, setSinavTarihi] = useState('2027-06-14');
  const [sinavSayisi, setSinavSayisi] = useState(0);
  const [enIyiSinavPct, setEnIyiSinavPct] = useState(0);
  const [denemeGecmisi, setDenemeGecmisi] = useState([]); // [{tarih, dogru, toplam, pct, net}]
  const [bildirimAcik, setBildirimAcik] = useState(false);
  const [sesAcik, setSesAcik] = useState(true);
  const [bildirimSaat, setBildirimSaat] = useState(19);
  const [aktifDers, setAktifDers] = useState(null);
  const [mod, setMod] = useState(null);
  const [aktifUnite, setAktifUnite] = useState(null);
  const [aktifGrup, setAktifGrup] = useState(null); // Yol haritasından seçilen mini-grup kart id'leri
  const [sinavMod, setSinavMod] = useState(false);
  const [denemeDersSecimi, setDenemeDersSecimi] = useState(null); // null = Genel Deneme, yoksa dersId
  const [onboarded, setOnboarded] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [profil, setProfil] = useState({});
  const [yukluyor, setYukluyor] = useState(true);
  const [acilisTamam, setAcilisTamam] = useState(false);
  const [premium, setPremium] = useState(false);
  const [premiumEkraniAcik, setPremiumEkraniAcik] = useState(false);

  // Abonelik durumu: RevenueCat kullanılabiliyorsa gerçek sonucu, yoksa
  // (Expo Go, henüz native build alınmadı) her zaman "premium değil"
  // döner — güvenli/varsayılan taraf her zaman ücretsiz sürümdür.
  useEffect(() => {
    if (!oturum?.user?.id) { setPremium(false); return; }
    abonelikBaslat(oturum.user.id).then(() => {
      premiumMi().then(setPremium);
    });
  }, [oturum?.user?.id]);
  const [oturum, setOturum] = useState(null);
  const [oturumOkundu, setOturumOkundu] = useState(false);
  const [misafir, setMisafir] = useState(false);

  // Kaydırmalı sekme geçişi: yatay hareket baskınsa sekme değiştirir,
  // dikey scroll'larla (ders listesi, profil vb.) çakışmaz çünkü
  // yalnızca |dx| > |dy| olduğunda devreye girer.
  // ÖNEMLİ: Bu hook'lar, aşağıdaki koşullu return'lerden (yukluyor,
  // onboarding, setup vb.) etkilenmemesi için fonksiyonun en başında,
  // koşulsuz olarak çağrılır. Hooks kuralı: hook sayısı her render'da
  // aynı olmalı.
  const sekmeKaydir = useRef(new Animated.Value(0)).current;

  // ÖNEMLİ SIRALAMA: sekmePan (useRef+PanResponder.create) yalnızca İLK
  // render'da gerçekten oluşturulur ve o render'ın kapanışını (closure)
  // sonsuza dek saklar. sekmeGec bu yüzden sekmePan'DAN ÖNCE, tam olarak
  // tanımlanmış olarak burada durmalı — aksi hâlde ilk render bir erken
  // return'e çarparsa (açılış ekranı, yukluyor, onboarding vb.) sekmeGec
  // hiç ilklenmeden kapanışa kilitlenir ve ilk kaydırmada "tanımsız
  // fonksiyon" hatası verir.
  const sekmeGec = (yon) => {
    const idx = SEKME_SIRASI.indexOf(tabRef.current);
    const yeniIdx = idx + yon;
    if (yeniIdx < 0 || yeniIdx >= SEKME_SIRASI.length) {
      Animated.sequence([
        Animated.timing(sekmeKaydir, { toValue: yon * -18, duration: 90, useNativeDriver: true }),
        Animated.spring(sekmeKaydir, { toValue: 0, useNativeDriver: true, bounciness: 10 }),
      ]).start();
      return;
    }
    titre.hafif();
    setTab(SEKME_SIRASI[yeniIdx]);
  };
  const sekmePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
    onPanResponderMove: (_, g) => sekmeKaydir.setValue(g.dx * 0.25),
    onPanResponderRelease: (_, g) => {
      Animated.spring(sekmeKaydir, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      if (g.dx < -70) sekmeGec(1);
      else if (g.dx > 70) sekmeGec(-1);
    },
  })).current;

  useEffect(() => {
    (async () => {
      try {
        const keys = ['lgs_srs', 'lgs_xp', 'lgs_seri', 'lgs_bugun', 'lgs_hedef', 'lgs_onboarded', 'lgs_setup', 'lgs_profil',
          'lgs_son_aktif', 'lgs_sinav_tarihi', 'lgs_sinav_sayisi', 'lgs_en_iyi_sinav', 'lgs_bildirim_acik', 'lgs_bildirim_saat', 'lgs_gunluk', 'lgs_misafir', 'lgs_deneme_gecmisi', 'lgs_gunluk_ders', 'lgs_ses_acik'];
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
        if (d.lgs_ses_acik !== undefined) setSesAcik(d.lgs_ses_acik !== '0');
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
          ['lgs_ses_acik', sesAcik ? '1' : '0'],
          ['lgs_bildirim_saat', String(bildirimSaat)],
          ['lgs_gunluk', JSON.stringify(gunluk)],
          ['lgs_deneme_gecmisi', JSON.stringify(denemeGecmisi)],
          ['lgs_gunluk_ders', JSON.stringify(gunlukDers)],
        ]);
      } catch (e) { console.log('Save error:', e); }
    })();
  }, [srs, xp, seri, bugun, hedefKart, yukluyor, onboarded, setupDone, profil, sonAktifGun, sinavTarihi, sinavSayisi, enIyiSinavPct, bildirimAcik, bildirimSaat, gunluk, denemeGecmisi, gunlukDers, sesAcik]);

  // Ses ayarını lib/sesler.js'e senkronize et
  useEffect(() => { sesAyarla(sesAcik); }, [sesAcik]);

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
    if (dogruMu) {
      setXp(x => {
        const yeni = x + 10;
        // Seviye atlama anını yakala — künyedeki rütbe değiştiyse kutlama tetiklenir
        const eskiSev = seviyeHesapla(x).ad;
        const yeniSev = seviyeHesapla(yeni).ad;
        if (eskiSev !== yeniSev) {
          setTimeout(() => { sesCal('seviye'); setKutlama({ tur: 'seviye', veri: { yeniSev } }); }, 400);
        }
        return yeni;
      });
    }
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

  const sinavBaslat = (dersId) => {
    if (!premium && buHaftaDenemeSayisi(denemeGecmisi) >= 1) {
      setPremiumEkraniAcik(true);
      return;
    }
    setDenemeDersSecimi(dersId || null);
    setSinavMod(true); setAktifDers('sinav'); setMod('quiz'); setAktifUnite(null);
  };
  const cikis = () => { setAktifDers(null); setMod(null); setSinavMod(false); setAktifUnite(null); setAktifGrup(null); setDenemeDersSecimi(null); };

  // Yeni rozet tespiti — her srs/seri/sınav değişiminde kontrol eder.
  // İlk kontrolde (uygulama ilk açılışta veri yüklenince) zaten kazanılmış
  // rozetleri sessizce "görülmüş" sayar — eski bir kullanıcıya "yeni
  // kazandın!" diye yanlış bir bildirim çıkmasın diye.
  useEffect(() => {
    if (yukluyor) return;
    const ogrenilen = Object.values(srs).filter(d => d.seviye >= 3).length;
    const usta = Object.values(srs).filter(d => d.seviye === 7).length;
    const toplamReps = Object.values(srs).reduce((a, d) => a + (d.reps || 0), 0);
    const ist = { seri, ogrenilen, usta, toplamReps, sinavSayisi, enIyiSinavPct };
    const acikOlanlar = ROZETLER.filter(r => r.kosul(ist)).map(r => r.id);

    AsyncStorage.getItem('lgs_gorulen_rozetler').then(v => {
      let gorulen = [];
      try { gorulen = v ? JSON.parse(v) : []; } catch (e) {}

      if (!rozetIlkKontrol.current) {
        rozetIlkKontrol.current = true;
        const birlesik = Array.from(new Set([...gorulen, ...acikOlanlar]));
        if (birlesik.length !== gorulen.length) {
          AsyncStorage.setItem('lgs_gorulen_rozetler', JSON.stringify(birlesik)).catch(() => {});
        }
        return;
      }

      const yeniAcilan = ROZETLER.find(r => acikOlanlar.includes(r.id) && !gorulen.includes(r.id));
      if (yeniAcilan) {
        AsyncStorage.setItem('lgs_gorulen_rozetler', JSON.stringify([...gorulen, yeniAcilan.id])).catch(() => {});
        titre.dogru();
        sesCal('seviye');
        setYeniRozet(yeniAcilan);
        setTimeout(() => setYeniRozet(null), 4000);
      }
    }).catch(() => {});
  }, [srs, seri, sinavSayisi, enIyiSinavPct, yukluyor]);

  if (!acilisTamam) return (
    <AcilisEkrani
      hazirMi={!yukluyor && oturumOkundu}
      onBitti={() => setAcilisTamam(true)}
    />
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

  // Premium ekranı hangi durumdan tetiklenirse tetiklensin (ModSecim'deki
  // Quiz butonu, ana sayfadaki deneme sınavı butonu vb.) her zaman bütün
  // ekranı devralır — böylece alt akışların her birine ayrı ayrı entegre
  // etmemize gerek kalmaz.
  if (premiumEkraniAcik) return (
    <PremiumEkrani
      onKapat={() => setPremiumEkraniAcik(false)}
      onSatinAlindi={() => { setPremium(true); setPremiumEkraniAcik(false); }}
    />
  );

  if (aktifDers && !mod) return (
    <KenardanGeriKaydir onGeri={cikis}>
      <ModSecim ders={aktifDers} srs={srs} onGeri={cikis}
        premium={premium} bugun={bugun}
        onLimitAsildi={() => setPremiumEkraniAcik(true)}
        onBaslat={(m, u, grupIdler) => { setAktifUnite(u); setAktifGrup(grupIdler || null); setMod(m); }} />
    </KenardanGeriKaydir>
  );

  if (aktifDers && mod) {
    const quizMi = mod === 'quiz';
    // Quiz modunda şıkkı olmayan kart tek seçenek gösterir; bu da doğru
    // cevabın kendisidir. Bu yüzden quizde yalnızca şıklı kartlar kullanılır.
    const uygun = (liste) => quizMi ? liste.filter(c => c.secenekler) : liste;

    let kartlar;
    if (sinavMod) {
      kartlar = denemeDersSecimi
        ? denemeKurTekDers(CARDS, denemeDersSecimi, 20)
        : denemeKur(CARDS, 30);
    }
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
          <KenardanGeriKaydir onGeri={cikis}>
            <KonuCalisma kartlar={kartlar} onBitti={cikis} />
          </KenardanGeriKaydir>
          <RozetBildirimi rozet={yeniRozet} onKapat={() => setYeniRozet(null)} />
        </React.Fragment>
      );
    }

    return (
      <React.Fragment>
        <StatusBar barStyle="light-content" backgroundColor={FOCUS.bg} />
        <KenardanGeriKaydir onGeri={cikis} aktif={!sinavMod}>
        <KartModu kartlar={kartlar} mod={mod} sinavMod={sinavMod}
          sinavSuresi={denemeDersSecimi ? 1500 : 2400} srs={srs}
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
        </KenardanGeriKaydir>
        <RozetBildirimi rozet={yeniRozet} onKapat={() => setYeniRozet(null)} />
      </React.Fragment>
    );
  }

  return (
    <Sayfa>
      <Animated.View style={{ flex: 1, transform: [{ translateX: sekmeKaydir }] }} {...sekmePan.panHandlers}>
        {tab === 'home' && <HomeScreen srs={srs} xp={xp} seri={seri} bugun={bugun} hedefKart={hedefKart} onDersBaslat={setAktifDers} sinavTarihi={sinavTarihi} profil={profil} onDenemeSekmesi={() => setTab('deneme')} onProfil={() => setTab('profil')} denemeGecmisi={denemeGecmisi} gunluk={gunluk} gunlukDers={gunlukDers} hesapVarMi={!!oturum} premium={premium} />}
        {tab === 'dersler' && <DerslerScreen srs={srs} onDersBaslat={setAktifDers} />}
        {tab === 'deneme' && <DenemeEkrani srs={srs} denemeGecmisi={denemeGecmisi} premium={premium} onBaslat={sinavBaslat} />}
        {tab === 'notlar' && <SinavNotlariEkrani />}
        {tab === 'profil' && (
          <ProfilScreen
            srs={srs} xp={xp} seri={seri} profil={profil} setProfil={setProfil}
            sinavSayisi={sinavSayisi} enIyiSinavPct={enIyiSinavPct}
            hedefKart={hedefKart} setHedefKart={setHedefKart}
            sinavTarihi={sinavTarihi} setSinavTarihi={setSinavTarihi}
            bildirimAcik={bildirimAcik} setBildirimAcik={setBildirimAcik}
            bildirimSaat={bildirimSaat} setBildirimSaat={setBildirimSaat}
            gunluk={gunluk} gunlukDers={gunlukDers} denemeGecmisi={denemeGecmisi}
            onVeriDegisti={yereldenTazele}
            hesapVarMi={!!oturum}
            premium={premium}
            onPremiumAc={() => setPremiumEkraniAcik(true)}
            sesAcik={sesAcik} setSesAcik={setSesAcik}
          />
        )}
      </Animated.View>


      {/* Hedef tamamlandığında tam ekran kutlama */}
      {kutlama && (
        <Kutlama
          tur={kutlama.tur}
          seri={seri}
          xp={xp}
          hedefKart={hedefKart}
          veri={kutlama.veri}
          onKapat={() => setKutlama(null)}
        />
      )}

      <RozetBildirimi rozet={yeniRozet} onKapat={() => setYeniRozet(null)} />

      <StatusBar barStyle={koyu ? 'light-content' : 'dark-content'} backgroundColor={P.bg} />
      <TabBar tab={tab} setTab={setTab} premium={premium} />
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