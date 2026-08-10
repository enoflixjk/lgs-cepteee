import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, Animated, PanResponder,
  StyleSheet, StatusBar, Alert, Dimensions, Easing, AppState
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useFonts, DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { CARDS as RAW_CARDS } from './data/cards';
import { TemaSaglayici, useTema, FOCUS, FONT, KAGIT } from './lib/tema';
import HesapEkrani from './ekranlar/HesapEkrani';
import { supabase } from './lib/supabase';

const { width: SW } = Dimensions.get('window');

// ============ VERİ SAĞLAMLAŞTIRMA ============
const CARDS = (Array.isArray(RAW_CARDS) ? RAW_CARDS : []).filter(
  c => c && c.id && c.ders && c.soru && c.cevap
).map(c => ({
  ...c,
  unite: c.unite || 'Genel',
  secenekler: Array.isArray(c.secenekler) && c.secenekler.length >= 2 ? c.secenekler : null,
}));

const uniteler = (dersId) => {
  const set = [];
  CARDS.forEach(c => { if (c.ders === dersId && !set.includes(c.unite)) set.push(c.unite); });
  return set;
};

// Odak modunda tema bağlamı kullanılmadığı için ders adları sabit sözlükten okunur
const DERS_ADLARI = {
  turkce: 'Türkçe', mat: 'Matematik', fen: 'Fen Bilimleri',
  inkilap: 'İnkılap Tarihi', din: 'Din Kültürü', ingilizce: 'İngilizce',
};

// ============ ROZETLER ============
const ROZETLER = [
  { id: 'ilk_adim',      ad: 'İlk Adım',         kosul: (s) => s.toplamReps >= 1 },
  { id: 'seri_3',        ad: '3 Gün Azim',        kosul: (s) => s.seri >= 3 },
  { id: 'seri_7',        ad: 'Haftalık Disiplin', kosul: (s) => s.seri >= 7 },
  { id: 'seri_30',       ad: 'Demir İrade',       kosul: (s) => s.seri >= 30 },
  { id: 'yuz_kart',      ad: '100 Kart',          kosul: (s) => s.ogrenilen >= 100 },
  { id: 'bes_yuz_kart',  ad: '500 Kart',          kosul: (s) => s.ogrenilen >= 500 },
  { id: 'bin_kart',      ad: 'Tam Puan',          kosul: (s) => s.ogrenilen >= 1000 },
  { id: 'usta_10',       ad: 'Ustalık Yolu',      kosul: (s) => s.usta >= 10 },
  { id: 'sinav_1',       ad: 'İlk Sınav',         kosul: (s) => s.sinavSayisi >= 1 },
  { id: 'sinav_mukemmel',ad: 'Mükemmel Sınav',    kosul: (s) => s.enIyiSinavPct >= 90 },
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

// ============ METİN KARŞILAŞTIRMA (yazarak cevaplama) ============
// Türkçe harfleri sadeleştirip noktalama ve boşlukları atarak karşılaştırır.
const TR_HARF = {
  'ı': 'i', 'İ': 'i', 'I': 'i', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
  'ş': 's', 'Ş': 's', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u',
};
const sadelestir = (m) => String(m || '')
  .split('').map(c => TR_HARF[c] || c).join('')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

// İki metin arasındaki düzenleme mesafesi (küçük yazım hatalarını affetmek için)
const mesafe = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let onceki = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const simdi = [i];
    for (let j = 1; j <= b.length; j++) {
      simdi[j] = Math.min(
        onceki[j] + 1,
        simdi[j - 1] + 1,
        onceki[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    onceki = simdi;
  }
  return onceki[b.length];
};

// Uzunluğa göre birkaç harflik yazım hatasını doğru sayar
const cevapEslesiyor = (yazilan, dogruCevap) => {
  const a = sadelestir(yazilan);
  const b = sadelestir(dogruCevap);
  if (!a || !b) return false;
  if (a === b) return true;
  const tolerans = b.length <= 5 ? 0 : b.length <= 10 ? 1 : 2;
  return mesafe(a, b) <= tolerans;
};

// ============ HAPTİK ============
const titre = {
  dogru: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {} },
  yanlis: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) {} },
  hafif: () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {} },
  orta: () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {} },
};

// ============ BİLDİRİM ============
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }),
});
async function bildirimGuncelle(acik, saat) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!acik) return true;
    let izin = await Notifications.getPermissionsAsync();
    if (izin.status !== 'granted') izin = await Notifications.requestPermissionsAsync();
    if (izin.status !== 'granted') return false;
    const trigger = Notifications.SchedulableTriggerInputTypes
      ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: saat, minute: 0 }
      : { hour: saat, minute: 0, repeats: true };
    await Notifications.scheduleNotificationAsync({
      content: { title: 'LGS Cepte', body: 'Bugünkü kartlarını henüz tamamlamadın. Birkaç dakikan var mı?' },
      trigger,
    });
    return true;
  } catch (e) { console.log('Bildirim hatası:', e); return false; }
}

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
            style={{ borderWidth: 1.5, borderColor: P.ink, paddingVertical: 14, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 15, color: P.ink, letterSpacing: 1 }}>TEKRAR DENE</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Emin misin?', 'Tüm ilerleme silinecek.', [
            { text: 'İptal' },
            { text: 'Sıfırla', style: 'destructive', onPress: async () => { await AsyncStorage.clear(); this.setState({ hata: null }); } },
          ])} style={{ borderWidth: 1.5, borderColor: P.red, paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: P.red, letterSpacing: 1 }}>VERİLERİ SIFIRLA</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// İMZA BİLEŞENLER
// ============================================================
function OptikBaloncuk({ seviye, max = 7, renk, boyut = 9 }) {
  const { P } = useTema();
  const c = renk || P.ink;
  const dolu = Math.round((seviye / Math.max(max, 1)) * 5);
  return (
    <View style={{ flexDirection: 'row' }}>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={{
          width: boyut, height: boyut, borderRadius: boyut / 2, marginLeft: 3,
          borderWidth: 1.3, borderColor: c,
          backgroundColor: i < dolu ? c : 'transparent',
        }} />
      ))}
    </View>
  );
}

function Muhur({ harf, renk, boyut = 44, font = 18, kagitRenk }) {
  const { P } = useTema();
  return (
    <View style={{
      width: boyut, height: boyut, borderRadius: boyut / 2,
      borderWidth: 1.5, borderColor: renk, backgroundColor: kagitRenk || P.yuzey,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontFamily: FONT.serif, fontSize: font, color: renk }}>{harf}</Text>
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
    { harf: '01', baslik: 'LGS Cepte', alt: 'LGS\'ye hazırlığın en etkili yolu.\n1000 kart · 6 ders · SRS sistemi' },
    { harf: '02', baslik: 'Aralıklı Tekrar', alt: 'Optik form mantığıyla çalışan SRS,\növrendiklerini kalıcı hafızaya taşır.' },
    { harf: '03', baslik: 'Hedefini Belirle', alt: 'Günlük hedefini koy,\nher gün düzenli çalış.' },
    { harf: '04', baslik: 'Hazırsın', alt: 'XP kazan, seviye atla,\nkendi sınav künyeni oluştur.' },
  ];
  const s = sayfalar[sayfa];
  const son = sayfa === sayfalar.length - 1;
  return (
    <Sayfa>
      <View style={{ flex: 1, justifyContent: 'center', padding: 32, paddingTop: kenar.top + 32, paddingBottom: kenar.bottom + 32 }}>
        <TouchableOpacity onPress={onDone} style={{ position: 'absolute', top: kenar.top + 14, right: 24 }}>
          <Text style={{ color: P.inkSoft, fontSize: 17, fontFamily: FONT.govde }}>geç →</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: FONT.mono, fontSize: 14, color: P.red, marginBottom: 8 }}>MADDE {s.harf}</Text>
        <Text style={{ fontFamily: FONT.serif, fontSize: 40, color: P.ink, marginBottom: 14 }}>{s.baslik}</Text>
        <Text style={{ fontSize: 18, color: P.inkSoft, lineHeight: 26, fontFamily: FONT.govde }}>{s.alt}</Text>
        <View style={{ flexDirection: 'row', marginTop: 36, marginBottom: 26 }}>
          {sayfalar.map((_, i) => (
            <View key={i} style={{ width: i === sayfa ? 22 : 8, height: 3, backgroundColor: i === sayfa ? P.red : P.line, marginRight: 6 }} />
          ))}
        </View>
        <TouchableOpacity onPress={() => { titre.hafif(); son ? onDone() : setSayfa(x => x + 1); }}
          style={{ borderWidth: 1.5, borderColor: P.ink, paddingVertical: 15, alignItems: 'center', backgroundColor: P.yuzey }}>
          <Text style={{ fontSize: 17, fontFamily: FONT.monoBold, color: P.ink, letterSpacing: 1 }}>{son ? 'BAŞLA' : 'DEVAM'}</Text>
        </TouchableOpacity>
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
        <Text style={{ fontFamily: FONT.mono, fontSize: 14, color: P.red, marginBottom: 6 }}>KAYIT FORMU · ADIM {no}/4</Text>
        <Text style={{ fontFamily: FONT.serif, fontSize: 31, color: P.ink, marginBottom: 8 }}>{baslik}</Text>
        <Text style={{ fontSize: 18, color: P.inkSoft, fontFamily: FONT.govde, marginBottom: 22 }}>{alt}</Text>
        {children}
        <TouchableOpacity style={{ borderWidth: 1.5, borderColor: P.ink, paddingVertical: 15, alignItems: 'center', marginTop: 22, backgroundColor: P.yuzey }}
          onPress={() => { titre.hafif(); devam(); }}>
          <Text style={{ fontSize: 17, fontFamily: FONT.monoBold, color: P.ink, letterSpacing: 1 }}>{no === 4 ? 'HAZIRIM' : 'DEVAM'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </Sayfa>
  );
}

