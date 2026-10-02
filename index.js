// ============================================================
// UYGULAMA GİRİŞ NOKTASI
//
// Ana uygulamayı kaydeder ve Android'de ana ekran widget'ının
// görev yöneticisini bağlar. Widget kaydı yapılmazsa, kullanıcı
// "Ligo Seri Widget"ı ana ekrana eklediğinde widget boş/hatalı görünür.
// ============================================================
import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);

if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./widget-task-handler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (e) {
    // Widget kütüphanesi yoksa (ör. Expo Go) uygulama yine de açılır.
  }
}
