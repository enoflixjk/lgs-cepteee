import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  Feather, Calculator, Atom, Landmark, Compass, Languages,
  Sprout, BookOpenCheck, Zap, Gem, Swords, Crown,
} from 'lucide-react-native';

// ============================================================
// TASARIM DİLİ v3 — "Gece Panosu"
//
// Koyu lacivert zemin, cam etkili yüzen kartlar, neon vurgular.
// Çocuksu değil; 14 yaşındaki bir öğrencinin "havalı" bulacağı,
// oyun arayüzlerinden beslenen profesyonel bir kontrol paneli.
// ============================================================

export const KARANLIK = {
  koyu: true,

  bg: '#10121A',
  bgAlt: '#161926',
  // Cam yüzey: arka plandan saydamlıkla ayrılır
  yuzey: 'rgba(255,255,255,0.055)',
  yuzeyKati: '#1A1E2C',
  yuzey2: 'rgba(255,255,255,0.09)',
  line: 'rgba(255,255,255,0.10)',
  lineKoyu: 'rgba(0,0,0,0.35)',
  cam: 'rgba(255,255,255,0.13)',

  ink: '#F2F5FF',
  inkSoft: '#9BA3BD',
  inkFaint: '#5F6880',

  neon: '#00D4FF',
  neonKoyu: '#0083B0',
  neonZemin: 'rgba(0,212,255,0.14)',

  yesil: '#38EF7D',
  yesilKoyu: '#11998E',
  yesilZemin: 'rgba(56,239,125,0.14)',

  mavi: '#00C6FF',
  maviKoyu: '#0072FF',
  maviZemin: 'rgba(0,198,255,0.14)',

  kirmizi: '#FF5A5F',
  kirmiziKoyu: '#B31217',
  kirmiziZemin: 'rgba(255,90,95,0.14)',

  altin: '#FFB020',
  altinKoyu: '#E5860B',
  altinZemin: 'rgba(255,176,32,0.14)',

  mor: '#D04ED6',
  morKoyu: '#834D9B',
  morZemin: 'rgba(208,78,214,0.14)',

  alev: '#FF6B35',

  // Eski kodla uyum
  red: '#FF5A5F',
  redSoft: 'rgba(255,90,95,0.14)',
  vurguZemin: 'rgba(0,198,255,0.14)',
  notKagit: '#1A1E2C',
  notYazi: '#F2F5FF',
};

// Aydınlık tema — aynı yapı, gündüz okunabilirliği için
export const AYDINLIK = {
  koyu: false,

  bg: '#F4F6FB',
  bgAlt: '#EAEEF7',
  yuzey: '#FFFFFF',
  yuzeyKati: '#FFFFFF',
  yuzey2: '#F0F3FA',
  line: 'rgba(16,18,26,0.09)',
  lineKoyu: 'rgba(16,18,26,0.14)',
  cam: 'rgba(16,18,26,0.05)',

  ink: '#10121A',
  inkSoft: '#5A6478',
  inkFaint: '#98A1B5',

  neon: '#0083B0',
  neonKoyu: '#00658A',
  neonZemin: 'rgba(0,131,176,0.10)',

  yesil: '#11998E',
  yesilKoyu: '#0C7A71',
  yesilZemin: 'rgba(17,153,142,0.10)',

  mavi: '#0072FF',
  maviKoyu: '#0059C7',
  maviZemin: 'rgba(0,114,255,0.10)',

  kirmizi: '#E52D27',
  kirmiziKoyu: '#B31217',
  kirmiziZemin: 'rgba(229,45,39,0.10)',

  altin: '#E5860B',
  altinKoyu: '#B96A05',
  altinZemin: 'rgba(229,134,11,0.10)',

  mor: '#834D9B',
  morKoyu: '#663A7A',
  morZemin: 'rgba(131,77,155,0.10)',

  alev: '#FF6B35',

  red: '#E52D27',
  redSoft: 'rgba(229,45,39,0.10)',
  vurguZemin: 'rgba(0,114,255,0.10)',
  notKagit: '#10121A',
  notYazi: '#FFFFFF',
};

