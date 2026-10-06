import type { ComponentProps } from 'react';
import { Link, type LinkProps } from 'react-router';
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant,
  size,
  className = '',
  type = 'button',
  ...props
}: ComponentProps<'button'> & StyleProps) {
  return (
    <button type={type} className={`${buttonClasses(variant, size)} ${className}`} {...props} />
  );
}

/** Lien de navigation présenté comme un bouton. */
export function ButtonLink({ variant, size, className = '', ...props }: LinkProps & StyleProps) {
  return <Link className={`${buttonClasses(variant, size)} ${className}`} {...props} />;
}
