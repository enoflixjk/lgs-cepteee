import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Feather, Calculator, Atom, Landmark, Compass, Languages,
  Sprout, BookOpenCheck, Zap, Gem, Swords, Crown,
} from 'lucide-react-native';

// ============================================================
// TASARIM DİLİ v5 — "Oyun"
//
// LGS'ye hazırlanan bir öğrencinin akşam masası: mavi tükenmez
// mürekkebi zemin, kağıt beyazı yazı, fosforlu kalem vurguları.
// İmza: seçili/aktif her şey fosforla işaretlenmiş gibi görünür.
// ============================================================

export const KARANLIK = {
  koyu: true,

  // OYUN — gece versiyonu: aynı canlı renkler, koyu petrol mavisi zemin
  bg: '#131F2B',
  bgAlt: '#1A2836',
  yuzey: '#1C2B3A',
  yuzeyKati: '#1F3040',
  yuzey2: '#243748',
  line: '#2E4356',
  lineKoyu: '#0D161F',
  cam: 'rgba(255,255,255,0.08)',

  ink: '#F2F5F8',
  inkSoft: '#A7B4C2',
  inkFaint: '#6D7F90',

  neon: '#1CB0F6',
  neonKoyu: '#1386C7',
  neonZemin: 'rgba(28,176,246,0.16)',

  yesil: '#58D23C',
  yesilKoyu: '#3FA826',
  yesilZemin: 'rgba(88,210,60,0.15)',

  mavi: '#1CB0F6',
  maviKoyu: '#1386C7',
  maviZemin: 'rgba(28,176,246,0.15)',

  kirmizi: '#FF5C5C',
  kirmiziKoyu: '#D93636',
  kirmiziZemin: 'rgba(255,92,92,0.15)',

  altin: '#FFC400',
  altinKoyu: '#E0A200',
  altinZemin: 'rgba(255,196,0,0.15)',

  mor: '#B77CFF',
  morKoyu: '#8E54E0',
  morZemin: 'rgba(183,124,255,0.15)',
  morSoft: 'rgba(183,124,255,0.15)',

  alev: '#FF9500',

  red: '#FF5C5C',
  redSoft: 'rgba(255,92,92,0.15)',
  green: '#58D23C',
  vurguZemin: 'rgba(28,176,246,0.15)',
  notKagit: '#1F3040',
  notYazi: '#F2F5F8',

  golgeRenk: '#000000',
};

// Aydınlık tema — aynı yapı, gündüz okunabilirliği için
export const AYDINLIK = {
  koyu: false,

  // OYUN — beyaz zemin, doygun renkler, basılabilir yüzeyler.
  // Kenarlar yumuşak gri değil, belirgin; alt kenarlar koyu (3D his).
  bg: '#FFFFFF',
  bgAlt: '#F4F5F9',
  yuzey: '#FFFFFF',
  yuzeyKati: '#FFFFFF',
  yuzey2: '#F4F5F9',
  line: '#E3E5EC',
  lineKoyu: '#CFD3DE',
  cam: 'rgba(43,45,66,0.05)',

  ink: '#2B2D42',
  inkSoft: '#6A6D82',
  inkFaint: '#A2A5B8',

  // Seçili/aktif: parlak mavi
  neon: '#1CA7F2',
  neonKoyu: '#1386C7',
  neonZemin: '#DDF3FF',

  yesil: '#3DBE29',
  yesilKoyu: '#2E9A1E',
  yesilZemin: '#E3F8DD',

  mavi: '#1CA7F2',
  maviKoyu: '#1386C7',
  maviZemin: '#DDF3FF',

  kirmizi: '#FF4B4B',
  kirmiziKoyu: '#D93636',
  kirmiziZemin: '#FFE4E4',

  // Ligo sarısı — yazı olarak da okunsun diye bir tık koyu
  altin: '#E89B00',
  altinKoyu: '#C98200',
  altinZemin: '#FFF4D6',

  mor: '#A560F0',
  morKoyu: '#8443D1',
  morZemin: '#F2E8FF',
  morSoft: '#F2E8FF',

  alev: '#FF8A00',

  red: '#FF4B4B',
  redSoft: '#FFE4E4',
  green: '#3DBE29',
  vurguZemin: '#DDF3FF',
  notKagit: '#2B2D42',
  notYazi: '#FFFFFF',

  golgeRenk: '#2B2D42',
};