function PersonalSetup({ onDone }) {
  const { P, s: st, DERSLER } = useTema();
  const kenar = useSafeAreaInsets();
  const [adim, setAdim] = useState(0);
  const [hedefOkul, setHedefOkul] = useState('');
  const [hedefNet, setHedefNet] = useState('');
  const [hedefKart, setHedefKart] = useState(30);
  const [zayifDersler, setZayifDersler] = useState([]);
  const toggleDers = (id) => { titre.hafif(); setZayifDersler(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };

  if (adim === 0) return (
    <KurulumCercevesi no={1} baslik="Hedef okulun" alt="Hayalindeki liseyi yaz (isteğe bağlı)" devam={() => setAdim(1)}>
      <TextInput style={st.girdi} placeholder="Örn. Fen Lisesi" placeholderTextColor={P.inkFaint} value={hedefOkul} onChangeText={setHedefOkul} />
    </KurulumCercevesi>
  );
  if (adim === 1) return (
    <KurulumCercevesi no={2} baslik="Net hedefin" alt="LGS'de kaç net hedefliyorsun?" devam={() => setAdim(2)}>
      <TextInput style={st.girdi} placeholder="Örn. 400" placeholderTextColor={P.inkFaint} value={hedefNet} onChangeText={setHedefNet} keyboardType="number-pad" />
    </KurulumCercevesi>
  );
  if (adim === 2) return (
    <KurulumCercevesi no={3} baslik="Günlük hedef" alt="Her gün kaç kart çalışmak istiyorsun?" devam={() => setAdim(3)}>
      {[15, 30, 50, 75].map(n => (
        <TouchableOpacity key={n} onPress={() => { titre.hafif(); setHedefKart(n); }}
          style={[st.secenek, hedefKart === n && st.secenekAktif]}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 14, color: P.inkSoft, marginRight: 8 }}>{hedefKart === n ? '●' : '○'}</Text>
          <Text style={[st.secenekYazi, hedefKart === n && { color: P.red, fontFamily: FONT.monoBold }]}>
            {n === 15 ? 'Hafif' : n === 30 ? 'Normal' : n === 50 ? 'Yoğun' : 'Hardcore'} · {n} kart/gün
          </Text>
        </TouchableOpacity>
      ))}
    </KurulumCercevesi>
  );
  return (
    <KurulumCercevesi no={4} baslik="Zayıf dersler" alt="Hangi derslerde eksiksin? (birden fazla seç)" devam={() => onDone({ hedefOkul, hedefNet, hedefKart, zayifDersler })}>
      {DERSLER.map(d => (
        <TouchableOpacity key={d.id} onPress={() => toggleDers(d.id)}
          style={[st.secenek, zayifDersler.includes(d.id) && { borderColor: d.renk, backgroundColor: d.acik }]}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 14, color: P.inkSoft, marginRight: 8 }}>{zayifDersler.includes(d.id) ? '☒' : '☐'}</Text>
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
  const OZEL = { yanlislar: { id: 'yanlislar', ad: 'Yanlışlarım', renk: P.red, acik: P.redSoft, harf: '⟲' } };
  const d = DERSLER.find(x => x.id === ders) || OZEL[ders] || { ad: ders, renk: P.ink, acik: P.bgAlt, harf: '?' };
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
          <Text style={{ fontFamily: FONT.mono, fontSize: 16, color: P.inkSoft }}>← geri</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center', paddingBottom: kenar.bottom + 24 }}>
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <Muhur harf={d.harf} renk={d.renk} boyut={58} font={21} kagitRenk={d.acik} />
          <Text style={{ fontFamily: FONT.serif, fontSize: 26, color: P.ink, marginTop: 10 }}>{d.ad}</Text>
          <Text style={{ fontSize: 14, color: P.inkSoft, fontFamily: FONT.mono, marginTop: 4 }}>
            {ders === 'yanlislar' ? dk.length + ' kart tekrar bekliyor' : ogr + '/' + dk.length + ' öğrenildi · ' + bek + ' bekliyor'}
          </Text>
        </View>

        {uList.length > 1 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={st.etiket}>ÜNİTE SEÇ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity onPress={() => { titre.hafif(); setSecUnite(null); }}
                style={[st.hap, !secUnite && { borderColor: d.renk, backgroundColor: d.acik }, { marginRight: 8 }]}>
                <Text style={[st.hapYazi, !secUnite && { color: d.renk, fontFamily: FONT.monoBold }]}>Tümü ({tumKartlar.length})</Text>
              </TouchableOpacity>
              {uList.map(u => {
                const sayi = tumKartlar.filter(c => c.unite === u).length;
                const secili = secUnite === u;
                return (
                  <TouchableOpacity key={u} onPress={() => { titre.hafif(); setSecUnite(u); }}
                    style={[st.hap, secili && { borderColor: d.renk, backgroundColor: d.acik }, { marginRight: 8 }]}>
                    <Text style={[st.hapYazi, secili && { color: d.renk, fontFamily: FONT.monoBold }]}>{u} ({sayi})</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity onPress={() => { titre.orta(); onBaslat('kart', secUnite); }} activeOpacity={0.8}
          disabled={dk.length === 0}
          style={{ backgroundColor: P.yuzey, borderWidth: 1.5, borderColor: d.renk, padding: 20, marginBottom: 12, opacity: dk.length ? 1 : 0.4 }}>
          <Text style={{ fontSize: 13, fontFamily: FONT.mono, color: d.renk, marginBottom: 4 }}>MOD A</Text>
          <Text style={{ fontSize: 19, fontFamily: FONT.serif, color: P.ink }}>Kart Modu</Text>
          <Text style={{ fontSize: 16, color: P.inkSoft, marginTop: 3, fontFamily: FONT.govde }}>Kartı çevir, sağa veya sola kaydırarak işaretle</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { titre.orta(); onBaslat('quiz', secUnite); }} activeOpacity={0.8}
          disabled={quizUygun === 0}
          style={{ backgroundColor: P.yuzey, borderWidth: 1.5, borderColor: d.renk, padding: 20, marginBottom: 12, opacity: quizUygun ? 1 : 0.4 }}>
          <Text style={{ fontSize: 13, fontFamily: FONT.mono, color: d.renk, marginBottom: 4 }}>MOD B</Text>
          <Text style={{ fontSize: 19, fontFamily: FONT.serif, color: P.ink }}>Quiz Modu</Text>
          <Text style={{ fontSize: 16, color: P.inkSoft, marginTop: 3, fontFamily: FONT.govde }}>
            {quizUygun ? 'Optik formdan doğru şıkkı işaretle' : 'Bu seçimde şıklı kart yok'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { titre.orta(); onBaslat('yaz', secUnite); }} activeOpacity={0.8}
          disabled={dk.length === 0}
          style={{ backgroundColor: P.yuzey, borderWidth: 1.5, borderColor: d.renk, padding: 20, opacity: dk.length ? 1 : 0.4 }}>
          <Text style={{ fontSize: 13, fontFamily: FONT.mono, color: d.renk, marginBottom: 4 }}>MOD C</Text>
          <Text style={{ fontSize: 19, fontFamily: FONT.serif, color: P.ink }}>Yazma Modu</Text>
          <Text style={{ fontSize: 16, color: P.inkSoft, marginTop: 3, fontFamily: FONT.govde }}>Cevabı kendin yaz — en zorlayıcı mod</Text>
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
    { id: 'home', label: 'Ana Sayfa' },
    { id: 'dersler', label: 'Dersler' },
    { id: 'istatistik', label: 'İstatistik' },
    { id: 'profil', label: 'Profil' },
  ];
  return (
    <View style={st.sekmeCubugu}>
      {tabs.map(t => (
        <TouchableOpacity key={t.id} style={st.sekme} onPress={() => { titre.hafif(); setTab(t.id); }}>
          <View style={[st.sekmeIsaret, { backgroundColor: tab === t.id ? P.red : 'transparent' }]} />
          <Text style={[st.sekmeYazi, tab === t.id && { color: P.ink, fontFamily: FONT.monoBold }]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============ ANA SAYFA ============
function HomeScreen({ srs, xp, seri, bugun, hedefKart, onDersBaslat, sinavTarihi, profil, onSinavBaslat, onProfil }) {
  const { P, s: st, DERSLER, seviyeHesapla } = useTema();
  const kenar = useSafeAreaInsets();
  const toplam = CARDS.length;
  const ogrenilenler = Object.values(srs).filter(d => d.seviye >= 3).length;
  // Hiç çalışılmamış kartlar da beklemede sayılır (srs'te henüz kaydı yoktur)
  const bekleyen = CARDS.filter(c => (srs[c.id] || yeniD(c.id)).dueAt <= Date.now()).length;
  const yanlisSayisi = Object.values(srs).filter(d => d.sonYanlis).length;
  const tamamlandi = bugun >= hedefKart;
  const sev = seviyeHesapla(xp);
  // Geçersiz/yarım yazılmış tarihte NaN göstermemek için doğrula
  const sinavZamani = sinavTarihi ? new Date(sinavTarihi).getTime() : NaN;
  const kalanGun = Number.isFinite(sinavZamani)
    ? Math.max(0, Math.ceil((sinavZamani - new Date().setHours(0, 0, 0, 0)) / GUN))
    : null;
  const zayifListe = DERSLER.filter(d => (profil && profil.zayifDersler ? profil.zayifDersler : []).includes(d.id));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: kenar.top + 12, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.red, letterSpacing: 1 }}>LGS CEPTE</Text>
          <Text style={{ fontFamily: FONT.serif, fontSize: 27, color: P.ink, marginTop: 3 }}>Merhaba</Text>
        </View>
        <TouchableOpacity onPress={() => { titre.hafif(); onProfil && onProfil(); }} activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ alignItems: 'center' }}>
          <Muhur harf={sev.harf} renk={sev.renk} boyut={44} font={17} />
          <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.inkFaint, marginTop: 3 }}>PROFİL</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 14 }}>
        <View style={st.miniIstatistik}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.inkSoft }}>SERİ</Text>
          <Text style={{ fontFamily: FONT.serif, fontSize: 21, color: P.ink }}>{seri}g</Text>
        </View>
        <View style={[st.miniIstatistik, { marginLeft: 8 }]}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.inkSoft }}>XP</Text>
          <Text style={{ fontFamily: FONT.serif, fontSize: 21, color: P.ink }}>{xp}</Text>
        </View>
        <View style={[st.miniIstatistik, { marginLeft: 8, flex: 1.4 }]}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.inkSoft }}>SEVİYE</Text>
          <Text style={{ fontFamily: FONT.serif, fontSize: 18, color: sev.renk }}>{sev.ad}</Text>
        </View>
      </View>

      {profil && (profil.hedefOkul || profil.hedefNet) ? (
        <View style={{ borderLeftWidth: 2, borderLeftColor: P.red, paddingLeft: 10, marginBottom: 14 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.red }}>HEDEF</Text>
          <Text style={{ fontFamily: FONT.govde, fontSize: 21, color: P.ink }}>
            {profil.hedefOkul || (profil.hedefNet + ' net')}
          </Text>
        </View>
      ) : null}

      {kalanGun !== null && (
        <View style={[st.kart, { borderColor: kalanGun <= 14 ? P.red : P.ink }]}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.inkSoft, letterSpacing: 1 }}>LGS'YE KALAN SÜRE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
            <Text style={{ fontFamily: FONT.serif, fontSize: 46, color: kalanGun <= 14 ? P.red : P.ink }}>{kalanGun}</Text>
            <Text style={{ fontSize: 18, color: P.inkSoft, marginLeft: 8, fontFamily: FONT.govde }}>gün</Text>
          </View>
        </View>
      )}

      <View style={[st.kart, tamamlandi && { borderColor: P.yesil }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.inkSoft, letterSpacing: 1 }}>GÜNLÜK HEDEF</Text>
          <Text style={{ fontFamily: FONT.mono, fontSize: 14, color: tamamlandi ? P.yesil : P.ink }}>{bugun}/{hedefKart}</Text>
        </View>
        <View style={{ marginTop: 10 }}>
          <OptikBaloncuk seviye={Math.min(bugun, hedefKart)} max={hedefKart} renk={tamamlandi ? P.yesil : P.red} boyut={13} />
        </View>
        {tamamlandi ? (
          <View style={{ marginTop: 12, backgroundColor: P.yesilZemin, borderRadius: 3, paddingVertical: 9, paddingHorizontal: 11 }}>
            <Text style={{ fontSize: 14, color: P.yesil, fontFamily: FONT.govdeKalin }}>
              Bugünkü hedefini tamamladın{bugun > hedefKart ? ' · ' + (bugun - hedefKart) + ' fazladan' : ''}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <Text style={{ fontSize: 15, color: P.inkSoft, fontFamily: FONT.govde }}>{hedefKart - bugun} kart kaldı</Text>
            <Text style={{ fontSize: 15, color: P.inkSoft, fontFamily: FONT.govde }}>{ogrenilenler}/{toplam} öğrenildi</Text>
          </View>
        )}
      </View>

      {bekleyen === 0 && ogrenilenler > 0 && (
        <View style={[st.kart, { borderLeftWidth: 3, borderLeftColor: P.yesil }]}>
          <Text style={{ fontSize: 16, fontFamily: FONT.serif, color: P.ink }}>Tekrar sırası boş</Text>
          <Text style={{ fontSize: 14, fontFamily: FONT.govde, color: P.inkSoft, marginTop: 4, lineHeight: 21 }}>
            Şu an tekrar zamanı gelen kart yok. Yeni konulara geçebilir veya deneme çözebilirsin.
          </Text>
        </View>
      )}

      <TouchableOpacity onPress={() => { titre.orta(); onSinavBaslat(); }} activeOpacity={0.8}
        style={{ borderWidth: 1.5, borderColor: P.red, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: P.yuzey }}>
        <View style={{ borderWidth: 1.5, borderColor: P.red, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.red }}>40′</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontFamily: FONT.serif, color: P.red }}>Sınav Simülasyonu</Text>
          <Text style={{ fontSize: 15, color: P.inkSoft, marginTop: 2, fontFamily: FONT.govde }}>30 soru · 40 dakika · odak modu açılır</Text>
        </View>
        <Text style={{ fontSize: 18, color: P.red, fontFamily: FONT.mono }}>›</Text>
      </TouchableOpacity>

      {yanlisSayisi > 0 && (
        <TouchableOpacity onPress={() => { titre.orta(); onDersBaslat('yanlislar'); }} activeOpacity={0.8}
          style={{ borderWidth: 1.5, borderColor: P.ink, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: P.yuzey }}>
          <View style={{ borderWidth: 1.5, borderColor: P.ink, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 16, color: P.ink }}>{yanlisSayisi}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontFamily: FONT.serif, color: P.ink }}>Yanlışlarım</Text>
            <Text style={{ fontSize: 15, color: P.inkSoft, marginTop: 2, fontFamily: FONT.govde }}>Daha önce bilemediğin kartları tekrarla</Text>
          </View>
          <Text style={{ fontSize: 18, color: P.ink, fontFamily: FONT.mono }}>›</Text>
        </TouchableOpacity>
      )}

      {zayifListe.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.red, letterSpacing: 1, marginBottom: 8 }}>★ ÖNCELİKLİ DERSLERİN</Text>
          {zayifListe.map(d => {
            const dkBek = CARDS.filter(c => c.ders === d.id).filter(c => (srs[c.id] || yeniD(c.id)).dueAt <= Date.now()).length;
            return (
              <TouchableOpacity key={d.id} onPress={() => { titre.hafif(); onDersBaslat(d.id); }} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: d.renk, padding: 10, marginBottom: 6, backgroundColor: P.yuzey }}>
                <Muhur harf={d.harf} renk={d.renk} boyut={30} font={11} kagitRenk={d.acik} />
                <Text style={{ marginLeft: 10, flex: 1, fontFamily: FONT.govde, fontSize: 18, color: P.ink }}>{d.ad}</Text>
                <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: d.renk }}>{dkBek} bekliyor</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.inkSoft, letterSpacing: 1, marginBottom: 10, marginTop: 4 }}>DERSE GÖRE ÇALIŞ</Text>
      {DERSLER.map(d => {
        const dk = CARDS.filter(c => c.ders === d.id);
        const ogr = dk.filter(c => (srs[c.id] || yeniD(c.id)).seviye >= 3).length;
        const bek = dk.filter(c => (srs[c.id] || yeniD(c.id)).dueAt <= Date.now()).length;
        const zayif = (profil && profil.zayifDersler ? profil.zayifDersler : []).includes(d.id);
        return (
          <TouchableOpacity key={d.id} style={st.dersSatir} onPress={() => { titre.hafif(); onDersBaslat(d.id); }} activeOpacity={0.7}>
            <Muhur harf={d.harf} renk={d.renk} boyut={38} font={13} kagitRenk={d.acik} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontFamily: FONT.serif, color: P.ink }}>{zayif ? '★ ' : ''}{d.ad}</Text>
              <View style={{ marginTop: 5 }}>
                <OptikBaloncuk seviye={ogr} max={dk.length} renk={d.renk} boyut={7} />
              </View>
            </View>
            {bek > 0 && <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: P.red, marginRight: 8 }}>+{bek}</Text>}
            <Text style={{ fontSize: 18, color: P.inkFaint }}>›</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ============ DERSLER ============
