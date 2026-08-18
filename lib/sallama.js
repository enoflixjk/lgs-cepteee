// ============================================================
// İVME TAKİBİ — sürekli sallama tepkisi için
//
// Tek seferlik eşik yerine her ivmeölçer örneğinde ham veri
// sağlar. Böylece Ligo, telefon sallandığı SÜRECE hareket eder,
// tek bir zıplayıp geri dönme yerine gerçek zamanlı takip eder.
//
// Pil tasarrufu için yalnızca bileşen ekranda görünürken aktif
// olmalı — kullanan taraf kendi useEffect temizliğini yapar.
// ============================================================
import { useEffect, useRef } from 'react';

let Accelerometer = null;
try {
  Accelerometer = require('expo-sensors').Accelerometer;
} catch (e) {
  // expo-sensors kurulu değilse sessizce devre dışı kalır
}

/**
 * Her ivmeölçer örneğinde onOrnek({x,y,z,dx,dy,dz,siddet}) çağrılır.
 * siddet: art arda iki örnek arasındaki toplam değişim büyüklüğü —
 * telefon dururken ~0, sallandıkça yükselir.
 */
export function useIvmeTakip(onOrnek) {
  const onceki = useRef({ x: 0, y: 0, z: 0 });
  const cbRef = useRef(onOrnek);
  cbRef.current = onOrnek;

  useEffect(() => {
    if (!Accelerometer) return;
    Accelerometer.setUpdateInterval(50); // ~20Hz — akıcı takip için yeterli, pili yormaz
    const abone = Accelerometer.addListener(({ x, y, z }) => {
      const o = onceki.current;
      const dx = x - o.x, dy = y - o.y, dz = z - o.z;
      const siddet = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
      onceki.current = { x, y, z };
      cbRef.current && cbRef.current({ x, y, z, dx, dy, dz, siddet });
    });
    return () => abone && abone.remove();
  }, []);
}

export const sallamaKullanilabilir = !!Accelerometer;