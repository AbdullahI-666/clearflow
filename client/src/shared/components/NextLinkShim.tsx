import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

export interface NextLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children: React.ReactNode;
}

const Link: React.FC<NextLinkProps> = ({ href, children, ...props }) => {
  return (
    <RouterLink to={href || '#'} {...(props as any)}>
      {children}
    </RouterLink>
  );
};

export default Link;
export { Link };
