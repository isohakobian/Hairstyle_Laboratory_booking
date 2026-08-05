import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { useLocation } from 'wouter';

type Lang = 'ru' | 'en' | 'am';

const copy: Record<Lang, {
  nav: { booking: string; status: string; login: string; logout: string; admin: string };
  hero: { eyebrow: string; title: string; sub: string; cta: string };
  about: { label: string; text: string };
  services: { label: string; haircut: string; haircutDesc: string; beard: string; beardDesc: string; duration: string; book: string };
  footer: { copy: string };
}> = {
  ru: {
    nav: { booking: 'Записаться', status: 'Статус', login: 'Войти', logout: 'Выйти', admin: 'Панель' },
    hero: {
      eyebrow: 'Hairstyle Laboratory',
      title: 'Стрижка.\nСтиль.\nДетали.',
      sub: 'Персональная запись к Isaac Hakobian',
      cta: 'Записаться',
    },
    about: {
      label: 'О мастере',
      text: 'Isaac Hakobian — стилист по волосам. Работаю с мужским образом: стрижка, форма, детали. Каждый клиент — отдельная задача.',
    },
    services: {
      label: 'Услуги',
      haircut: 'Стрижка',
      haircutDesc: 'Точная стрижка и стайлинг',
      beard: 'Моделирование бороды',
      beardDesc: 'Формовка и уход за бородой',
      duration: 'мин',
      book: 'Записаться',
    },
    footer: { copy: '© Hairstyle Laboratory' },
  },
  en: {
    nav: { booking: 'Book', status: 'Status', login: 'Login', logout: 'Logout', admin: 'Admin' },
    hero: {
      eyebrow: 'Hairstyle Laboratory',
      title: 'Cut.\nStyle.\nDetail.',
      sub: 'Personal booking with Isaac Hakobian',
      cta: 'Book appointment',
    },
    about: {
      label: 'About',
      text: 'Isaac Hakobian — men\'s hairstylist. I work with the whole look: cut, shape, detail. Every client is a separate task.',
    },
    services: {
      label: 'Services',
      haircut: 'Haircut',
      haircutDesc: 'Precision cut and styling',
      beard: 'Beard modeling',
      beardDesc: 'Beard shaping and grooming',
      duration: 'min',
      book: 'Book',
    },
    footer: { copy: '© Hairstyle Laboratory' },
  },
  am: {
    nav: { booking: 'Գրանցվել', status: 'Կարգավիճակ', login: 'Մուտք', logout: 'Ելք', admin: 'Կառ.' },
    hero: {
      eyebrow: 'Hairstyle Laboratory',
      title: 'Կտրվածք.\nՈճ.\nՄանրամասն.',
      sub: 'Անձնական գրանցում Isaac Hakobian-ի մոտ',
      cta: 'Գրանցվել',
    },
    about: {
      label: 'Վարպետի մասին',
      text: 'Isaac Hakobian — տղամարդու մազերի ոճաբան: Աշխատում եմ ամբողջ կերպարի հետ՝ կտրվածք, ձև, մանրամասն:',
    },
    services: {
      label: 'Ծառայություններ',
      haircut: 'Կտրվածք',
      haircutDesc: 'Ճշգրիտ կտրվածք և ոճ',
      beard: 'Մորուքի ձևավորում',
      beardDesc: 'Մորուքի ձևավորում և խնամք',
      duration: 'ր',
      book: 'Գրանցվել',
    },
    footer: { copy: '© Hairstyle Laboratory' },
  },
};

const services = [
  { id: 1, duration: 45, priceRub: 3000, priceAmd: 15000 },
  { id: 2, duration: 30, priceRub: 500, priceAmd: 2500 },
];

