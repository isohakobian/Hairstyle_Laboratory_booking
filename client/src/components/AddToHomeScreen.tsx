import React, { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type Lang = "hy" | "ru" | "en";
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const copy: Record<Lang, {
  title: string; intro: string; iphone: string; iphoneText: string; android: string; androidText: string; install: string; installing: string; installed: string; note: string;
}> = {
  ru: { title: "Сохрани сайт на главном экране", intro: "Так Hairstyle Laboratory всегда будет под рукой — без отдельного приложения.", iphone: "iPhone", iphoneText: "Открой сайт в Safari → нажми «Поделиться» → «На экран Домой» → «Добавить».", android: "Android", androidText: "Открой сайт в Chrome → нажми ⋮ → «Добавить на главный экран» или «Установить приложение».", install: "Добавить сейчас", installing: "Открываю…", installed: "Готово", note: "После добавления сайт откроется как аккуратное приложение с отдельной иконкой.", },
  en: { title: "Save the site to your home screen", intro: "Keep Hairstyle Laboratory one tap away — no separate app needed.", iphone: "iPhone", iphoneText: "Open the site in Safari → tap Share → Add to Home Screen → Add.", android: "Android", androidText: "Open the site in Chrome → tap ⋮ → Add to Home screen or Install app.", install: "Add now", installing: "Opening…", installed: "Done", note: "After adding it, the site opens like a clean app with its own icon.", },
  hy: { title: "Պահպանեք կայքը գլխավոր էկրանին", intro: "Hairstyle Laboratory-ը միշտ կլինի մեկ հպումով հասանելի՝ առանց առանձին հավելվածի։", iphone: "iPhone", iphoneText: "Բացեք Safari-ում → սեղմեք «Share» → «Add to Home Screen» → «Add»։", android: "Android", androidText: "Բացեք Chrome-ում → սեղմեք ⋮ → «Add to Home screen» կամ «Install app»։", install: "Ավելացնել հիմա", installing: "Բացում է…", installed: "Պատրաստ է", note: "Ավելացնելուց հետո կայքը կբացվի որպես առանձին հավելվածի նման։", },
};

export default function AddToHomeScreen() {
  const { language } = useLanguage() as { language: Lang };
  const c = copy[language] ?? copy.ru;
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onAppInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    if (window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone) setInstalled(true);
    return () => { window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt); window.removeEventListener("appinstalled", onAppInstalled); };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  };

  return <section aria-label={c.title} style={{ marginTop: "2rem", border: "1px solid var(--gold-mid)", padding: "1.25rem", background: "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--card)))", textAlign: "left" }}>
    <p className="label-caps" style={{ color: "var(--gold-mid)", marginBottom: "0.6rem" }}>Hairstyle Laboratory</p>
    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", margin: "0 0 0.35rem" }}>{c.title}</h2>
    <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.8rem", lineHeight: 1.5, margin: "0 0 1rem" }}>{c.intro}</p>
    {installEvent && !installed && <button type="button" className="btn-primary" onClick={install} style={{ width: "100%", marginBottom: "1rem" }}>{c.install}</button>}
    {installed && <p style={{ color: "var(--gold-mid)", fontSize: "0.75rem", margin: "0 0 1rem" }}>✓ {c.installed}</p>}
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <div style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: "0.75rem" }}><strong style={{ display: "block", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>{c.iphone}</strong><span style={{ display: "block", color: "hsl(var(--muted-foreground))", fontSize: "0.75rem", lineHeight: 1.5, marginTop: "0.25rem" }}>{c.iphoneText}</span></div>
      <div style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: "0.75rem" }}><strong style={{ display: "block", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>{c.android}</strong><span style={{ display: "block", color: "hsl(var(--muted-foreground))", fontSize: "0.75rem", lineHeight: 1.5, marginTop: "0.25rem" }}>{c.androidText}</span></div>
    </div>
    <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.68rem", lineHeight: 1.45, margin: "1rem 0 0" }}>{c.note}</p>
  </section>;
}
