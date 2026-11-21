import React, { useEffect, useState } from "react";
import { ArrowDown, Check, Download, MoreVertical, Plus, Share2, Smartphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Lang = "hy" | "ru" | "en";
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

type Copy = {
  title: string;
  intro: string;
  iphone: string;
  iphoneText: string;
  android: string;
  androidText: string;
  install: string;
  installing: string;
  installed: string;
  note: string;
  step: string;
  shareStep: string;
  addStep: string;
  menuStep: string;
  chooseStep: string;
  iosHint: string;
  androidHint: string;
  close: string;
};

const copy: Record<Lang, Copy> = {
  ru: {
    title: "Сохрани сайт на главный экран",
    intro: "Это не отдельное приложение: ты добавляешь красивый ярлык Hairstyle Laboratory на телефон и открываешь сайт одним касанием.",
    iphone: "iPhone · Safari",
    iphoneText: "Внизу Safari нажми кнопку «Поделиться», затем выбери «На экран Домой» и нажми «Добавить».",
    android: "Android · Chrome",
    androidText: "В Chrome нажми ⋮ в правом верхнем углу, выбери «Добавить на главный экран» или «Установить приложение».",
    install: "Добавить на главный экран",
    installing: "Открываю установку…",
    installed: "Сайт уже добавлен",
    note: "После этого на главном экране появится иконка Hairstyle Laboratory — как у приложения.",
    step: "ШАГ",
    shareStep: "Нажми «Поделиться»",
    addStep: "Выбери «На экран Домой»",
    menuStep: "Открой меню ⋮",
    chooseStep: "Нажми «Добавить»",
    iosHint: "Показываем для iPhone",
    androidHint: "Показываем для Android",
    close: "Понятно",
  },
  en: {
    title: "Save the site to your home screen",
    intro: "This is not a separate app: add a beautiful Hairstyle Laboratory shortcut to your phone and open the site with one tap.",
    iphone: "iPhone · Safari",
    iphoneText: "In Safari, tap the Share button at the bottom, choose Add to Home Screen, then tap Add.",
    android: "Android · Chrome",
    androidText: "In Chrome, tap ⋮ in the top-right corner, choose Add to Home screen or Install app.",
    install: "Add to home screen",
    installing: "Opening install…",
    installed: "Site already added",
    note: "A Hairstyle Laboratory icon will appear on your home screen and open like an app.",
    step: "STEP",
    shareStep: "Tap Share",
    addStep: "Choose Add to Home Screen",
    menuStep: "Open the ⋮ menu",
    chooseStep: "Tap Add",
    iosHint: "For iPhone",
    androidHint: "For Android",
    close: "Maybe later",
  },
  hy: {
    title: "Պահպանեք կայքը գլխավոր էկրանին",
    intro: "Սա առանձին հավելված չէ․ ավելացրեք Hairstyle Laboratory-ի գեղեցիկ դյուրանցումը և բացեք կայքը մեկ հպումով։",
    iphone: "iPhone · Safari",
    iphoneText: "Safari-ում ներքևում սեղմեք «Share», ընտրեք «Add to Home Screen», ապա սեղմեք «Add»։",
    android: "Android · Chrome",
    androidText: "Chrome-ում վերևի աջ անկյունում սեղմեք ⋮, ընտրեք «Add to Home screen» կամ «Install app»։",
    install: "Ավելացնել գլխավոր էկրանին",
    installing: "Բացում է…",
    installed: "Կայքն արդեն ավելացված է",
    note: "Գլխավոր էկրանին կհայտնվի Hairstyle Laboratory-ի պատկերակը և կբացվի հավելվածի նման։",
    step: "ՔԱՅԼ",
    shareStep: "Սեղմեք Share",
    addStep: "Ընտրեք Add to Home Screen",
    menuStep: "Բացեք ⋮ մենյուն",
    chooseStep: "Սեղմեք Add",
    iosHint: "iPhone-ի համար",
    androidHint: "Android-ի համար",
    close: "Հետո",
  },
};

const phoneFrame: React.CSSProperties = {
  width: "5.1rem",
  height: "8.7rem",
  border: "2px solid hsl(var(--foreground))",
  borderRadius: "1rem",
  padding: "0.45rem",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  background: "hsl(var(--card))",
  boxShadow: "0 0.5rem 1.2rem hsl(var(--foreground) / 0.08)",
};

function MiniPhone({ android, step }: { android?: boolean; step: 1 | 2 }) {
  return <div aria-hidden="true" style={phoneFrame}>
    <div style={{ height: "0.22rem", width: "2rem", borderRadius: "999px", background: "hsl(var(--foreground) / 0.18)", alignSelf: "center" }} />
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <div style={{ height: "0.28rem", width: "3.2rem", background: "hsl(var(--foreground) / 0.12)" }} />
      <div style={{ height: "3.2rem", background: "linear-gradient(135deg, hsl(var(--foreground) / 0.12), hsl(var(--gold-mid) / 0.34))" }} />
      <div style={{ height: "0.24rem", width: "2.5rem", background: "hsl(var(--foreground) / 0.12)" }} />
    </div>
    <div style={{ position: "relative", height: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-around", color: "hsl(var(--muted-foreground))" }}>
      {android ? <MoreVertical size={15} strokeWidth={2.5} style={{ color: step === 1 ? "var(--gold-mid)" : "hsl(var(--muted-foreground))" }} /> : <Share2 size={14} strokeWidth={2.5} style={{ color: step === 1 ? "var(--gold-mid)" : "hsl(var(--muted-foreground))" }} />}
      {step === 2 && <span style={{ position: "absolute", bottom: "1.35rem", left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", padding: "0.25rem 0.35rem", border: "1px solid var(--gold-mid)", background: "hsl(var(--card))", color: "hsl(var(--foreground))", fontSize: "0.42rem", fontWeight: 700 }}>{android ? "Add" : "Home Screen"}</span>}
      {step === 2 && <ArrowDown size={12} style={{ position: "absolute", bottom: "1rem", left: "50%", color: "var(--gold-mid)" }} />}
    </div>
  </div>;
}

function VisualStep({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <div style={{ display: "grid", gap: "0.65rem", justifyItems: "center", minWidth: "6.5rem", flex: 1 }}>
    <div style={{ width: "1.45rem", height: "1.45rem", borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--gold-mid)", color: "#17181b", fontSize: "0.62rem", fontWeight: 800 }}>{number}</div>
    {children}
    <p style={{ margin: 0, textAlign: "center", fontSize: "0.66rem", lineHeight: 1.35, fontWeight: 700 }}>{title}</p>
  </div>;
}

export default function AddToHomeScreen({ autoPopup = false }: { autoPopup?: boolean }) {
  const { language } = useLanguage() as { language: Lang };
  const c = copy[language] ?? copy.ru;
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallPromptEvent); };
    const onAppInstalled = () => { setInstalled(true); setInstallEvent(null); setShowPopup(false); try { localStorage.setItem("hl_add_to_home_seen", "installed"); } catch { /* localStorage unavailable */ } };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    const isStandalone = Boolean(window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) setInstalled(true);
    if (autoPopup && !isStandalone) {
      let seen = false;
      try { seen = Boolean(localStorage.getItem("hl_add_to_home_seen")); } catch { /* localStorage unavailable */ }
      if (!seen) {
        const timer = window.setTimeout(() => setShowPopup(true), 2800);
        return () => { window.clearTimeout(timer); window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt); window.removeEventListener("appinstalled", onAppInstalled); };
      }
    }
    return () => { window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt); window.removeEventListener("appinstalled", onAppInstalled); };
  }, [autoPopup]);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  };

  const guide = <section aria-label={c.title} style={{ marginTop: "2rem", border: "1px solid var(--gold-mid)", padding: "1.25rem", background: "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--card)))", textAlign: "left", overflow: "hidden" }}>
    <div style={{ display: "flex", gap: "0.7rem", alignItems: "flex-start" }}>
      <div style={{ flex: "0 0 auto", width: "2rem", height: "2rem", display: "grid", placeItems: "center", border: "1px solid var(--gold-mid)", color: "var(--gold-mid)" }}><Smartphone size={17} /></div>
      <div><p className="label-caps" style={{ color: "var(--gold-mid)", marginBottom: "0.4rem" }}>Hairstyle Laboratory</p><h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", margin: 0 }}>{c.title}</h2></div>
    </div>
    <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.8rem", lineHeight: 1.55, margin: "0.75rem 0 1rem" }}>{c.intro}</p>
    {installEvent && !installed && <button type="button" className="btn-primary" onClick={install} style={{ width: "100%", marginBottom: "1rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.45rem" }}><Download size={14} />{c.install}</button>}
    {installed && <p style={{ color: "var(--gold-mid)", fontSize: "0.75rem", margin: "0 0 1rem", display: "flex", alignItems: "center", gap: "0.35rem" }}><Check size={14} />{c.installed}</p>}

    <div style={{ display: "grid", gap: "1rem" }}>
      <article style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: "0.9rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}><strong style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{c.iphone}</strong><span style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.62rem" }}>{c.iosHint}</span></div>
        <div style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start", justifyContent: "space-between" }}>
          <VisualStep number="1" title={c.shareStep}><MiniPhone step={1} /></VisualStep><Plus size={13} style={{ marginTop: "4.4rem", color: "var(--gold-mid)", flex: "0 0 auto" }} /><VisualStep number="2" title={c.addStep}><MiniPhone step={2} /></VisualStep><Plus size={13} style={{ marginTop: "4.4rem", color: "var(--gold-mid)", flex: "0 0 auto" }} /><VisualStep number="3" title={c.chooseStep}><div style={{ ...phoneFrame, alignItems: "center", justifyContent: "center", gap: "0.7rem" }}><Share2 size={15} /><div style={{ display: "grid", gap: "0.45rem", width: "100%" }}><span style={{ height: "0.4rem", background: "hsl(var(--foreground) / 0.12)" }} /><span style={{ height: "0.4rem", background: "hsl(var(--gold-mid) / 0.7)" }} /><span style={{ height: "0.4rem", background: "hsl(var(--foreground) / 0.12)" }} /></div><Check size={17} color="var(--gold-mid)" /></div></VisualStep>
        </div>
        <p style={{ margin: "0.8rem 0 0", color: "hsl(var(--muted-foreground))", fontSize: "0.73rem", lineHeight: 1.5 }}>{c.iphoneText}</p>
      </article>

      <article style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: "0.9rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}><strong style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{c.android}</strong><span style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.62rem" }}>{c.androidHint}</span></div>
        <div style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start", justifyContent: "space-between" }}>
          <VisualStep number="1" title={c.menuStep}><MiniPhone android step={1} /></VisualStep><Plus size={13} style={{ marginTop: "4.4rem", color: "var(--gold-mid)", flex: "0 0 auto" }} /><VisualStep number="2" title={c.chooseStep}><MiniPhone android step={2} /></VisualStep><Plus size={13} style={{ marginTop: "4.4rem", color: "var(--gold-mid)", flex: "0 0 auto" }} /><VisualStep number="3" title={c.addStep}><div style={{ ...phoneFrame, alignItems: "center", justifyContent: "center", gap: "0.7rem" }}><MoreVertical size={15} /><div style={{ width: "100%", border: "1px solid var(--gold-mid)", padding: "0.45rem 0.3rem", display: "grid", gap: "0.35rem" }}><Download size={13} color="var(--gold-mid)" style={{ margin: "auto" }} /><span style={{ height: "0.35rem", background: "hsl(var(--gold-mid) / 0.65)" }} /></div><Check size={17} color="var(--gold-mid)" /></div></VisualStep>
        </div>
        <p style={{ margin: "0.8rem 0 0", color: "hsl(var(--muted-foreground))", fontSize: "0.73rem", lineHeight: 1.5 }}>{c.androidText}</p>
      </article>
    </div>
    <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.68rem", lineHeight: 1.45, margin: "1rem 0 0", display: "flex", gap: "0.35rem", alignItems: "flex-start" }}><Check size={13} color="var(--gold-mid)" style={{ flex: "0 0 auto", marginTop: "0.08rem" }} />{c.note}</p>
  </section>;

  if (!autoPopup) return guide;
  if (!showPopup || installed) return null;
  return <div role="dialog" aria-modal="true" aria-label={c.title} style={{ position: "fixed", inset: 0, zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "hsl(var(--foreground) / 0.58)", overflowY: "auto" }}>
    <div style={{ width: "min(100%, 38rem)", position: "relative" }}>
      <button type="button" aria-label={c.close} onClick={() => { setShowPopup(false); try { localStorage.setItem("hl_add_to_home_seen", "dismissed"); } catch { /* localStorage unavailable */ } }} style={{ position: "absolute", top: "0.7rem", right: "0.7rem", zIndex: 2, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--foreground))", width: "2rem", height: "2rem", display: "grid", placeItems: "center", cursor: "pointer", fontSize: "1.1rem" }}>×</button>
      {guide}
    </div>
  </div>;
}