export default function Home() {
  const { language, setLanguage } = useLanguage() as { language: Lang; setLanguage: (l: Lang) => void };
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const c = copy[language] ?? copy.ru;

  const formatPrice = (rub: number, amd: number) => {
    if (language === 'am') return `${amd.toLocaleString()} ֏`;
    return `${rub.toLocaleString()} ₽`;
  };

  const langs: Lang[] = ['ru', 'en', 'am'];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))' }}>

      {/* ── Navigation ── */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'hsl(var(--background))',
        borderBottom: '1px solid hsl(var(--border))',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4rem' }}>

          {/* Brand */}
          <button
            onClick={() => setLocation('/')}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6875rem',
              fontWeight: 500,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'hsl(var(--foreground))',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Hairstyle Laboratory
          </button>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="hidden md:flex">
            <button className="btn-ghost" onClick={() => setLocation('/booking')}>
              {c.nav.booking}
            </button>
            <button className="btn-ghost" onClick={() => setLocation('/status')}>
              {c.nav.status}
            </button>
            {isAuthenticated && user?.role === 'admin' && (
              <button className="btn-ghost" onClick={() => setLocation('/admin')}>
                {c.nav.admin}
              </button>
            )}
            {isAuthenticated ? (
              <button className="btn-ghost" onClick={logout}>{c.nav.logout}</button>
            ) : (
              <button className="btn-ghost" onClick={() => window.location.href = getLoginUrl()}>{c.nav.login}</button>
            )}

            {/* Language switcher */}
            <div style={{ display: 'flex', gap: '0.25rem', borderLeft: '1px solid hsl(var(--border))', paddingLeft: '1.5rem' }}>
              {langs.map(l => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.6875rem',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '0.25rem 0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: language === l ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    borderBottom: language === l ? '1px solid hsl(var(--foreground))' : '1px solid transparent',
                    transition: 'color 200ms ease',
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden btn-ghost"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ padding: '0.5rem' }}
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {menuOpen ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="17" y2="6" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="3" y1="14" x2="17" y2="14" stroke="currentColor" strokeWidth="1.5" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{
            backgroundColor: 'hsl(var(--background))',
            borderTop: '1px solid hsl(var(--border))',
            padding: '1.5rem',
          }} className="md:hidden">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <button className="btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { setLocation('/booking'); setMenuOpen(false); }}>
                {c.nav.booking}
              </button>
              <button className="btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { setLocation('/status'); setMenuOpen(false); }}>
                {c.nav.status}
              </button>
              {isAuthenticated && user?.role === 'admin' && (
                <button className="btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => { setLocation('/admin'); setMenuOpen(false); }}>
                  {c.nav.admin}
                </button>
              )}
              {isAuthenticated ? (
                <button className="btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={logout}>{c.nav.logout}</button>
              ) : (
                <button className="btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => window.location.href = getLoginUrl()}>{c.nav.login}</button>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid hsl(var(--border))' }}>
                {langs.map(l => (
                  <button
                    key={l}
                    onClick={() => { setLanguage(l); setMenuOpen(false); }}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '0.25rem 0.5rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: language === l ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                      borderBottom: language === l ? '1px solid hsl(var(--foreground))' : '1px solid transparent',
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section style={{
        paddingTop: '10rem',
        paddingBottom: '8rem',
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
      }}>
        <div className="container">
          <div className="fade-up" style={{ maxWidth: '44rem' }}>
            <p className="label-caps fade-up" style={{ marginBottom: '2rem' }}>
              {c.hero.eyebrow}
            </p>
            <h1 className="fade-up fade-up-delay-1" style={{
              whiteSpace: 'pre-line',
              marginBottom: '2rem',
              fontStyle: 'italic',
            }}>
              {c.hero.title}
            </h1>
            <p className="fade-up fade-up-delay-2" style={{
              fontSize: '1rem',
              color: 'hsl(var(--muted-foreground))',
              marginBottom: '3rem',
              maxWidth: '28rem',
            }}>
              {c.hero.sub}
            </p>
            <button
              className="btn-primary fade-up fade-up-delay-3"
              onClick={() => setLocation('/booking')}
            >
              {c.hero.cta}
            </button>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section style={{
        paddingTop: '6rem',
        paddingBottom: '6rem',
        borderTop: '1px solid hsl(var(--border))',
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '3rem',
          }} className="md:grid-cols-[1fr_2fr]">
            <div>
              <p className="label-caps">{c.about.label}</p>
            </div>
            <div>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
                fontWeight: 300,
                lineHeight: 1.5,
                color: 'hsl(var(--foreground))',
                fontStyle: 'italic',
              }}>
                {c.about.text}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section style={{
        paddingTop: '6rem',
        paddingBottom: '6rem',
        borderTop: '1px solid hsl(var(--border))',
      }}>
        <div className="container">
          <p className="label-caps" style={{ marginBottom: '3rem' }}>{c.services.label}</p>

          {/* Haircut */}
          <div className="service-block" onClick={() => setLocation('/booking')}>
            <div>
              <h3 style={{ marginBottom: '0.5rem', fontStyle: 'normal' }}>
                {c.services.haircut}
              </h3>
              <p style={{ fontSize: '0.875rem', margin: 0 }}>
                {c.services.haircutDesc} · {services[0].duration} {c.services.duration}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '1.5rem',
                fontWeight: 400,
                color: 'hsl(var(--foreground))',
                margin: 0,
              }}>
                {formatPrice(services[0].priceRub, services[0].priceAmd)}
              </p>
              <span className="label-caps" style={{ fontSize: '0.625rem' }}>
                {c.services.book} →
              </span>
            </div>
          </div>

          {/* Beard */}
          <div className="service-block" onClick={() => setLocation('/booking')}>
            <div>
              <h3 style={{ marginBottom: '0.5rem', fontStyle: 'normal' }}>
                {c.services.beard}
              </h3>
              <p style={{ fontSize: '0.875rem', margin: 0 }}>
                {c.services.beardDesc} · {services[1].duration} {c.services.duration}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '1.5rem',
                fontWeight: 400,
                color: 'hsl(var(--foreground))',
                margin: 0,
              }}>
                {formatPrice(services[1].priceRub, services[1].priceAmd)}
              </p>
              <span className="label-caps" style={{ fontSize: '0.625rem' }}>
                {c.services.book} →
              </span>
            </div>
          </div>

          <div style={{ marginTop: '3rem', textAlign: 'center' }}>
            <button className="btn-outline" onClick={() => setLocation('/booking')}>
              {c.hero.cta}
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid hsl(var(--border))',
        paddingTop: '2rem',
        paddingBottom: '2rem',
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p className="label-caps" style={{ margin: 0, fontSize: '0.625rem' }}>
            {c.footer.copy}
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button className="btn-ghost" style={{ fontSize: '0.625rem', padding: '0.25rem 0' }} onClick={() => setLocation('/booking')}>
              {c.nav.booking}
            </button>
            <button className="btn-ghost" style={{ fontSize: '0.625rem', padding: '0.25rem 0' }} onClick={() => setLocation('/status')}>
              {c.nav.status}
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
