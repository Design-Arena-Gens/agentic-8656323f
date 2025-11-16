"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DRONE_FREQUENCIES = [146.83, 220, 293.66, 220];

interface DroneNode {
  osc: OscillatorNode;
  gain: GainNode;
  modOsc: OscillatorNode;
  modGain: GainNode;
}

interface TanpuraState {
  isActive: boolean;
  toggle: () => void;
  stop: () => void;
}

type ExtendedWindow = Window & {
  AudioContext?: typeof globalThis.AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

export const useTanpuraDrone = (): TanpuraState => {
  const contextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<DroneNode[]>([]);
  const [isActive, setIsActive] = useState(false);

  const stop = useCallback(() => {
    const ctx = contextRef.current;
    const now = ctx?.currentTime ?? 0;
    nodesRef.current.forEach(({ osc, gain, modGain, modOsc }) => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        modGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.stop(now + 0.6);
        modOsc.stop(now + 0.6);
      } catch {
        // ignore already stopped nodes
      }
      osc.disconnect();
      gain.disconnect();
      modOsc.disconnect();
      modGain.disconnect();
    });
    nodesRef.current = [];
    if (contextRef.current) {
      contextRef.current.suspend().catch(() => undefined);
    }
    setIsActive(false);
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const audioWindow = window as ExtendedWindow;
    const AudioCtx = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioCtx) return;

    if (!contextRef.current) {
      contextRef.current = new AudioCtx();
    }

    const ctx = contextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }

    const oscillators: DroneNode[] = [];

    DRONE_FREQUENCIES.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const spread = index % 2 === 0 ? 0.1 : -0.08;
      osc.type = "sine";
      osc.frequency.value = freq;
      const detune = ctx.createOscillator();
      detune.type = "sine";
      detune.frequency.value = 0.1 + Math.random() * 0.2;
      const detuneGain = ctx.createGain();
      detuneGain.gain.value = freq * spread;
      detune.connect(detuneGain);
      detuneGain.connect(osc.frequency);
      detune.start();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 2);
      oscillators.push({ osc, gain, modOsc: detune, modGain: detuneGain });
    });

    nodesRef.current = oscillators;
    setIsActive(true);
  }, []);

  const toggle = useCallback(() => {
    if (isActive) {
      stop();
    } else {
      start();
    }
  }, [isActive, start, stop]);

  useEffect(() => {
    return () => {
      stop();
      if (contextRef.current) {
        contextRef.current.close().catch(() => undefined);
      }
    };
  }, [stop]);

  return { isActive, toggle, stop };
};