// Göz Dostu Sepya — gece geç saatte çalışanlar için, saf beyaz/mavi
// ışık yerine yumuşak, kahve/krem tonlu bir okuma yüzeyi. Aydınlık
// temayla AYNI anahtar setini kullanır — hiçbir bileşenin bilmesi
// gerekmez, sadece renkler değişir.
export const SEPYA = {
  koyu: false,

  bg: '#F4ECD8',
  bgAlt: '#EBE0C7',
  yuzey: '#FBF6E9',
  yuzeyKati: '#FBF6E9',
  yuzey2: '#F1E7CF',
  line: 'rgba(59,47,31,0.12)',
  lineKoyu: 'rgba(59,47,31,0.18)',
  cam: 'rgba(59,47,31,0.06)',

  ink: '#3B2F1F',
  inkSoft: '#6B5842',
  inkFaint: '#9C8A6E',

  neon: '#8B5A2B',
  neonKoyu: '#6B4520',
  neonZemin: 'rgba(139,90,43,0.12)',

  yesil: '#5F7A4A',
  yesilKoyu: '#465C37',
  yesilZemin: 'rgba(95,122,74,0.12)',

  mavi: '#5B7A96',
  maviKoyu: '#456080',
  maviZemin: 'rgba(91,122,150,0.12)',

  kirmizi: '#A6462F',
  kirmiziKoyu: '#833623',
  kirmiziZemin: 'rgba(166,70,47,0.12)',

  altin: '#B8842E',
  altinKoyu: '#93691F',
  altinZemin: 'rgba(184,132,46,0.12)',

  mor: '#7A5A7A',
  morKoyu: '#5F455F',
  morZemin: 'rgba(122,90,122,0.12)',

  alev: '#B8622E',
  morSoft: 'rgba(122,90,122,0.12)',
  green: '#5F7A4A',
  golgeRenk: '#3B2F1F',

  red: '#A6462F',
  redSoft: 'rgba(166,70,47,0.12)',
  vurguZemin: 'rgba(139,90,43,0.12)',
  notKagit: '#3B2F1F',
  notYazi: '#F4ECD8',
};

// Çalışma ekranı — her iki temada da en koyu hali
export const FOCUS = {
  // Koyu çalışma paleti — Gece teması ve özel koyu ekranlar (Premium, Odak)
  bg: '#131F2B',
  panel: '#1C2B3A',
  panelKati: '#1F3040',
  panel2: '#243748',
  line: '#2E4356',
  text: '#F2F5F8',
  textSoft: '#A7B4C2',
  ember: '#FFC400',
  emberSoft: 'rgba(255,196,0,0.16)',
  green: '#58D23C',
  greenDark: '#3FA826',
  red: '#FF5C5C',
  redDark: '#D93636',
  blue: '#1CB0F6',
  blueDark: '#1386C7',
};

// Açık çalışma paleti — Aydınlık/Sepya temada Kart, Quiz ve Konu Çalışma
// ekranları bunu kullanır. FOCUS ile birebir aynı anahtarlar.
export const CALISMA_ACIK = {
  bg: '#F4F5F9',
  panel: '#FFFFFF',
  panelKati: '#FFFFFF',
  panel2: '#EBEDF3',
  line: '#E3E5EC',
  text: '#2B2D42',
  textSoft: '#6A6D82',
  ember: '#E89B00',
  emberSoft: '#FFF4D6',
  green: '#3DBE29',
  greenDark: '#2E9A1E',
  red: '#FF4B4B',
  redDark: '#D93636',
  blue: '#1CA7F2',
  blueDark: '#1386C7',
};

export const FONT = {
  serif: 'Baloo2_700Bold',
  baslik: 'Baloo2_800ExtraBold',
  govde: 'Baloo2_500Medium',
  govdeOrta: 'Baloo2_600SemiBold',
  govdeKalin: 'Baloo2_700Bold',
  mono: 'Baloo2_600SemiBold',
  monoBold: 'Baloo2_800ExtraBold',
};

