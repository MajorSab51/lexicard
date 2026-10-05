export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50 select-none';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-fg hover:bg-surface-muted',
  ghost: 'text-fg hover:bg-surface-muted',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-bg',
};

// Hauteur minimale de 44 px (taille md) pour un usage confortable au doigt.
const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-13 px-6 text-lg',
};

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return `${base} ${variants[variant]} ${sizes[size]}`;
}
