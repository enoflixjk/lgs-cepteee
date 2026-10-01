// ============================================================
// UYGULAMA GİRİŞ NOKTASI — sade hali (OTA güncellemeleri için)
//
// Sentry ve widget kaydı burada YOK, çünkü ikisi de henüz kurulu
// olmayan / native build gerektiren paketler. Ay sonu build'inde
// Sentry'li ve widget'lı index.js'e geçilecek.
// ============================================================
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);