import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';

export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  const services = [
    {
      id: 1,
      titleEn: 'Haircut',
      titleRu: 'Стрижка',
      descEn: 'Precision cut and styling',
      duration: 45,
      price: 3000,
    },
    {
      id: 2,
      titleEn: 'Beard modeling',
      titleRu: 'Моделирование бороды',
      descEn: 'Beard shaping and grooming',
      duration: 30,
      price: 500,
    },
  ];

  const getServiceTitle = (service: any) => {
    return language === 'ru' ? service.titleRu : service.titleEn;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'hsl(var(--background))' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'hsl(var(--card))', borderBottom: '1px solid hsl(var(--border))' }} className="backdrop-blur-sm">
        <div className="container flex items-center justify-between" style={{ height: '5rem' }}>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'hsl(var(--primary))' }}>Hairstyle Laboratory</h1>
          </div>

          <nav className="flex items-center gap-8">
            <button
              onClick={() => setLocation('/booking')}
              style={{ fontSize: '0.875rem', fontWeight: '500', color: 'hsl(var(--muted-foreground))' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
              className="transition-colors"
            >
              {language === 'ru' ? 'Бронирование' : 'Booking'}
            </button>
            <button
              onClick={() => setLocation('/status')}
              style={{ fontSize: '0.875rem', fontWeight: '500', color: 'hsl(var(--muted-foreground))' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
              className="transition-colors"
            >
              {language === 'ru' ? 'Статус' : 'Status'}
            </button>

            {/* Language Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid hsl(var(--border))', paddingLeft: '2rem' }}>
              <button
                onClick={() => setLanguage('en')}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  backgroundColor: language === 'en' ? 'hsl(var(--primary))' : 'transparent',
                  color: language === 'en' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                  transition: 'all 300ms',
                  cursor: 'pointer',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  if (language !== 'en') {
                    e.currentTarget.style.color = 'hsl(var(--foreground))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (language !== 'en') {
                    e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                  }
                }}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('ru')}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  backgroundColor: language === 'ru' ? 'hsl(var(--primary))' : 'transparent',
                  color: language === 'ru' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                  transition: 'all 300ms',
                  cursor: 'pointer',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  if (language !== 'ru') {
                    e.currentTarget.style.color = 'hsl(var(--foreground))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (language !== 'ru') {
                    e.currentTarget.style.color = 'hsl(var(--muted-foreground))';
                  }
                }}
              >
                РУ
              </button>
            </div>

            {/* Auth */}
            {isAuthenticated && user?.role === 'admin' && (
              <>
                <button
                  onClick={() => setLocation('/admin')}
                  style={{ fontSize: '0.875rem', fontWeight: '500', color: 'hsl(var(--accent))' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--primary))')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--accent))')}
                  className="transition-colors"
                >
                  {language === 'ru' ? 'Админ' : 'Admin'}
                </button>
                <button
                  onClick={logout}
                  style={{ fontSize: '0.875rem', fontWeight: '500', color: 'hsl(var(--muted-foreground))' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--foreground))')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
                  className="transition-colors"
                >
                  {language === 'ru' ? 'Выход' : 'Logout'}
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ paddingTop: '4rem', paddingBottom: '4rem', background: 'linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--card)), hsl(var(--background)))' }}>
        <div className="container">
          <div style={{ maxWidth: '48rem', margin: '0 auto', textAlign: 'center' }}>
            <h1 style={{ marginBottom: '1.5rem', color: 'hsl(var(--primary))' }}>
              {language === 'ru' ? 'Hairstyle Laboratory' : 'Hairstyle Laboratory'}
            </h1>
            <p style={{ fontSize: '1.25rem', color: 'hsl(var(--muted-foreground))', marginBottom: '2rem' }}>
              {language === 'ru'
                ? 'Личное пространство для записи на приём'
                : 'Personal booking space'}
            </p>
            <Button
              onClick={() => setLocation('/booking')}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                fontSize: '1.125rem',
                fontWeight: '600',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 300ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'hsl(var(--accent))')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'hsl(var(--primary))')}
            >
              {language === 'ru' ? 'Запишитесь на прием' : 'Book Your Appointment'}
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section style={{ paddingTop: '4rem', paddingBottom: '4rem', backgroundColor: 'hsl(var(--card))', borderTop: '1px solid hsl(var(--border))' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '4rem', color: 'hsl(var(--primary))' }}>
            {language === 'ru' ? 'Услуги' : 'Services'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            {services.map((service) => (
              <div
                key={service.id}
                style={{
                  backgroundColor: 'hsl(var(--card))',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  border: '1px solid hsl(var(--border))',
                  transition: 'all 300ms',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                }}
              >
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem', color: 'hsl(var(--primary))' }}>
                  {getServiceTitle(service)}
                </h3>
                <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1rem', fontSize: '0.875rem', lineHeight: '1.625' }}>
                  {service.descEn}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {service.duration} {language === 'ru' ? 'мин' : 'min'}
                    </span>
                    <span style={{ fontWeight: '600', color: 'hsl(var(--primary))' }}>
                      {service.price === 0 ? (language === 'ru' ? 'Бесплатно' : 'Free') : `${service.price.toLocaleString()} ₽`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Button
              onClick={() => setLocation('/booking')}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                fontSize: '1.125rem',
                fontWeight: '600',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 300ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'hsl(var(--accent))')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'hsl(var(--primary))')}
            >
              {language === 'ru' ? 'Запишитесь на прием' : 'Book Your Appointment'}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', padding: '2rem' }}>
        <div className="container" style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
          <p>© 2024 Isaac's Premium Barbershop. {language === 'ru' ? 'Все права защищены.' : 'All rights reserved.'}</p>
        </div>
      </footer>
    </div>
  );
}
