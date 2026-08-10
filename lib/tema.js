import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, Platform } from 'react-native';

// ============================================================
// PALETLER
// Açık = "Sınav Defteri" kağıdı
// Koyu = aynı defterin gece lambası altındaki hali (sıcak koyu, saf siyah değil)
// ============================================================

export const KAGIT = {
  koyu: false,
  bg: '#F2EFE9',          // yumuşak taş beji
  bgAlt: '#E9E5DC',
  yuzey: '#FFFFFF',       // kartlar net beyaz, okunabilirlik yüksek
  line: '#DCD6CA',
  ink: '#1C1A17',
  inkSoft: '#6E675D',
  inkFaint: '#9C948A',
  red: '#A6392C',
  redSoft: '#E7D2CE',
  vurguZemin: '#F6E9E6',
  yesil: '#3F7A52',
  yesilZemin: '#E4EDE6',
  notKagit: '#1C1A17',    // koyu bildirim şeridi
  notYazi: '#F2EFE9',
};

export const GECE = {
  koyu: true,
  bg: '#141311',
  bgAlt: '#1B1917',
  yuzey: '#232120',
  line: '#35322F',
  ink: '#EDEAE4',
  inkSoft: '#A29C94',
  inkFaint: '#726C65',
  red: '#DE7B67',
  redSoft: '#432B25',
  vurguZemin: '#33231F',
  yesil: '#6FAE84',
  yesilZemin: '#1F2E24',
  notKagit: '#EDEAE4',
  notYazi: '#141311',
};

// Odak modu (çalışma ekranı) her iki temada da koyu kalır
export const FOCUS = {
  bg: '#0C0C0E', panel: '#18181B', panel2: '#212125', line: '#2B2B30',
  text: '#ECE9E3', textSoft: '#8B8A8F', ember: '#FF6B35', emberSoft: '#3A241A',
  green: '#5DAE7A', red: '#D9534F',
};

export const FONT = {
  serif: 'DMSerifDisplay_400Regular',   // başlıklar
  govde: 'Inter_400Regular',            // gövde metni
  govdeOrta: 'Inter_500Medium',
  govdeKalin: 'Inter_600SemiBold',
  mono: 'SpaceMono_400Regular',         // etiketler ve sayılar
  monoBold: 'SpaceMono_700Bold',
};

// ============================================================
// DERSLER — her ders için açık ve koyu tema renkleri
// ============================================================
const DERS_TANIM = [
  { id: 'turkce',    ad: 'Türkçe',         harf: 'Tü', a: '#B23A2E', aZ: '#F4E3DD', k: '#E38A78', kZ: '#3B2621' },
  { id: 'mat',       ad: 'Matematik',      harf: '∑',  a: '#2F4858', aZ: '#E2E8E9', k: '#87B0C6', kZ: '#1F2E36' },
  { id: 'fen',       ad: 'Fen Bilimleri',  harf: 'Fe', a: '#3F6D45', aZ: '#E7EDE1', k: '#86BE91', kZ: '#1F2E23' },
  { id: 'inkilap',   ad: 'İnkılap Tarihi', harf: 'İn', a: '#A15C2B', aZ: '#F1E5D4', k: '#DBA26B', kZ: '#382718' },
  { id: 'din',       ad: 'Din Kültürü',    harf: 'Dk', a: '#6B4A82', aZ: '#EAE1EE', k: '#B899D0', kZ: '#2C2135' },
  { id: 'ingilizce', ad: 'İngilizce',      harf: 'En', a: '#2D6E6B', aZ: '#E1EAE8', k: '#76BCB6', kZ: '#1B2F2E' },
];

export const derslerAl = (koyu) => DERS_TANIM.map(d => ({
  id: d.id, ad: d.ad, harf: d.harf,
  renk: koyu ? d.k : d.a,
  acik: koyu ? d.kZ : d.aZ,
}));

// ============================================================
// SEVİYELER
// ============================================================
const SEVIYE_TANIM = [
  { ad: 'Çaylak',  minXp: 0,    harf: 'Ç', a: '#7A705C', k: '#A99B86' },
  { ad: 'Öğrenci', minXp: 100,  harf: 'Ö', a: '#2F4858', k: '#87B0C6' },
  { ad: 'Azimli',  minXp: 300,  harf: 'A', a: '#A15C2B', k: '#DBA26B' },
  { ad: 'Uzman',   minXp: 600,  harf: 'U', a: '#6B4A82', k: '#B899D0' },
  { ad: 'Usta',    minXp: 1200, harf: 'M', a: '#B23A2E', k: '#E38A78' },
  { ad: 'Efsane',  minXp: 2500, harf: 'E', a: '#211D16', k: '#EFE7D8' },
];

