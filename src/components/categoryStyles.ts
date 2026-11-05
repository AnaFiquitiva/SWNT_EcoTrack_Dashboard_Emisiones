import type { Category } from '../types/emission';

interface CategoryStyle {
  icon: string;
  badge: string;
  accent: string;
  bar: string;
}

export const CATEGORY_STYLES: Readonly<Record<Category, CategoryStyle>> = {
  transporte: { icon: '🚚', badge: 'bg-sky-50 text-sky-800 ring-sky-200', accent: 'border-l-sky-500', bar: 'bg-sky-500' },
  energia: { icon: '⚡', badge: 'bg-amber-50 text-amber-800 ring-amber-200', accent: 'border-l-amber-500', bar: 'bg-amber-500' },
  residuos: { icon: '♻️', badge: 'bg-emerald-50 text-emerald-800 ring-emerald-200', accent: 'border-l-emerald-500', bar: 'bg-emerald-500' },
};
