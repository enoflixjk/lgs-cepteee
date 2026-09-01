import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema, FONT } from '../lib/tema';
import { supabase } from '../lib/supabase';
import { kayit_ol, giris_yap, cikis_yap, sifre_sifirla, buluta_yukle, buluttan_indir, hesabi_sil, googleIleGiris } from '../lib/bulut';

export default function HesapEkrani({ onVeriDegisti, kapiModu, basliksiz, onGec }) {
  const { P } = useTema();
  const kenar = useSafeAreaInsets();
  const s = React.useMemo(() => yapStil(P), [P]);
  const [oturum, setOturum] = useState(null);
  const [eposta, setEposta] = useState('');
  const [sifre, setSifre] = useState('');
  const [kayitModu, setKayitModu] = useState(false);
  const [mesgul, setMesgul] = useState(false);
  const [durum, setDurum] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setOturum(data.session));
    const { data: dinleyici } = supabase.auth.onAuthStateChange((_e, s) => setOturum(s));
    return () => dinleyici.subscription.unsubscribe();
  }, []);

  const calistir = async (isim, fn) => {
    setMesgul(true); setDurum(null);
    try {
      const sonuc = await fn();
      setDurum({ tur: 'ok', mesaj: isim });
      return sonuc;
    } catch (e) {
      setDurum({ tur: 'hata', mesaj: cevir(e.message) });
    } finally {
      setMesgul(false);
    }
  };

  // Supabase hata mesajlarını Türkçeleştir
  const cevir = (m = '') => {
    if (m.includes('Invalid login')) return 'E-posta veya şifre hatalı.';
    if (m.includes('already registered')) return 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.';
    if (m.includes('Password should be')) return 'Şifre en az 6 karakter olmalı.';
    if (m.includes('valid email')) return 'Geçerli bir e-posta adresi gir.';
    if (m.includes('Email not confirmed')) return 'E-postanı doğrulaman gerekiyor. Gelen kutunu kontrol et.';
    if (m.includes('Network')) return 'İnternet bağlantını kontrol et.';
    return m;
  };

  // ---------- GİRİŞ YAPILMAMIŞ ----------
  if (!oturum) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: P.bg }}
        contentContainerStyle={{ padding: 20, paddingTop: basliksiz ? 16 : kenar.top + (kapiModu ? 48 : 12), paddingBottom: 24, flexGrow: 1, justifyContent: kapiModu ? 'center' : 'flex-start' }}
        keyboardShouldPersistTaps="handled">
        {kapiModu ? (
          <React.Fragment>
            <Text style={s.ustEtiket}>LGS CEPTE</Text>
            <Text style={s.baslik}>{kayitModu ? 'Hesap oluştur' : 'Giriş yap'}</Text>
            <Text style={s.aciklama}>
              İlerlemen hesabına kaydedilir. Telefonunu değiştirsen bile
              kaldığın yerden devam edersin.
            </Text>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {!basliksiz && <Text style={s.baslik}>Hesap</Text>}
            <Text style={s.aciklama}>
              İlerlemen buluta yedeklenir; telefonunu değiştirsen bile kaldığın
              yerden devam edersin.
            </Text>
          </React.Fragment>
        )}

        <TouchableOpacity
          disabled={mesgul}
          style={[s.googleDugme, mesgul && { opacity: 0.5 }]}
          onPress={() => calistir('Giriş yapıldı.', googleIleGiris)}>
          {mesgul
            ? <ActivityIndicator color={P.ink} />
            : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontFamily: FONT.monoBold, fontSize: 15, color: '#1F1F1F' }}>G</Text>
                <Text style={[s.googleDugmeYazi, { marginLeft: 10 }]}>GOOGLE İLE DEVAM ET</Text>
              </View>
            )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 18 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: P.line }} />
          <Text style={{ fontFamily: FONT.mono, fontSize: 12, color: P.inkFaint, marginHorizontal: 10 }}>VEYA</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: P.line }} />
        </View>

        <View style={s.kart}>
          <Text style={s.etiket}>{kayitModu ? 'YENİ HESAP' : 'GİRİŞ YAP'}</Text>

          <Text style={s.alanEtiket}>E-POSTA</Text>
          <TextInput
            style={s.girdi}
            value={eposta}
            onChangeText={setEposta}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="ornek@eposta.com"
            placeholderTextColor={P.inkFaint}
          />

          <Text style={s.alanEtiket}>ŞİFRE</Text>
          <TextInput
            style={s.girdi}
            value={sifre}
            onChangeText={setSifre}
            secureTextEntry
            placeholder="en az 6 karakter"
            placeholderTextColor={P.inkFaint}
          />

          <TouchableOpacity
            disabled={mesgul}
            style={[s.dugme, mesgul && { opacity: 0.5 }]}
            onPress={() => calistir(
              kayitModu ? 'Hesap açıldı. E-postana gelen doğrulama bağlantısına tıkla.' : 'Giriş yapıldı.',
              () => kayitModu ? kayit_ol(eposta, sifre) : giris_yap(eposta, sifre)
            )}>
            {mesgul
              ? <ActivityIndicator color={P.ink} />
              : <Text style={s.dugmeYazi}>{kayitModu ? 'HESAP AÇ' : 'GİRİŞ YAP'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setKayitModu(k => !k); setDurum(null); }} style={{ marginTop: 14 }}>
            <Text style={s.baglanti}>
              {kayitModu ? 'Zaten hesabım var, giriş yapayım' : 'Hesabım yok, yeni hesap açayım'}
            </Text>
          </TouchableOpacity>

          {!kayitModu && (
            <TouchableOpacity
              onPress={() => {
                if (!eposta.trim()) { setDurum({ tur: 'hata', mesaj: 'Önce e-posta adresini yaz.' }); return; }
                calistir('Şifre sıfırlama bağlantısı e-postana gönderildi.', () => sifre_sifirla(eposta));
              }}
              style={{ marginTop: 10 }}>
              <Text style={s.baglanti}>Şifremi unuttum</Text>
            </TouchableOpacity>
          )}
        </View>

        {kapiModu && onGec && (
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <TouchableOpacity onPress={onGec} hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }} style={{ paddingVertical: 10 }}>
              <Text style={[s.baglanti, { color: P.inkSoft }]}>Şimdilik geç, hesapsız devam et</Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: FONT.mono, fontSize: 11, color: P.inkFaint, textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
              Hesabı sonradan Profil › Hesap'tan açabilirsin.{'\n'}Hesapsız çalışırsan ilerlemen yalnızca bu telefonda kalır.
            </Text>
          </View>
        )}

        {durum && (
          <View style={[s.durum, durum.tur === 'hata' ? s.durumHata : s.durumOk]}>
            <Text style={[s.durumYazi, durum.tur === 'hata' && { color: P.red }]}>{durum.mesaj}</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // ---------- GİRİŞ YAPILMIŞ ----------
  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: basliksiz ? 16 : kenar.top + 12, paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled">
      {!basliksiz && <Text style={s.baslik}>Hesap</Text>}

      <View style={s.kart}>
        <Text style={s.etiket}>HESAP</Text>
        <Text style={{ fontFamily: FONT.govde, fontSize: 19, color: P.ink, marginTop: 4 }}>
          {oturum.user.email}
        </Text>
      </View>

      <TouchableOpacity
        disabled={mesgul}
        style={[s.dugme, { marginBottom: 10 }, mesgul && { opacity: 0.5 }]}
        onPress={() => calistir('İlerlemen buluta yedeklendi.', buluta_yukle)}>
        <Text style={s.dugmeYazi}>BULUTA YEDEKLE</Text>
      </TouchableOpacity>

      <TouchableOpacity
        disabled={mesgul}
        style={[s.dugme, { marginBottom: 10 }, mesgul && { opacity: 0.5 }]}
        onPress={() => Alert.alert(
          'Buluttan geri yükle',
          'Buluttaki ilerleme telefonundakiyle birleştirilecek. Çakışma olursa daha çok çalışılmış olan kalır.',
          [
            { text: 'İptal' },
            {
              text: 'Devam et',
              onPress: () => calistir('İlerlemen geri yüklendi.', async () => {
                await buluttan_indir();
                if (onVeriDegisti) onVeriDegisti();
              }),
            },
          ]
        )}>
        <Text style={s.dugmeYazi}>BULUTTAN GERİ YÜKLE</Text>
      </TouchableOpacity>

      {mesgul && <ActivityIndicator color={P.ink} style={{ marginVertical: 10 }} />}

      {durum && (
        <View style={[s.durum, durum.tur === 'hata' ? s.durumHata : s.durumOk]}>
          <Text style={[s.durumYazi, durum.tur === 'hata' && { color: P.red }]}>{durum.mesaj}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[s.dugme, { backgroundColor: P.kirmizi, borderBottomColor: P.kirmiziKoyu, marginTop: 16 }]}
        onPress={() => calistir('Çıkış yapıldı.', cikis_yap)}>
        <Text style={s.dugmeYazi}>ÇIKIŞ YAP</Text>
      </TouchableOpacity>

      <View style={{ height: 1, backgroundColor: P.line, marginTop: 26, marginBottom: 18 }} />

      <Text style={s.etiket}>HESABI SİL</Text>
      <Text style={[s.aciklama, { marginTop: 6, marginBottom: 12 }]}>
        Hesabın ve buluttaki tüm ilerlemen kalıcı olarak silinir. Bu işlem geri alınamaz.
      </Text>
      <TouchableOpacity
        disabled={mesgul}
        style={[s.dugme, { backgroundColor: P.kirmizi, borderBottomColor: P.kirmiziKoyu, marginTop: 0 }, mesgul && { opacity: 0.5 }]}
        onPress={() => Alert.alert(
          'Hesabını sil',
          'Hesabın ve buluttaki tüm ilerlemen kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam edilsin mi?',
          [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Hesabımı sil',
              style: 'destructive',
              onPress: () => calistir('Hesabın silindi.', hesabi_sil),
            },
          ]
        )}>
        <Text style={s.dugmeYazi}>HESABIMI KALICI OLARAK SİL</Text>
      </TouchableOpacity>

      <Text style={s.dipnot}>
        Yedekleme otomatik değildir. Çalışma bitiminde "Buluta Yedekle" demeyi alışkanlık haline getir.
      </Text>
    </ScrollView>
  );
}

