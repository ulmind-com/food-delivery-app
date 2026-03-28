const BASE_URL = 'https://food-delivery-backend-173b.onrender.com';

export const resolveImageURL = (url?: string): string => {
  if (!url) return 'https://placehold.co/400x400';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/api/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/api/upload/image/${url}`;
};
