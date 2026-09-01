// paragraf-ekle.js
// Kullanım: proje klasöründe (lgs-cards) şunu çalıştır:
//   node paragraf-ekle.js
//
// Ne yapar:
// 1. data/cards.js dosyasının yedeğini alır (data/cards.paragraf-oncesi.js)
// 2. Aşağıdaki 12 kart id'sine, tanımlı paragraf metnini ekler
// 3. Her id'nin gerçekten TEK bir yerde bulunduğunu kontrol eder
//    (çakışma varsa o kartı atlar, hata basar, dosyayı bozmaz)
// 4. Sonunda kaç kart güncellendiğini raporlar

const fs = require('fs');
const path = require('path');

const DOSYA = path.join(__dirname, 'data', 'cards.js');
const YEDEK = path.join(__dirname, 'data', 'cards.paragraf-oncesi.js');

const PARAGRAFLAR = {
  'ltur-0041': "Kitap okumak, insanın hem kelime dağarcığını genişletir hem de hayal gücünü besler. Bir roman okurken kahramanların dünyasına girer, onların gözünden hayatı görürüz. Bilgilendirici bir kitap okurken ise yeni konular öğrenir, merakımızı gideririz. Kısacası okumak, zihnimizi her yönden zenginleştiren bir alışkanlıktır.",
  'ltur-0042': "Düzenli spor yapmak sağlığa çok fayda sağlar. Öncelikle kalp ve damar sağlığını güçlendirir. Ayrıca kemik yoğunluğunu artırarak osteoporoz riskini azaltır. Bunun yanında stresi azaltıp ruh halini iyileştirir.",
  'ltur-0061': "Ormanlar, dünyadaki oksijenin büyük bir kısmını üretir. Aynı zamanda binlerce canlı türüne ev sahipliği yapar. Toprağın erozyona uğramasını da engeller. Bütün bu nedenlerle ormanları korumak, sadece doğa için değil insanlık için de bir zorunluluktur.",
  'ltur-0073': "Ali sabah erkenden kalkıp derslerine çalıştı. Öğleden sonra ise arkadaşlarıyla buluşup futbol oynadı. Akşam olduğunda ise evde ailesiyle vakit geçirdi. Görüldüğü gibi Ali, günün her saatini dengeli bir şekilde değerlendirmişti.",
  'ltur-0099': "Ece, sınava çok iyi hazırlandığını düşünüyordu. Buna karşın sınav sonucu beklediği gibi çıkmadı. Oysa haftalarca düzenli çalışmış, hiçbir konuyu atlamamıştı.",
  'ltur-0100': "Hava kirliliği son yıllarda ciddi boyutlara ulaştı. Bu nedenle birçok şehirde solunum yolu hastalıkları arttı. Dolayısıyla yetkililer araç trafiğini azaltacak önlemler almaya başladı.",
  'ltur-0114': "Türkiye'de son on yılda okuma oranları artış gösterdi. Örneğin 2015 yılında kişi başı yıllık ortalama 5 kitap okunurken bu sayı 2023'te 8'e yükseldi. Bu istatistikler, okuma kültürünün giderek yaygınlaştığını gösteriyor.",
  'ltur-0126': "Yeni açılan kütüphane, öğrencilere sessiz bir çalışma ortamı sunuyor. Öte yandan ücretsiz internet erişimi de sağlıyor. Üstelik hafta sonları da açık kalarak herkesin faydalanmasına imkan tanıyor.",
  'ltur-0139': "Tarih boyunca birçok buluş, insanlığın hayatını kökten değiştirmiştir. Örneğin matbaanın icadı bilginin hızla yayılmasını sağlamıştır. Yine elektriğin keşfi, günlük yaşamı tümüyle dönüştürmüştür.",
  'ltur-0154': "Uyku, insan sağlığı için beslenme kadar önemlidir. Yeterli uyumayan kişilerde dikkat dağınıklığı görülür. Bağışıklık sistemi zayıflar. Ruh hali olumsuz yönde etkilenir.",
  'ltur-0164': "Bitkiler fotosentez yaparak oksijen üretir. Toprağı kökleriyle tutarak erozyonu önler. Birçok canlıya barınak ve besin kaynağı olur. Sonuç olarak bitkiler, ekosistemin vazgeçilmez bir parçasıdır.",
  'ltur-0175': "Şehir merkezindeki yeni köprü, 3 yılda tamamlandı ve 2 milyar liraya mal oldu. Köprü, günlük yaklaşık 40 bin aracın geçişine imkan tanıyor. Yapım sürecinde 500 işçi görev aldı.",
};

function kacIleGec(str, aranan) {
  let sayi = 0, i = 0;
  while ((i = str.indexOf(aranan, i)) !== -1) { sayi++; i += aranan.length; }
  return sayi;
}

function calistir() {
  if (!fs.existsSync(DOSYA)) {
    console.error('HATA: data/cards.js bulunamadı. Bu scripti proje kök klasöründe çalıştır.');
    process.exit(1);
  }

  let icerik = fs.readFileSync(DOSYA, 'utf8');
  fs.writeFileSync(YEDEK, icerik, 'utf8');
  console.log('Yedek alındı: data/cards.paragraf-oncesi.js');

  let basarili = 0, atlanan = [];

  for (const [id, paragraf] of Object.entries(PARAGRAFLAR)) {
    const idArandi = `id: "${id}"`;
    const kacTane = kacIleGec(icerik, idArandi);

    if (kacTane === 0) {
      console.warn(`  ATLANDI (${id}): kart bulunamadı`);
      atlanan.push(id);
      continue;
    }
    if (kacTane > 1) {
      console.warn(`  ATLANDI (${id}): id ${kacTane} kez geçiyor, çakışma riski var — elle kontrol et`);
      atlanan.push(id);
      continue;
    }

    // "id: "ltur-0041", ders: "turkce", unite: "...", " kalıbının hemen
    // ardına paragraf alanını ekliyoruz. unite: alanından hemen sonra ekliyoruz.
    const idIndex = icerik.indexOf(idArandi);
    const satirSonu = icerik.indexOf('\n', idIndex);
    const satir = icerik.slice(idIndex, satirSonu === -1 ? icerik.length : satirSonu);

    // unite: "..." kısmının bittiği yeri (ilk virgülden sonrasını) bul
    const uniteMatch = satir.match(/unite:\s*"[^"]*",\s*/);
    if (!uniteMatch) {
      console.warn(`  ATLANDI (${id}): 'unite:' alanı satırda bulunamadı, elle kontrol et`);
      atlanan.push(id);
      continue;
    }

    const eklemeNoktasi = idIndex + uniteMatch.index + uniteMatch[0].length;
    const paragrafKacisli = paragraf.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const eklenecek = `paragraf: "${paragrafKacisli}", `;

    icerik = icerik.slice(0, eklemeNoktasi) + eklenecek + icerik.slice(eklemeNoktasi);
    basarili++;
    console.log(`  OK (${id}): paragraf eklendi`);
  }

  fs.writeFileSync(DOSYA, icerik, 'utf8');

  console.log('');
  console.log(`Tamamlandı: ${basarili} kart güncellendi, ${atlanan.length} kart atlandı.`);
  if (atlanan.length > 0) {
    console.log('Atlanan id\'ler:', atlanan.join(', '));
  }
  console.log('');
  console.log('Bir sorun görürsen data/cards.paragraf-oncesi.js yedeğinden geri dönebilirsin:');
  console.log('  cp data/cards.paragraf-oncesi.js data/cards.js');
}

calistir();
