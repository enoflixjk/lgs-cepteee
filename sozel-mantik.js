// ============================================================
// TÜRKÇE — SÖZEL MANTIK
// LGS'de 4 soru ağırlığında, önceden hiç kartı yoktu.
//
// Her soru kendi içinde çözülebilir bir mantık bulmacası —
// dış bir bilgiye değil, verilen ipuçlarına dayanır. Bu yüzden
// doğruluğu üretirken kendim adım adım kontrol edebildim.
// ============================================================

export const SOZEL_MANTIK_KARTLARI = [
  // ---------- SIRALAMA BULMACALARI ----------
  {
    id: "ltur-sm001", ders: "turkce", unite: "Sözel Mantık",
    soru: "Ali, Boran'dan uzun; Boran, Cem'den kısa; Cem, Ali'den kısadır. Bu üç kişiden en uzun olan kimdir?",
    cevap: "Ali",
    secenekler: ["Ali", "Boran", "Cem", "Belirlenemez"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm002", ders: "turkce", unite: "Sözel Mantık",
    soru: "Bir apartmanda Deniz, Ege'nin üstünde; Ege, Fırat'ın üstünde oturuyor. Fırat 1. katta oturuyorsa Deniz kaçıncı kattadır?",
    cevap: "En az 3. kat",
    secenekler: ["1. kat", "2. kat", "En az 3. kat", "Belirlenemez"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm003", ders: "turkce", unite: "Sözel Mantık",
    soru: "Beş öğrenci bir sırada oturuyor. Gül tam ortada, Han Gül'ün solunda, İrem Han'ın solunda oturuyor. İrem sırada kaçıncı sıradadır (soldan)?",
    cevap: "1.",
    secenekler: ["1.", "2.", "3.", "4."],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm004", ders: "turkce", unite: "Sözel Mantık",
    soru: "Kaan, Mert'ten yaşlı. Mert, Sena'dan yaşlı. Sena, Kaan'dan yaşlı değil. Üç kişiyi yaştan küçüğe büyüğe sıralarsak hangisi doğrudur?",
    cevap: "Sena, Mert, Kaan",
    secenekler: ["Sena, Mert, Kaan", "Mert, Sena, Kaan", "Kaan, Sena, Mert", "Mert, Kaan, Sena"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm005", ders: "turkce", unite: "Sözel Mantık",
    soru: "Bir yarışta Zeynep, Aslı'dan önce; Cem, Zeynep'ten önce; Aslı, Ece'den önce bitirdi. Yarışı ilk bitiren kimdir?",
    cevap: "Cem",
    secenekler: ["Zeynep", "Cem", "Aslı", "Ece"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm006", ders: "turkce", unite: "Sözel Mantık",
    soru: "Beren'in doğum günü Can'dan önce, Can'ınki Deren'den önce. Deren'inki ise yılın son ayında. Üçünün doğum günü hangi sırayla gelir?",
    cevap: "Beren, Can, Deren",
    secenekler: ["Beren, Can, Deren", "Can, Beren, Deren", "Deren, Can, Beren", "Belirlenemez"],
    lgsKapsam: true,
  },

  // ---------- KİM NE YAPTI: İPUÇLARINDAN ÇIKARIM ----------
  {
    id: "ltur-sm007", ders: "turkce", unite: "Sözel Mantık",
    soru: "Ayşe, Burak ve Ceren'den biri kırmızı, biri mavi, biri sarı bisiklete biniyor. Ayşe sarı binmiyor. Burak mavi binmiyor. Ceren kırmızı binmiyor, sarı da binmiyor. Ceren hangi renge biniyor?",
    cevap: "Mavi",
    secenekler: ["Kırmızı", "Mavi", "Sarı", "Belirlenemez"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm008", ders: "turkce", unite: "Sözel Mantık",
    soru: "Üç arkadaştan biri piyano, biri keman, biri gitar çalıyor. Elif piyano çalmıyor. Mert gitar çalmıyor. Elif keman da çalmıyor. Elif hangi çalgıyı çalar?",
    cevap: "Gitar",
    secenekler: ["Piyano", "Keman", "Gitar", "Belirlenemez"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm009", ders: "turkce", unite: "Sözel Mantık",
    soru: "Bir vazoyu üç arkadaştan biri kırmıştır. Bunlardan yalnızca biri doğru söylüyor. Ali: \"Vazoyu ben kırmadım.\" Veli: \"Vazoyu Ali kırdı.\" Deli: \"Vazoyu ben kırdım.\" Yalnızca Ali doğru söylüyorsa vazoyu kim kırmıştır?",
    cevap: "Veli",
    secenekler: ["Ali", "Veli", "Deli", "Belirlenemez"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm010", ders: "turkce", unite: "Sözel Mantık",
    soru: "Üç kutudan yalnızca birinde ödül var. Kutu 1 üzerinde \"Ödül burada değil\" yazıyor. Kutu 2 üzerinde \"Ödül Kutu 1'de\" yazıyor. Kutu 3 üzerinde \"Ödül burada değil\" yazıyor. Yazılardan yalnızca biri doğruysa ödül hangi kutudadır?",
    cevap: "Kutu 3",
    secenekler: ["Kutu 1", "Kutu 2", "Kutu 3", "Belirlenemez"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm011", ders: "turkce", unite: "Sözel Mantık",
    soru: "Bir sınıfta herkes ya futbol ya basketbol oynuyor, ikisini birden oynayan yok. Futbol oynayanların sayısı basketbol oynayanların iki katı. Sınıfta 24 öğrenci varsa kaç öğrenci basketbol oynar?",
    cevap: "8",
    secenekler: ["6", "8", "12", "16"],
    lgsKapsam: true,
  },

  // ---------- KOŞULLU MANTIK (EĞER...İSE ZİNCİRLERİ) ----------
  {
    id: "ltur-sm012", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Yağmur yağarsa yollar ıslanır. Yollar ıslanırsa trafik yavaşlar.\" Bu bilgilere göre yağmur yağdığında kesin olarak ne olur?",
    cevap: "Trafik yavaşlar",
    secenekler: ["Yollar kurur", "Trafik yavaşlar", "Güneş açar", "Hiçbir şey değişmez"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm013", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Ders çalışan başarılı olur.\" cümlesi doğruysa aşağıdakilerden hangisi kesinlikle doğrudur?",
    cevap: "Başarılı olmayan ders çalışmamıştır",
    secenekler: ["Başarılı olan ders çalışmıştır", "Başarılı olmayan ders çalışmamıştır", "Ders çalışmayan başarısız olur", "Herkes ders çalışır"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm014", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Bütün kuşlar uçar. Serçe bir kuştur.\" Bu iki bilgiden hangi sonuç kesin olarak çıkar?",
    cevap: "Serçe uçar",
    secenekler: ["Serçe uçar", "Serçe uçmaz", "Bütün uçanlar kuştur", "Serçe bir kuş değildir"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm015", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Bazı çiçekler kırmızıdır. Güller çiçektir.\" Bu bilgilerden hangisi kesin olarak çıkar?",
    cevap: "Hiçbiri kesin değildir",
    secenekler: ["Bütün güller kırmızıdır", "Hiç gül kırmızı değildir", "Hiçbiri kesin değildir", "Bazı güller sarıdır"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm016", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Hiçbir balık kanatlı değildir. Kelebek kanatlıdır.\" Bu bilgilerden hangi sonuç çıkar?",
    cevap: "Kelebek balık değildir",
    secenekler: ["Kelebek bir balıktır", "Kelebek balık değildir", "Bütün kanatlılar kelebektir", "Balıklar da uçabilir"],
    lgsKapsam: true,
  },

  // ---------- ÇELİŞKİ / TUTARLILIK BULMA ----------
  {
    id: "ltur-sm017", ders: "turkce", unite: "Sözel Mantık",
    soru: "Bir tanık şöyle diyor: \"Olay markette saat 14.00'te oldu. Ben o sırada evdeydim ama olayı kendi gözümle gördüm.\" Bu ifadede ne tür bir sorun vardır?",
    cevap: "Çelişki: evdeyken markette olanı görmüş olmak birbiriyle uyuşmuyor",
    secenekler: ["Sorun yok, ifade tutarlı", "Çelişki: evdeyken markette olanı görmüş olmak birbiriyle uyuşmuyor", "Saat bilgisi eksik", "Marketin adı belirtilmemiş"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm018", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Sınıftaki herkes maçı izledi. Sadece Deniz maçı kaçırdı.\" cümlelerinde ne tür bir sorun vardır?",
    cevap: "Çelişki: herkes izlediyse Deniz de izlemiş olmalı",
    secenekler: ["Sorun yoktur", "Çelişki: herkes izlediyse Deniz de izlemiş olmalı", "Maçın sonucu belirtilmemiş", "Deniz sınıfta değildir"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm019", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Bu kutuda hiç elma yok.\" yazan bir kutuyu açtığımızda içinde 3 elma buluyoruz. Buna göre kutunun üzerindeki yazı için ne söylenebilir?",
    cevap: "Yanlıştır",
    secenekler: ["Doğrudur", "Yanlıştır", "Belirsizdir", "Elmalarla ilgisi yoktur"],
    lgsKapsam: true,
  },

  // ---------- SEBEP-SONUÇ İLİŞKİSİ ----------
  {
    id: "ltur-sm020", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Ahmet erken uyandığı için okula zamanında yetişti.\" cümlesinde sebep hangisidir?",
    cevap: "Erken uyanması",
    secenekler: ["Okula zamanında yetişmesi", "Erken uyanması", "Okulun uzak olması", "Ahmet'in ismi"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm021", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Nehir taştığı için köprü kapatıldı, köprü kapatıldığı için ulaşım aksadı.\" Bu cümlede ulaşımın aksamasının asıl (ilk) sebebi nedir?",
    cevap: "Nehrin taşması",
    secenekler: ["Köprünün kapatılması", "Nehrin taşması", "Ulaşımın yoğunluğu", "Belirtilmemiş"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm022", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Toprak susuz kaldığından bitkiler soldu, bitkiler solduğundan hasat azaldı.\" Hasadın azalmasının temel nedeni nedir?",
    cevap: "Toprağın susuz kalması",
    secenekler: ["Bitkilerin solması", "Toprağın susuz kalması", "Hasat mevsimi", "Hava sıcaklığı"],
    lgsKapsam: true,
  },

  // ---------- BAZI / HEPSİ / HİÇBİRİ MANTIĞI ----------
  {
    id: "ltur-sm023", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Sınıftaki bazı öğrenciler gözlük takıyor.\" cümlesi doğruysa aşağıdakilerden hangisi kesinlikle yanlıştır?",
    cevap: "Sınıfta hiç gözlüklü öğrenci yoktur",
    secenekler: ["Sınıfta gözlüklü öğrenci vardır", "Sınıfta hiç gözlüklü öğrenci yoktur", "Bütün öğrenciler gözlüklü olabilir", "Bazı öğrenciler gözlüksüzdür"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm024", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Takımdaki hiçbir oyuncu 15 yaşından küçük değildir.\" cümlesi neyle aynı anlamdadır?",
    cevap: "Takımdaki bütün oyuncular 15 yaş veya daha büyüktür",
    secenekler: ["Takımdaki bütün oyuncular 15 yaş veya daha büyüktür", "Takımdaki hiç kimse 15 yaşında değildir", "Takımda yaş sınırı yoktur", "Takımdaki herkes tam 15 yaşındadır"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm025", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Kütüphanedeki kitapların tamamı Türkçe değildir.\" cümlesinden ne anlaşılır?",
    cevap: "Kütüphanede Türkçe olmayan en az bir kitap vardır",
    secenekler: ["Kütüphanede hiç Türkçe kitap yoktur", "Kütüphanede Türkçe olmayan en az bir kitap vardır", "Bütün kitaplar Türkçedir", "Kütüphanede kitap yoktur"],
    lgsKapsam: true,
  },

  // ---------- SAYISAL OLMAYAN BULMACA / EŞLEŞTİRME ----------
  {
    id: "ltur-sm026", ders: "turkce", unite: "Sözel Mantık",
    soru: "Üç arkadaşın evcil hayvanı var: kedi, köpek, kuş. Aslı'nın hayvanı havlamıyor. Baran'ın hayvanı uçmuyor. Aslı'nın hayvanı kuş değilse Aslı'nın hayvanı nedir?",
    cevap: "Kedi",
    secenekler: ["Kedi", "Köpek", "Kuş", "Belirlenemez"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm027", ders: "turkce", unite: "Sözel Mantık",
    soru: "Dört renkli kalemden (kırmızı, mavi, yeşil, sarı) her öğrenci bir tane aldı. Ela sarı almadı. Fuat kırmızı ya da mavi aldı. Ela'nın rengi mavi ya da yeşilse ve Fuat mavi aldıysa Ela hangi rengi almıştır?",
    cevap: "Yeşil",
    secenekler: ["Kırmızı", "Mavi", "Yeşil", "Sarı"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm028", ders: "turkce", unite: "Sözel Mantık",
    soru: "Üç masadan birinde elma, birinde armut, birinde muz var. 1. masada elma yok. 3. masada muz yok. 2. masada armut yoksa ve 1. masada armut da yoksa 1. masada ne vardır?",
    cevap: "Muz",
    secenekler: ["Elma", "Armut", "Muz", "Belirlenemez"],
    lgsKapsam: true,
  },

  // ---------- ZAMAN / GÜN MANTIĞI ----------
  {
    id: "ltur-sm029", ders: "turkce", unite: "Sözel Mantık",
    soru: "Bugün Çarşamba ise 10 gün sonra hangi gündür?",
    cevap: "Cumartesi",
    secenekler: ["Cuma", "Cumartesi", "Pazar", "Pazartesi"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm030", ders: "turkce", unite: "Sözel Mantık",
    soru: "Bir etkinlik Salı gününden 3 gün önce başladıysa etkinlik hangi gün başlamıştır?",
    cevap: "Cumartesi",
    secenekler: ["Cuma", "Cumartesi", "Pazar", "Pazartesi"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm031", ders: "turkce", unite: "Sözel Mantık",
    soru: "Ece'nin doğum günü Mart ayının üçüncü Pazar günü. Mart ayı Çarşamba günü başlıyorsa Ece'nin doğum günü ayın kaçıncı günüdür?",
    cevap: "19",
    secenekler: ["12", "19", "5", "26"],
    lgsKapsam: true,
  },

  // ---------- KIYASLAMA (KARŞILAŞTIRMA) MANTIĞI ----------
  {
    id: "ltur-sm032", ders: "turkce", unite: "Sözel Mantık",
    soru: "A kutusu B kutusundan ağır, C kutusu A kutusundan hafif ama B kutusundan ağırdır. Kutuları hafiften ağıra sıralayınız.",
    cevap: "B, C, A",
    secenekler: ["A, B, C", "B, C, A", "C, B, A", "A, C, B"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm033", ders: "turkce", unite: "Sözel Mantık",
    soru: "Üç şehirden İzmir, Ankara'dan sıcak; Ankara, İstanbul'dan soğuk; İstanbul, İzmir'den soğuktur. En sıcak şehir hangisidir?",
    cevap: "İzmir",
    secenekler: ["İzmir", "Ankara", "İstanbul", "Belirlenemez"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm034", ders: "turkce", unite: "Sözel Mantık",
    soru: "Bir kitap bir dergiden kalın, bir dergi bir defterden ince. Kitap ile defter karşılaştırıldığında kesin olarak ne söylenebilir?",
    cevap: "Belirlenemez",
    secenekler: ["Kitap defterden kalındır", "Kitap defterden incedir", "Kitap defterle aynı kalınlıktadır", "Belirlenemez"],
    lgsKapsam: true,
  },

  // ---------- ANALOJİ (İLİŞKİ KURMA) ----------
  {
    id: "ltur-sm035", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Kalem : Yazmak\" ilişkisi \"Makas : ?\" ile aynıdır. Boşluğa ne gelmelidir?",
    cevap: "Kesmek",
    secenekler: ["Yapıştırmak", "Kesmek", "Ölçmek", "Boyamak"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm036", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Doktor : Hastane\" ilişkisi \"Öğretmen : ?\" ile aynıdır. Boşluğa ne gelmelidir?",
    cevap: "Okul",
    secenekler: ["Hastane", "Okul", "Ev", "Market"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm037", ders: "turkce", unite: "Sözel Mantık",
    soru: "\"Balık : Su\" ilişkisi \"Kuş : ?\" ile aynıdır. Boşluğa ne gelmelidir?",
    cevap: "Hava",
    secenekler: ["Toprak", "Ateş", "Hava", "Ağaç"],
    lgsKapsam: true,
  },

  // ---------- ÇOK ADIMLI KARMA MANTIK ----------
  {
    id: "ltur-sm038", ders: "turkce", unite: "Sözel Mantık",
    soru: "Üç kardeşten en büyüğü en küçüğünden 6 yaş büyüktür. Ortanca, en küçükten 2 yaş büyüktür. En küçük 10 yaşındaysa en büyük kaç yaşındadır?",
    cevap: "16",
    secenekler: ["12", "14", "16", "18"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm039", ders: "turkce", unite: "Sözel Mantık",
    soru: "Bir yarışmada doğru cevap 3 puan, yanlış cevap -1 puan getiriyor. Bir yarışmacı 10 soruya cevap verdi, 7'si doğruydu. Bu yarışmacının toplam puanı kaçtır?",
    cevap: "18",
    secenekler: ["15", "18", "21", "24"],
    lgsKapsam: true,
  },
  {
    id: "ltur-sm040", ders: "turkce", unite: "Sözel Mantık",
    soru: "Üç arkadaştan Aslı her zaman doğru, Burak her zaman yalan söyler. Aslı \"Burak yalancıdır\" derse bu ifade için ne söylenebilir?",
    cevap: "Doğrudur, çünkü Burak gerçekten her zaman yalan söylüyor",
    secenekler: ["Yanlıştır", "Doğrudur, çünkü Burak gerçekten her zaman yalan söylüyor", "Belirsizdir", "Aslı bu sefer yalan söylemiştir"],
    lgsKapsam: true,
  },
];
