import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  CreditCard,
  BarChart2,
  Gift,
  Users,
  UserRound,
  UsersRound,
  Settings,
  Webhook,
  Search,
  User,
} from 'lucide-react';

interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  type: 'student' | 'tutor' | 'nav';
  url: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: Omit<SearchResult, 'id'>[] = [
  {
    label: 'Overview',
    sublabel: 'Admin dashboard home',
    type: 'nav',
    url: '/admin-dashboard?tab=overview',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    label: 'Class Logs',
    sublabel: 'Completed classes & payments',
    type: 'nav',
    url: '/admin-dashboard?tab=schedule',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: 'Calendar',
    sublabel: 'Scheduled classes',
    type: 'nav',
    url: '/admin-dashboard?tab=calendar',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    label: 'Students',
    sublabel: 'Student directory',
    type: 'nav',
    url: '/admin-dashboard?tab=students',
    icon: <Users className="h-4 w-4" />,
  },
  {
    label: 'Tutors',
    sublabel: 'Tutor directory',
    type: 'nav',
    url: '/admin-dashboard?tab=tutors',
    icon: <UserRound className="h-4 w-4" />,
  },
  {
    label: 'Assignments',
    sublabel: 'Tutor-student assignments',
    type: 'nav',
    url: '/admin-dashboard?tab=assignments',
    icon: <UsersRound className="h-4 w-4" />,
  },
  {
    label: 'Reports',
    sublabel: 'Quarterly reports',
    type: 'nav',
    url: '/admin-dashboard?tab=reports',
    icon: <BarChart2 className="h-4 w-4" />,
  },
  {
    label: 'Referrals',
    sublabel: 'Referral analytics & codes',
    type: 'nav',
    url: '/admin-dashboard?tab=referrals',
    icon: <Gift className="h-4 w-4" />,
  },
  {
    label: 'Credit Tools',
    sublabel: 'Manual credit allocation',
    type: 'nav',
    url: '/admin-dashboard?tab=credits',
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    label: 'Payments',
    sublabel: 'Stripe webhook event log',
    type: 'nav',
    url: '/admin-dashboard?tab=payments',
    icon: <Webhook className="h-4 w-4" />,
  },
  {
    label: 'Settings',
    sublabel: 'Platform settings',
    type: 'nav',
    url: '/admin-dashboard?tab=settings',
    icon: <Settings className="h-4 w-4" />,
  },
];

interface PaletteProps {
  open: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<PaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch students + tutors once (stale 5 min)
  const { data: people = [] } = useQuery({
    queryKey: ['command-palette-people'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role')
        .in('role', ['student', 'tutor'])
        .order('first_name');
      return data ?? [];
    },
    staleTime: 5 * 60_000,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results: SearchResult[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    const navResults: SearchResult[] = NAV_ITEMS.filter(
      (n) =>
        !q ||
        n.label.toLowerCase().includes(q) ||
        n.sublabel.toLowerCase().includes(q)
    ).map((n, i) => ({ ...n, id: `nav-${i}` }));

    if (!q) return navResults;

    const peopleResults: SearchResult[] = people
      .filter((p) => {
        const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase();
        return name.includes(q) || (p.email ?? '').toLowerCase().includes(q);
      })
      .slice(0, 6)
      .map((p) => {
        const name =
          [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email;
        const tab = p.role === 'student' ? 'students' : 'tutors';
        return {
          id: p.id,
          label: name,
          sublabel: `${p.role} · ${p.email}`,
          type: p.role as 'student' | 'tutor',
          url: `/admin-dashboard?tab=${tab}&q=${encodeURIComponent(name)}`,
          icon: <User className="h-4 w-4" />,
        };
      });

    return [...peopleResults, ...navResults];
  }, [query, people]);

  useEffect(() => {
    setCursor(0);
  }, [results.length]);

  const select = (item: SearchResult) => {
    navigate(item.url);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
    if (e.key === 'Enter' && results[cursor]) select(results[cursor]);
    if (e.key === 'Escape') onClose();
  };

  // Scroll cursor into view
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-idx="${cursor}"]`
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const sections = query.trim()
    ? [
        { title: 'People', items: results.filter((r) => r.type !== 'nav') },
        { title: 'Navigation', items: results.filter((r) => r.type === 'nav') },
      ].filter((s) => s.items.length > 0)
    : [{ title: 'Navigation', items: results }];

  let globalIdx = 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        className="p-0 gap-0 max-w-lg overflow-hidden"
        aria-label="Command palette"
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search students, tutors, or navigate…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No results for "{query}"
            </p>
          ) : (
            sections.map((section) => (
              <div key={section.title}>
                <p className="px-4 py-1.5 text-xs font-medium text-muted-foreground">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const idx = globalIdx++;
                  const isActive = cursor === idx;
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => select(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                    >
                      <span className="text-muted-foreground shrink-0">
                        {item.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate">
                          {item.label}
                        </span>
                        <span className="text-xs text-muted-foreground block truncate">
                          {item.sublabel}
                        </span>
                      </span>
                      {isActive && (
                        <kbd className="hidden sm:inline-flex shrink-0 h-5 items-center rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