export const xpdenSeviye = (xp, koyu) => {
  const liste = SEVIYE_TANIM.map(s => ({ ad: s.ad, minXp: s.minXp, harf: s.harf, renk: koyu ? s.k : s.a }));
  let g = liste[0];
  for (const s of liste) { if (xp >= s.minXp) g = s; }
  const sir = liste.find(s => s.minXp > xp);
  const pct = sir ? Math.round(((xp - g.minXp) / (sir.minXp - g.minXp)) * 100) : 100;
  return { ...g, siradaki: sir, pct };
};

// ============================================================
// STİL FABRİKASI — palet değişince stiller yeniden üretilir
// ============================================================
export function yapStiller(P, altBosluk = 12) {
  return StyleSheet.create({
    kart: {
      backgroundColor: P.yuzey, borderWidth: 1, borderColor: P.line,
      borderRadius: 4, padding: 16, marginBottom: 12,
    },
    odakKart: { backgroundColor: FOCUS.panel, borderRadius: 8, padding: 14, alignItems: 'center' },
    sayfaBaslik: { fontFamily: FONT.serif, fontSize: 27, color: P.ink, marginBottom: 16, marginTop: 8 },
    dersSatir: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: P.yuzey,
      borderWidth: 1, borderColor: P.line, padding: 12, marginBottom: 10,
    },
    miniIstatistik: { flex: 1, borderWidth: 1, borderColor: P.line, padding: 10, backgroundColor: P.yuzey },
    sekmeCubugu: {
      flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: P.ink,
      backgroundColor: P.bg, paddingTop: 10, paddingBottom: altBosluk,
    },
    sekme: { flex: 1, alignItems: 'center' },
    sekmeIsaret: { width: 22, height: 2.5, borderRadius: 2, marginBottom: 5 },
    sekmeYazi: { fontSize: 11, color: P.inkSoft, fontFamily: FONT.mono },

    girdi: {
      backgroundColor: P.yuzey, borderWidth: 1, borderColor: P.line, borderRadius: 4,
      paddingHorizontal: 13, paddingVertical: 12,
      fontSize: 16, color: P.ink, fontFamily: FONT.govde, marginBottom: 12,
    },
    secenek: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: P.yuzey,
      borderWidth: 1, borderColor: P.line, borderRadius: 4, padding: 14, marginBottom: 8,
    },
    secenekAktif: { borderColor: P.red, backgroundColor: P.vurguZemin },
    secenekYazi: { fontSize: 15, color: P.ink, fontFamily: FONT.govde },

    etiket: { fontFamily: FONT.mono, fontSize: 12, color: P.inkSoft, letterSpacing: 1, marginBottom: 6, marginTop: 4 },
    hap: { borderWidth: 1, borderColor: P.line, borderRadius: 4, paddingVertical: 9, paddingHorizontal: 13, backgroundColor: P.yuzey },
    hapAktif: { borderColor: P.red, backgroundColor: P.vurguZemin },
    hapYazi: { fontSize: 14, fontFamily: FONT.mono, color: P.ink },
  });
}

// ============================================================
// BAĞLAM (Context)
// ============================================================
const TemaBaglami = createContext(null);

export function TemaSaglayici({ koyu, setKoyu, altBosluk, children }) {
  const deger = useMemo(() => {
    const P = koyu ? GECE : KAGIT;
    return {
      P,
      koyu,
      setKoyu,
      s: yapStiller(P, altBosluk),
      DERSLER: derslerAl(koyu),
      seviyeHesapla: (xp) => xpdenSeviye(xp, koyu),
    };
  }, [koyu, setKoyu, altBosluk]);

  return <TemaBaglami.Provider value={deger}>{children}</TemaBaglami.Provider>;
}

export function useTema() {
  const t = useContext(TemaBaglami);
  if (!t) {
    // Sağlayıcı dışında kullanılırsa açık temaya düş (çökme olmasın)
    const P = KAGIT;
    return { P, koyu: false, setKoyu: () => {}, s: yapStiller(P), DERSLER: derslerAl(false), seviyeHesapla: (x) => xpdenSeviye(x, false) };
  }
  return t;
}