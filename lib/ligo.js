import * as Notifications from 'expo-notifications';

// Uygulama açıkken de bildirim görünsün.
//
// ÖNEMLİ: Bu çağrı modül yüklenir yüklenmez (React render'dan önce)
// çalışıyor. Taze açılan bir production build'de native köprü tam
// hazır olmadan bu satıra gelinirse senkron bir hata fırlatıp
// uygulamayı DAHA REACT BAŞLAMADAN çökertebilir — HataYakalayici
// gibi render-aşaması hata yakalayıcılar bunu yakalayamaz. Bu yüzden
// try/catch ile korunuyor: başarısız olursa bildirim özelleştirmesi
// çalışmaz ama uygulama çökmez.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.log('Bildirim işleyicisi ayarlanamadı:', e?.message || e);
}

// ============================================================
// LIGO — motivasyon sesi
//
// Ton: hafif rekabetçi, meydan okuyan bir arkadaş. Suçlama yok,
// utandırma yok. "Yapamazsın" değil, "hadi göster" dili.
//
// Kural: aynı mesaj üst üste çıkmasın diye her havuzdan rastgele
// seçilir; havuzlar en az 8 varyant içerir VE bir önceki seçimle
// aynı çıkarsa (havuz 1'den büyükse) otomatik yeniden çekilir —
// böylece art arda iki kez aynı mesajı görme ihtimali sıfıra yakın.
// ============================================================

const sonSecim = {};

const sec = (liste, anahtar) => {
  if (liste.length <= 1) return liste[0];
  let secilen = liste[Math.floor(Math.random() * liste.length)];
  if (anahtar && secilen === sonSecim[anahtar]) {
    secilen = liste[Math.floor(Math.random() * liste.length)];
  }
  if (anahtar) sonSecim[anahtar] = secilen;
  return secilen;
};

// ---------- UYGULAMA İÇİ MESAJLAR ----------

const MESAJ = {
  baslangic: [
    'Bugün hiç kart çevirmedin. Ben buradayım, sen neredesin?',
    'Sayfa bomboş. Doldurmaya ne dersin?',
    'Halka seni bekliyor. İlk kartı çevir yeter.',
    'Dünkü sen bugünküne güveniyordu. Mahcup etme.',
    'Başlamak en zor kısmı. Gerisi kolay, söz.',
    'Daha bir kart bile çevirmedin. Hadi, ilkini hallet.',
    'Bugün henüz sıfırdasın. Sıfırdan bir şey çıkmaz, biliyorsun.',
    'Ligo bekliyor. Sen ne zaman başlayacaksın?',
    'Boş bir gün, boş bir halka. İkisini de doldurma vaktı.',
    'İlk adım her zaman en ağırıdır. At gitsin.',
  ],
  ortada: [
    'İyi gidiyorsun ama halka daha yarılanmadı.',
    'Isınma turu bitti sayılır. Asıl kısım şimdi.',
    'Bu tempoyla hedefi bugün görürsün.',
    'Devam. Halkanın rengi yakışmış.',
    'Yarıyı geçmene az kaldı, bırakma.',
    'Başladın bile, durmanın anlamı yok.',
    'Yolun yarısı bu kadar kolaysa gerisi de kolay.',
    'Halka doluyor, sen de dolduruyorsun. Güzel gidiyor.',
    'Ne durdun? Devam et, tempo iyi.',
    'Bu hıza devam edersen bugünü erken kapatırsın.',
  ],
  sonDuzluk: [
    'Son birkaç kart. O kadar yolu gelip burada mı bırakacaksın?',
    'Halka neredeyse kapanıyor. Bitir şunu.',
    'Bu kadar yaklaşıp durmak sana yakışmaz.',
    'Son düzlük. Bugünü tamamlananlar listesine yaz.',
    'Bir tur daha, sonra rahat rahat dinlen.',
    'Bitmesine bu kadar yakınken vazgeçmek olmaz.',
    'Son metrelerdesin, koşuyu burada bırakma.',
    'Az kaldı, gerçekten az. Bitir.',
    'Halka neredeyse tam. Son dokunuş sende.',
    'Bu kadar emek verip son anda bırakmak yazık olur.',
  ],
  tamam: [
    'Hedef tamam. Bugün seni kimse yenemez.',
    'Halka kapandı. Yarın da görüşürüz, değil mi?',
    'Bitti. Şimdi hak edilmiş bir mola.',
    'Bugünü kazandın. Serini büyütmeye devam.',
    'Tamamdır. Yarın daha fazlasını isteyeceğim ama bugün helal.',
    'Günün işini bitirdin. Gurur duyabilirsin.',
    'Halka doldu, gün senin oldu.',
    'İşte bu! Bugünkü hedefi geride bıraktın.',
    'Tamamlandı. Yarın yine burada olacağım.',
    'Bugünlük yeter. İyi iş çıkardın.',
  ],
  seriGuclu: [
    'Bu seri ciddi iş. Kırma sakın.',
    'Böyle giderse seni durdurmak zor.',
    'Düzenli çalışan kazanır, sen zaten biliyorsun.',
    'Seri büyüyor. Ben sayıyorum.',
    'İstikrar bu işte. Devam.',
    'Bu seriyi kimse kolay kolay tutturamaz.',
    'Sağlam gidiyorsun, bu tempo işe yarıyor.',
    'Seri uzadıkça uzuyor, güzel bir alışkanlık kurdun.',
    'Bu kararlılığı görmek güzel.',
    'Seri seni tanımlıyor artık. Devam ettir.',
  ],
  seriRisk: [
    'Serin tehlikede. Bunu bana yaptırma.',
    'Bugün boş geçerse sayaç sıfırlanır. Buna değer mi?',
    'Şu ana kadar sıfır kart. Serin sana bakıyor.',
    'Bir kart bile serini kurtarır. Bahanen ne?',
    'Serini korumak için geç değil. Henüz.',
    'O kadar günü bir günde harcamak ister misin?',
    'Serin şu an ipte yürüyor. Bir kart, denge sende.',
    'Bugün çalışmazsan bütün o günler boşa gider.',
    'Son şans gibi düşün. Bir tur yeter.',
    'Serini bugüne kurban etme.',
  ],
  birikmis: [
    'Tekrar sırası kabardı. Biraz eritelim mi?',
    'Unutmak üzere olduğun kartlar var. Yetişelim.',
    'Bekleyen kartlar seni arıyor.',
    'Tekrarlar birikince zorlaşır. Şimdi hallet.',
    'Sıradaki kartlar hazır. Sen hazır mısın?',
    'Kartlar sırada bekliyor, biraz uzun bir sıra oldu.',
    'Ne kadar bekletirsen o kadar zorlaşır, biliyorsun.',
    'Birikenler eriyene kadar bir süre devam etsen iyi olur.',
    'Bu kadar kart seni bekliyorken oturmak zor.',
    'Şimdi hallet, sonra daha da kabarır.',
  ],
};

