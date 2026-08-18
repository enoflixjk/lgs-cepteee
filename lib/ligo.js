import * as Notifications from 'expo-notifications';

// Uygulama açıkken de bildirim görünsün
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ============================================================
// LIGO — motivasyon sesi
//
// Ton: hafif rekabetçi, meydan okuyan bir arkadaş. Suçlama yok,
// utandırma yok. "Yapamazsın" değil, "hadi göster" dili.
//
// Kural: aynı mesaj üst üste çıkmasın diye her havuzdan rastgele
// seçilir; havuzlar en az 5 varyant içerir.
// ============================================================

const sec = (liste) => liste[Math.floor(Math.random() * liste.length)];

// ---------- UYGULAMA İÇİ MESAJLAR ----------

const MESAJ = {
  // Gün başında, hiç çalışılmamış
  baslangic: [
    'Bugün hiç kart çevirmedin. Ben buradayım, sen neredesin?',
    'Sayfa bomboş. Doldurmaya ne dersin?',
    'Halka seni bekliyor. İlk kartı çevir yeter.',
    'Dünkü sen bugünküne güveniyordu. Mahcup etme.',
    'Başlamak en zor kısmı. Gerisi kolay, söz.',
  ],

  // Başlamış ama hedefin yarısına gelmemiş
  ortada: [
    'İyi gidiyorsun ama halka daha yarılanmadı.',
    'Isınma turu bitti sayılır. Asıl kısım şimdi.',
    'Bu tempoyla hedefi bugün görürsün.',
    'Devam. Halkanın rengi yakışmış.',
    'Yarıyı geçmene az kaldı, bırakma.',
  ],

  // Hedefe az kalmış (son %25)
  sonDuzluk: [
    'Son birkaç kart. O kadar yolu gelip burada mı bırakacaksın?',
    'Halka neredeyse kapanıyor. Bitir şunu.',
    'Bu kadar yaklaşıp durmak sana yakışmaz.',
    'Son düzlük. Bugünü tamamlananlar listesine yaz.',
    'Bir tur daha, sonra rahat rahat dinlen.',
  ],

  // Hedef tamamlanmış
  tamam: [
    'Hedef tamam. Bugün seni kimse yenemez.',
    'Halka kapandı. Yarın da görüşürüz, değil mi?',
    'Bitti. Şimdi hak edilmiş bir mola.',
    'Bugünü kazandın. Serini büyütmeye devam.',
    'Tamamdır. Yarın daha fazlasını isteyeceğim ama bugün helal.',
  ],

  // Seri uzun ve bugün çalışılmış
  seriGuclu: [
    'Bu seri ciddi iş. Kırma sakın.',
    'Böyle giderse seni durdurmak zor.',
    'Düzenli çalışan kazanır, sen zaten biliyorsun.',
    'Seri büyüyor. Ben sayıyorum.',
    'İstikrar bu işte. Devam.',
  ],

  // Seri risk altında (seri var, bugün çalışılmamış)
  seriRisk: [
    'Serin tehlikede. Bunu bana yaptırma.',
    'Bugün boş geçerse sayaç sıfırlanır. Buna değer mi?',
    'Şu ana kadar sıfır kart. Serin sana bakıyor.',
    'Bir kart bile serini kurtarır. Bahanen ne?',
    'Serini korumak için geç değil. Henüz.',
  ],

  // Bekleyen tekrar birikmiş
  birikmis: [
    'Tekrar sırası kabardı. Biraz eritelim mi?',
    'Unutmak üzere olduğun kartlar var. Yetişelim.',
    'Bekleyen kartlar seni arıyor.',
    'Tekrarlar birikince zorlaşır. Şimdi hallet.',
    'Sıradaki kartlar hazır. Sen hazır mısın?',
  ],
};

// Bağlama göre uygun mesajı seç
export function ligoMesaji({ bugun, hedefKart, seri, bekleyen }) {
  const oran = hedefKart > 0 ? bugun / hedefKart : 0;

  if (oran >= 1) {
    return seri >= 3 ? sec(MESAJ.seriGuclu) : sec(MESAJ.tamam);
  }
  if (bugun === 0) {
    if (seri > 0) return sec(MESAJ.seriRisk);
    if (bekleyen > 40) return sec(MESAJ.birikmis);
    return sec(MESAJ.baslangic);
  }
  if (oran >= 0.75) return sec(MESAJ.sonDuzluk);
  return sec(MESAJ.ortada);
}

// ============================================================
// BİLDİRİMLER
//
// Yerel bildirimler tetiklenme anında koşul kontrol edemez.
// Bu yüzden durum her değiştiğinde hepsi iptal edilip
// güncel duruma göre yeniden planlanır.
// ============================================================

