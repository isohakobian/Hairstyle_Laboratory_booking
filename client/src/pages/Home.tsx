import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { getHomeTheme } from '@/homeTheme';
import GtaLaunchHome from './GtaLaunchHome';

type Lang = 'hy' | 'ru' | 'en';

const copy: Record<Lang, {
  nav: { booking: string; status: string; login: string; logout: string; admin: string };
  hero: { eyebrow: string; line1: string; line2: string; line3: string; sub: string; cta: string; servicesCta: string };
  about: { label: string; title: string; intro: string; text: string };
  services: { label: string; intro: string; haircut: string; haircutDesc: string; beard: string; beardDesc: string; bioPerm: string; bioPermDesc: string; duration: string; book: string; deposit: string };
  loyalty: { label: string; title: string; text: string; reward: string; cta: string };
  footer: { copy: string };
}> = {
  ru: {
    nav: { booking: 'Записаться', status: 'Статус', login: 'Войти', logout: 'Выйти', admin: 'Панель' },
    hero: {
      eyebrow: 'Isaac Hakobian',
      line1: 'Стрижка.',
      line2: 'Стиль.',
      line3: 'Детали.',
      sub: 'Персональная запись на стрижку, форму бороды и биохимическую завивку.',
      cta: 'Выбрать время',
      servicesCta: 'Посмотреть услуги',
    },
    about: {
      label: 'Личный подход',
      title: 'О мастере',
      intro: 'Точная форма. Естественный результат. Внимание к деталям.',
      text: 'Я работаю с мужским образом через стрижку, форму и детали. Сначала слушаю, затем собираю точный и естественный результат — под твой ритм и характер.',
    },
    services: {
      label: 'Услуги',
      intro: 'Выбери услугу — затем удобные дату и время.',
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
    loyalty: { label: 'Карта лояльности', title: '5 визитов — бонус 10 000 ֏', text: 'После пяти завершённых визитов Isaac отмечает бонус в твоей CRM-карточке.', reward: 'Бонус можно применить к следующей стрижке или моделированию бороды.', cta: 'Записаться на следующий визит' },
    footer: { copy: '© Hairstyle Laboratory' },
  },
  en: {
    nav: { booking: 'Book', status: 'Status', login: 'Login', logout: 'Logout', admin: 'Admin' },
    hero: {
      eyebrow: 'Isaac Hakobian',
      line1: 'Cut.',
      line2: 'Style.',
      line3: 'Detail.',
      sub: 'Personal appointments for haircuts, beard shaping, and bio perms.',
      cta: 'Choose a time',
      servicesCta: 'View services',
    },
    about: {
      label: 'Personal approach',
      title: 'About Isaac',
      intro: 'Precise shape. Natural finish. Attention to detail.',
      text: 'I work with the full masculine look through cut, shape, and detail. I listen first, then build a precise and natural result around your rhythm and character.',
    },
    services: {
      label: 'Services',
      intro: 'Choose a service, then select the time that suits you.',
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
    loyalty: { label: 'Loyalty card', title: '5 visits — 10,000 ֏ reward', text: 'After five completed visits, Isaac adds a reward to your private CRM profile.', reward: 'Use it on your next haircut or beard modeling appointment.', cta: 'Book your next visit' },
    footer: { copy: '© Hairstyle Laboratory' },
  },
  hy: {
    nav: { booking: 'Գրանցվել', status: 'Կարգավիճակ', login: 'Մուտք', logout: 'Ելք', admin: 'Վահանակ' },
    hero: {
      eyebrow: 'Իսահակ Հակոբյան',
      line1: 'Սանրվածք։',
      line2: 'Ոճ։',
      line3: 'Մանրուքներ։',
      sub: 'Անհատական գրանցում սանրվածքի, մորուքի ձևավորման և բիոքիմիական գանգրացման համար։',
      cta: 'Ընտրել ժամ',
      servicesCta: 'Դիտել ծառայությունները',
    },
    about: {
      label: 'Անհատական մոտեցում',
      title: 'Վարպետի մասին',
      intro: 'Ճշգրիտ ձև։ Բնական արդյունք։ Ուշադրություն մանրուքներին։',
      text: 'Ես աշխատում եմ տղամարդու կերպարի վրա՝ սանրվածքի, ձևի և մանրուքների։ Սկզբում լսում եմ, ապա ստեղծում ճշգրիտ ու բնական արդյունք՝ ձեր ռիթմին և բնավորությանը համապատասխան։',
    },
    services: {
      label: 'Ծառայություններ',
      intro: 'Ընտրեք ծառայությունը, ապա հարմար օրը և ժամը։',
      haircut: 'Սանրվածք',
      haircutDesc: 'Ճշգրիտ սանրվածք և հարդարում',
      beard: 'Մորուքի ձևավորում',
      beardDesc: 'Մորուքի ձևավորում և խնամք',
      bioPerm: 'Կենսաքիմիական գանգրացում',
      bioPermDesc: 'Քիմիական գանգրացում՝ խնամքով',
      duration: 'րոպե',
      book: 'Գրանցվել',
      deposit: 'Կանխավճար',
    },
    loyalty: { label: 'Հավատարմության քարտ', title: '5 այց — 10 000 ֏ բոնուս', text: 'Հինգ ավարտված այցից հետո Իսահակը բոնուս է ավելացնում ձեր անձնական պրոֆիլում։', reward: 'Բոնուսը կարող եք օգտագործել հաջորդ սանրվածքի կամ մորուքի ձևավորման ժամանակ։', cta: 'Գրանցվել հաջորդ այցին' },
    footer: { copy: '© Hairstyle Laboratory' },
  },

};

const langs: Lang[] = ['hy', 'ru', 'en'];

function OriginalHome({ seasonal = false }: { seasonal?: boolean }) {
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
    if (language === 'ru') return svc.noteRu || 'По запросу';
    if (language === 'en') return svc.noteEn || 'On request';
    return svc.noteHy || 'Հարցման դեպքում';
  };

  const getLocalizedServiceText = (
    svc: NonNullable<typeof publicServices>[number],
    field: 'name' | 'description',
  ) => {
    if (language === 'ru') return field === 'name' ? svc.nameRu : svc.descriptionRu;
    if (language === 'en') return field === 'name' ? svc.nameEn : svc.descriptionEn;
    if (field === 'name' && svc.nameHy) return svc.nameHy;
    if (field === 'description' && svc.descriptionHy) return svc.descriptionHy;

    const source = `${svc.nameRu} ${svc.nameEn}`.toLowerCase();
    if (source.includes('бород') || source.includes('beard')) {
      return field === 'name' ? c.services.beard : c.services.beardDesc;
    }
    if (source.includes('завив') || source.includes('perm')) {
      return field === 'name' ? c.services.bioPerm : c.services.bioPermDesc;
    }
    if (source.includes('стриж') || source.includes('haircut')) {
      return field === 'name' ? c.services.haircut : c.services.haircutDesc;
    }
    return field === 'name' ? svc.nameEn || svc.nameRu : svc.descriptionEn || svc.descriptionRu;
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
    <div className={`typography-modern ${seasonal ? 'new-year-original-home' : ''}`} style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))' }}>

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
              fontSize: 'clamp(0.9375rem, 1.5vw, 1.05rem)',
              color: 'hsl(var(--muted-foreground))',
              marginBottom: '3rem',
              letterSpacing: '0.025em',
              lineHeight: 1.65,
              maxWidth: '31rem',
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
                {c.hero.servicesCta}
              </button>
            </div>
            <button type="button" className="fade-up fade-up-delay-4" onClick={() => document.getElementById('loyalty')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} style={{ display: 'grid', gap: '0.25rem', marginTop: '1.4rem', padding: '0.9rem 1rem', textAlign: 'left', border: '1px solid var(--gold-mid)', background: 'linear-gradient(90deg, rgba(201,168,76,0.1), transparent)', color: 'hsl(var(--foreground))', cursor: 'pointer', maxWidth: '23rem' }}>
              <span className="label-caps" style={{ color: 'var(--gold-mid)', fontSize: '0.5625rem' }}>{c.loyalty.label} ↓</span>
              <strong style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem' }}>{c.loyalty.title}</strong>
              <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.72rem' }}>{language === 'ru' ? 'Нажми, чтобы узнать, как это работает' : language === 'en' ? 'Tap to see how it works' : 'Սեղմեք՝ իմանալու համար, թե ինչպես է աշխատում'}</span>
            </button>
          </div>
          {(activeAnnouncements ?? []).length > 0 ? (
            <aside className="fade-up fade-up-delay-3" style={{ display: 'grid', gap: '0.75rem' }} aria-label={language === 'ru' ? 'Новости' : language === 'en' ? 'Notices' : 'Նորություններ'}>
              {(activeAnnouncements ?? []).slice(0, 2).map((announcement, index) => (
                <article key={announcement.id} className="notice-card" style={{ '--notice-delay': `${index * 90}ms` } as React.CSSProperties}>
                  <div style={{ position: 'absolute', top: 0, left: '1.5rem', right: '1.5rem', height: '2px', background: 'linear-gradient(90deg, transparent, var(--gold-mid), transparent)' }} />
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <p className="label-caps" style={{ margin: 0, color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Новости' : language === 'en' ? 'Notice' : 'Նորություն'}</p>
                    {announcement.imageUrl && <img src={announcement.imageUrl} alt={language === 'ru' ? `Иллюстрация: ${announcement.titleRu}` : language === 'en' ? `Illustration: ${announcement.titleEn}` : `Նկարազարդում․ ${announcement.titleHy || announcement.titleEn}`} style={{ width: '3rem', height: '3rem', flex: '0 0 auto', objectFit: 'cover', border: '1px solid hsl(var(--border))' }} />}
                  </div>
                  <h3 className="notice-title" style={{ margin: '0 0 0.55rem', fontStyle: 'italic', fontSize: '1.4rem', lineHeight: 1.08 }}>
                    {language === 'ru' ? announcement.titleRu : language === 'en' ? announcement.titleEn : announcement.titleHy || announcement.titleEn}
                  </h3>
                  <p style={{ margin: '0 0 1rem', color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', lineHeight: 1.55 }}>
                    {language === 'ru' ? announcement.bodyRu : language === 'en' ? announcement.bodyEn : announcement.bodyHy || announcement.bodyEn}
                  </p>
                  <p style={{ fontFamily: "'Inter', sans-serif", margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{announcement.startDate} — {announcement.endDate}</p>
                </article>
              ))}
            </aside>
          ) : (
            <aside className="fade-up fade-up-delay-3" style={{ display: 'grid', gap: '0.75rem' }} aria-label={language === 'ru' ? 'Новости' : language === 'en' ? 'Notices' : 'Նորություններ'}>
              <article className="notice-card">
                <div style={{ position: 'absolute', top: 0, left: '1.5rem', right: '1.5rem', height: '2px', background: 'linear-gradient(90deg, transparent, var(--gold-mid), transparent)' }} />
                <p className="label-caps" style={{ margin: '0 0 0.75rem', color: 'var(--gold-mid)' }}>{language === 'ru' ? 'Открытый набор' : language === 'en' ? 'Open call' : 'Բաց հրավեր'}</p>
                <h3 className="notice-title" style={{ margin: '0 0 0.55rem', fontStyle: 'italic', fontSize: '1.4rem', lineHeight: 1.08 }}>
                  {language === 'ru' ? 'Ищу моделей и UGC-креаторов' : language === 'en' ? 'Models and UGC creators wanted' : 'Մոդելների և UGC ստեղծողների որոնում'}
                </h3>
                <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.8125rem', lineHeight: 1.55 }}>
                  {language === 'ru' ? 'Для съёмок мужских образов, ухода и визуальных историй Hairstyle Laboratory.' : language === 'en' ? 'For men’s grooming, style and visual storytelling shoots with Hairstyle Laboratory.' : 'Hairstyle Laboratory-ի տղամարդկանց խնամքի, ոճի և տեսողական պատմությունների նկարահանումների համար։'}
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", margin: '1rem 0 0', color: 'hsl(var(--muted-foreground))', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{language === 'ru' ? 'Напиши Isaac для деталей' : language === 'en' ? 'Message Isaac for details' : 'Մանրամասների համար գրեք Իսահակին'}</p>
              </article>
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
                <p className="label-caps" style={{ margin: '0 0 0.7rem', color: 'var(--gold-mid)' }}>{c.about.label}</p>
                <h2 className="section-heading" style={{ margin: 0 }}>{c.about.title}</h2>
                <p className="section-intro" style={{ margin: '0.75rem 0 0' }}>{c.about.intro}</p>
              </div>
            <div>
              <p className="about-message" style={{
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
          <div className="section-heading-row">
            <h2 className="section-heading" style={{ margin: 0 }}>{c.services.label}</h2>
            <p className="section-intro" style={{ margin: 0 }}>{c.services.intro}</p>
          </div>

          {servicesLoading && <p style={{ color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? 'Загружаю услуги...' : language === 'en' ? 'Loading services...' : 'Ծառայությունները բեռնվում են…'}</p>}
          {servicesError && <p style={{ color: 'hsl(var(--destructive))' }}>{language === 'ru' ? 'Не удалось загрузить услуги. Попробуйте обновить страницу.' : language === 'en' ? 'Could not load services. Please refresh the page.' : 'Չհաջողվեց բեռնել ծառայությունները։ Թարմացրեք էջը և փորձեք կրկին։'}</p>}
          {!servicesLoading && !servicesError && (publicServices ?? []).length === 0 && <p style={{ color: 'hsl(var(--muted-foreground))' }}>{language === 'ru' ? 'Сейчас нет доступных услуг.' : language === 'en' ? 'No services are currently available.' : 'Այս պահին հասանելի ծառայություններ չկան։'}</p>}
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
                  {getLocalizedServiceText(svc, 'name')}
                </h3>
                <p style={{ fontSize: '0.8125rem', margin: 0, letterSpacing: '0.03em' }}>
                  {getLocalizedServiceText(svc, 'description') || (language === 'ru' ? 'Персональный сервис' : language === 'en' ? 'Personal service' : 'Անհատական ծառայություն')} &nbsp;·&nbsp; {svc.durationMinutes} {c.services.duration}
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

      {/* ── Loyalty card ── */}
      <section id="loyalty" style={{ paddingTop: '5rem', paddingBottom: '5rem', borderTop: '1px solid hsl(var(--border))', position: 'relative', scrollMarginTop: '5rem' }}>
        <div className="container">
          <div style={{ maxWidth: '42rem', padding: '1.75rem', border: '1px solid var(--gold-mid)', background: 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--card)))' }}>
            <p className="label-caps" style={{ margin: '0 0 0.7rem', color: 'var(--gold-mid)' }}>{c.loyalty.label}</p>
            <h2 className="section-heading" style={{ margin: 0 }}>{c.loyalty.title}</h2>
            <p style={{ margin: '1rem 0 0', maxWidth: '34rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.6 }}>{c.loyalty.text}</p>
            <div style={{ display: 'flex', gap: '0.45rem', margin: '1.25rem 0 0.75rem' }} aria-label={c.loyalty.title}>
              {Array.from({ length: 5 }).map((_, index) => <span key={index} style={{ width: '1.35rem', height: '1.35rem', border: '1px solid var(--gold-mid)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'var(--gold-mid)', fontSize: '0.6rem' }}>{index + 1}</span>)}
            </div>
            <p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem' }}>{c.loyalty.reward}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
              {([
                { number: '01', title: language === 'ru' ? 'Записываешься' : language === 'en' ? 'You book' : 'Գրանցվում եք', text: language === 'ru' ? 'Выбираешь услугу и приходишь на визит.' : language === 'en' ? 'Choose a service and come in for your appointment.' : 'Ընտրում եք ծառայությունը և գալիս այցի։' },
                { number: '02', title: language === 'ru' ? 'Собираешь визиты' : language === 'en' ? 'You collect visits' : 'Հավաքում եք այցեր', text: language === 'ru' ? 'Каждый завершённый визит добавляет один знак в CRM-карту.' : language === 'en' ? 'Every completed visit adds one stamp to your CRM card.' : 'Յուրաքանչյուր ավարտված այց ավելացնում է մեկ նշան։' },
                { number: '03', title: language === 'ru' ? 'Получаешь бонус' : language === 'en' ? 'You unlock a reward' : 'Ստանում եք բոնուս', text: language === 'ru' ? 'После пятого визита доступно 10 000 ֏ на следующую стрижку или бороду.' : language === 'en' ? 'After visit five, 10,000 ֏ is available for your next haircut or beard service.' : 'Հինգերորդ այցից հետո հասանելի է 10 000 ֏ բոնուս։' },
              ]).map(step => <div key={step.number} style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '0.7rem' }}><span className="label-caps" style={{ color: 'var(--gold-mid)' }}>{step.number}</span><h3 style={{ margin: '0.45rem 0', fontSize: '1rem' }}>{step.title}</h3><p style={{ margin: 0, color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', lineHeight: 1.5 }}>{step.text}</p></div>)}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.2rem' }}>
              <button className="btn-primary" onClick={() => setLocation('/booking')}>{c.loyalty.cta} →</button>
              <button className="btn-outline" onClick={() => setLocation('/loyalty')}>{language === 'ru' ? 'Зарегистрироваться бесплатно' : language === 'en' ? 'Join for free' : 'Միանալ անվճար'} →</button>
            </div>
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

export default function Home() {
  const theme = getHomeTheme();
  if (theme === 'new-year') return <OriginalHome seasonal />;
  return theme === 'gta' ? <GtaLaunchHome /> : <OriginalHome />;
}
