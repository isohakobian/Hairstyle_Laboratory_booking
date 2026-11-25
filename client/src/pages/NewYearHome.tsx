import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import PublishedReviewsMarquee from '@/components/PublishedReviewsMarquee';

type Lang = 'hy' | 'ru' | 'en';

type CampaignCopy = {
  eyebrow: string;
  navBook: string;
  navStatus: string;
  navAdmin: string;
  navLogin: string;
  navLogout: string;
  tagline: string;
  subtitle: string;
  cta: string;
  secondaryCta: string;
  campaign: string;
  city: string;
  servicesLabel: string;
  servicesIntro: string;
  aboutLabel: string;
  aboutTitle: string;
  aboutText: string;
  loyaltyLabel: string;
  loyaltyTitle: string;
  loyaltyText: string;
  loyaltyCta: string;
  noticeLabel: string;
  footer: string;
};

const copy: Record<Lang, CampaignCopy> = {
  en: {
    eyebrow: 'ISAAC HAKOBIAN / PERSONAL GROOMING',
    navBook: 'Book', navStatus: 'Status', navAdmin: 'Admin', navLogin: 'Login', navLogout: 'Logout',
    tagline: 'Start the year with a sharper version of you.',
    subtitle: 'Precision cuts, beard shaping, and bio perms — made for the way you move through Yerevan.',
    cta: 'Book your appointment',
    secondaryCta: 'Explore services',
    campaign: 'NEW YEAR EDITION · 25 DEC — 07 JAN',
    city: 'YEREVAN / 40.1872° N 44.5152° E',
    servicesLabel: 'Available services',
    servicesIntro: 'Select a service. Then choose your time.',
    aboutLabel: 'The reset',
    aboutTitle: 'A new year, cut with intention.',
    aboutText: 'A private appointment experience for men who care about the details. Clean shape, considered texture, and a finish that feels like you — only sharper.',
    loyaltyLabel: 'Loyalty card',
    loyaltyTitle: 'Five visits. One reward for the new year.',
    loyaltyText: 'Complete five visits and receive a 10,000 ֏ reward for your next haircut or beard modeling appointment.',
    loyaltyCta: 'Join for free',
    noticeLabel: 'New year / live',
    footer: '© Hairstyle Laboratory / Isaac Hakobian',
  },
  ru: {
    eyebrow: 'ISAAC HAKOBIAN / PERSONAL GROOMING',
    navBook: 'Записаться', navStatus: 'Статус', navAdmin: 'Панель', navLogin: 'Войти', navLogout: 'Выйти',
    tagline: 'Новый год начинается с нового образа.',
    subtitle: 'Точные стрижки, форма бороды и биохимическая завивка — под твой ритм и жизнь в Ереване.',
    cta: 'Записаться',
    secondaryCta: 'Смотреть услуги',
    campaign: 'NEW YEAR EDITION · 25 DEC — 07 JAN',
    city: 'ЕРЕВАН / 40.1872° N 44.5152° E',
    servicesLabel: 'Услуги',
    servicesIntro: 'Выбери услугу. Затем удобное время.',
    aboutLabel: 'Новый старт',
    aboutTitle: 'Новый год — с точным образом.',
    aboutText: 'Персональная запись для тех, кто ценит детали. Чистая форма, продуманная текстура и результат, который остаётся твоим — только точнее.',
    loyaltyLabel: 'Карта лояльности',
    loyaltyTitle: 'Пять визитов. Один новогодний бонус.',
    loyaltyText: 'После пяти визитов доступен бонус 10 000 ֏ на следующую стрижку или моделирование бороды.',
    loyaltyCta: 'Участвовать бесплатно',
    noticeLabel: 'Новогодний режим',
    footer: '© Hairstyle Laboratory / Isaac Hakobian',
  },
  hy: {
    eyebrow: 'ISAAC HAKOBIAN / PERSONAL GROOMING',
    navBook: 'Գրանցվել', navStatus: 'Կարգավիճակ', navAdmin: 'Վահանակ', navLogin: 'Մուտք', navLogout: 'Ելք',
    tagline: 'Ձեր նոր կերպարը սկսվում է այստեղ։',
    subtitle: 'Ճշգրիտ սանրվածքներ, մորուքի ձևավորում և բիոքիմիական գանգրացում՝ Երևանի ձեր ռիթմի համար։',
    cta: 'Գրանցվել',
    secondaryCta: 'Դիտել ծառայությունները',
    campaign: 'NEW YEAR EDITION · 25 DEC — 07 JAN',
    city: 'ԵՐԵՎԱՆ / 40.1872° N 44.5152° E',
    servicesLabel: 'Ծառայություններ',
    servicesIntro: 'Ընտրեք ծառայությունը, ապա հարմար ժամը։',
    aboutLabel: 'Նոր սկիզբ',
    aboutTitle: 'Նոր տարի՝ մտածված կերպարով։',
    aboutText: 'Անձնական գրանցում նրանց համար, ովքեր գնահատում են մանրուքները։ Մաքուր ձև, մտածված հյուսվածք և ձեզ նման արդյունք՝ միայն ավելի հստակ։',
    loyaltyLabel: 'Հավատարմության քարտ',
    loyaltyTitle: 'Հինգ այց։ Մեկ ամանորյա բոնուս։',
    loyaltyText: 'Հինգ այցից հետո ստացեք 10 000 ֏ բոնուս հաջորդ սանրվածքի կամ մորուքի ձևավորման համար։',
    loyaltyCta: 'Միանալ անվճար',
    noticeLabel: 'Ամանորյա ռեժիմ',
    footer: '© Hairstyle Laboratory / Isaac Hakobian',
  },
};

