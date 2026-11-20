import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import AddToHomeScreen from "@/components/AddToHomeScreen";

type Lang = "hy" | "ru" | "en";

const copy: Record<Lang, {
  back: string; label: string; title: string; intro: string; free: string; name: string; phone: string; email: string; join: string; joining: string; privacy: string; dashboard: string; visits: string; remaining: string; earned: string; available: string; used: string; history: string; empty: string; clear: string; error: string;
}> = {
  ru: { back: "На главную", label: "БЕСПЛАТНАЯ ПРОГРАММА", title: "Твоя карта лояльности", intro: "Зарегистрируйся один раз — и отслеживай визиты и бонусы прямо на сайте.", free: "Участие бесплатно", name: "Имя", phone: "Телефон", email: "Email", join: "Получить карту", joining: "Создаём карту…", privacy: "Данные используются только для связи с твоей CRM-картой и записи к Isaac.", dashboard: "Твоя карта", visits: "Всего визитов", remaining: "До следующего бонуса", earned: "Получено бонусов", available: "Доступно сейчас", used: "Использовано", history: "История визитов", empty: "Пока нет завершённых визитов. Первый визит добавится автоматически.", clear: "Выйти из карты", error: "Не удалось открыть карту. Зарегистрируйся ещё раз.", },
  en: { back: "Back home", label: "FREE PROGRAM", title: "Your loyalty card", intro: "Join once and track your visits and rewards directly on the website.", free: "Free to join", name: "Name", phone: "Phone", email: "Email", join: "Get my card", joining: "Creating card…", privacy: "Your details are used only to connect your CRM profile and manage appointments with Isaac.", dashboard: "Your card", visits: "Total visits", remaining: "Until next reward", earned: "Rewards earned", available: "Available now", used: "Used", history: "Visit history", empty: "No completed visits yet. Your first visit will appear automatically.", clear: "Sign out of card", error: "We could not open this card. Please register again.", },
  hy: { back: "Գլխավոր էջ", label: "ԱՆՎՃԱՐ ԾՐԱԳԻՐ", title: "Ձեր հավատարմության քարտը", intro: "Գրանցվեք մեկ անգամ և հետևեք ձեր այցերին ու բոնուսներին կայքում։", free: "Մասնակցությունն անվճար է", name: "Անուն", phone: "Հեռախոս", email: "Email", join: "Ստանալ քարտը", joining: "Քարտը ստեղծվում է…", privacy: "Տվյալներն օգտագործվում են միայն ձեր CRM պրոֆիլի և այցերի կառավարման համար։", dashboard: "Ձեր քարտը", visits: "Ընդհանուր այցեր", remaining: "Մինչև հաջորդ բոնուս", earned: "Ստացված բոնուսներ", available: "Հասանելի է", used: "Օգտագործված", history: "Այցերի պատմություն", empty: "Ավարտված այցեր դեռ չկան։ Առաջին այցը կավելանա ավտոմատ։", clear: "Դուրս գալ քարտից", error: "Չհաջողվեց բացել քարտը։ Գրանցվեք կրկին։", },
};

