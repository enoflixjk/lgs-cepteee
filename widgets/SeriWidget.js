// ============================================================
// SERİ WIDGET — Android ana ekranında gösterilen küçük widget.
//
// ÖNEMLİ: Bu dosya normal React Native bileşenleri KULLANAMAZ.
// Widget'lar Android sistemi tarafından (RemoteViews ile) çiziliyor,
// React Native motoru tarafından değil. Bu yüzden sadece
// react-native-android-widget'ın kendi özel bileşenleri kullanılabilir:
// FlexWidget, TextWidget, ImageWidget, IconWidget vb.
//
// Var olan App.js'teki stil/renk sabitlerini burada DOĞRUDAN
// kullanamayız (farklı bir render motoru) — bu yüzden renkler elle
// tekrar yazıldı (Ligo'nun mavi teması: #4B7BE8, alev turuncusu: #F97316).
// ============================================================
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function SeriWidget({ seri = 0 }) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1B1E33',
        borderRadius: 20,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text="🔥"
        style={{ fontSize: 28, marginBottom: 2 }}
      />
      <TextWidget
        text={String(seri)}
        style={{ fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' }}
      />
      <TextWidget
        text={seri === 1 ? 'gün' : 'gün seri'}
        style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}
      />
    </FlexWidget>
  );
}
