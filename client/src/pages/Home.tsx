import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { useLocation } from 'wouter';

type Lang = 'ru' | 'en' | 'am';

const copy: Record<Lang, {
  nav: { booking: string; status: string; login: string; logout: string; admin: string };
  hero: { eyebrow: string; line1: string; line2: string; line3: string; sub: string; cta: string };
  about: { label: string; text: string };
  services: { label: string; haircut: string; haircutDesc: string; beard: string; beardDesc: string; duration: string; book: string };
  footer: { copy: string };
}> = {
  ru: {
    nav: { booking: 'Записаться', status: 'Статус', login: 'Войти', logout: 'Выйти', admin: 'Панель' },
    hero: {
      eyebrow: 'Isaac Hakobian',
      line1: 'Стрижка.',
      line2: 'Стиль.',
      line3: 'Детали.',
      sub: 'Персональная запись',
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
      eyebrow: 'Isaac Hakobian',
      line1: 'Cut.',
      line2: 'Style.',
      line3: 'Detail.',
      sub: 'Personal booking',
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
    nav: { booking: 'Գրանցվել', status: 'Կարգ.', login: 'Մուտք', logout: 'Ելք', admin: 'Կառ.' },
    hero: {
      eyebrow: 'Isaac Hakobian',
      line1: 'Կտրվածք.',
      line2: 'Ոճ.',
      line3: 'Մանրամ.',
      sub: 'Անձնական գրանցում',
      cta: 'Գրանցվել',
    },
    about: {
      label: 'Վարպետի մասին',
      text: 'Isaac Hakobian — տղամարդու մազերի ոճաբան: Կտրվածք, ձև, մանրամասն:',
    },
    services: {
      label: 'Ծառայություններ',
      haircut: 'Կտրվածք',
      haircutDesc: 'Ճշգրիտ կտրվածք',
      beard: 'Մորուքի ձևավ.',
      beardDesc: 'Ձևավորում և խնամք',
      duration: 'ր',
      book: 'Գրանցվել',
    },
    footer: { copy: '© Hairstyle Laboratory' },
  },
};

const services = [
  { id: 1, nameKey: 'haircut' as const, descKey: 'haircutDesc' as const, duration: 45, priceRub: 3000, priceAmd: 15000 },
  { id: 2, nameKey: 'beard' as const, descKey: 'beardDesc' as const, duration: 30, priceRub: 500, priceAmd: 2500 },
];

const langs: Lang[] = ['ru', 'en', 'am'];

export default function Home() {
  const { language, setLanguage } = useLanguage() as { language: Lang; setLanguage: (l: Lang) => void };
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredService, setHoveredService] = useState<number | null>(null);

  const c = copy[language] ?? copy.ru;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatPrice = (rub: number, amd: number) => {
    if (language === 'am') return `${amd.toLocaleString()} ֏`;
    return `${rub.toLocaleString()} ₽`;
  };

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: scrolled ? 'rgba(17, 19, 24, 0.95)' : 'transparent',
    backdropFilter: scrolled ? 'blur(12px)' : 'none',
    borderBottom: scrolled ? '1px solid hsl(var(--border))' : '1px solid transparent',
    transition: 'all 400ms ease',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))' }}>

      {/* ── Navigation ── */}
      <header style={navStyle}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4.5rem' }}>
          <button
            onClick={() => setLocation('/')}
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'hsl(var(--foreground))',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'opacity 200ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Hairstyle Laboratory
          </button>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }} className="hidden md:flex">
            {[
              { label: c.nav.booking, path: '/booking' },
              { label: c.nav.status, path: '/status' },
            ].map(item => (
              <button
                key={item.path}
                className="btn-ghost"
                onClick={() => setLocation(item.path)}
              >
                {item.label}
              </button>
            ))}
            {isAuthenticated && user?.role === 'admin' && (
              <button className="btn-ghost" onClick={() => setLocation('/admin')}>{c.nav.admin}</button>
            )}
            {isAuthenticated ? (
              <button className="btn-ghost" onClick={logout}>{c.nav.logout}</button>
            ) : (
              <button className="btn-ghost" onClick={() => window.location.href = getLoginUrl()}>{c.nav.login}</button>
            )}

            {/* Language switcher */}
            <div style={{ display: 'flex', gap: '0.125rem', borderLeft: '1px solid hsl(var(--border))', paddingLeft: '1.5rem' }}>
              {langs.map(l => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    padding: '0.375rem 0.5rem',
                    background: language === l ? 'hsl(var(--secondary))' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: language === l ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    transition: 'all 200ms ease',
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'hsl(var(--foreground))' }}
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              {menuOpen ? (
                <>
                  <line x1="4" y1="4" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="18" y1="4" x2="4" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="19" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="3" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="3" y1="16" x2="19" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ backgroundColor: 'hsl(var(--card))', borderTop: '1px solid hsl(var(--border))', padding: '1.5rem 1.5rem 2rem' }} className="md:hidden">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { label: c.nav.booking, path: '/booking' },
                { label: c.nav.status, path: '/status' },
              ].map(item => (
                <button key={item.path} className="btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem 0' }} onClick={() => { setLocation(item.path); setMenuOpen(false); }}>
                  {item.label}
                </button>
              ))}
              {isAuthenticated && user?.role === 'admin' && (
                <button className="btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem 0' }} onClick={() => { setLocation('/admin'); setMenuOpen(false); }}>{c.nav.admin}</button>
              )}
              {isAuthenticated ? (
                <button className="btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem 0' }} onClick={logout}>{c.nav.logout}</button>
              ) : (
                <button className="btn-ghost" style={{ justifyContent: 'flex-start', padding: '0.5rem 0' }} onClick={() => window.location.href = getLoginUrl()}>{c.nav.login}</button>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
                {langs.map(l => (
                  <button key={l} onClick={() => { setLanguage(l); setMenuOpen(false); }}
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.375rem 0.625rem', background: language === l ? 'hsl(var(--secondary))' : 'none', border: 'none', cursor: 'pointer', color: language === l ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="noise-overlay" style={{
        paddingTop: '10rem',
        paddingBottom: '8rem',
        minHeight: '95vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background metallic gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Vertical accent line */}
        <div style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: '1px',
          height: '6rem',
          background: 'linear-gradient(to bottom, transparent, rgba(201,168,76,0.4), transparent)',
          pointerEvents: 'none',
        }} />

        <div className="container">
          <div style={{ maxWidth: '52rem' }}>
            <p className="label-caps fade-in" style={{ marginBottom: '2.5rem', color: 'var(--gold-mid)' }}>
              {c.hero.eyebrow}
            </p>

            <h1 className="fade-up" style={{ marginBottom: 0, lineHeight: 1.0 }}>
              <span className="text-shimmer" style={{ display: 'block' }}>{c.hero.line1}</span>
            </h1>
            <h1 className="fade-up fade-up-delay-1" style={{ marginBottom: 0, lineHeight: 1.0 }}>
              <span style={{ display: 'block', color: 'hsl(var(--foreground))', opacity: 0.85 }}>{c.hero.line2}</span>
            </h1>
            <h1 className="fade-up fade-up-delay-2" style={{ marginBottom: '2.5rem', lineHeight: 1.0 }}>
              <span style={{ display: 'block', color: 'hsl(var(--muted-foreground))' }}>{c.hero.line3}</span>
            </h1>

            <p className="fade-up fade-up-delay-3" style={{
              fontSize: '0.9375rem',
              color: 'hsl(var(--muted-foreground))',
              marginBottom: '3rem',
              letterSpacing: '0.05em',
            }}>
              {c.hero.sub}
            </p>

            <div className="fade-up fade-up-delay-4" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => setLocation('/booking')}>
                {c.hero.cta}
              </button>
              <button className="btn-outline" onClick={() => {
                document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
              }}>
                {c.services.label}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section style={{
        paddingTop: '6rem',
        paddingBottom: '6rem',
        borderTop: '1px solid hsl(var(--border))',
        position: 'relative',
      }}>
        {/* Gold top accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '4rem',
          width: '4rem',
          height: '2px',
          background: 'linear-gradient(90deg, var(--gold-mid), transparent)',
        }} />
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }} className="md:grid-cols-[180px_1fr]">
            <div>
              <p className="label-caps">{c.about.label}</p>
            </div>
            <div>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)',
                fontWeight: 400,
                lineHeight: 1.6,
                color: 'hsl(var(--foreground))',
                fontStyle: 'italic',
                opacity: 0.9,
              }}>
                {c.about.text}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services ── */}
      <section id="services" style={{
        paddingTop: '6rem',
        paddingBottom: '6rem',
        borderTop: '1px solid hsl(var(--border))',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: '4rem',
          width: '4rem',
          height: '2px',
          background: 'linear-gradient(90deg, var(--gold-mid), transparent)',
        }} />
        <div className="container">
          <p className="label-caps" style={{ marginBottom: '3rem' }}>{c.services.label}</p>

          {services.map((svc) => (
            <div
              key={svc.id}
              className="service-block"
              onClick={() => setLocation('/booking')}
              onMouseEnter={() => setHoveredService(svc.id)}
              onMouseLeave={() => setHoveredService(null)}
            >
              <div>
                <h3
                  className="service-name"
                  style={{
                    marginBottom: '0.375rem',
                    fontStyle: 'italic',
                    transition: 'all 300ms ease',
                    fontSize: 'clamp(1.25rem, 3vw, 1.875rem)',
                  }}
                >
                  {c.services[svc.nameKey]}
                </h3>
                <p style={{ fontSize: '0.8125rem', margin: 0, letterSpacing: '0.03em' }}>
                  {c.services[svc.descKey]} &nbsp;·&nbsp; {svc.duration} {c.services.duration}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                  fontWeight: 700,
                  margin: 0,
                  color: hoveredService === svc.id ? 'var(--gold-mid)' : 'hsl(var(--foreground))',
                  transition: 'color 300ms ease',
                }}>
                  {formatPrice(svc.priceRub, svc.priceAmd)}
                </p>
                <span className="label-caps" style={{
                  fontSize: '0.5625rem',
                  color: hoveredService === svc.id ? 'var(--gold-mid)' : 'hsl(var(--muted-foreground))',
                  transition: 'color 300ms ease',
                }}>
                  {c.services.book} →
                </span>
              </div>
            </div>
          ))}

          <div style={{ marginTop: '3.5rem', textAlign: 'center' }}>
            <button className="btn-primary" onClick={() => setLocation('/booking')}>
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
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--gold-mid), transparent)',
          opacity: 0.3,
        }} />
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p className="label-caps" style={{ margin: 0, fontSize: '0.5625rem' }}>{c.footer.copy}</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button className="btn-ghost" style={{ fontSize: '0.5625rem', padding: '0.25rem 0' }} onClick={() => setLocation('/booking')}>
              {c.nav.booking}
            </button>
            <button className="btn-ghost" style={{ fontSize: '0.5625rem', padding: '0.25rem 0' }} onClick={() => setLocation('/status')}>
              {c.nav.status}
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