// ============================================================
// DERSLER — 135° gradyanlar + filigran görselleri
// ============================================================
const DERS_TANIM = [
  // Oyun paleti: her ders tek bir doygun renk; ikinci ton butonun
  // "basılabilir" alt kenarı olarak kullanılır.
  { id: 'turkce',    ad: 'Türkçe',          ikon: Feather,    g: ['#FF5CA8', '#D12A7C'], r: '#FF4FA0', rk: '#D12A7C', gorsel: 'turkce' },
  { id: 'mat',       ad: 'Matematik',       ikon: Calculator, g: ['#3DBE29', '#2E9A1E'], r: '#3DBE29', rk: '#2E9A1E', gorsel: 'matematik' },
  { id: 'fen',       ad: 'Fen Bilimleri',   ikon: Atom,       g: ['#1CA7F2', '#1386C7'], r: '#1CA7F2', rk: '#1386C7', gorsel: 'fen' },
  { id: 'inkilap',   ad: 'İnkılap Tarihi',  ikon: Landmark,   g: ['#FF6A3D', '#D9431A'], r: '#FF6A3D', rk: '#D9431A', gorsel: 'inkilap' },
  { id: 'din',       ad: 'Din Kültürü',     ikon: Compass,    g: ['#FFB800', '#D08A00'], r: '#F2A900', rk: '#D08A00', gorsel: 'din' },
  { id: 'ingilizce', ad: 'İngilizce',       ikon: Languages,  g: ['#A560F0', '#8443D1'], r: '#A560F0', rk: '#8443D1', gorsel: 'ingilizce' },
];

export const derslerAl = () => DERS_TANIM.map(d => ({
  id: d.id, ad: d.ad, ikon: d.ikon,
  gradyan: d.g,
  renk: d.r,
  renkKoyu: d.rk,
  acik: d.r + '24',
  gorsel: d.gorsel,
}));

// ============================================================
// SEVİYELER
// ============================================================
// r/rk: karanlık temada · ar/ark: aydınlık temada
const SEVIYE_TANIM = [
  { ad: 'Çaylak',  minXp: 0,    ikon: Sprout,        r: '#58D23C', rk: '#3FA826', ar: '#3DBE29', ark: '#2E9A1E' },
  { ad: 'Öğrenci', minXp: 100,  ikon: BookOpenCheck, r: '#1CB0F6', rk: '#1386C7', ar: '#1CA7F2', ark: '#1386C7' },
  { ad: 'Azimli',  minXp: 300,  ikon: Zap,           r: '#FF9500', rk: '#D97600', ar: '#FF8A00', ark: '#D97000' },
  { ad: 'Uzman',   minXp: 600,  ikon: Gem,           r: '#B77CFF', rk: '#8E54E0', ar: '#A560F0', ark: '#8443D1' },
  { ad: 'Usta',    minXp: 1200, ikon: Swords,        r: '#FF5CA8', rk: '#D12A7C', ar: '#FF4FA0', ark: '#D12A7C' },
  { ad: 'Efsane',  minXp: 2500, ikon: Crown,         r: '#FFC400', rk: '#E0A200', ar: '#E89B00', ark: '#C98200' },
];

export const xpdenSeviye = (xp, koyu = true) => {
  const liste = SEVIYE_TANIM.map(s => ({
    ad: s.ad, minXp: s.minXp, ikon: s.ikon,
    renk: koyu ? s.r : s.ar,
    renkKoyu: koyu ? s.rk : s.ark,
  }));
  let g = liste[0];
  for (const s of liste) { if (xp >= s.minXp) g = s; }
  const sir = liste.find(s => s.minXp > xp);
  const pct = sir ? Math.round(((xp - g.minXp) / (sir.minXp - g.minXp)) * 100) : 100;
  return { ...g, siradaki: sir, pct };
};

