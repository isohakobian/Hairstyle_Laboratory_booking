export type Language = 'en' | 'ru';

export const translations = {
  en: {
    // Navigation & Header
    bookNow: 'Book appointment',
    admin: 'Admin',
    logout: 'Logout',
    home: 'Home',
    services: 'Services',
    booking: 'Booking',

    // Landing Page
    welcomeTitle: 'Hairstyle Laboratory',
    welcomeSubtitle: 'Personal booking with Isaac — hair stylist and barber',
    aboutTitle: 'About',
    aboutText: 'Isaac is a personal hair stylist and barber specializing in men\'s grooming, precision cuts, and individual style consultation.',
    servicesTitle: 'Services',
    bookingCTA: 'Book appointment',

    // Services
    menHaircut: 'Men\'s haircut',
    menHaircutDesc: 'Professional haircut with precision fading and styling',
    beardModeling: 'Beard modeling',
    beardModelingDesc: 'Expert beard shaping and grooming',
    scalpCare: 'Scalp care',
    scalpCareDesc: 'Therapeutic scalp treatment and massage',
    hairCare: 'Hair care',
    hairCareDesc: 'Deep conditioning and hair treatment',
    chemicalBioPerm: 'Chemical bio perm',
    chemicalBioPermDesc: 'Professional chemical treatment for permanent waves',
    chemicalBioPermNote: 'A 5,000 RUB prepayment is required for chemical bio perm booking. Final price: 10,000–15,000 RUB.',
    consultation: 'Consultation',
    consultationDesc: 'Free consultation for hair and style advice',

    // Duration & Price
    duration: 'Duration',
    minutes: 'min',
    hours: 'hours',
    price: 'Price',
    free: 'Free',
    rub: 'RUB',
    priceRange: '10,000–15,000 RUB',

    // Booking Form
    selectService: 'Select Service',
    selectDate: 'Select Date',
    selectTime: 'Select Time',
    yourName: 'Your Name',
    phoneOrWhatsapp: 'Phone / WhatsApp',
    addComment: 'Add Comment (Optional)',
    submitBooking: 'Submit Booking',
    bookingRequestSent: 'Booking request sent',
    bookingReference: 'Your Reference Number',
    checkStatus: 'Check Status',

    // Booking Status
    searchBooking: 'Search Your Booking',
    searchByReference: 'Search by Reference Number',
    search: 'Search',
    bookingStatus: 'Booking Status',
    pending: 'Pending',
    confirmed: 'Confirmed',
    declined: 'Declined',
    noBookingFound: 'No booking found',
    waitingForConfirmation: 'Your request is waiting for Isaac\'s confirmation.',
    statusPending: 'Status: pending',

    // Admin Dashboard
    adminDashboard: 'Admin Dashboard',
    allBookings: 'All Bookings',
    clientName: 'Client Name',
    contact: 'Contact',
    service: 'Service',
    date: 'Date',
    time: 'Time',
    statusLabel: 'Status',
    actions: 'Actions',
    confirm: 'Confirm',
    decline: 'Decline',
    noBookings: 'No bookings yet',

    // Messages
    bookingSubmitted: 'Your booking has been submitted successfully!',
    timeSlotUnavailable: 'This time slot is already booked',
    pleaseSelectService: 'Please select a service',
    pleaseSelectDate: 'Please select a date',
    pleaseSelectTime: 'Please select a time',
    pleaseEnterName: 'Please enter your name',
    pleaseEnterPhone: 'Please enter your phone number',
    bookingConfirmedMessage: 'Your booking has been confirmed!',
    bookingDeclinedMessage: 'Your booking has been declined',
  },
  ru: {
    // Navigation & Header
    bookNow: 'Записаться',
    admin: 'Админ',
    logout: 'Выход',
    home: 'Главная',
    services: 'Услуги',
    booking: 'Бронирование',

    // Landing Page
    welcomeTitle: 'Hairstyle Laboratory',
    welcomeSubtitle: 'Персональная запись к Isaac — стилисту по волосам и барберу',
    aboutTitle: 'О мастере',
    aboutText: 'Isaac — персональный стилист по волосам и барбер, специализирующийся на мужском уходе, точных стрижках и индивидуальной консультации по стилю.',
    servicesTitle: 'Услуги',
    bookingCTA: 'Записаться',

    // Services
    menHaircut: 'Мужская стрижка',
    menHaircutDesc: 'Профессиональная стрижка с точной техникой и стайлингом',
    beardModeling: 'Моделирование бороды',
    beardModelingDesc: 'Экспертная формовка и уход за бородой',
    scalpCare: 'Уход за кожей головы',
    scalpCareDesc: 'Терапевтическое лечение кожи головы и массаж',
    hairCare: 'Уход за волосами',
    hairCareDesc: 'Глубокое кондиционирование и лечение волос',
    chemicalBioPerm: 'Химическая биозавивка',
    chemicalBioPermDesc: 'Профессиональное химическое лечение для перманентных волн',
    chemicalBioPermNote: 'Для записи на химическую биозавивку требуется предоплата 5 000 ₽. Итоговая стоимость: 10 000–15 000 ₽.',
    consultation: 'Консультация',
    consultationDesc: 'Бесплатная консультация по волосам и стилю',

    // Duration & Price
    duration: 'Длительность',
    minutes: 'мин',
    hours: 'часа',
    price: 'Цена',
    free: 'Бесплатно',
    rub: '₽',
    priceRange: '10 000–15 000 ₽',

    // Booking Form
    selectService: 'Выберите услугу',
    selectDate: 'Выберите дату',
    selectTime: 'Выберите время',
    yourName: 'Ваше имя',
    phoneOrWhatsapp: 'Телефон / WhatsApp',
    addComment: 'Добавить комментарий (опционально)',
    submitBooking: 'Отправить заявку',
    bookingRequestSent: 'Заявка отправлена',
    bookingReference: 'Ваш номер бронирования',
    checkStatus: 'Проверить статус',

    // Booking Status
    searchBooking: 'Найти ваше бронирование',
    searchByReference: 'Поиск по номеру бронирования',
    search: 'Поиск',
    bookingStatus: 'Статус бронирования',
    pending: 'Ожидание',
    confirmed: 'Подтверждено',
    declined: 'Отклонено',
    noBookingFound: 'Бронирование не найдено',
    waitingForConfirmation: 'Ваша заявка ожидает подтверждения Isaac.',
    statusPending: 'Статус: ожидание',

    // Admin Dashboard
    adminDashboard: 'Админ-панель',
    allBookings: 'Все бронирования',
    clientName: 'Имя клиента',
    contact: 'Контакт',
    service: 'Услуга',
    date: 'Дата',
    time: 'Время',
    statusLabel: 'Статус',
    actions: 'Действия',
    confirm: 'Подтвердить',
    decline: 'Отклонить',
    noBookings: 'Еще нет бронирований',

    // Messages
    bookingSubmitted: 'Ваша заявка успешно отправлена!',
    timeSlotUnavailable: 'Этот временной слот уже занят',
    pleaseSelectService: 'Пожалуйста, выберите услугу',
    pleaseSelectDate: 'Пожалуйста, выберите дату',
    pleaseSelectTime: 'Пожалуйста, выберите время',
    pleaseEnterName: 'Пожалуйста, введите ваше имя',
    pleaseEnterPhone: 'Пожалуйста, введите ваш номер телефона',
    bookingConfirmedMessage: 'Ваше бронирование подтверждено!',
    bookingDeclinedMessage: 'Ваше бронирование отклонено',
  },
};

export function t(key: keyof typeof translations.en, lang: Language): string {
  return translations[lang][key] || translations.en[key] || key;
}
