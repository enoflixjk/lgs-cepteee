// ============================================================
// FEN BİLİMLERİ — BASİT MAKİNELER
// LGS'de 2 soru ağırlığında, önceden hiç kartı yoktu.
//
// Standart 8. sınıf müfredat bilgisi: kaldıraç, makara, eğik
// düzlem, vida, kama, çark-dingil. Örnekler ders kitaplarında
// da geçen, tartışmasız klasik örneklerden seçildi.
// ============================================================

export const BASIT_MAKINELER_KARTLARI = [
  // ---------- GENEL TANIM VE ORTAK İLKE ----------
  {
    id: "lfen-bm001", ders: "fen", unite: "Basit Makineler",
    soru: "Basit makineler kullanmanın temel amacı nedir?",
    cevap: "Daha az kuvvetle iş yapmayı ya da kuvvetin yönünü değiştirmeyi kolaylaştırmak",
    secenekler: ["Yapılan işi azaltmak", "Daha az kuvvetle iş yapmayı ya da kuvvetin yönünü değiştirmeyi kolaylaştırmak", "Enerji üretmek", "Sürtünmeyi tamamen yok etmek"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm002", ders: "fen", unite: "Basit Makineler",
    soru: "Basit makineler kullanılarak yapılan iş miktarı hakkında hangisi doğrudur?",
    cevap: "Basit makineler yapılan işten kazanç sağlamaz, yalnızca kuvvetten veya yoldan kazanç sağlar",
    secenekler: ["Yapılan iş azalır", "Basit makineler yapılan işten kazanç sağlamaz, yalnızca kuvvetten veya yoldan kazanç sağlar", "Yapılan iş kaybolur", "Basit makineler her zaman işten kazanç sağlar"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm003", ders: "fen", unite: "Basit Makineler",
    soru: "Bir basit makinede kuvvetten kazanç sağlanıyorsa yoldan durumu ne olur?",
    cevap: "Yoldan kayıp olur, yani kuvvetin uygulandığı mesafe artar",
    secenekler: ["Yoldan da kazanç sağlanır", "Yoldan kayıp olur, yani kuvvetin uygulandığı mesafe artar", "Yol hiç değişmez", "Yol sıfırlanır"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm004", ders: "fen", unite: "Basit Makineler",
    soru: "Sürtünmenin olduğu bir basit makinede harcanan iş ile yararlı iş arasındaki ilişki nedir?",
    cevap: "Harcanan iş, yararlı işten daha büyüktür",
    secenekler: ["Harcanan iş, yararlı işten daha büyüktür", "Harcanan iş, yararlı işten daha küçüktür", "İkisi her zaman eşittir", "Sürtünme iş miktarını etkilemez"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm005", ders: "fen", unite: "Basit Makineler",
    soru: "Aşağıdakilerden hangisi temel basit makine türlerinden biri değildir?",
    cevap: "Elektrik motoru",
    secenekler: ["Kaldıraç", "Makara", "Eğik düzlem", "Elektrik motoru"],
    lgsKapsam: true,
  },

  // ---------- KALDIRAÇ: TANIM VE PARÇALAR ----------
  {
    id: "lfen-bm006", ders: "fen", unite: "Basit Makineler",
    soru: "Bir kaldıracın döndüğü sabit noktaya ne ad verilir?",
    cevap: "Destek noktası",
    secenekler: ["Destek noktası", "Kuvvet kolu", "Yük kolu", "Denge noktası"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm007", ders: "fen", unite: "Basit Makineler",
    soru: "Kaldıraçta destek noktası ile kuvvetin uygulandığı nokta arasındaki mesafeye ne denir?",
    cevap: "Kuvvet kolu",
    secenekler: ["Kuvvet kolu", "Yük kolu", "Destek kolu", "Denge kolu"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm008", ders: "fen", unite: "Basit Makineler",
    soru: "Kaldıraçta destek noktası ile yükün bulunduğu nokta arasındaki mesafeye ne denir?",
    cevap: "Yük kolu",
    secenekler: ["Kuvvet kolu", "Yük kolu", "Denge kolu", "Ana kol"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm009", ders: "fen", unite: "Basit Makineler",
    soru: "Bir kaldıraçta kuvvet kolu, yük kolundan daha uzunsa ne olur?",
    cevap: "Daha az kuvvetle yük kaldırılır",
    secenekler: ["Daha az kuvvetle yük kaldırılır", "Daha fazla kuvvet gerekir", "Kaldıraç dengeye gelemez", "Yükün ağırlığı artar"],
    lgsKapsam: true,
  },

  // ---------- KALDIRAÇ TÜRLERİ ----------
  {
    id: "lfen-bm010", ders: "fen", unite: "Basit Makineler",
    soru: "Destek noktasının kuvvet ile yük arasında bulunduğu kaldıraç türüne ne denir?",
    cevap: "1. tür kaldıraç",
    secenekler: ["1. tür kaldıraç", "2. tür kaldıraç", "3. tür kaldıraç", "4. tür kaldıraç"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm011", ders: "fen", unite: "Basit Makineler",
    soru: "Aşağıdakilerden hangisi 1. tür kaldıraca örnektir?",
    cevap: "Makas",
    secenekler: ["Makas", "Fındıkkıran", "Cımbız", "Süpürge"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm012", ders: "fen", unite: "Basit Makineler",
    soru: "Yükün, destek noktası ile kuvvet arasında bulunduğu kaldıraç türüne ne denir?",
    cevap: "2. tür kaldıraç",
    secenekler: ["1. tür kaldıraç", "2. tür kaldıraç", "3. tür kaldıraç", "Bileşik kaldıraç"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm013", ders: "fen", unite: "Basit Makineler",
    soru: "Aşağıdakilerden hangisi 2. tür kaldıraca örnektir?",
    cevap: "Fındıkkıran",
    secenekler: ["Makas", "Fındıkkıran", "Cımbız", "Terazi"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm014", ders: "fen", unite: "Basit Makineler",
    soru: "Kuvvetin, destek noktası ile yük arasında uygulandığı kaldıraç türüne ne denir?",
    cevap: "3. tür kaldıraç",
    secenekler: ["1. tür kaldıraç", "2. tür kaldıraç", "3. tür kaldıraç", "Bileşik kaldıraç"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm015", ders: "fen", unite: "Basit Makineler",
    soru: "Aşağıdakilerden hangisi 3. tür kaldıraca örnektir?",
    cevap: "Cımbız",
    secenekler: ["Cımbız", "Fındıkkıran", "Makas", "Terazi"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm016", ders: "fen", unite: "Basit Makineler",
    soru: "Tahterevalli hangi tür kaldıraca örnektir?",
    cevap: "1. tür kaldıraç",
    secenekler: ["1. tür kaldıraç", "2. tür kaldıraç", "3. tür kaldıraç", "Kaldıraç değildir"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm017", ders: "fen", unite: "Basit Makineler",
    soru: "El arabası (tek tekerlekli) hangi tür kaldıraca örnektir? (Tekerlek destek noktasıdır.)",
    cevap: "2. tür kaldıraç",
    secenekler: ["1. tür kaldıraç", "2. tür kaldıraç", "3. tür kaldıraç", "Kaldıraç değildir"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm018", ders: "fen", unite: "Basit Makineler",
    soru: "Süpürgeyi kullanırken üst eliniz destek, alt eliniz kuvvet uygulama noktasıdır. Bu bir kaldıraç örneğiyse hangi türdür?",
    cevap: "3. tür kaldıraç",
    secenekler: ["1. tür kaldıraç", "2. tür kaldıraç", "3. tür kaldıraç", "Kaldıraç değildir"],
    lgsKapsam: true,
  },

  // ---------- MAKARA ----------
  {
    id: "lfen-bm019", ders: "fen", unite: "Basit Makineler",
    soru: "Sabit makara kullanmanın temel faydası nedir?",
    cevap: "Uygulanan kuvvetin yönünü değiştirir",
    secenekler: ["Uygulanan kuvvetin yönünü değiştirir", "Kuvvetten kazanç sağlar", "Yükü otomatik olarak kaldırır", "Sürtünmeyi tamamen yok eder"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm020", ders: "fen", unite: "Basit Makineler",
    soru: "Sabit makara kuvvetten kazanç sağlar mı?",
    cevap: "Hayır, uygulanan kuvvet yükün ağırlığına eşittir",
    secenekler: ["Evet, kuvveti yarıya indirir", "Hayır, uygulanan kuvvet yükün ağırlığına eşittir", "Evet, kuvveti iki katına çıkarır", "Yüke göre değişir"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm021", ders: "fen", unite: "Basit Makineler",
    soru: "Hareketli makara kullanmanın temel faydası nedir?",
    cevap: "Daha az kuvvetle yük kaldırmayı sağlar",
    secenekler: ["Daha az kuvvetle yük kaldırmayı sağlar", "Kuvvetin yönünü değiştirir", "Yükü hafifletir", "Sürtünmeyi artırır"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm022", ders: "fen", unite: "Basit Makineler",
    soru: "İdeal (sürtünmesiz) bir hareketli makarada yük, yükün ağırlığının yarısı kadar kuvvetle kaldırılıyorsa ip ne kadar çekilmelidir?",
    cevap: "Yükün çıkacağı mesafenin iki katı kadar",
    secenekler: ["Yükün çıkacağı mesafe kadar", "Yükün çıkacağı mesafenin yarısı kadar", "Yükün çıkacağı mesafenin iki katı kadar", "Hiç ip çekilmesine gerek yoktur"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm023", ders: "fen", unite: "Basit Makineler",
    soru: "Hareketli makara yük ile birlikte hareket eder mi?",
    cevap: "Evet, hareketli makara yükle birlikte yukarı çıkar",
    secenekler: ["Evet, hareketli makara yükle birlikte yukarı çıkar", "Hayır, sabit bir yere bağlıdır", "Yalnızca yük ağırsa hareket eder", "Yalnızca ip kısaysa hareket eder"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm024", ders: "fen", unite: "Basit Makineler",
    soru: "Sabit ve hareketli makaraların birlikte kullanıldığı düzeneğe ne ad verilir?",
    cevap: "Palanga",
    secenekler: ["Palanga", "Vinç", "Kasnak", "Dingil"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm025", ders: "fen", unite: "Basit Makineler",
    soru: "Palanga kullanmanın avantajı nedir?",
    cevap: "Hem kuvvetten kazanç sağlar hem de kuvvetin yönünü değiştirir",
    secenekler: ["Yalnızca yön değiştirir", "Yalnızca kuvvetten kazanç sağlar", "Hem kuvvetten kazanç sağlar hem de kuvvetin yönünü değiştirir", "Yapılan işten kazanç sağlar"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm026", ders: "fen", unite: "Basit Makineler",
    soru: "Bayrak direğindeki ipin geçtiği makara hangi tür makaradır?",
    cevap: "Sabit makara",
    secenekler: ["Sabit makara", "Hareketli makara", "Palanga", "Dingil"],
    lgsKapsam: true,
  },

  // ---------- EĞİK DÜZLEM ----------
  {
    id: "lfen-bm027", ders: "fen", unite: "Basit Makineler",
    soru: "Eğik düzlem kullanmanın temel faydası nedir?",
    cevap: "Yükü daha az kuvvetle, ama daha uzun bir yoldan çıkarmayı sağlar",
    secenekler: ["Yükü daha az kuvvetle, ama daha uzun bir yoldan çıkarmayı sağlar", "Yükün ağırlığını azaltır", "Sürtünmeyi tamamen ortadan kaldırır", "Yapılan işi azaltır"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm028", ders: "fen", unite: "Basit Makineler",
    soru: "Bir kamyona rampa üzerinden yük yüklemek, doğrudan kaldırmaya göre neden daha kolaydır?",
    cevap: "Rampa (eğik düzlem) yükü kaldırmak için gereken kuvveti azaltır",
    secenekler: ["Rampa (eğik düzlem) yükü kaldırmak için gereken kuvveti azaltır", "Rampa yükün ağırlığını azaltır", "Rampa sürtünmeyi tamamen yok eder", "Rampa yapılan işi azaltır"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm029", ders: "fen", unite: "Basit Makineler",
    soru: "Eğik düzlemin eğim açısı azaldıkça (daha yatık hale geldikçe) gereken kuvvet nasıl değişir?",
    cevap: "Gereken kuvvet azalır, ama gidilecek yol uzar",
    secenekler: ["Gereken kuvvet azalır, ama gidilecek yol uzar", "Gereken kuvvet artar", "Kuvvet ve yol ikisi de azalır", "Hiçbir şey değişmez"],
    lgsKapsam: true,
  },

  // ---------- VİDA ----------
  {
    id: "lfen-bm030", ders: "fen", unite: "Basit Makineler",
    soru: "Vida hangi basit makinenin bir silindir etrafına sarılmış hâli olarak düşünülebilir?",
    cevap: "Eğik düzlem",
    secenekler: ["Kaldıraç", "Eğik düzlem", "Makara", "Kama"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm031", ders: "fen", unite: "Basit Makineler",
    soru: "Vidanın dişleri arasındaki mesafe (adım) sıklaştıkça kuvvetten kazanç nasıl değişir?",
    cevap: "Kuvvetten kazanç artar",
    secenekler: ["Kuvvetten kazanç artar", "Kuvvetten kazanç azalır", "Değişmez", "Vidanın işlevi kalmaz"],
    lgsKapsam: true,
  },

  // ---------- KAMA ----------
  {
    id: "lfen-bm032", ders: "fen", unite: "Basit Makineler",
    soru: "Balta, bıçak gibi kesici aletlerin uç kısmı hangi basit makine türüne örnektir?",
    cevap: "Kama",
    secenekler: ["Kama", "Kaldıraç", "Makara", "Çark ve dingil"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm033", ders: "fen", unite: "Basit Makineler",
    soru: "Kama, temel olarak hangi işi kolaylaştırmak için kullanılır?",
    cevap: "Kesme veya yarma işini",
    secenekler: ["Kesme veya yarma işini", "Yük kaldırma işini", "Döndürme işini", "Yön değiştirme işini"],
    lgsKapsam: true,
  },

  // ---------- ÇARK VE DİNGİL ----------
  {
    id: "lfen-bm034", ders: "fen", unite: "Basit Makineler",
    soru: "Aşağıdakilerden hangisi çark ve dingil sistemine örnektir?",
    cevap: "Direksiyon simidi",
    secenekler: ["Direksiyon simidi", "Makas", "Balta", "Cımbız"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm035", ders: "fen", unite: "Basit Makineler",
    soru: "Çark ve dingil sisteminde büyük çarka uygulanan küçük bir kuvvet, dingilde nasıl bir etki yaratır?",
    cevap: "Daha büyük bir kuvvet ya da döndürme etkisi oluşturur",
    secenekler: ["Daha büyük bir kuvvet ya da döndürme etkisi oluşturur", "Kuvvet azalır", "Hiçbir etki oluşmaz", "Yalnızca yön değişir"],
    lgsKapsam: true,
  },

  // ---------- KARIŞIK EŞLEŞTİRME / GÜNLÜK HAYAT ----------
  {
    id: "lfen-bm036", ders: "fen", unite: "Basit Makineler",
    soru: "Merdiven, bir binaya çıkmak için hangi basit makinenin mantığıyla çalışır?",
    cevap: "Eğik düzlem",
    secenekler: ["Eğik düzlem", "Kaldıraç", "Makara", "Vida"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm037", ders: "fen", unite: "Basit Makineler",
    soru: "Kuyudan kova ile su çekmek için kullanılan tek makara hangi türdür?",
    cevap: "Sabit makara",
    secenekler: ["Sabit makara", "Hareketli makara", "Palanga", "Çark ve dingil"],
    lgsKapsam: true,
  },
  {
    id: "lfen-bm038", ders: "fen", unite: "Basit Makineler",
    soru: "Kapı kolu (tokmağı) döndürülerek kilit açılırken hangi basit makine mantığı kullanılır?",
    cevap: "Çark ve dingil",
    secenekler: ["Çark ve dingil", "Kama", "Eğik düzlem", "Makara"],
    lgsKapsam: true,
  },
];