// ============================================================
// STİLLER
// ============================================================
export function yapStiller(P, altBosluk = 12) {
  // OYUN: gölge yok — derinliği kalın alt kenar veriyor (basılabilir his).
  const golge = { shadowOpacity: 0, elevation: 0 };
  const kabartma = {
    borderWidth: 2, borderColor: P.line,
    borderBottomWidth: 4, borderBottomColor: P.lineKoyu,
  };

  return StyleSheet.create({
    golge,
    kabartma,

    kart: { backgroundColor: P.yuzey, ...kabartma, borderRadius: 20, padding: 18, marginBottom: 14 },
    kartBasilir: { backgroundColor: P.yuzey, ...kabartma, borderRadius: 20, padding: 18, marginBottom: 14 },
    focusCard: {
      backgroundColor: FOCUS.panel,
      borderWidth: 2, borderColor: FOCUS.line,
      borderRadius: 20, padding: 16, alignItems: 'center',
    },

    sayfaBaslik: { fontFamily: FONT.baslik, fontSize: 30, color: P.ink, marginBottom: 6, marginTop: 4 },
    ustEtiket: { fontFamily: FONT.govdeKalin, fontSize: 14, color: P.inkSoft },

    dersSatir: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: P.yuzey, ...kabartma,
      borderRadius: 18, padding: 16, marginBottom: 12,
    },

    miniIstatistik: { flex: 1, backgroundColor: P.yuzey, ...kabartma, borderRadius: 18, padding: 14 },

    // ---------- SEKME ÇUBUĞU ----------
    sekmeCubugu: {
      flexDirection: 'row',
      borderTopWidth: 2, borderTopColor: P.line,
      backgroundColor: P.yuzey,
      paddingTop: 10, paddingBottom: altBosluk,
    },
    sekme: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    sekmeKapsul: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
    sekmeYazi: { fontSize: 12, color: P.inkFaint, fontFamily: FONT.govdeKalin, marginTop: 2 },
    sekmeIsaret: { width: 0, height: 0 },

    girdi: {
      backgroundColor: P.yuzey2,
      borderWidth: 2, borderColor: P.line,
      borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 17, color: P.ink, fontFamily: FONT.govde, marginBottom: 14,
    },
    secenek: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: P.yuzey, ...kabartma,
      borderRadius: 16, padding: 16, marginBottom: 12,
    },
    secenekAktif: {
      borderColor: P.neon, borderBottomColor: P.neonKoyu, backgroundColor: P.neonZemin,
    },
    secenekYazi: { fontSize: 17, color: P.ink, fontFamily: FONT.govdeOrta },

    etiket: {
      fontFamily: FONT.govdeKalin, fontSize: 14, color: P.inkSoft,
      letterSpacing: 0.3, marginBottom: 10, marginTop: 10,
    },

    hap: {
      ...kabartma,
      borderRadius: 14, paddingVertical: 11, paddingHorizontal: 16,
      backgroundColor: P.yuzey,
    },
    hapAktif: { borderColor: P.neon, borderBottomColor: P.neonKoyu, backgroundColor: P.neonZemin },
    hapYazi: { fontSize: 15, fontFamily: FONT.govdeKalin, color: P.ink },

    uniteHap: {
      ...kabartma,
      borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14,
      backgroundColor: P.yuzey, marginRight: 10, width: 148,
    },
  });
}

// ============================================================
// BAĞLAM
// ============================================================
const TemaBaglami = createContext(null);

export function TemaSaglayici({ koyu, setKoyu, sepya, setSepya, altBosluk, children }) {
  const deger = useMemo(() => {
    // Sepya, koyu/aydınlık seçiminden BAĞIMSIZ, üçüncü bir seçenek —
    // etkinse diğer ikisinin önüne geçer. Bu sayede App.js'teki
    // mevcut `koyu` mantığına hiç dokunmadan eklenebildi.
    const P = sepya ? SEPYA : (koyu ? KARANLIK : AYDINLIK);
    return {
      P, koyu, setKoyu, sepya, setSepya,
      s: yapStiller(P, altBosluk),
      DERSLER: derslerAl(),
      seviyeHesapla: (xp) => xpdenSeviye(xp, koyu),
    };
  }, [koyu, setKoyu, sepya, setSepya, altBosluk]);
  return <TemaBaglami.Provider value={deger}>{children}</TemaBaglami.Provider>;
}

export function useTema() {
  const t = useContext(TemaBaglami);
  if (!t) {
    const P = KARANLIK;
    return {
      P, koyu: true, setKoyu: () => {}, sepya: false, setSepya: () => {}, s: yapStiller(P),
      DERSLER: derslerAl(), seviyeHesapla: (x) => xpdenSeviye(x, true),
    };
  }
  return t;
}

// Eski isimlerle uyum
export const KAGIT = KARANLIK;
export const GECE = KARANLIK;