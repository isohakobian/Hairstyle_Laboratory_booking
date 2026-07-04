import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function Booking() {
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'service' | 'datetime' | 'contact' | 'confirm'>('service');
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [comment, setComment] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const { data: services } = trpc.services.list.useQuery();
  const createBookingMutation = trpc.bookings.create.useMutation();

  const selectedServiceData = services?.find(s => s.id === selectedService);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00'
  ];

  const getServiceName = (service: any) => {
    return language === 'ru' ? service.nameRu : service.nameEn;
  };

  const handleServiceSelect = () => {
    if (!selectedService) {
      toast.error(language === 'ru' ? 'Выберите услугу' : 'Please select a service');
      return;
    }
    setStep('datetime');
  };

  const handleDateTimeSelect = () => {
    if (!bookingDate || !bookingTime) {
      toast.error(language === 'ru' ? 'Выберите дату и время' : 'Please select date and time');
      return;
    }
    setStep('contact');
  };

  const handleSubmit = async () => {
    if (!clientName || !clientPhone) {
      toast.error(language === 'ru' ? 'Заполните обязательные поля' : 'Please fill required fields');
      return;
    }

    try {
      const result = await createBookingMutation.mutateAsync({
        serviceId: selectedService!,
        serviceName: getServiceName(selectedServiceData!),
        bookingDate,
        bookingTime,
        clientName,
        clientPhone,
        clientEmail: clientEmail || undefined,
        comment: comment || undefined,
      });

      if (result) {
        setReferenceNumber(result.referenceNumber);
        setStep('confirm');
      }
    } catch (error: any) {
      toast.error(error.message || (language === 'ru' ? 'Ошибка при бронировании' : 'Booking error'));
    }
  };

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pt-24 pb-16">
      <div className="container max-w-2xl">
        <h1 className="text-center mb-12 text-[hsl(var(--primary))]">
          {language === 'ru' ? 'Запишитесь на прием' : 'Book Your Appointment'}
        </h1>

        {/* Progress Indicator */}
        <div className="flex gap-2 mb-12 justify-center">
          {['service', 'datetime', 'contact', 'confirm'].map((s, i) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-all ${
                step === s ? 'bg-[hsl(var(--primary))] w-8' : 
                ['service', 'datetime', 'contact', 'confirm'].indexOf(step) > i ? 'bg-accent' : 'bg-[hsl(var(--muted))]'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Service Selection */}
        {step === 'service' && (
          <div className="card-premium">
            <h2 className="text-2xl font-semibold mb-6 text-[hsl(var(--primary))]">
              {language === 'ru' ? 'Выберите услугу' : 'Select Service'}
            </h2>
            <div className="space-y-3 mb-8">
              {services?.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedService === service.id
                      ? 'border-primary bg-[hsl(var(--primary))]/5'
                      : 'border-[hsl(var(--muted))] hover:border-[hsl(var(--muted))]-foreground'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-[hsl(var(--foreground))]">{getServiceName(service)}</h3>
                      <p className="text-sm text-[hsl(var(--muted))]-foreground mt-1">
                        {language === 'ru' ? service.descriptionRu : service.descriptionEn}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[hsl(var(--primary))]">{service.priceRub === 0 ? (language === 'ru' ? 'Бесплатно' : 'Free') : `${service.priceRub.toLocaleString()} ₽`}</p>
                      <p className="text-xs text-[hsl(var(--muted))]-foreground">{service.durationMinutes} {language === 'ru' ? 'мин' : 'min'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {selectedServiceData?.noteRu && (
              <div className="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[hsl(var(--foreground))]">
                  {language === 'ru' ? selectedServiceData.noteRu : selectedServiceData.noteEn}
                </p>
              </div>
            )}

            <Button onClick={handleServiceSelect} className="btn-primary w-full">
              {language === 'ru' ? 'Далее' : 'Next'}
            </Button>
          </div>
        )}

        {/* Step 2: Date & Time Selection */}
        {step === 'datetime' && (
          <div className="card-premium">
            <h2 className="text-2xl font-semibold mb-6 text-[hsl(var(--primary))]">
              {language === 'ru' ? 'Выберите дату и время' : 'Select Date & Time'}
            </h2>

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-medium mb-3 text-[hsl(var(--foreground))]">
                  {language === 'ru' ? 'Дата' : 'Date'}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-5 h-5 text-[hsl(var(--muted))]-foreground pointer-events-none" />
                  <input
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-[hsl(var(--muted))] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3 text-[hsl(var(--foreground))]">
                  {language === 'ru' ? 'Время' : 'Time'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setBookingTime(time)}
                      className={`p-2 rounded-lg border transition-all text-sm font-medium ${
                        bookingTime === time
                          ? 'border-primary bg-[hsl(var(--primary))] text-[hsl(var(--primary))]-foreground'
                          : 'border-[hsl(var(--muted))] hover:border-primary'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep('service')}
                className="btn-secondary flex-1"
              >
                {language === 'ru' ? 'Назад' : 'Back'}
              </Button>
              <Button
                onClick={handleDateTimeSelect}
                className="btn-primary flex-1"
              >
                {language === 'ru' ? 'Далее' : 'Next'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Contact Information */}
        {step === 'contact' && (
          <div className="card-premium">
            <h2 className="text-2xl font-semibold mb-6 text-[hsl(var(--primary))]">
              {language === 'ru' ? 'Ваши контакты' : 'Your Contact Information'}
            </h2>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
                  {language === 'ru' ? 'Имя' : 'Name'} *
                </label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={language === 'ru' ? 'Ваше имя' : 'Your name'}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
                  {language === 'ru' ? 'Телефон' : 'Phone'} *
                </label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
                  {language === 'ru' ? 'Email' : 'Email'}
                </label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[hsl(var(--foreground))]">
                  {language === 'ru' ? 'Комментарий' : 'Comment'}
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={language === 'ru' ? 'Дополнительная информация...' : 'Additional information...'}
                  className="w-full"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep('datetime')}
                className="btn-secondary flex-1"
              >
                {language === 'ru' ? 'Назад' : 'Back'}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createBookingMutation.isPending}
                className="btn-primary flex-1"
              >
                {createBookingMutation.isPending ? (language === 'ru' ? 'Отправка...' : 'Submitting...') : (language === 'ru' ? 'Отправить' : 'Submit')}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirm' && (
          <div className="card-premium text-center">
            <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-4 text-[hsl(var(--primary))]">
              {language === 'ru' ? 'Бронирование подтверждено!' : 'Booking Confirmed!'}
            </h2>
            <p className="text-[hsl(var(--muted))]-foreground mb-8">
              {language === 'ru'
                ? 'Ваше бронирование успешно отправлено. Вы получите подтверждение в ближайшее время.'
                : 'Your booking has been submitted successfully. You will receive confirmation shortly.'}
            </p>

            <div className="bg-[hsl(var(--secondary))] rounded-lg p-6 mb-8">
              <p className="text-sm text-[hsl(var(--muted))]-foreground mb-2">
                {language === 'ru' ? 'Номер бронирования' : 'Reference Number'}
              </p>
              <p className="text-3xl font-bold text-[hsl(var(--primary))] font-mono">{referenceNumber}</p>
            </div>

            <div className="space-y-2 mb-8 text-left bg-accent/5 p-4 rounded-lg">
              <p className="text-sm"><span className="font-semibold">{language === 'ru' ? 'Услуга:' : 'Service:'}</span> {getServiceName(selectedServiceData!)}</p>
              <p className="text-sm"><span className="font-semibold">{language === 'ru' ? 'Дата:' : 'Date:'}</span> {bookingDate}</p>
              <p className="text-sm"><span className="font-semibold">{language === 'ru' ? 'Время:' : 'Time:'}</span> {bookingTime}</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setLocation('/status')}
                className="btn-primary flex-1"
              >
                {language === 'ru' ? 'Проверить статус' : 'Check Status'}
              </Button>
              <Button
                onClick={() => setLocation('/')}
                className="btn-secondary flex-1"
              >
                {language === 'ru' ? 'На главную' : 'Home'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
