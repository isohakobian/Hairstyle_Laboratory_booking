import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/contexts/LanguageContext";

const copy: Record<Language, { title: string; body: string; moved: string; home: string }> = {
  hy: {
    title: 'Էջը չի գտնվել',
    body: 'Ներողություն, որոնվող էջը գոյություն չունի։',
    moved: 'Հնարավոր է՝ այն տեղափոխվել կամ ջնջվել է։',
    home: 'Գլխավոր էջ',
  },
  ru: {
    title: 'Страница не найдена',
    body: 'Извините, страница, которую вы ищете, не существует.',
    moved: 'Возможно, она была перемещена или удалена.',
    home: 'На главную',
  },
  en: {
    title: 'Page Not Found',
    body: 'Sorry, the page you are looking for does not exist.',
    moved: 'It may have been moved or deleted.',
    home: 'Go Home',
  },
};

export default function NotFound() {
  const { language } = useLanguage() as { language: Language };
  const c = copy[language] ?? copy.hy;
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-lg mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-100 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-red-500" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>

          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            {c.title}
          </h2>

          <p className="text-slate-600 mb-8 leading-relaxed">
            {c.body}
            <br />
            {c.moved}
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              onClick={handleGoHome}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              {c.home}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
