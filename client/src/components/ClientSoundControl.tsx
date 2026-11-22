import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';

type Lang = 'hy' | 'ru' | 'en';

const AUDIO_SRC = '/manus-storage/hairstyle-lab-neon-night_9bcc33cf.mp3';
const CLIENT_ROUTES = new Set(['/', '/booking', '/status', '/review', '/loyalty']);

const labels: Record<Lang, { on: string; off: string }> = {
  en: { on: 'Sound on', off: 'Sound off' },
  ru: { on: 'Включить звук', off: 'Выключить звук' },
  hy: { on: 'Միացնել ձայնը', off: 'Անջատել ձայնը' },
};

export default function ClientSoundControl() {
  const { language } = useLanguage() as { language: Lang };
  const [location] = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const isClientRoute = CLIENT_ROUTES.has(location);
  const c = labels[language] ?? labels.en;

  useEffect(() => {
    if (!isClientRoute) {
      audioRef.current?.pause();
      setSoundEnabled(false);
    }
  }, [isClientRoute]);

  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

  const toggleSound = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (soundEnabled) {
      audio.pause();
      setSoundEnabled(false);
      return;
    }

    audio.volume = 0.18;
    try {
      await audio.play();
      setSoundEnabled(true);
    } catch {
      setSoundEnabled(false);
    }
  };

  return (
    <>
      <audio ref={audioRef} loop preload="metadata" src={AUDIO_SRC} />
      {isClientRoute && (
        <button
          type="button"
          className={`gta-sound-toggle ${soundEnabled ? 'is-playing' : ''}`}
          onClick={toggleSound}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? c.off : c.on}
        >
          <span className="gta-sound-icon" aria-hidden="true"><i /><i /><i /></span>
          <span>{soundEnabled ? c.off : c.on}</span>
        </button>
      )}
    </>
  );
}