function yapStil(P) {
  return StyleSheet.create({
    ustEtiket: { fontFamily: FONT.mono, fontSize: 13, color: P.red, letterSpacing: 2, marginTop: 8 },
    baslik: { fontFamily: FONT.serif, fontSize: 31, color: P.ink, marginBottom: 10, marginTop: 6 },
    aciklama: { fontFamily: FONT.govde, fontSize: 18, color: P.inkSoft, lineHeight: 24, marginBottom: 18 },
    kart: { backgroundColor: P.yuzey, borderWidth: 2, borderColor: P.line, borderRadius: 16, padding: 18, marginBottom: 14 },
    etiket: { fontFamily: FONT.mono, fontSize: 12, color: P.red, letterSpacing: 1 },
    alanEtiket: { fontFamily: FONT.mono, fontSize: 12, color: P.inkSoft, letterSpacing: 1, marginTop: 14 },
    girdi: {
      backgroundColor: P.yuzey, borderWidth: 1, borderColor: P.line, borderRadius: 4,
      paddingHorizontal: 13, paddingVertical: 12,
      fontSize: 16, color: P.ink, fontFamily: FONT.govde,
    },
    dugme: {
      borderWidth: 1.5, borderColor: P.ink, borderRadius: 4, paddingVertical: 14,
      alignItems: 'center', marginTop: 20, backgroundColor: P.yuzey,
    },
    dugmeYazi: { fontFamily: FONT.monoBold, fontSize: 15, color: P.ink, letterSpacing: 1 },
    googleDugme: {
      borderWidth: 1.5, borderColor: '#DADCE0', borderRadius: 4, paddingVertical: 14,
      alignItems: 'center', backgroundColor: '#FFFFFF',
    },
    googleDugmeYazi: { fontFamily: FONT.monoBold, fontSize: 14, color: '#1F1F1F', letterSpacing: 1 },
    baglanti: { fontFamily: FONT.govde, fontSize: 18, color: P.red, textAlign: 'center' },
    durum: { borderLeftWidth: 2, paddingLeft: 10, paddingVertical: 6, marginTop: 6 },
    durumOk: { borderLeftColor: P.ink },
    durumHata: { borderLeftColor: P.red },
    durumYazi: { fontFamily: FONT.govde, fontSize: 18, color: P.ink },
    dipnot: { fontFamily: FONT.mono, fontSize: 12, color: P.inkFaint, marginTop: 18, lineHeight: 16 },
  });
}