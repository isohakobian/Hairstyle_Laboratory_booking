import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, LogOut } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';

export default function AdminDashboard() {
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, logout, loading } = useAuth();

  const { data: bookings, isLoading, refetch } = trpc.admin.bookings.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
  });

  const confirmMutation = trpc.admin.confirmBooking.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Бронирование подтверждено' : 'Booking confirmed');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || (language === 'ru' ? 'Ошибка' : 'Error'));
    },
  });

  const declineMutation = trpc.admin.declineBooking.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Бронирование отклонено' : 'Booking declined');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || (language === 'ru' ? 'Ошибка' : 'Error'));
    },
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'admin')) {
      setLocation('/');
    }
  }, [isAuthenticated, user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-[hsl(var(--muted))]-foreground">{language === 'ru' ? 'Загрузка...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'declined':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 border-green-200';
      case 'declined':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  const pendingBookings = bookings?.filter(b => b.status === 'pending') || [];
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];
  const declinedBookings = bookings?.filter(b => b.status === 'declined') || [];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pt-24 pb-16">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-[hsl(var(--primary))]">
            {language === 'ru' ? 'Админ-панель' : 'Admin Dashboard'}
          </h1>
          <Button
            onClick={logout}
            className="btn-secondary flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {language === 'ru' ? 'Выход' : 'Logout'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card-premium">
            <p className="text-[hsl(var(--muted))]-foreground text-sm mb-2">
              {language === 'ru' ? 'Ожидающие' : 'Pending'}
            </p>
            <p className="text-4xl font-bold text-[hsl(var(--primary))]">{pendingBookings.length}</p>
          </div>
          <div className="card-premium">
            <p className="text-[hsl(var(--muted))]-foreground text-sm mb-2">
              {language === 'ru' ? 'Подтверждено' : 'Confirmed'}
            </p>
            <p className="text-4xl font-bold text-green-600">{confirmedBookings.length}</p>
          </div>
          <div className="card-premium">
            <p className="text-[hsl(var(--muted))]-foreground text-sm mb-2">
              {language === 'ru' ? 'Отклонено' : 'Declined'}
            </p>
            <p className="text-4xl font-bold text-red-600">{declinedBookings.length}</p>
          </div>
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-[hsl(var(--muted))]-foreground">{language === 'ru' ? 'Загрузка бронирований...' : 'Loading bookings...'}</p>
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className={`card-premium border-l-4 ${
                  booking.status === 'confirmed'
                    ? 'border-l-green-600'
                    : booking.status === 'declined'
                    ? 'border-l-red-600'
                    : 'border-l-yellow-600'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-[hsl(var(--muted))]-foreground">{language === 'ru' ? 'Номер бронирования' : 'Reference'}</p>
                    <p className="font-mono font-bold text-[hsl(var(--primary))]">{booking.referenceNumber}</p>
                  </div>
                  <div className="flex items-start justify-between md:justify-end gap-4">
                    <div>
                      <p className="text-sm text-[hsl(var(--muted))]-foreground">{language === 'ru' ? 'Статус' : 'Status'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(booking.status)}
                        <span className="font-semibold">
                          {booking.status === 'pending'
                            ? language === 'ru' ? 'Ожидание' : 'Pending'
                            : booking.status === 'confirmed'
                            ? language === 'ru' ? 'Подтверждено' : 'Confirmed'
                            : language === 'ru' ? 'Отклонено' : 'Declined'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-[hsl(var(--muted))]">
                  <div>
                    <p className="text-xs text-[hsl(var(--muted))]-foreground">{language === 'ru' ? 'Имя' : 'Name'}</p>
                    <p className="font-semibold text-[hsl(var(--foreground))]">{booking.clientName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted))]-foreground">{language === 'ru' ? 'Услуга' : 'Service'}</p>
                    <p className="font-semibold text-[hsl(var(--foreground))]">{booking.serviceName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted))]-foreground">{language === 'ru' ? 'Дата' : 'Date'}</p>
                    <p className="font-semibold text-[hsl(var(--foreground))]">{booking.bookingDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted))]-foreground">{language === 'ru' ? 'Время' : 'Time'}</p>
                    <p className="font-semibold text-[hsl(var(--foreground))]">{booking.bookingTime}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-[hsl(var(--muted))]-foreground">{language === 'ru' ? 'Контакт' : 'Contact'}</p>
                    <p className="font-semibold text-[hsl(var(--foreground))]">{booking.clientPhone}</p>
                    {booking.clientEmail && (
                      <p className="text-sm text-[hsl(var(--muted))]-foreground">{booking.clientEmail}</p>
                    )}
                  </div>
                  {booking.comment && (
                    <div>
                      <p className="text-xs text-[hsl(var(--muted))]-foreground">{language === 'ru' ? 'Комментарий' : 'Comment'}</p>
                      <p className="text-[hsl(var(--foreground))]">{booking.comment}</p>
                    </div>
                  )}
                </div>

                {booking.status === 'pending' && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => confirmMutation.mutate({ id: booking.id })}
                      disabled={confirmMutation.isPending || declineMutation.isPending}
                      className="btn-primary flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {language === 'ru' ? 'Подтвердить' : 'Confirm'}
                    </Button>
                    <Button
                      onClick={() => declineMutation.mutate({ id: booking.id })}
                      disabled={confirmMutation.isPending || declineMutation.isPending}
                      className="btn-secondary flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {language === 'ru' ? 'Отклонить' : 'Decline'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card-premium text-center py-12">
            <Clock className="w-12 h-12 text-[hsl(var(--muted))]-foreground mx-auto mb-4" />
            <p className="text-[hsl(var(--muted))]-foreground">
              {language === 'ru' ? 'Нет бронирований' : 'No bookings yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
