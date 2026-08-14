import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

type Lang = 'ru' | 'en';

const copy: Record<Lang, {
  nav: { booking: string; status: string; login: string; logout: string; admin: string };
  hero: { eyebrow: string; line1: string; line2: string; line3: string; sub: string; cta: string };
  about: { label: string; text: string };
  services: { label: string; haircut: string; haircutDesc: string; beard: string; beardDesc: string; bioPerm: string; bioPermDesc: string; duration: string; book: string; deposit: string };
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
      bioPerm: 'Биохимическая завивка',
      bioPermDesc: 'Химическая завивка с уходом',
      duration: 'мин',
      book: 'Записаться',
      deposit: 'Предоплата',
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
      bioPerm: 'Bio Perm',
      bioPermDesc: 'Chemical wave treatment',
      duration: 'min',
      book: 'Book',
      deposit: 'Deposit',
    },
    footer: { copy: '© Hairstyle Laboratory' },
  },

};

const langs: Lang[] = ['ru', 'en'];

export default function Home() {
  const { language, setLanguage } = useLanguage() as { language: Lang; setLanguage: (l: Lang) => void };
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredService, setHoveredService] = useState<number | null>(null);
  const { data: activeAnnouncements } = trpc.announcements.active.useQuery();
  const { data: publicServices, isLoading: servicesLoading, isError: servicesError } = trpc.services.list.useQuery();

  const c = copy[language] ?? copy.ru;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatPrice = (svc: NonNullable<typeof publicServices>[number]) => {
    if (svc.priceMinAmd !== null && svc.priceMaxAmd !== null) {
      return `${svc.priceMinAmd.toLocaleString()} – ${svc.priceMaxAmd!.toLocaleString()} ֏`;
    }
    if (svc.priceAmd !== null) return `${svc.priceAmd.toLocaleString()} ֏`;
    return language === 'ru' ? (svc.noteRu || 'По запросу') : (svc.noteEn || 'On request');
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
          <nav style={{ alignItems: 'center', gap: '2rem' }} className="hidden md:flex">
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

          {/* Mobile actions — language is always visible, menu contains only navigation. */}
          <div className="flex md:hidden" style={{ alignItems: 'center', gap: '0.5rem' }}>
            <div
              role="group"
              aria-label="Language"
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid hsl(var(--border))',
                padding: '0.125rem',
              }}
            >
              {langs.map(l => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  aria-pressed={language === l}
                  style={{
                    minWidth: '2rem',
                    minHeight: '2rem',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.625rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '0.375rem',
                    background: language === l ? 'hsl(var(--secondary))' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: language === l ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                    transition: 'all 160ms cubic-bezier(0.23, 1, 0.32, 1)',
                  }}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'hsl(var(--foreground))' }}
              aria-label="Menu"
              aria-expanded={menuOpen}
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
        <div className="hero-ambient" aria-hidden="true">
          <span className="hero-ambient-orb hero-ambient-orb-a" />
          <span className="hero-ambient-orb hero-ambient-orb-b" />
          <span className="hero-ambient-grain" />
        </div>
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
          <div style={{ gap: '3rem', alignItems: 'center' }} className="hero-editorial-layout">
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
          {(activeAnnouncements ?? []).length > 0 && (
            <aside className="fade-up fade-up-delay-3" style={{ display: 'grid', gap: '0.75rem' }} aria-label={language === 'ru' ? 'Новости' : 'Notices'}>
              {(activeAnnouncements ?? []).slice(0, 2).map((announcement, index) => (
                <article key={announcement.id} className="notice-card" style={{ '--notice-delay': `${index * 90}ms` } as React.CSSProperties}>
                  <div style={{ position: 'absolute', top: 0, left: '1.5rem', right: '1.5rem', height: '2px', background: 'linear-gradient(90deg, transparent, var(--gold-mid), transparent)' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <p className="label-caps" style={{ margin: 0, color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Новости' : 'Notice'}</p>
                    {announcement.imageUrl && <img src={announcement.imageUrl} alt={language === 'ru' ? `Иллюстрация: ${announcement.titleRu}` : `Illustration: ${announcement.titleEn}`} style={{ width: '3rem', height: '3rem', flex: '0 0 auto', objectFit: 'cover', border: '1px solid hsl(var(--border))' }} />}
                  </div>
                  <h3 style={{ margin: '0 0 0.55rem', fontStyle: 'italic', fontSize: '1.4rem', lineHeight: 1.08 }}>
                    {language === 'ru' ? announcement.titleRu : announcement.titleEn}
                  </h3>
                  <p style={{ margin: '0 0 1rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', lineHeight: 1.55 }}>
                    {language === 'ru' ? announcement.bodyRu : announcement.bodyEn}
                  </p>
                  <p style={{ fontFamily: "'Inter', sans-serif", margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{announcement.startDate} — {announcement.endDate}</p>
                </article>
              ))}
            </aside>
          )}
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

          {servicesLoading && <p style={{ color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? 'Загружаю услуги...' : 'Loading services...'}</p>}
          {servicesError && <p style={{ color: 'hsl(var(--destructive))' }}>{language === 'ru' ? 'Не удалось загрузить услуги. Попробуйте обновить страницу.' : 'Could not load services. Please refresh the page.'}</p>}
          {!servicesLoading && !servicesError && (publicServices ?? []).length === 0 && <p style={{ color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? 'Сейчас нет доступных услуг.' : 'No services are currently available.'}</p>}
          {(publicServices ?? []).map((svc) => (
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
                  {language === 'ru' ? svc.nameRu : svc.nameEn}
                </h3>
                <p style={{ fontSize: '0.8125rem', margin: 0, letterSpacing: '0.03em' }}>
                  {(language === 'ru' ? svc.descriptionRu : svc.descriptionEn) || (language === 'ru' ? 'Персональный сервис' : 'Personal service')} &nbsp;·&nbsp; {svc.durationMinutes} {c.services.duration}
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
                  {formatPrice(svc)}
                </p>
                {svc.depositAmd !== null && svc.depositAmd > 0 && (
                  <span className="label-caps" style={{ fontSize: '0.5625rem', color: 'var(--gold-mid)' }}>
                    {c.services.deposit}: {svc.depositAmd.toLocaleString()} ֏
                  </span>
                )}
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
