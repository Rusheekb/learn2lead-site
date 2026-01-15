import { useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Route configuration for breadcrumb labels
const routeLabels: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/tutor-dashboard': 'Tutor Dashboard',
  '/admin-dashboard': 'Admin Dashboard',
  '/profile': 'Profile',
  '/pricing': 'Pricing',
  '/login': 'Login',
};

// Tab labels for dashboard pages
const tabLabels: Record<string, Record<string, string>> = {
  '/dashboard': {
    dashboard: 'Overview',
    schedule: 'Schedule',
    resources: 'Resources',
  },
  '/tutor-dashboard': {
    schedule: 'Class Scheduler',
    students: 'My Students',
  },
  '/admin-dashboard': {
    schedule: 'Class Logs',
    tutors: 'Tutors',
    students: 'Students',
    assignments: 'Assignments',
    credits: 'Credits',
    reports: 'Reports',
    settings: 'Settings',
  },
};

const BASE_URL = 'https://learn2lead.vercel.app';

export const PageBreadcrumbs = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab');

  // Build breadcrumb items based on current route
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

    // Get the base route label
    const baseLabel = routeLabels[pathname];
    if (baseLabel && pathname !== '/') {
      items.push({ label: baseLabel, href: activeTab ? pathname : undefined });
    }

    // Add tab as final breadcrumb if present
    if (activeTab && tabLabels[pathname]?.[activeTab]) {
      items.push({ label: tabLabels[pathname][activeTab] });
    }

    return items;
  }, [pathname, activeTab]);

  // Inject JSON-LD BreadcrumbList schema
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-schema';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.href ? `${BASE_URL}${item.href}` : undefined,
      })),
    });

    // Remove existing script if present
    const existing = document.getElementById('breadcrumb-schema');
    if (existing) {
      existing.remove();
    }

    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('breadcrumb-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [breadcrumbs]);

  // Don't show breadcrumbs on homepage
  if (pathname === '/') {
    return null;
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <BreadcrumbItem key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              {isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.href || '/'} className="flex items-center gap-1">
                    {isFirst && <Home className="h-3.5 w-3.5" />}
                    {!isFirst && item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default PageBreadcrumbs;
