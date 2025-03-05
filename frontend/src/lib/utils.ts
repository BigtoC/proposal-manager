import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isLoveApp() {
  // 💖-> %F0%9F%92%96
  return window.location.pathname.includes('%F0%9F%92%96');
}