// Çalışma ekranı — her iki temada da en koyu hali
export const FOCUS = {
  bg: '#0B0D14',
  panel: 'rgba(255,255,255,0.055)',
  panelKati: '#161926',
  panel2: 'rgba(255,255,255,0.09)',
  line: 'rgba(255,255,255,0.11)',
  text: '#F2F5FF',
  textSoft: '#9BA3BD',
  ember: '#FFB020',
  emberSoft: 'rgba(255,176,32,0.16)',
  green: '#38EF7D',
  greenDark: '#11998E',
  red: '#FF5A5F',
  redDark: '#B31217',
  blue: '#00C6FF',
  blueDark: '#0072FF',
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
  {
    id: 'turkce', ad: 'Türkçe', ikon: Feather,
    g: ['#834D9B', '#D04ED6'],        // mor / pembe
    r: '#D04ED6', rk: '#834D9B',
    gorsel: 'turkce',
  },
  {
    id: 'mat', ad: 'Matematik', ikon: Calculator,
    g: ['#11998E', '#38EF7D'],        // siber yeşil
    r: '#38EF7D', rk: '#11998E',
    gorsel: 'matematik',
  },
  {
    id: 'fen', ad: 'Fen Bilimleri', ikon: Atom,
    g: ['#00C6FF', '#0072FF'],        // neon mavi
    r: '#00C6FF', rk: '#0072FF',
    gorsel: 'fen',
  },
  {
    id: 'inkilap', ad: 'İnkılap Tarihi', ikon: Landmark,
    g: ['#E52D27', '#B31217'],        // derin kırmızı
    r: '#E52D27', rk: '#B31217',
    gorsel: 'inkilap',
  },
  {
    id: 'din', ad: 'Din Kültürü', ikon: Compass,
    g: ['#F7971E', '#FFD200'],        // amber / altın
    r: '#F7971E', rk: '#D97C06',
    gorsel: 'din',
  },
  {
    id: 'ingilizce', ad: 'İngilizce', ikon: Languages,
    g: ['#4776E6', '#8E54E9'],        // indigo / menekşe
    r: '#8E54E9', rk: '#4776E6',
    gorsel: 'ingilizce',
  },
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
  { ad: 'Çaylak',  minXp: 0,    ikon: Sprout,        r: '#4A7DFF', rk: '#2B4FCC', ar: '#7BA4FF', ark: '#4A7DFF' },
  { ad: 'Öğrenci', minXp: 100,  ikon: BookOpenCheck, r: '#00C6FF', rk: '#0072FF', ar: '#3DA9FF', ark: '#0072FF' },
  { ad: 'Azimli',  minXp: 300,  ikon: Zap,           r: '#38EF7D', rk: '#11998E', ar: '#2BC46A', ark: '#11998E' },
  { ad: 'Uzman',   minXp: 600,  ikon: Gem,           r: '#D04ED6', rk: '#834D9B', ar: '#B93FC0', ark: '#834D9B' },
  { ad: 'Usta',    minXp: 1200, ikon: Swords,        r: '#FF8A3D', rk: '#E0561A', ar: '#F4762A', ark: '#C74A11' },
  { ad: 'Efsane',  minXp: 2500, ikon: Crown,         r: '#FFD200', rk: '#F7971E', ar: '#E8A200', ark: '#C77A00' },
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
  // Yüzen kart gölgesi — brifteki 0 8px 20px rgba(0,0,0,0.2)
  const golge = {
    shadowColor: '#000',
    shadowOpacity: P.koyu ? 0.45 : 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  };

  return StyleSheet.create({
    golge,

    // Cam kart: saydam yüzey + ince kenar
    kart: {
      backgroundColor: P.yuzey,
      borderWidth: 1, borderColor: P.line,
      borderRadius: 20, padding: 18, marginBottom: 14,
      ...golge,
    },
    kartBasilir: {
      backgroundColor: P.yuzey,
      borderWidth: 1, borderColor: P.line,
      borderRadius: 20, padding: 18, marginBottom: 14,
      ...golge,
    },
    focusCard: {
      backgroundColor: FOCUS.panel,
      borderWidth: 1, borderColor: FOCUS.line,
      borderRadius: 18, padding: 16, alignItems: 'center',
    },

    sayfaBaslik: { fontFamily: FONT.baslik, fontSize: 30, color: P.ink, marginBottom: 6, marginTop: 4 },
    ustEtiket: { fontFamily: FONT.monoBold, fontSize: 13, letterSpacing: 1.2, color: P.inkSoft },

    dersSatir: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: P.yuzey,
      borderWidth: 1, borderColor: P.line,
      borderRadius: 20, padding: 16, marginBottom: 13,
      ...golge,
    },

    miniIstatistik: {
      flex: 1, backgroundColor: P.yuzey,
      borderWidth: 1, borderColor: P.line,
      borderRadius: 18, padding: 14,
      ...golge,
    },

    // ---------- SEKME ÇUBUĞU ----------
    sekmeCubugu: {
      flexDirection: 'row',
      borderTopWidth: 1, borderTopColor: P.line,
      backgroundColor: P.bgAlt,
      paddingTop: 10, paddingBottom: altBosluk,
    },
    sekme: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    // Oval çerçeve kaldırıldı: yalnızca ikon + parlama
    sekmeKapsul: {
      width: 44, height: 40,
      alignItems: 'center', justifyContent: 'center',
    },
    sekmeYazi: { fontSize: 12, color: P.inkFaint, fontFamily: FONT.govdeKalin, marginTop: 2 },
    sekmeIsaret: { width: 0, height: 0 },

    girdi: {
      backgroundColor: P.yuzey2,
      borderWidth: 1, borderColor: P.line,
      borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 17, color: P.ink, fontFamily: FONT.govde, marginBottom: 14,
    },
    secenek: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: P.yuzey,
      borderWidth: 1, borderColor: P.line,
      borderRadius: 16, padding: 16, marginBottom: 12,
    },
    secenekAktif: {
      borderColor: P.neon, backgroundColor: P.neonZemin,
    },
    secenekYazi: { fontSize: 17, color: P.ink, fontFamily: FONT.govdeOrta },

    etiket: {
      fontFamily: FONT.monoBold, fontSize: 13, color: P.inkSoft,
      letterSpacing: 1.4, marginBottom: 12, marginTop: 8,
    },

    hap: {
      borderWidth: 1, borderColor: P.line,
      borderRadius: 14, paddingVertical: 11, paddingHorizontal: 16,
      backgroundColor: P.yuzey,
    },
    hapAktif: { borderColor: P.neon, backgroundColor: P.neonZemin },
    hapYazi: { fontSize: 15, fontFamily: FONT.govdeKalin, color: P.ink },

    uniteHap: {
      borderWidth: 1, borderColor: P.line,
      borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14,
      backgroundColor: P.yuzey, marginRight: 10, width: 148,
    },
  });
}

// ============================================================
// BAĞLAM
// ============================================================
const TemaBaglami = createContext(null);

export function TemaSaglayici({ koyu, setKoyu, altBosluk, children }) {
  const deger = useMemo(() => {
    const P = koyu ? KARANLIK : AYDINLIK;
    return {
      P, koyu, setKoyu,
      s: yapStiller(P, altBosluk),
      DERSLER: derslerAl(),
      seviyeHesapla: (xp) => xpdenSeviye(xp, koyu),
    };
  }, [koyu, setKoyu, altBosluk]);
  return <TemaBaglami.Provider value={deger}>{children}</TemaBaglami.Provider>;
}

export function useTema() {
  const t = useContext(TemaBaglami);
  if (!t) {
    const P = KARANLIK;
    return {
      P, koyu: true, setKoyu: () => {}, s: yapStiller(P),
      DERSLER: derslerAl(), seviyeHesapla: (x) => xpdenSeviye(x, true),
    };
  }
  return t;
}

// Eski isimlerle uyum
export const KAGIT = KARANLIK;
export const GECE = KARANLIK;