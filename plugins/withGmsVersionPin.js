// ============================================================
// ÖZEL EXPO CONFIG PLUGIN — Google Play Services sürüm sabitleme
//
// SORUN: react-native-google-mobile-ads (AdMob), Gradle'ın otomatik
// bağımlılık çözümlemesiyle "com.google.android.gms:play-services-ads"
// kütüphanesinin EN YENİ sürümünü (25.4.0) çekiyor. Bu sürüm Kotlin
// 2.3.0 ile derlenmiş, ama React Native'in kendi Gradle eklentisi
// Kotlin dil/API sürümünü 2.1'de sabit tutuyor — bu ikisi birbirini
// okuyamıyor ("incompatible version of Kotlin" hatası).
//
// ÇÖZÜM: com.google.android.gms grubundaki TÜM kütüphaneleri, Kotlin
// 2.1 ile uyumlu olduğu bilinen daha eski, sabit bir sürüme (24.6.0)
// zorluyoruz. Bu, react-native-google-mobile-ads'in 15.8.0 sürümünde
// resmi olarak hedeflediği sürümle aynı.
//
// Bu dosya npx expo prebuild sırasında android/build.gradle'ın en
// altına otomatik olarak enjekte edilir.
// ============================================================
const { withProjectBuildGradle } = require('@expo/config-plugins');

const GMS_SABIT_SURUM = '24.6.0';

const EKLENECEK_BLOK = `
// --- withGmsVersionPin tarafından eklendi ---
allprojects {
  configurations.all {
    resolutionStrategy.eachDependency { details ->
      // Sadece AdMob SDK'sının kendi paketleri. 'play-services-ads-identifier'
      // gibi ayrı sürümlenen paketler (RevenueCat bunu kullanıyor) HARİÇ —
      // onların 24.6.0 diye bir sürümü yok, build'i düşürür.
      if (details.requested.group == 'com.google.android.gms' &&
          ['play-services-ads', 'play-services-ads-lite', 'play-services-ads-api', 'play-services-ads-base']
            .contains(details.requested.name)) {
        details.useVersion('${GMS_SABIT_SURUM}')
      }
    }
  }
}
// --- withGmsVersionPin sonu ---
`;

module.exports = function withGmsVersionPin(config) {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('withGmsVersionPin')) {
      config.modResults.contents += EKLENECEK_BLOK;
    }
    return config;
  });
};