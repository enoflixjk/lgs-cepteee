// ============================================================
// UYGULAMA GİRİŞ NOKTASI
//
// Normalde Expo'nun kendi varsayılan giriş dosyasını (AppEntry.js)
// kullanıyorduk. Widget desteği eklemek için kendi index.js'imizi
// yazmamız ve package.json'daki "main" alanını buna yönlendirmemiz
// gerekiyor — aksi halde registerWidgetTaskHandler çağrılamaz.
// ============================================================
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { widgetTaskHandler } from './widget-task-handler';

// registerRootComponent, AppRegistry.registerComponent('main', () => App)
// çağırır ve Expo Go ile gerçek cihaz build'i arasındaki ortam farkını
// otomatik olarak yönetir — bu satır App.js'i her zamanki gibi çalıştırır.
registerRootComponent(App);

// Android widget'ının ne zaman güncelleneceğini (eklendi/silindi/
// yeniden boyutlandırıldı/periyodik) bu fonksiyona bağlıyoruz.
registerWidgetTaskHandler(widgetTaskHandler);
