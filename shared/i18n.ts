export type Language = 'en' | 'ru';

export const translations = {
  en: {
    // Navigation & Header
    bookNow: 'Book Now',
    admin: 'Admin',
    logout: 'Logout',
    home: 'Home',
    services: 'Services',
    booking: 'Booking',

    // Landing Page
    welcomeTitle: "Isaac's Premium Barbershop",
    welcomeSubtitle: 'Experience refined grooming and exceptional style',
    aboutTitle: 'About Our Barbershop',
    aboutText: 'We specialize in premium men\'s grooming with attention to detail and a commitment to excellence. Every cut is crafted to perfection.',
    servicesTitle: 'Our Services',
    bookingCTA: 'Book Your Appointment',

    // Services
    menHaircut: 'Men\'s Haircut',
    menHaircutDesc: 'Professional haircut with precision fading and styling',
    beardModeling: 'Beard Modeling',
    beardModelingDesc: 'Expert beard shaping and grooming',
    scalpCare: 'Scalp Care',
    scalpCareDesc: 'Therapeutic scalp treatment and massage',
    hairCare: 'Hair Care',
    hairCareDesc: 'Deep conditioning and hair treatment',
    chemicalBioPerm: 'Chemical Bio Perm',
    chemicalBioPermDesc: 'Professional chemical treatment for permanent waves',
    consultation: 'Consultation',
    consultationDesc: 'Free consultation for hair and style advice',

    // Duration & Price
    duration: 'Duration',
    minutes: 'min',
    price: 'Price',
    free: 'Free',
    rub: '₽',

    // Booking Form
    selectService: 'Select Service',
    selectDate: 'Select Date',
    selectTime: 'Select Time',
    yourName: 'Your Name',
    phoneOrEmail: 'Phone or Email',
    addComment: 'Add Comment (Optional)',
    submitBooking: 'Submit Booking',
    bookingConfirmed: 'Booking Confirmed!',
    bookingReference: 'Your Reference Number',
    checkStatus: 'Check Status',

    // Booking Status
    searchBooking: 'Search Your Booking',
    searchByReference: 'Search by Reference Number',
    searchByEmail: 'Search by Email',
    search: 'Search',
    bookingStatus: 'Booking Status',
    pending: 'Pending',
    confirmed: 'Confirmed',
    declined: 'Declined',
    noBookingFound: 'No booking found',

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
    invalidEmail: 'Please enter a valid email',
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
    welcomeTitle: 'Премиум барбершоп Isaac',
    welcomeSubtitle: 'Опыт утонченного ухода и исключительного стиля',
    aboutTitle: 'О нашем барбершопе',
    aboutText: 'Мы специализируемся на премиум уходе за мужчинами с вниманием к деталям и стремлением к совершенству. Каждая стрижка создается идеально.',
    servicesTitle: 'Наши услуги',
    bookingCTA: 'Запишитесь на прием',

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
    consultation: 'Консультация',
    consultationDesc: 'Бесплатная консультация по волосам и стилю',

    // Duration & Price
    duration: 'Длительность',
    minutes: 'мин',
    price: 'Цена',
    free: 'Бесплатно',
    rub: '₽',

    // Booking Form
    selectService: 'Выберите услугу',
    selectDate: 'Выберите дату',
    selectTime: 'Выберите время',
    yourName: 'Ваше имя',
    phoneOrEmail: 'Телефон или Email',
    addComment: 'Добавить комментарий (опционально)',
    submitBooking: 'Отправить бронирование',
    bookingConfirmed: 'Бронирование подтверждено!',
    bookingReference: 'Ваш номер бронирования',
    checkStatus: 'Проверить статус',

    // Booking Status
    searchBooking: 'Найти ваше бронирование',
    searchByReference: 'Поиск по номеру бронирования',
    searchByEmail: 'Поиск по Email',
    search: 'Поиск',
    bookingStatus: 'Статус бронирования',
    pending: 'Ожидание',
    confirmed: 'Подтверждено',
    declined: 'Отклонено',
    noBookingFound: 'Бронирование не найдено',

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
    bookingSubmitted: 'Ваше бронирование успешно отправлено!',
    timeSlotUnavailable: 'Этот временной слот уже занят',
    pleaseSelectService: 'Пожалуйста, выберите услугу',
    pleaseSelectDate: 'Пожалуйста, выберите дату',
    pleaseSelectTime: 'Пожалуйста, выберите время',
    invalidEmail: 'Пожалуйста, введите корректный email',
    bookingConfirmedMessage: 'Ваше бронирование подтверждено!',
    bookingDeclinedMessage: 'Ваше бронирование отклонено',
  },
};

export function t(key: keyof typeof translations.en, lang: Language): string {
  return translations[lang][key] || translations.en[key] || key;
}