export default function Loyalty() {
  const { language } = useLanguage() as { language: Lang };
  const [, setLocation] = useLocation();
  const c = copy[language] ?? copy.ru;
  const [token, setToken] = useState(() => window.localStorage.getItem("isaac_loyalty_token") ?? "");
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const memberQuery = trpc.loyalty.me.useQuery({ token }, { enabled: token.length === 64 });
  const registerMutation = trpc.loyalty.register.useMutation({
    onSuccess: result => { window.localStorage.setItem("isaac_loyalty_token", result.accessToken); setToken(result.accessToken); },
  });
  const member = memberQuery.data;

  useEffect(() => {
    if (token && memberQuery.isError) window.localStorage.removeItem("isaac_loyalty_token");
  }, [memberQuery.isError, token]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    registerMutation.mutate(form);
  };

  return <main style={{ minHeight: "100vh", background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
    <header style={{ borderBottom: "1px solid hsl(var(--border))", padding: "1.25rem 0" }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="btn-ghost" onClick={() => setLocation("/")} style={{ padding: 0 }}>{c.back}</button>
        <span className="label-caps">Hairstyle Laboratory</span>
      </div>
    </header>
    <div className="container" style={{ paddingTop: "clamp(3rem, 9vw, 7rem)", paddingBottom: "5rem" }}>
      {!member ? <div style={{ maxWidth: "38rem", margin: "0 auto" }}>
        <p className="label-caps" style={{ color: "var(--gold-mid)", marginBottom: "1rem" }}>{c.label}</p>
        <h1 className="section-heading" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", margin: 0 }}>{c.title}</h1>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "1rem", lineHeight: 1.7, maxWidth: "32rem" }}>{c.intro}</p>
        <div style={{ border: "1px solid var(--gold-mid)", padding: "1.5rem", marginTop: "2rem", background: "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--card)))" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "1.3rem" }}><span className="label-caps" style={{ color: "var(--gold-mid)" }}>{c.free}</span><strong style={{ fontFamily: "'Playfair Display', serif" }}>5 visits / 10 000 ֏</strong></div>
          <form onSubmit={submit} style={{ display: "grid", gap: "1rem" }}>
            {(["name", "phone", "email"] as const).map(field => <label key={field} style={{ display: "grid", gap: "0.4rem" }}><span className="label-caps">{c[field]}</span><input required type={field === "email" ? "email" : field === "phone" ? "tel" : "text"} value={form[field]} onChange={event => setForm({ ...form, [field]: event.target.value })} style={{ width: "100%", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))", color: "hsl(var(--foreground))", padding: "0.8rem 0.75rem", fontFamily: "inherit" }} /></label>)}
            {registerMutation.error && <p style={{ color: "hsl(var(--destructive))", margin: 0, fontSize: "0.8rem" }}>{registerMutation.error.message}</p>}
            <button className="btn-primary" type="submit" disabled={registerMutation.isPending}>{registerMutation.isPending ? c.joining : c.join}</button>
          </form>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "0.7rem", lineHeight: 1.5, margin: "1rem 0 0" }}>{c.privacy}</p>
        </div>
      </div> : <div style={{ maxWidth: "52rem", margin: "0 auto" }}>
        <p className="label-caps" style={{ color: "var(--gold-mid)" }}>{c.dashboard}</p>
        <h1 className="section-heading" style={{ margin: "0.5rem 0 2rem", fontSize: "clamp(2.2rem, 6vw, 4rem)" }}>{member.name}</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(9rem, 1fr))", gap: "0.75rem" }}>
          {[[c.visits, member.visitCount], [c.remaining, member.visitsRemaining], [c.earned, member.rewardsEarned], [c.available, member.rewardsAvailable], [c.used, member.rewardsUsed]].map(([label, value]) => <div key={String(label)} style={{ borderTop: "1px solid var(--gold-mid)", paddingTop: "0.7rem" }}><span className="label-caps">{label}</span><strong style={{ display: "block", fontFamily: "'Playfair Display', serif", fontSize: "2rem", marginTop: "0.3rem" }}>{value}</strong></div>)}
        </div>
        <div style={{ marginTop: "2rem", padding: "1.4rem", border: "1px solid var(--gold-mid)", background: "linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--card)))" }}>
          <p className="label-caps" style={{ color: "var(--gold-mid)" }}>10 000 ֏</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", margin: "0.4rem 0" }}>{member.rewardsAvailable > 0 ? (language === "ru" ? "Бонус доступен" : language === "en" ? "Your reward is ready" : "Ձեր բոնուսը պատրաստ է") : (language === "ru" ? `Осталось визитов: ${member.visitsRemaining}` : language === "en" ? `${member.visitsRemaining} visits to go` : `Մնացել է ${member.visitsRemaining} այց`)}</h2>
          <div style={{ display: "flex", gap: "0.45rem", marginTop: "1rem" }}>{Array.from({ length: 5 }).map((_, index) => <span key={index} style={{ width: "1.4rem", height: "1.4rem", borderRadius: "50%", border: "1px solid var(--gold-mid)", background: index < (member.rewardsAvailable > 0 ? 5 : member.stamps) ? "var(--gold-mid)" : "transparent" }} />)}</div>
        </div>
        <AddToHomeScreen />
        <h2 style={{ fontFamily: "'Playfair Display', serif", marginTop: "2.5rem" }}>{c.history}</h2>
        {member.visits.length === 0 ? <p style={{ color: "hsl(var(--muted-foreground))" }}>{c.empty}</p> : <div style={{ display: "grid", gap: "0.6rem" }}>{member.visits.map((visit, index) => <div key={`${visit.date}-${index}`} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid hsl(var(--border))", padding: "0.7rem 0", gap: "1rem" }}><span>{visit.serviceName}</span><span style={{ color: "hsl(var(--muted-foreground))" }}>{visit.date}</span></div>)}</div>}
        {memberQuery.isError && <p style={{ color: "hsl(var(--destructive))" }}>{c.error}</p>}
        <button className="btn-ghost" onClick={() => { window.localStorage.removeItem("isaac_loyalty_token"); setToken(""); }} style={{ marginTop: "2rem", paddingLeft: 0 }}>{c.clear}</button>
      </div>}
    </div>
  </main>;
}
