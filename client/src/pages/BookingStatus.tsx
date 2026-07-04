import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function BookingStatus() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const [searchType, setSearchType] = useState<'reference' | 'email'>('reference');
  const [searchValue, setSearchValue] = useState('');
  const [booking, setBooking] = useState<any | null>(null);
  const [searched, setSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error(language === 'ru' ? 'Введите значение для поиска' : 'Please enter a search value');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real app, you would call the API here
      // For now, show a message that the booking wasn't found
      setBooking(null);
      setSearched(true);
      toast.info(language === 'ru' ? 'Бронирование не найдено' : 'No booking found');
    } catch (error: any) {
      toast.error(error.message || (language === 'ru' ? 'Ошибка при поиске' : 'Search error'));
      setBooking(null);
      setSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: any; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: language === 'ru' ? 'Ожидание' : 'Pending' },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: language === 'ru' ? 'Подтверждено' : 'Confirmed' },
      declined: { color: 'bg-red-100 text-red-800', icon: XCircle, label: language === 'ru' ? 'Отклонено' : 'Declined' },
    };
    const info = statusMap[status] || statusMap.pending;
    const Icon = info.icon;
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${info.color}`}>
        <Icon className="w-4 h-4" />
        <span className="font-semibold">{info.label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pt-24 pb-16">
      <div className="container max-w-2xl">
        <h1 className="text-center mb-12 text-[hsl(var(--primary))]">
          {language === 'ru' ? 'Проверить статус бронирования' : 'Check Your Booking Status'}
        </h1>

        {/* Search Form */}
        <div className="card-premium mb-8">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-4 text-[hsl(var(--foreground))]">
              {language === 'ru' ? 'Способ поиска' : 'Search by'}
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => { setSearchType('reference'); setSearched(false); setBooking(null); }}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  searchType === 'reference'
                    ? 'border-primary bg-[hsl(var(--primary))]/5'
                    : 'border-[hsl(var(--muted))] hover:border-[hsl(var(--muted))]-foreground'
                }`}
              >
                {language === 'ru' ? 'Номер бронирования' : 'Reference Number'}
              </button>
              <button
                onClick={() => { setSearchType('email'); setSearched(false); setBooking(null); }}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  searchType === 'email'
                    ? 'border-primary bg-[hsl(var(--primary))]/5'
                    : 'border-[hsl(var(--muted))] hover:border-[hsl(var(--muted))]-foreground'
                }`}
              >
                Email
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={
                searchType === 'reference'
                  ? language === 'ru' ? 'Введите номер бронирования' : 'Enter reference number'
                  : 'your@email.com'
              }
              className="w-full"
            />
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="btn-primary"
            >
              <Search className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* No Booking Found */}
        {searched && !booking ? (
          <div className="card-premium text-center">
            <XCircle className="w-16 h-16 text-[hsl(var(--muted))]-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-[hsl(var(--foreground))]">
              {language === 'ru' ? 'Бронирование не найдено' : 'No Booking Found'}
            </h2>
            <p className="text-[hsl(var(--muted))]-foreground mb-6">
              {language === 'ru'
                ? 'Проверьте введенные данные и попробуйте еще раз.'
                : 'Please check your information and try again.'}
            </p>
            <Button
              onClick={() => { setSearched(false); setSearchValue(''); setBooking(null); }}
              className="btn-primary w-full"
            >
              {language === 'ru' ? 'Новый поиск' : 'New Search'}
            </Button>
          </div>
        ) : null}

        {/* Help Text */}
        {!searched && (
          <div className="card-premium text-center text-[hsl(var(--muted))]-foreground">
            <p>
              {language === 'ru'
                ? 'Введите номер бронирования или email, чтобы проверить статус вашего бронирования.'
                : 'Enter your reference number or email to check your booking status.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
