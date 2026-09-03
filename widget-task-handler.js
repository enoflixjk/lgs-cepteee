// ============================================================
// WIDGET GÖREV YÖNETİCİSİ (Task Handler)
//
// Android, widget her eklendiğinde / periyodik güncellendiğinde /
// yeniden boyutlandırıldığında bu fonksiyonu çağırır — ana uygulama
// o an AÇIK OLMASA BİLE çalışır. Bu yüzden React state'ine değil,
// doğrudan AsyncStorage'a (cihaz hafızasına) bakıyoruz; App.js'te
// zaten 'lgs_seri' anahtarıyla kaydediliyor.
// ============================================================
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SeriWidget } from './widgets/SeriWidget';

export async function widgetTaskHandler(props) {
  let seri = 0;
  try {
    const v = await AsyncStorage.getItem('lgs_seri');
    seri = Number(v) || 0;
  } catch (e) {
    // Okunamazsa 0 göster, widget hiçbir zaman çökmesin
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<SeriWidget seri={seri} />);
      break;
    case 'WIDGET_DELETED':
      // Temizlenecek bir şey yok
      break;
    case 'WIDGET_CLICK':
      // clickAction="OPEN_APP" zaten kütüphane tarafından otomatik
      // olarak uygulamayı açıyor, burada ekstra işlem gerekmiyor.
      break;
    default:
      break;
  }
}