export function ligoMesaji({ bugun, hedefKart, seri, bekleyen }) {
  const oran = hedefKart > 0 ? bugun / hedefKart : 0;
  if (oran >= 1) {
    return seri >= 3 ? sec(MESAJ.seriGuclu, 'seriGuclu') : sec(MESAJ.tamam, 'tamam');
  }
  if (bugun === 0) {
    if (seri > 0) return sec(MESAJ.seriRisk, 'seriRisk');
    if (bekleyen > 40) return sec(MESAJ.birikmis, 'birikmis');
    return sec(MESAJ.baslangic, 'baslangic');
  }
  if (oran >= 0.75) return sec(MESAJ.sonDuzluk, 'sonDuzluk');
  return sec(MESAJ.ortada, 'ortada');
}

// ============================================================
// BİLDİRİMLER
// ============================================================

const BILDIRIM = {
  hatirlatma: [
    { t: 'Ligo seni bekliyor', b: 'Bugün hiç kart çevirmedin. Beş dakikan var mı?' },
    { t: 'Sayfa hâlâ boş', b: 'Bir kart bile bugünü kurtarır.' },
    { t: 'Hadi ama', b: 'Dün çalışan sen bugün nerede?' },
    { t: 'Kısa bir tur?', b: 'On kart on dakika sürmez.' },
    { t: 'Ligo burada', b: 'Halkan bugün hiç renk almadı.' },
    { t: 'Beş dakikan var mı?', b: 'Sadece birkaç kart, hepsi bu.' },
    { t: 'Unuttun mu?', b: 'Bugünkü kartların seni bekliyor.' },
    { t: 'Küçük bir hatırlatma', b: 'Halka bugün hâlâ boş duruyor.' },
    { t: 'Bir bakış at', b: 'İki dakikalığına açıp bir tur yapsan?' },
    { t: "Ligo'dan selam", b: 'Bugün için hâlâ vaktin var, hadi başla.' },
  ],
  seriRisk: [
    { t: 'Serin tehlikede', b: 'Bugün çalışmazsan sayaç sıfırlanacak.' },
    { t: 'Son şans', b: 'Serini korumak için hâlâ vaktin var.' },
    { t: 'Bunu bana yaptırma', b: 'Bir kart yeter, serin devam etsin.' },
    { t: 'Sayaç sıfırlanmak üzere', b: 'Bu kadar emeği bugün bırakma.' },
    { t: 'Ligo endişeli', b: 'Serin bugün kırılabilir. Hemen bir tur at.' },
    { t: 'Vakit daralıyor', b: 'Serini kurtarmak için bir kart yeter.' },
    { t: 'Bugün kritik gün', b: 'Serin şu an sana bağlı.' },
    { t: 'Az kaldı', b: 'Gün bitmeden serini koru.' },
  ],
  sonDuzluk: [
    { t: 'Az kaldı', b: 'Birkaç kart daha, halkan kapanıyor.' },
    { t: 'Son düzlük', b: 'Bu kadar yaklaşıp bırakmak yok.' },
    { t: 'Bitirelim mi?', b: 'Günlük hedefine parmak kadar kaldı.' },
    { t: 'Halka kapanmak üzere', b: 'Son kartları çevir, bugünü kazan.' },
    { t: 'Neredeyse tamam', b: 'Şimdi bırakırsan yarın canın sıkılır.' },
    { t: 'Son birkaç adım', b: 'Hedefe bu kadar yakınken durma.' },
    { t: 'Bitmesine az var', b: 'Küçük bir çaba daha, hepsi bu.' },
    { t: 'Neredeyse bitti', b: 'Son kartlar seni bekliyor.' },
  ],
  denemeTakip: [
    { t: 'Deneme nasıl gitti?', b: 'Yanlışlarını çalışmak için iyi bir gün.' },
    { t: 'Yanlışların bekliyor', b: 'Dünkü denemenin eksiklerini kapatalım.' },
    { t: 'Ligo not aldı', b: 'Denemede zorlandığın konulara bakalım mı?' },
    { t: 'Tekrar zamanı', b: 'Deneme sonrası tekrar en çok işe yarayan şeydir.' },
    { t: 'Bir adım daha', b: 'Dün denemeni çözdün. Bugün eksiklerini kapat.' },
    { t: 'Sonuçları unutma', b: 'Dünkü denemenden çıkan dersleri tekrarla.' },
    { t: 'Eksikleri kapatalım', b: 'Denemede zorlandığın yerler hâlâ orada.' },
  ],
};

