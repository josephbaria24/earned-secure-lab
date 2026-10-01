import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const SMOKE_SRC = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png';

type Puff = {
  x: number;
  y: number;
  z: number;
  size: number;
  rotation: number;
  spin: number;
  drift: number;
};

function SmokeCanvas() {
  const host = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const current = host.current as unknown as HTMLElement | { getBoundingClientRect?: () => DOMRect } | null;
    const root = current && 'appendChild' in current ? current as HTMLElement : null;
    if (!root) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    root.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = document.createElement('img');
    image.crossOrigin = 'anonymous';
    image.src = SMOKE_SRC;

    const puffs: Puff[] = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.4 + Math.random() * 1.1,
      size: 180 + Math.random() * 220,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() * 0.12 + 0.04) * (Math.random() > 0.5 ? 1 : -1),
      drift: (Math.random() * 0.012 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
    }));

    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      const width = root.clientWidth;
      const height = root.clientHeight;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      puffs.forEach((puff) => {
        puff.rotation += puff.spin * delta;
        puff.x += puff.drift * delta;
        if (puff.x < -0.2) puff.x = 1.2;
        if (puff.x > 1.2) puff.x = -0.2;
        const size = puff.size * puff.z;
        const x = puff.x * width;
        const y = puff.y * height;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(puff.rotation);
        ctx.globalAlpha = 0.18;
        if (image.complete && image.naturalWidth) {
          ctx.drawImage(image, -size / 2, -size / 2, size, size);
        }
        ctx.restore();
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      canvas.remove();
    };
  }, []);

  return <View ref={host} pointerEvents="none" style={StyleSheet.absoluteFill} />;
}

export function SmokeBackground() {
  if (Platform.OS !== 'web') return null;
  return <SmokeCanvas />;
}