function DerslerScreen({ srs, onDersBaslat }) {
  const { P, s: st, DERSLER } = useTema();
  const kenar = useSafeAreaInsets();
  const [arama, setArama] = useState('');
  const [acikKart, setAcikKart] = useState(null);

  // En az 2 karakterden sonra ara; sonuçlar 40 ile sınırlı tutulur
  const sonuclar = React.useMemo(() => {
    const q = sadelestir(arama);
    if (q.length < 2) return [];
    return CARDS.filter(c => sadelestir(c.soru).includes(q) || sadelestir(c.cevap).includes(q)).slice(0, 40);
  }, [arama]);

  const aramaAcik = sadelestir(arama).length >= 2;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: kenar.top + 12, paddingBottom: 16 }}
      keyboardShouldPersistTaps="handled">
      <Text style={st.sayfaBaslik}>Dersler</Text>

      <TextInput
        value={arama}
        onChangeText={setArama}
        placeholder="Kartlarda ara"
        placeholderTextColor={P.inkFaint}
        style={{
          backgroundColor: P.yuzey, borderWidth: 1, borderColor: P.line,
          paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14,
          fontSize: 17, color: P.ink, fontFamily: FONT.govde,
        }}
      />

      {aramaAcik && (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.inkSoft, letterSpacing: 1 }}>
              {sonuclar.length === 0 ? 'SONUÇ YOK' : sonuclar.length + ' SONUÇ'}
            </Text>
            <TouchableOpacity onPress={() => { setArama(''); setAcikKart(null); }}>
              <Text style={{ fontFamily: FONT.govde, fontSize: 17, color: P.red }}>temizle</Text>
            </TouchableOpacity>
          </View>

          {sonuclar.map(c => {
            const d = DERSLER.find(x => x.id === c.ders) || { renk: P.ink, acik: P.bgAlt, harf: '?' };
            const acik = acikKart === c.id;
            const durum = srs[c.id] || yeniD(c.id);
            return (
              <TouchableOpacity key={c.id} activeOpacity={0.75}
                onPress={() => { titre.hafif(); setAcikKart(acik ? null : c.id); }}
                style={{ backgroundColor: P.yuzey, borderWidth: 1, borderColor: acik ? d.renk : P.line, padding: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: d.renk, letterSpacing: 1 }}>{c.unite}</Text>
                  <View style={{ flex: 1 }} />
                  <OptikBaloncuk seviye={durum.seviye} max={7} renk={d.renk} boyut={6} />
                </View>
                <Text style={{ fontSize: 16, fontFamily: FONT.serif, color: P.ink, lineHeight: 21 }}>{c.soru}</Text>
                {acik ? (
                  <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: P.line, paddingTop: 10 }}>
                    <Text style={{ fontSize: 16, fontFamily: FONT.govde, color: d.renk, lineHeight: 21 }}>{c.cevap}</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 15, fontFamily: FONT.govde, color: P.inkFaint, marginTop: 6 }}>cevabı görmek için dokun</Text>
                )}
              </TouchableOpacity>
            );
          })}

          {sonuclar.length === 40 && (
            <Text style={{ fontFamily: FONT.govde, fontSize: 16, color: P.inkFaint, textAlign: 'center', marginTop: 4 }}>
              İlk 40 sonuç gösteriliyor. Aramayı daralt.
            </Text>
          )}
        </View>
      )}

      {DERSLER.map(d => {
        const dk = CARDS.filter(c => c.ders === d.id);
        const ogr = dk.filter(c => (srs[c.id] || yeniD(c.id)).seviye >= 3).length;
        const uSayi = uniteler(d.id).length;
        return (
          <TouchableOpacity key={d.id} style={st.dersSatir} onPress={() => { titre.hafif(); onDersBaslat(d.id); }} activeOpacity={0.7}>
            <Muhur harf={d.harf} renk={d.renk} boyut={38} font={13} kagitRenk={d.acik} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontFamily: FONT.serif, color: P.ink }}>{d.ad}</Text>
              <Text style={{ fontSize: 15, color: P.inkSoft, marginTop: 2, fontFamily: FONT.govde }}>{ogr}/{dk.length} öğrenildi · {uSayi} ünite</Text>
            </View>
            <Text style={{ fontSize: 18, color: P.inkFaint }}>›</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ============ KART MODU (ODAK — daima koyu) ============
function KartModu({ kartlar, mod, onBitti, onUpdate, onGeriAl, srs, sinavMod }) {
  const kenar = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const [acik, setAcik] = useState(false);
  const [dogru, setDogru] = useState(0);
  const [xpKazanim, setXpKazanim] = useState(0);
  const [canlar, setCanlar] = useState(5);
  const [gameOver, setGameOver] = useState(false);
  const [kalanSaniye, setKalanSaniye] = useState(sinavMod ? 2400 : null);
  const [secilen, setSecilen] = useState(null);
  const [gecmis, setGecmis] = useState([]);
  const [yazilan, setYazilan] = useState('');
  const [yazimSonuc, setYazimSonuc] = useState(null); // 'dogru' | 'yanlis'
  const [dersSayac, setDersSayac] = useState({});     // sınav sonu ders kırılımı
  const isQuiz = mod === 'quiz';
  const isYaz = mod === 'yaz';
  // Sınav simülasyonunda can yoktur: gerçek sınav 5 yanlışta bitmez,
  // denemenin amacı zaten yanlışları görmektir.
  const canVar = !sinavMod;

  const flip = useRef(new Animated.Value(0)).current;
  const kaydir = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const acikRef = useRef(false);
  const kartRef = useRef(null);
  const canRef = useRef(5);

  useEffect(() => { acikRef.current = acik; }, [acik]);
  useEffect(() => { canRef.current = canlar; }, [canlar]);

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
    Animated.timing(flip, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    setTimeout(() => setAcik(true), 190);
  };
  const sifirlaAnim = () => { flip.setValue(0); kaydir.setValue({ x: 0, y: 0 }); };

  useEffect(() => {
    if (!sinavMod) return;
    const t = setInterval(() => setKalanSaniye(s => {
      if (s === null) return s;
      if (s <= 1) { clearInterval(t); setGameOver(true); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [sinavMod]);

  const cevapla = (dogruMu, animYon) => {
    const ref = kartRef.current;
    if (!ref || !ref.kart) return;
    dogruMu ? titre.dogru() : titre.yanlis();
    setGecmis(g => [...g, { kartId: ref.kart.id, oncekiDurum: ref.durum, dogruMu, canOnce: canRef.current, ders: ref.kart.ders }]);
    onUpdate(ref.kart.id, srsGuncelle(ref.durum, dogruMu), dogruMu);

    // Ders bazında sayaç (sınav sonu kırılımı için)
    const dersId = ref.kart.ders;
    setDersSayac(p => ({
      ...p,
      [dersId]: {
        dogru: (p[dersId]?.dogru || 0) + (dogruMu ? 1 : 0),
        toplam: (p[dersId]?.toplam || 0) + 1,
      },
    }));

    if (dogruMu) { setDogru(d => d + 1); setXpKazanim(x => x + 10); }
    else if (canVar) {
      setCanlar(c => {
        const yeni = c - 1;
        if (yeni <= 0) setTimeout(() => setGameOver(true), 320);
        return yeni;
      });
    }
    const bitis = animYon ? animYon * SW * 1.2 : 0;
    Animated.timing(kaydir, { toValue: { x: bitis, y: 0 }, duration: animYon ? 200 : 0, useNativeDriver: true })
      .start(() => { setAcik(false); setSecilen(null); setYazilan(''); setYazimSonuc(null); sifirlaAnim(); setIdx(i => i + 1); });
  };

  const geriAl = () => {
    if (gecmis.length === 0) return;
    titre.orta();
    const son = gecmis[gecmis.length - 1];
    setGecmis(g => g.slice(0, -1));
    onGeriAl(son.kartId, son.oncekiDurum, son.dogruMu);
    if (son.dogruMu) { setDogru(d => Math.max(0, d - 1)); setXpKazanim(x => Math.max(0, x - 10)); }
    else if (canVar) setCanlar(son.canOnce);
    if (son.ders) {
      setDersSayac(p => ({
        ...p,
        [son.ders]: {
          dogru: Math.max(0, (p[son.ders]?.dogru || 0) - (son.dogruMu ? 1 : 0)),
          toplam: Math.max(0, (p[son.ders]?.toplam || 0) - 1),
        },
      }));
    }
    setAcik(false); setSecilen(null); setYazilan(''); setYazimSonuc(null); sifirlaAnim();
    setIdx(i => Math.max(0, i - 1));
  };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => acikRef.current && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => kaydir.setValue({ x: g.dx, y: g.dy * 0.15 }),
    onPanResponderRelease: (_, g) => {
      if (g.dx > 110) cevapla(true, 1);
      else if (g.dx < -110) cevapla(false, -1);
      else Animated.spring(kaydir, { toValue: { x: 0, y: 0 }, useNativeDriver: true, bounciness: 8 }).start();
    },
  })).current;

  // ---- SONUÇ ----
  if (!kart || idx >= kartlar.length || gameOver) {
    const toplam = Math.min(idx, kartlar.length);
    const pct = toplam > 0 ? Math.round((dogru / toplam) * 100) : 0;
    const renk = pct >= 80 ? FOCUS.green : pct >= 50 ? FOCUS.ember : FOCUS.red;
    return (
      <View style={{ flex: 1, backgroundColor: FOCUS.bg }}>
        <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', justifyContent: 'center', flexGrow: 1, paddingTop: kenar.top + 24, paddingBottom: kenar.bottom + 24 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: FOCUS.textSoft, letterSpacing: 2, marginBottom: 8 }}>
            {gameOver ? 'CANLAR TÜKENDİ' : 'SONUÇ RAPORU'}
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

          <TouchableOpacity style={{ borderWidth: 1.5, borderColor: FOCUS.ember, paddingVertical: 15, width: '100%', alignItems: 'center' }}
            onPress={() => { titre.orta(); onBitti(dogru, toplam, dersSayac); }}>
            <Text style={{ fontSize: 15, fontFamily: FONT.monoBold, color: FOCUS.ember, letterSpacing: 1 }}>ANA SAYFAYA DÖN</Text>
          </TouchableOpacity>
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

  const donus = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const kaydirDonus = kaydir.x.interpolate({ inputRange: [-SW, 0, SW], outputRange: ['-9deg', '0deg', '9deg'] });
  const evetOpak = kaydir.x.interpolate({ inputRange: [0, 110], outputRange: [0, 1], extrapolate: 'clamp' });
  const hayirOpak = kaydir.x.interpolate({ inputRange: [-110, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={{ flex: 1, backgroundColor: FOCUS.bg, paddingTop: kenar.top, paddingBottom: kenar.bottom }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}>
        <TouchableOpacity onPress={() => onBitti(dogru, idx)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 19, color: FOCUS.textSoft }}>×</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          {sinavMod && dakika !== null ? (
            <Text style={{ fontSize: 21, fontFamily: FONT.monoBold, color: zamanAz ? FOCUS.red : FOCUS.ember }}>{dakika}:{String(saniye).padStart(2, '0')}</Text>
          ) : (
            <Text style={{ fontSize: 13, color: FOCUS.textSoft, fontFamily: FONT.mono, letterSpacing: 1 }}>{isQuiz ? 'QUIZ' : isYaz ? 'YAZMA' : 'KART'} MODU</Text>
          )}
          <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: FOCUS.textSoft, marginTop: 2 }}>{idx + 1} / {kartlar.length}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={geriAl} disabled={gecmis.length === 0} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginRight: 12, opacity: gecmis.length ? 1 : 0.25 }}>
            <Text style={{ fontFamily: FONT.mono, fontSize: 17, color: FOCUS.ember }}>⟲</Text>
          </TouchableOpacity>
          {canVar ? (
            <Text style={{ fontFamily: FONT.mono, fontSize: 15, color: canlar <= 2 ? FOCUS.red : FOCUS.textSoft }}>
              {'—'.repeat(canlar)}{'·'.repeat(5 - canlar)}
            </Text>
          ) : (
            <Text style={{ fontFamily: FONT.mono, fontSize: 13, color: FOCUS.textSoft }}>{dogru} D</Text>
          )}
        </View>
      </View>

      <View style={{ height: 2, backgroundColor: FOCUS.line, marginHorizontal: 20 }}>
        <View style={{ height: '100%', backgroundColor: FOCUS.ember, width: ((idx / kartlar.length) * 100) + '%' }} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
        keyboardShouldPersistTaps="handled">
        <Animated.View
          {...((!isQuiz && !isYaz) ? pan.panHandlers : {})}
          style={{
            transform: [
              { translateX: kaydir.x }, { translateY: kaydir.y },
              { rotate: kaydirDonus },
              { perspective: 1200 }, { rotateY: donus },
            ],
          }}>
          <View style={{
            backgroundColor: FOCUS.panel, borderRadius: 10, padding: 24,
            borderLeftWidth: 3, borderLeftColor: FOCUS.ember,
            transform: [{ rotateY: (acik && !isQuiz && !isYaz) ? '180deg' : '0deg' }],
          }}>
            {!isQuiz && !isYaz && acik && (
              <React.Fragment>
                <Animated.View style={{ position: 'absolute', top: 12, right: 12, opacity: evetOpak, borderWidth: 1.5, borderColor: FOCUS.green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                  <Text style={{ fontFamily: FONT.monoBold, fontSize: 13, color: FOCUS.green }}>BİLDİM</Text>
                </Animated.View>
                <Animated.View style={{ position: 'absolute', top: 12, left: 12, opacity: hayirOpak, borderWidth: 1.5, borderColor: FOCUS.red, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                  <Text style={{ fontFamily: FONT.monoBold, fontSize: 13, color: FOCUS.red }}>BİLMEDİM</Text>
                </Animated.View>
              </React.Fragment>
            )}

            <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: FOCUS.ember, marginBottom: 10, letterSpacing: 1 }}>{kart.unite}</Text>
            <Text style={{ fontSize: 18, fontFamily: FONT.serif, color: FOCUS.text, lineHeight: 26 }}>{kart.soru}</Text>

            {!isQuiz && !isYaz && !acik && (
              <TouchableOpacity style={{ borderWidth: 1.5, borderColor: FOCUS.ember, paddingVertical: 14, alignItems: 'center', marginTop: 22 }} onPress={cevirtme}>
                <Text style={{ fontSize: 15, fontFamily: FONT.monoBold, color: FOCUS.ember, letterSpacing: 1 }}>CEVABI GÖR</Text>
              </TouchableOpacity>
            )}
            {!isQuiz && !isYaz && acik && (
              <View style={{ marginTop: 22 }}>
                <View style={{ backgroundColor: FOCUS.panel2, borderRadius: 8, padding: 14, marginBottom: 14 }}>
                  <Text style={{ fontSize: 16, fontFamily: FONT.mono, color: FOCUS.green }}>{kart.cevap}</Text>
                </View>
                <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: FOCUS.textSoft, textAlign: 'center', marginBottom: 12 }}>
                  sola kaydır: bilmedim · sağa kaydır: bildim
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity style={{ flex: 1, borderWidth: 1.5, borderColor: FOCUS.red, paddingVertical: 13, alignItems: 'center', marginRight: 6 }} onPress={() => cevapla(false, -1)}>
                    <Text style={{ fontSize: 15, fontFamily: FONT.monoBold, color: FOCUS.red }}>BİLMEDİM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, borderWidth: 1.5, borderColor: FOCUS.green, paddingVertical: 13, alignItems: 'center', marginLeft: 6 }} onPress={() => cevapla(true, 1)}>
                    <Text style={{ fontSize: 15, fontFamily: FONT.monoBold, color: FOCUS.green }}>BİLDİM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {isYaz && (
              <View style={{ marginTop: 20 }}>
                {!acik ? (
                  <React.Fragment>
                    <TextInput
                      value={yazilan}
                      onChangeText={setYazilan}
                      placeholder="Cevabı buraya yaz"
                      placeholderTextColor={FOCUS.textSoft}
                      multiline
                      style={{
                        backgroundColor: FOCUS.panel2, borderRadius: 8, padding: 14,
                        color: FOCUS.text, fontFamily: FONT.mono, fontSize: 17,
                        minHeight: 56, textAlignVertical: 'top',
                        borderWidth: 1.5, borderColor: FOCUS.line,
                      }}
                    />
                    <TouchableOpacity
                      disabled={!yazilan.trim()}
                      style={{
                        borderWidth: 1.5, borderColor: FOCUS.ember, paddingVertical: 14,
                        alignItems: 'center', marginTop: 14, opacity: yazilan.trim() ? 1 : 0.4,
                      }}
                      onPress={() => {
                        const dogruMu = cevapEslesiyor(yazilan, kart.cevap);
                        setYazimSonuc(dogruMu ? 'dogru' : 'yanlis');
                        setAcik(true);
                        dogruMu ? titre.dogru() : titre.yanlis();
                      }}>
                      <Text style={{ fontSize: 15, fontFamily: FONT.monoBold, color: FOCUS.ember, letterSpacing: 1 }}>KONTROL ET</Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <View style={{
                      backgroundColor: FOCUS.panel2, borderRadius: 8, padding: 14, marginBottom: 10,
                      borderLeftWidth: 3, borderLeftColor: yazimSonuc === 'dogru' ? FOCUS.green : FOCUS.red,
                    }}>
                      <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: FOCUS.textSoft, marginBottom: 5 }}>SENİN CEVABIN</Text>
                      <Text style={{ fontSize: 16, fontFamily: FONT.mono, color: yazimSonuc === 'dogru' ? FOCUS.green : FOCUS.red }}>{yazilan}</Text>
                    </View>
                    <View style={{ backgroundColor: FOCUS.panel2, borderRadius: 8, padding: 14, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: FOCUS.green }}>
                      <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: FOCUS.textSoft, marginBottom: 5 }}>DOĞRU CEVAP</Text>
                      <Text style={{ fontSize: 16, fontFamily: FONT.mono, color: FOCUS.green }}>{kart.cevap}</Text>
                    </View>

                    {yazimSonuc === 'yanlis' && (
                      <TouchableOpacity
                        style={{ borderWidth: 1.5, borderColor: FOCUS.textSoft, paddingVertical: 11, alignItems: 'center', marginBottom: 10 }}
                        onPress={() => cevapla(true, 0)}>
                        <Text style={{ fontSize: 14, fontFamily: FONT.mono, color: FOCUS.textSoft }}>Aslında doğruydu, doğru say</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={{
                        borderWidth: 1.5, paddingVertical: 14, alignItems: 'center',
                        borderColor: yazimSonuc === 'dogru' ? FOCUS.green : FOCUS.red,
                      }}
                      onPress={() => cevapla(yazimSonuc === 'dogru', 0)}>
                      <Text style={{
                        fontSize: 15, fontFamily: FONT.monoBold, letterSpacing: 1,
                        color: yazimSonuc === 'dogru' ? FOCUS.green : FOCUS.red,
                      }}>
                        {yazimSonuc === 'dogru' ? 'DOĞRU · DEVAM' : 'YANLIŞ · DEVAM'}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                )}
              </View>
            )}

            {isQuiz && (
              <View style={{ marginTop: 18 }}>
                {sikSirasi.map((sec, i) => {
                  const dogruMu = sec === kart.cevap;
                  const border = !acik ? FOCUS.line : (dogruMu ? FOCUS.green : (sec === secilen ? FOCUS.red : FOCUS.line));
                  const tc = !acik ? FOCUS.text : (dogruMu ? FOCUS.green : (sec === secilen ? FOCUS.red : FOCUS.textSoft));
                  return (
                    <TouchableOpacity key={i} disabled={acik}
                      style={{ padding: 13, borderRadius: 6, marginBottom: 8, backgroundColor: FOCUS.panel2, borderWidth: 1.5, borderColor: border }}
                      onPress={() => { setSecilen(sec); setAcik(true); setTimeout(() => cevapla(dogruMu, 0), 850); }}>
                      <Text style={{ fontSize: 15, color: tc, fontFamily: FONT.mono }}>{String.fromCharCode(65 + i)}. {sec}</Text>
                    </TouchableOpacity>
                  );
                })}
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.inkSoft, letterSpacing: 1 }}>ÇALIŞMA TAKVİMİ</Text>
        <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.inkFaint }}>{toplamGun} gün · {toplamKart} kart</Text>
      </View>

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

// ============ İSTATİSTİK ============
function IstatistikScreen({ srs, xp, seri, gunluk = {}, hedefKart = 30 }) {
  const { P, s: st, DERSLER } = useTema();
  const kenar = useSafeAreaInsets();
  const ogrenilenler = Object.values(srs).filter(d => d.seviye >= 3).length;
  const usta = Object.values(srs).filter(d => d.seviye === 7).length;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: kenar.top + 12, paddingBottom: 16 }}>
      <Text style={st.sayfaBaslik}>İstatistikler</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 }}>
        {[
          { label: 'Toplam XP', val: xp },
          { label: 'Gün Serisi', val: seri + ' gün' },
          { label: 'Öğrenilen', val: ogrenilenler },
          { label: 'Usta', val: usta },
        ].map(it => (
          <View key={it.label} style={{ width: '48%', marginRight: '2%', marginBottom: 10, borderWidth: 1, borderColor: P.line, padding: 12, backgroundColor: P.yuzey }}>
            <Text style={{ fontFamily: FONT.serif, fontSize: 25, color: P.ink }}>{it.val}</Text>
            <Text style={{ fontSize: 12, color: P.inkSoft, marginTop: 2, fontFamily: FONT.mono }}>{it.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>
      <View style={st.kart}>
        <CalismaTakvimi gunluk={gunluk} hedefKart={hedefKart} />
      </View>

      <View style={st.kart}>
        <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.inkSoft, letterSpacing: 1, marginBottom: 14 }}>DERS BAZINDA OPTİK FORM</Text>
        {DERSLER.map(d => {
          const dk = CARDS.filter(c => c.ders === d.id);
          const og = dk.filter(c => (srs[c.id] || yeniD(c.id)).seviye >= 3).length;
          const pct = dk.length ? Math.round((og / dk.length) * 100) : 0;
          return (
            <View key={d.id} style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontFamily: FONT.govde, color: P.ink, width: 110 }}>{d.ad}</Text>
              <OptikBaloncuk seviye={og} max={dk.length} renk={d.renk} boyut={8} />
              <Text style={{ fontSize: 13, fontFamily: FONT.mono, color: d.renk, marginLeft: 8 }}>%{pct}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ============ PROFİL ============
function RozetRow({ istatistikler }) {
  const { P } = useTema();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {ROZETLER.map(r => {
        const acik = r.kosul(istatistikler);
        return (
          <View key={r.id} style={{ width: '33.33%', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: acik ? P.red : P.line, alignItems: 'center', justifyContent: 'center', backgroundColor: acik ? P.vurguZemin : 'transparent' }}>
              <Text style={{ fontSize: 19, opacity: acik ? 1 : 0.3, color: P.red }}>{acik ? '✦' : '·'}</Text>
            </View>
            <Text style={{ fontSize: 11, fontFamily: FONT.mono, color: acik ? P.ink : P.inkFaint, marginTop: 5, textAlign: 'center' }}>{r.ad}</Text>
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
    bildirimAcik, setBildirimAcik, bildirimSaat, setBildirimSaat, onVeriDegisti,
  } = props;
  const { P, s: st, seviyeHesapla } = useTema();
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
            <Text style={{ fontFamily: FONT.mono, fontSize: 17, color: P.inkSoft }}>← Profil</Text>
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: 'center', fontFamily: FONT.serif, fontSize: 20, color: P.ink, marginRight: 60 }}>
            {altSayfa === 'ayarlar' ? 'Ayarlar' : 'Hesap'}
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

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: kenar.top + 12, paddingBottom: 16 }}>
      <Text style={st.sayfaBaslik}>Sınav Künyesi</Text>
      <View style={[st.kart, { alignItems: 'center', paddingVertical: 24 }]}>
        <Muhur harf={sev.harf} renk={sev.renk} boyut={64} font={24} />
        <Text style={{ fontFamily: FONT.serif, fontSize: 21, color: P.ink, marginTop: 10 }}>{sev.ad}</Text>
        <Text style={{ fontSize: 14, color: P.inkSoft, fontFamily: FONT.mono, marginTop: 2 }}>{xp} XP</Text>
        <View style={{ marginTop: 12 }}>
          <OptikBaloncuk seviye={sev.pct} max={100} renk={sev.renk} boyut={10} />
        </View>
        {sev.siradaki && <Text style={{ fontSize: 16, color: P.inkSoft, marginTop: 8, fontFamily: FONT.govde }}>Sonraki: {sev.siradaki.ad} ({sev.siradaki.minXp - xp} XP kaldı)</Text>}
      </View>
      <View style={st.kart}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          {[
            { val: ogrenilenler, label: 'Öğrenilen' },
            { val: seri, label: 'Gün Serisi' },
            { val: CARDS.length, label: 'Toplam' },
          ].map(it => (
            <View key={it.label} style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: FONT.serif, fontSize: 25, color: P.ink }}>{it.val}</Text>
              <Text style={{ fontSize: 12, color: P.inkSoft, fontFamily: FONT.mono }}>{it.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={st.kart}>
        <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.inkSoft, letterSpacing: 1, marginBottom: 12 }}>
          ROZETLER · {acikRozetSayisi}/{ROZETLER.length}
        </Text>
        <RozetRow istatistikler={istatistikler} />
      </View>
      {profil && profil.hedefOkul ? (
        <View style={[st.kart, { borderLeftWidth: 2, borderLeftColor: P.red }]}>
          <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.red }}>HEDEF OKUL</Text>
          <Text style={{ fontSize: 20, fontFamily: FONT.govde, color: P.ink }}>{profil.hedefOkul}</Text>
          {profil.hedefNet ? <Text style={{ fontSize: 14, color: P.inkSoft, marginTop: 2, fontFamily: FONT.mono }}>{profil.hedefNet} net hedef</Text> : null}
        </View>
      ) : null}
      {[
        { id: 'ayarlar', ad: 'Ayarlar', alt: 'Hedefler, bildirimler, görünüm' },
        { id: 'hesap', ad: 'Hesap', alt: 'Yedekleme, çıkış, hesabı silme' },
      ].map(b => (
        <TouchableOpacity key={b.id} activeOpacity={0.75}
          onPress={() => { titre.hafif(); setAltSayfa(b.id); }}
          style={[st.kart, { flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontFamily: FONT.serif, color: P.ink }}>{b.ad}</Text>
            <Text style={{ fontSize: 14, fontFamily: FONT.govde, color: P.inkSoft, marginTop: 3 }}>{b.alt}</Text>
          </View>
          <Text style={{ fontSize: 20, color: P.inkFaint }}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={{ alignItems: 'center', marginTop: 6 }}>
        <Text style={{ fontSize: 13, color: P.inkFaint, fontFamily: FONT.mono }}>LGS Cepte · v1.8.1 · {CARDS.length} kart · 6 ders</Text>
      </View>
    </ScrollView>
  );
}

// ============ AYARLAR ============
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: basliksiz ? 16 : kenar.top + 12, paddingBottom: 16 }}
      keyboardShouldPersistTaps="handled">
      {!basliksiz && <Text style={st.sayfaBaslik}>Ayarlar</Text>}

      <Text style={st.etiket}>GÖRÜNÜM</Text>
      <View style={{ flexDirection: 'row', marginBottom: 18 }}>
        <TouchableOpacity onPress={() => { titre.hafif(); setKoyu(false); }}
          style={[st.hap, !koyu && st.hapAktif, { marginRight: 8, flex: 1, alignItems: 'center' }]}>
          <Text style={[st.hapYazi, !koyu && { color: P.red, fontFamily: FONT.monoBold }]}>☀ Kağıt</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { titre.hafif(); setKoyu(true); }}
          style={[st.hap, koyu && st.hapAktif, { flex: 1, alignItems: 'center' }]}>
          <Text style={[st.hapYazi, koyu && { color: P.red, fontFamily: FONT.monoBold }]}>☾ Gece</Text>
        </TouchableOpacity>
      </View>

      <Text style={st.etiket}>SINAV TARİHİ (YYYY-AA-GG)</Text>
      <TextInput style={st.girdi} value={sinavTarihi} onChangeText={setSinavTarihi} placeholder="2027-06-14" placeholderTextColor={P.inkFaint} />

      <Text style={st.etiket}>HEDEF OKUL</Text>
      <TextInput style={st.girdi} value={profil.hedefOkul || ''} onChangeText={(t) => setProfil(p => ({ ...p, hedefOkul: t }))} placeholder="Örn. Fen Lisesi" placeholderTextColor={P.inkFaint} />

      <Text style={st.etiket}>NET HEDEFİ</Text>
      <TextInput style={st.girdi} value={profil.hedefNet || ''} onChangeText={(t) => setProfil(p => ({ ...p, hedefNet: t }))} keyboardType="number-pad" placeholder="Örn. 400" placeholderTextColor={P.inkFaint} />

      <Text style={st.etiket}>GÜNLÜK HEDEF</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
        {[15, 30, 50, 75].map(n => (
          <TouchableOpacity key={n} onPress={() => { titre.hafif(); setHedefKart(n); }}
            style={[st.hap, hedefKart === n && st.hapAktif, { marginRight: 8, marginBottom: 8 }]}>
            <Text style={[st.hapYazi, hedefKart === n && { color: P.red, fontFamily: FONT.monoBold }]}>{n} kart</Text>
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
              <Text style={{ fontFamily: FONT.mono, fontSize: 14, color: P.inkSoft, marginRight: 8 }}>{secili ? '☒' : '☐'}</Text>
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

      <TouchableOpacity style={[st.kart, { borderColor: P.red, alignItems: 'center', marginTop: 8 }]}
        onPress={() => Alert.alert('Emin misin?', 'Tüm ilerleme silinecek.', [
          { text: 'İptal' },
          { text: 'Sıfırla', style: 'destructive', onPress: async () => { await AsyncStorage.clear(); } }
        ])}>
        <Text style={{ fontSize: 14, fontFamily: FONT.monoBold, color: P.red, letterSpacing: 1 }}>TÜM VERİLERİ SIFIRLA</Text>
      </TouchableOpacity>
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
  const [gunluk, setGunluk] = useState({}); // { 'YYYY-MM-DD': kartSayisi }
  const [hedefKart, setHedefKart] = useState(30);
  const [sinavTarihi, setSinavTarihi] = useState('2027-06-14');
  const [sinavSayisi, setSinavSayisi] = useState(0);
  const [enIyiSinavPct, setEnIyiSinavPct] = useState(0);
  const [bildirimAcik, setBildirimAcik] = useState(false);
  const [bildirimSaat, setBildirimSaat] = useState(19);
  const [aktifDers, setAktifDers] = useState(null);
  const [mod, setMod] = useState(null);
  const [aktifUnite, setAktifUnite] = useState(null);
  const [sinavMod, setSinavMod] = useState(false);
  const [motivasyonMesaj, setMotivasyonMesaj] = useState(null);
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
          'lgs_son_aktif', 'lgs_sinav_tarihi', 'lgs_sinav_sayisi', 'lgs_en_iyi_sinav', 'lgs_bildirim_acik', 'lgs_bildirim_saat', 'lgs_gunluk', 'lgs_misafir'];
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

      try {
        const bugunStr = bugunTarihi();
        const sonMotGun = await AsyncStorage.getItem('lgs_mot_gun');
        if (sonMotGun !== bugunStr) {
          const mesajlar = [
            'Bugün harika bir gün çalışmak için.',
            'Her kart seni hedefe yaklaştırıyor.',
            'Düzenli çalışmak başarının anahtarı.',
            'Bugünün çalışması yarının başarısı.',
            'Sen yapabilirsin, hadi başla.',
            'Küçük adımlar büyük sonuçlara götürür.',
          ];
          setMotivasyonMesaj(mesajlar[Math.floor(Math.random() * mesajlar.length)]);
          await AsyncStorage.setItem('lgs_mot_gun', bugunStr);
        }
      } catch (e) {}
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
        ]);
      } catch (e) { console.log('Save error:', e); }
    })();
  }, [srs, xp, seri, bugun, hedefKart, yukluyor, onboarded, setupDone, profil, sonAktifGun, sinavTarihi, sinavSayisi, enIyiSinavPct, bildirimAcik, bildirimSaat, gunluk]);

  useEffect(() => {
    if (yukluyor) return;
    bildirimGuncelle(bildirimAcik, bildirimSaat);
  }, [bildirimAcik, bildirimSaat, yukluyor]);

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
    setBugun(b => b + 1);
    // Çalışma takvimi için günlük kaydı tut
    const gun = bugunTarihi();
    setGunluk(g => ({ ...g, [gun]: (g[gun] || 0) + 1 }));
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
    if (dogruMuydu) setXp(x => Math.max(0, x - 10));
  };

  const yereldenTazele = async () => {
    try {
      const keys = ['lgs_srs', 'lgs_xp', 'lgs_seri', 'lgs_bugun', 'lgs_hedef', 'lgs_profil',
        'lgs_son_aktif', 'lgs_sinav_tarihi', 'lgs_sinav_sayisi', 'lgs_en_iyi_sinav', 'lgs_gunluk'];
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
    } catch (e) { console.log('Tazeleme hatası:', e); }
  };

  const sinavBaslat = () => { setSinavMod(true); setAktifDers('sinav'); setMod('quiz'); setAktifUnite(null); };
  const cikis = () => { setAktifDers(null); setMod(null); setSinavMod(false); setAktifUnite(null); };

  if (yukluyor || !oturumOkundu) return (
    <View style={{ flex: 1, backgroundColor: P.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 15, color: P.red, letterSpacing: 2, marginBottom: 10, fontFamily: FONT.mono }}>LGS CEPTE</Text>
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
    <ModSecim ders={aktifDers} srs={srs} onGeri={cikis} onBaslat={(m, u) => { setAktifUnite(u); setMod(m); }} />
  );

  if (aktifDers && mod) {
    const quizMi = mod === 'quiz';
    // Quiz modunda şıkkı olmayan kart tek seçenek gösterir; bu da doğru
    // cevabın kendisidir. Bu yüzden quizde yalnızca şıklı kartlar kullanılır.
    const uygun = (liste) => quizMi ? liste.filter(c => c.secenekler) : liste;

    let kartlar;
    if (sinavMod) kartlar = shuffle(uygun(CARDS)).slice(0, 30);
    else if (aktifDers === 'yanlislar') kartlar = shuffle(uygun(CARDS.filter(c => (srs[c.id] || {}).sonYanlis)));
    else kartlar = shuffle(uygun(CARDS.filter(c => c.ders === aktifDers && (!aktifUnite || c.unite === aktifUnite))));

    // Quizde hiç şıklı kart yoksa kullanıcıyı boş ekranda bırakma
    if (kartlar.length === 0) {
      Alert.alert('Kart bulunamadı', 'Bu seçimde test moduna uygun kart yok. Kart modunu deneyebilirsin.');
      cikis();
      return null;
    }
    return (
      <React.Fragment>
        <StatusBar barStyle="light-content" backgroundColor={FOCUS.bg} />
        <KartModu kartlar={kartlar} mod={mod} sinavMod={sinavMod} srs={srs}
          onUpdate={guncelle} onGeriAl={geriAl}
          onBitti={(dogru, toplam) => {
            if (sinavMod && toplam > 0) {
              setSinavSayisi(s => s + 1);
              setEnIyiSinavPct(p => Math.max(p, Math.round((dogru / toplam) * 100)));
            }
            cikis();
          }} />
      </React.Fragment>
    );
  }

  return (
    <Sayfa>
      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen srs={srs} xp={xp} seri={seri} bugun={bugun} hedefKart={hedefKart} onDersBaslat={setAktifDers} sinavTarihi={sinavTarihi} profil={profil} onSinavBaslat={sinavBaslat} onProfil={() => setTab('profil')} />}
        {tab === 'dersler' && <DerslerScreen srs={srs} onDersBaslat={setAktifDers} />}
        {tab === 'istatistik' && <IstatistikScreen srs={srs} xp={xp} seri={seri} gunluk={gunluk} hedefKart={hedefKart} />}
        {tab === 'profil' && (
          <ProfilScreen
            srs={srs} xp={xp} seri={seri} profil={profil} setProfil={setProfil}
            sinavSayisi={sinavSayisi} enIyiSinavPct={enIyiSinavPct}
            hedefKart={hedefKart} setHedefKart={setHedefKart}
            sinavTarihi={sinavTarihi} setSinavTarihi={setSinavTarihi}
            bildirimAcik={bildirimAcik} setBildirimAcik={setBildirimAcik}
            bildirimSaat={bildirimSaat} setBildirimSaat={setBildirimSaat}
            onVeriDegisti={yereldenTazele}
          />
        )}
      </View>

      {motivasyonMesaj && (
        <View style={{ position: 'absolute', bottom: kenar.bottom + 78, left: 20, right: 20, zIndex: 999 }}>
          <View style={{
            backgroundColor: P.notKagit, borderRadius: 4, paddingVertical: 14, paddingHorizontal: 16,
            flexDirection: 'row', alignItems: 'center',
            shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6,
          }}>
            <Text style={{ flex: 1, fontSize: 15, color: P.notYazi, fontFamily: FONT.govde, lineHeight: 22 }}>{motivasyonMesaj}</Text>
            <TouchableOpacity onPress={() => setMotivasyonMesaj(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ marginLeft: 12 }}>
              <Text style={{ fontSize: 18, color: P.notYazi, opacity: 0.7 }}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <StatusBar barStyle={koyu ? 'light-content' : 'dark-content'} backgroundColor={P.bg} />
      <TabBar tab={tab} setTab={setTab} />
    </Sayfa>
  );
}

// ============ KÖK ============
function Kok() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, SpaceMono_400Regular, SpaceMono_700Bold,
  });
  const [koyu, setKoyuState] = useState(false);
  const [temaOkundu, setTemaOkundu] = useState(false);
  const kenar = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('lgs_tema');
        if (v === 'koyu') setKoyuState(true);
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