const BILDIRIM = {
  hatirlatma: [
    { t: 'Ligo seni bekliyor', b: 'Bugün hiç kart çevirmedin. Beş dakikan var mı?' },
    { t: 'Sayfa hâlâ boş', b: 'Bir kart bile bugünü kurtarır.' },
    { t: 'Hadi ama', b: 'Dün çalışan sen bugün nerede?' },
    { t: 'Kısa bir tur?', b: 'On kart on dakika sürmez.' },
    { t: 'Ligo burada', b: 'Halkan bugün hiç renk almadı.' },
  ],

  seriRisk: [
    { t: 'Serin tehlikede', b: 'Bugün çalışmazsan sayaç sıfırlanacak.' },
    { t: 'Son şans', b: 'Serini korumak için hâlâ vaktin var.' },
    { t: 'Bunu bana yaptırma', b: 'Bir kart yeter, serin devam etsin.' },
    { t: 'Sayaç sıfırlanmak üzere', b: 'Bu kadar emeği bugün bırakma.' },
    { t: 'Ligo endişeli', b: 'Serin bugün kırılabilir. Hemen bir tur at.' },
  ],

  sonDuzluk: [
    { t: 'Az kaldı', b: 'Birkaç kart daha, halkan kapanıyor.' },
    { t: 'Son düzlük', b: 'Bu kadar yaklaşıp bırakmak yok.' },
    { t: 'Bitirelim mi?', b: 'Günlük hedefine parmak kadar kaldı.' },
    { t: 'Halka kapanmak üzere', b: 'Son kartları çevir, bugünü kazan.' },
    { t: 'Neredeyse tamam', b: 'Şimdi bırakırsan yarın canın sıkılır.' },
  ],

  denemeTakip: [
    { t: 'Deneme nasıl gitti?', b: 'Yanlışlarını çalışmak için iyi bir gün.' },
    { t: 'Yanlışların bekliyor', b: 'Dünkü denemenin eksiklerini kapatalım.' },
    { t: 'Ligo not aldı', b: 'Denemede zorlandığın konulara bakalım mı?' },
    { t: 'Tekrar zamanı', b: 'Deneme sonrası tekrar en çok işe yarayan şeydir.' },
    { t: 'Bir adım daha', b: 'Dün denemeni çözdün. Bugün eksiklerini kapat.' },
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

// Bugünün belirli saatine kaç saniye kaldı (geçtiyse null)
function bugunKalanSaniye(saat, dakika = 0) {
  const simdi = new Date();
  const hedef = new Date();
  hedef.setHours(saat, dakika, 0, 0);
  const fark = Math.floor((hedef - simdi) / 1000);
  return fark > 60 ? fark : null;
}

/**
 * Bildirimleri güncel duruma göre yeniden planlar.
 * Durum değiştikçe (kart çalışıldıkça) tekrar çağrılmalıdır.
 */
export async function bildirimleriPlanla({
  acik, saat, bugun, hedefKart, seri, denemeBugun,
}) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!acik) return false;
    if (!(await izinAl())) return false;

    const tamamlandi = hedefKart > 0 && bugun >= hedefKart;
    const oran = hedefKart > 0 ? bugun / hedefKart : 0;

    // ---- 1) Her gün sabit saatte hatırlatma ----
    // Bugün tamamlandıysa bugünkü tetikleme zaten anlamsız; günlük
    // tekrar eden bildirim yarın için kalır.
    if (!tamamlandi) {
      const m = sec(BILDIRIM.hatirlatma);
      await Notifications.scheduleNotificationAsync({
        content: { title: m.t, body: m.b },
        trigger: gunlukTetik(saat),
      });
    }

    // ---- 2) Seri risk uyarısı: seri var, bugün hiç çalışılmamış ----
    if (seri > 0 && bugun === 0) {
      const kalan = bugunKalanSaniye(21, 0);
      if (kalan) {
        const m = sec(BILDIRIM.seriRisk);
        await Notifications.scheduleNotificationAsync({
          content: { title: m.t, body: m.b.replace('{seri}', String(seri)) },
          trigger: saniyeTetik(kalan),
        });
      }
    }

    // ---- 3) Son düzlük dürtüsü: başlamış ama bitmemiş ----
    if (!tamamlandi && oran >= 0.5) {
      const kalan = bugunKalanSaniye(20, 30);
      if (kalan) {
        const m = sec(BILDIRIM.sonDuzluk);
        await Notifications.scheduleNotificationAsync({
          content: { title: m.t, body: m.b },
          trigger: saniyeTetik(kalan),
        });
      }
    }

    // ---- 4) Deneme sonrası takip: ertesi gün ----
    if (denemeBugun) {
      const m = sec(BILDIRIM.denemeTakip);
      // Yaklaşık 20 saat sonra — ertesi günün benzer saatine denk gelir
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