export type Language = 'en' | 'ru';

export const translations = {
  en: {
    // Navigation & Header
    bookNow: 'Book',
    admin: 'Admin',
    logout: 'Logout',
    home: 'Home',
    services: 'Services',
    booking: 'Booking',
    status: 'Status',

    // Landing Page
    welcomeTitle: 'Hairstyle Laboratory',
    welcomeSubtitle: 'Personal booking with Isaac',
    aboutTitle: 'About',
    aboutText: 'A personal space for booking appointments. Precision haircuts and beard styling.',
    servicesTitle: 'Services',
    bookingCTA: 'Book appointment',

    // Services
    menHaircut: 'Haircut',
    menHaircutDesc: 'Precision cut and styling',
    beardModeling: 'Beard modeling',
    beardModelingDesc: 'Beard shaping and grooming',

    // Duration & Price
    duration: 'Duration',
    minutes: 'min',
    price: 'Price',
    rub: 'RUB',
    amd: 'AMD',

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
    waitingForConfirmation: 'Your request is waiting for confirmation.',
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
    status: 'Статус',

    // Landing Page
    welcomeTitle: 'Hairstyle Laboratory',
    welcomeSubtitle: 'Персональная запись к Isaac',
    aboutTitle: 'О сайте',
    aboutText: 'Личное пространство для записи на приём. Точные стрижки и моделирование бороды.',
    servicesTitle: 'Услуги',
    bookingCTA: 'Записаться',

    // Services
    menHaircut: 'Стрижка',
    menHaircutDesc: 'Точная стрижка и стайлинг',
    beardModeling: 'Моделирование бороды',
    beardModelingDesc: 'Формовка и уход за бородой',

    // Duration & Price
    duration: 'Длительность',
    minutes: 'мин',
    price: 'Цена',
    rub: '₽',
    amd: '֏',

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
    waitingForConfirmation: 'Ваша заявка ожидает подтверждения.',
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
