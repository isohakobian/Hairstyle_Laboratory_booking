import React from 'react';
import { trpc } from '@/lib/trpc';

type Lang = 'ru' | 'en' | 'hy';

export default function PublishedReviewsMarquee({ language }: { language: Lang }) {
  const { data: reviews, isLoading } = trpc.reviews.published.useQuery();
  if (isLoading || !reviews?.length) return null;
  const title = language === 'ru' ? 'Говорят после визита' : language === 'hy' ? 'Հյուրերի կարծիքները' : 'After the visit';
  const subtitle = language === 'ru' ? 'Одобрено Isaac' : language === 'hy' ? 'Հաստատված Isaac-ի կողմից' : 'Approved by Isaac';
  const cards = [...reviews, ...reviews];
  return (
    <section className="reviews-marquee" aria-label={title}>
      <div className="reviews-marquee-heading"><span>{subtitle}</span><h2>{title}</h2></div>
      <div className="reviews-marquee-viewport">
        <div className="reviews-marquee-track">
          {cards.map((review, index) => <article className="reviews-marquee-card" key={`${review.id}-${index}`}>
            <div className="reviews-marquee-stars" aria-label={`${review.rating} out of 5`}>{'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span></div>
            {review.text && <p>“{review.text}”</p>}
            <strong>{review.clientName}</strong>
          </article>)}
        </div>
      </div>
    </section>
  );
}