const langs: Lang[] = ['hy', 'ru', 'en'];

export default function NewYearHome() {
  const { language, setLanguage } = useLanguage() as { language: Lang; setLanguage: (l: Lang) => void };
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: activeAnnouncements } = trpc.announcements.active.useQuery();
  const { data: publicServices, isLoading: servicesLoading, isError: servicesError } = trpc.services.list.useQuery();
  const c = copy[language] ?? copy.en;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatPrice = (svc: NonNullable<typeof publicServices>[number]) => {
    if (svc.priceMinAmd !== null && svc.priceMaxAmd !== null) return `${svc.priceMinAmd.toLocaleString()} – ${svc.priceMaxAmd.toLocaleString()} ֏`;
    if (svc.priceAmd !== null) return `${svc.priceAmd.toLocaleString()} ֏`;
    return language === 'ru' ? svc.noteRu || 'По запросу' : language === 'hy' ? svc.noteHy || 'Հարցման դեպքում' : svc.noteEn || 'On request';
  };

  const getServiceText = (svc: NonNullable<typeof publicServices>[number], field: 'name' | 'description') => {
    if (language === 'ru') return field === 'name' ? svc.nameRu : svc.descriptionRu;
    if (language === 'en') return field === 'name' ? svc.nameEn : svc.descriptionEn;
    if (field === 'name' && svc.nameHy) return svc.nameHy;
    if (field === 'description' && svc.descriptionHy) return svc.descriptionHy;
    return field === 'name' ? svc.nameEn || svc.nameRu : svc.descriptionEn || svc.descriptionRu;
  };

  return (
    <div className="gta-home new-year-home">
      <header className={`gta-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="gta-shell gta-nav-inner">
          <button className="gta-wordmark" onClick={() => setLocation('/')} aria-label="Hairstyle Laboratory home">
            <span>HL</span> Hairstyle Laboratory
          </button>
          <nav className="gta-desktop-nav" aria-label="Primary navigation">
            <button onClick={() => setLocation('/booking')}>{c.navBook}</button>
            <button onClick={() => setLocation('/status')}>{c.navStatus}</button>
            {isAuthenticated && user?.role === 'admin' && <button onClick={() => setLocation('/admin')}>{c.navAdmin}</button>}
            {isAuthenticated ? <button onClick={logout}>{c.navLogout}</button> : <button onClick={() => { window.location.href = getLoginUrl(); }}>{c.navLogin}</button>}
            <div className="gta-lang-switcher" role="group" aria-label="Language">
              {langs.map((l) => <button key={l} className={language === l ? 'active' : ''} onClick={() => setLanguage(l)}>{l.toUpperCase()}</button>)}
            </div>
          </nav>
          <div className="gta-mobile-actions">
            <div className="gta-lang-switcher" role="group" aria-label="Language">
              {langs.map((l) => <button key={l} className={language === l ? 'active' : ''} onClick={() => setLanguage(l)}>{l.toUpperCase()}</button>)}
            </div>
            <button className="gta-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Menu" aria-expanded={menuOpen}>
              <span /><span /><span />
            </button>
          </div>
        </div>
        {menuOpen && <div className="gta-mobile-menu">
          <button onClick={() => { setLocation('/booking'); setMenuOpen(false); }}>{c.navBook}</button>
          <button onClick={() => { setLocation('/status'); setMenuOpen(false); }}>{c.navStatus}</button>
          {isAuthenticated && user?.role === 'admin' && <button onClick={() => { setLocation('/admin'); setMenuOpen(false); }}>{c.navAdmin}</button>}
          {isAuthenticated ? <button onClick={logout}>{c.navLogout}</button> : <button onClick={() => { window.location.href = getLoginUrl(); }}>{c.navLogin}</button>}
        </div>}
      </header>

      <main>
        <section className="gta-hero">
          <div className="gta-grid" aria-hidden="true" />
          <div className="gta-sun" aria-hidden="true" />
          <div className="gta-route gta-route-one" aria-hidden="true" />
          <div className="gta-route gta-route-two" aria-hidden="true" />
          <div className="gta-coordinates" aria-hidden="true"><span>40°11'14.0"N</span><span>44°30'54.7"E</span></div>
          <div className="gta-shell gta-hero-content">
            <div className="gta-hero-copy">
              <div className="gta-eyebrow gta-reveal gta-delay-1"><span className="gta-pulse-dot" /> {c.eyebrow}</div>
              <div className="gta-campaign-pill gta-reveal gta-delay-2">{c.campaign}</div>
              <h1 className="gta-title gta-reveal gta-delay-2"><span>NEW YEAR.</span><span>NEW ENERGY</span><em>STARTS HERE.</em></h1>
              <p className="gta-tagline gta-reveal gta-delay-3">{c.tagline}</p>
              <p className="gta-subtitle gta-reveal gta-delay-3">{c.subtitle}</p>
              <div className="gta-actions gta-reveal gta-delay-4">
                <button className="gta-primary-button" onClick={() => setLocation('/booking')}>{c.cta}<span>↗</span></button>
                <button className="gta-secondary-button" onClick={() => document.getElementById('gta-services')?.scrollIntoView({ behavior: 'smooth' })}>{c.secondaryCta}<span>↓</span></button>
              </div>
              <p className="gta-location gta-reveal gta-delay-4">{c.city}</p>
            </div>
            <div className="gta-hero-panel gta-reveal gta-delay-3" aria-label={c.noticeLabel}>
              <div className="gta-panel-top"><span>{c.noticeLabel}</span><span className="gta-live"><i /> LIVE</span></div>
              <div className="gta-panel-art"><div className="gta-silhouette" /><div className="gta-panel-sun" /><span className="gta-panel-label">NEW ENERGY<br /><strong>UNLOCKED</strong></span></div>
              <div className="gta-panel-bottom"><span>HL / 2026</span><span>01 — 03</span></div>
            </div>
          </div>
          <div className="gta-scroll-cue" aria-hidden="true"><span /> SCROLL TO EXPLORE</div>
        </section>

        <section className="gta-statement">
          <div className="gta-shell gta-two-column">
            <p className="gta-kicker">{c.aboutLabel}</p>
            <div><h2>{c.aboutTitle}</h2><p>{c.aboutText}</p></div>
          </div>
        </section>

        <section id="gta-services" className="gta-services">
          <div className="gta-shell">
            <div className="gta-section-heading"><div><p className="gta-kicker">02 / {c.servicesLabel}</p><h2>{c.servicesLabel}</h2></div><p>{c.servicesIntro}</p></div>
            {servicesLoading && <p className="gta-muted">{language === 'ru' ? 'Загружаю услуги…' : language === 'hy' ? 'Ծառայությունները բեռնվում են…' : 'Loading services…'}</p>}
            {servicesError && <p className="gta-error">{language === 'ru' ? 'Не удалось загрузить услуги. Обновите страницу.' : language === 'hy' ? 'Չհաջողվեց բեռնել ծառայությունները։' : 'Could not load services. Please refresh.'}</p>}
            <div className="gta-service-list">
              {(publicServices ?? []).map((svc, index) => <button key={svc.id} className="gta-service-row" onClick={() => setLocation('/booking')}>
                <span className="gta-service-index">0{index + 1}</span><span className="gta-service-main"><strong>{getServiceText(svc, 'name')}</strong><small>{getServiceText(svc, 'description')} · {svc.durationMinutes} {language === 'ru' ? 'мин' : language === 'hy' ? 'րոպե' : 'min'}</small></span><span className="gta-service-price">{formatPrice(svc)}<small>{c.navBook} ↗</small></span>
              </button>)}
            </div>
            <button className="gta-outline-button" onClick={() => setLocation('/booking')}>{c.cta}<span>↗</span></button>
          </div>
        </section>

        <section className="gta-loyalty">
          <div className="gta-shell gta-loyalty-card"><div><p className="gta-kicker">03 / {c.loyaltyLabel}</p><h2>{c.loyaltyTitle}</h2><p>{c.loyaltyText}</p></div><button className="gta-primary-button" onClick={() => setLocation('/loyalty')}>{c.loyaltyCta}<span>↗</span></button></div>
        </section>

        <PublishedReviewsMarquee language={language} />
                {(activeAnnouncements ?? []).length > 0 && <section className="gta-notices"><div className="gta-shell"><div className="gta-section-heading"><div><p className="gta-kicker">04 / {c.noticeLabel}</p><h2>{c.noticeLabel}</h2></div><p>{language === 'ru' ? 'Новости и обновления студии.' : language === 'hy' ? 'Ստուդիայի նորություններ և թարմացումներ։' : 'Studio news and updates.'}</p></div><div className="gta-notice-grid">{(activeAnnouncements ?? []).slice(0, 2).map((notice) => <article key={notice.id} className="gta-notice-card">{notice.imageUrl ? <img src={notice.imageUrl} alt="" /> : <div className="gta-notice-copy"><span>{c.campaign}</span><strong>{language === 'ru' ? notice.titleRu : language === 'hy' ? notice.titleHy || notice.titleEn : notice.titleEn}</strong><p>{language === 'ru' ? notice.bodyRu : language === 'hy' ? notice.bodyHy || notice.bodyEn : notice.bodyEn}</p></div>}</article>)}</div></div></section>}
      </main>

      <footer className="gta-footer"><div className="gta-shell"><span>{c.footer}</span><span>{c.campaign}</span></div></footer>
    </div>
  );
}
