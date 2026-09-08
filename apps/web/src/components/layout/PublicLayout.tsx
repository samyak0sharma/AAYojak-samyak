import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export function PublicLayout({ children }: { children?: ReactNode }) {
  return <div className="site-frame"><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader /><main id="main-content">{children ?? <Outlet />}</main><SiteFooter /></div>;
}