async function izinAl() {
  let izin = await Notifications.getPermissionsAsync();
  if (izin.status !== 'granted') izin = await Notifications.requestPermissionsAsync();
  return izin.status === 'granted';
}

function gunlukTetik(saat, dakika = 0) {
  return Notifications.SchedulableTriggerInputTypes
    ? { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: saat, minute: dakika }
    : { hour: saat, minute: dakika, repeats: true };
}

function saniyeTetik(saniye) {
  return Notifications.SchedulableTriggerInputTypes
    ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: saniye, repeats: false }
    : { seconds: saniye, repeats: false };
}

function bugunKalanSaniye(saat, dakika = 0) {
  const simdi = new Date();
  const hedef = new Date();
  hedef.setHours(saat, dakika, 0, 0);
  const fark = Math.floor((hedef - simdi) / 1000);
  return fark > 60 ? fark : null;
}

export async function bildirimleriPlanla({
  acik, saat, bugun, hedefKart, seri, denemeBugun,
}) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!acik) return false;
    if (!(await izinAl())) return false;

    const tamamlandi = hedefKart > 0 && bugun >= hedefKart;
    const oran = hedefKart > 0 ? bugun / hedefKart : 0;

    if (!tamamlandi) {
      const m = sec(BILDIRIM.hatirlatma, 'hatirlatma');
      await Notifications.scheduleNotificationAsync({
        content: { title: m.t, body: m.b },
        trigger: gunlukTetik(saat),
      });
    }

    if (seri > 0 && bugun === 0) {
      const kalan = bugunKalanSaniye(21, 0);
      if (kalan) {
        const m = sec(BILDIRIM.seriRisk, 'seriRisk');
        await Notifications.scheduleNotificationAsync({
          content: { title: m.t, body: m.b.replace('{seri}', String(seri)) },
          trigger: saniyeTetik(kalan),
        });
      }
    }

    if (!tamamlandi && oran >= 0.5) {
      const kalan = bugunKalanSaniye(20, 30);
      if (kalan) {
        const m = sec(BILDIRIM.sonDuzluk, 'sonDuzluk');
        await Notifications.scheduleNotificationAsync({
          content: { title: m.t, body: m.b },
          trigger: saniyeTetik(kalan),
        });
      }
    }

    if (denemeBugun) {
      const m = sec(BILDIRIM.denemeTakip, 'denemeTakip');
      await Notifications.scheduleNotificationAsync({
        content: { title: m.t, body: m.b },
        trigger: saniyeTetik(20 * 60 * 60),
      });
    }

    return true;
  } catch (e) {
    console.log('Bildirim planlama hatası:', e);
    return false;
  }
}

export async function bildirimleriKapat() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {}
}