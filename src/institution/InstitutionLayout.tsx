import React, { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronRight, ClipboardCheck, CreditCard, Layers, Loader2, LogOut, LucideIcon, Menu, Settings, Users, Wallet } from 'lucide-react';
import { formatExamDate } from '@/lib/dates';
import AnimatedLogo from '@/components/layout/AnimatedLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { InstitutionAccount, PLANS } from './api';
import { dashboardPath, sectionPath } from './paths';
import BrandMark from './BrandMark';
import { brandGradient, useBrandColor } from './brand';

// 'overview' is the institution's main address, which is its students page.
export type InstitutionSection = 'overview' | 'batches' | 'mocks' | 'fees' | 'subscription' | 'settings';

const NAV: { id: InstitutionSection; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Students', icon: Users },
  { id: 'batches', label: 'Batches', icon: Layers },
  { id: 'mocks', label: 'Institute Mocks', icon: ClipboardCheck },
  { id: 'fees', label: 'Fees', icon: Wallet },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface Props {
  account: InstitutionAccount;
  // The page's name, shown in the top bar.
  title: string;
  signingOut: boolean;
  onSignOut: () => void;
  children: React.ReactNode;
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?';

/**
 * The signed-in institution admin's frame, built on the shadcn sidebar and styled like the
 * learner app: the blue sidebar with white rows, a round toggle on its edge, and the same top bar.
 */
export default function InstitutionLayout({ account, title, signingOut, onSignOut, children }: Props) {
  // The brand colour from Settings colours the whole dashboard, not only the sign-in page.
  useBrandColor(account.institution.profile.brandColor);

  return (
    <SidebarProvider style={{ '--sidebar-width': '17rem', '--sidebar-width-icon': '4rem' } as React.CSSProperties}>
      <InstitutionSidebar account={account} signingOut={signingOut} onSignOut={onSignOut} />
      <SidebarInset className="app-backdrop">
        <TopBar account={account} title={title} signingOut={signingOut} onSignOut={onSignOut} />
        <div className="flex-1 px-4 py-5 sm:px-6 lg:py-6">
          <div className="w-full">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Rows as in the learner sidebar: an icon tile, white when the page is open.
const ROW =
  'h-auto gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 text-[13.5px] font-medium text-white/85 hover:bg-white/10 hover:text-white focus-visible:ring-white active:bg-white/15 active:text-white ' +
  'data-[active=true]:bg-white data-[active=true]:font-semibold data-[active=true]:text-primary data-[active=true]:shadow-lg data-[active=true]:shadow-black/15 dark:data-[active=true]:text-blue-950 ' +
  'group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!p-1 group-data-[collapsible=icon]:justify-center';
const TILE =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/75 transition-colors group-hover/menu-item:bg-white/15 group-hover/menu-item:text-white ' +
  'group-data-[active=true]/row:bg-primary/10 group-data-[active=true]/row:text-primary dark:group-data-[active=true]/row:text-blue-950';

function InstitutionSidebar({ account, signingOut, onSignOut }: { account: InstitutionAccount; signingOut: boolean; onSignOut: () => void }) {
  const { institution, admin } = account;
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile, open, toggleSidebar } = useSidebar();
  const plan = institution.plan ? PLANS[institution.plan] : null;

  // Picking a page closes the phone menu.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div
        className="relative flex h-full flex-col bg-gradient-to-b from-[#2a56cf] via-primary to-[#132e7d] text-white dark:from-blue-950 dark:via-blue-950 dark:to-slate-950"
        style={{ backgroundImage: brandGradient(institution.profile.brandColor) }}
      >
        <SidebarHeader className="gap-4 px-3 pb-2 pt-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <Link to={dashboardPath(institution.code)} className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:px-0" title="Students">
            <AnimatedLogo size={36} />
            <span className="font-display text-base font-black group-data-[collapsible=icon]:hidden">prepyo</span>
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide group-data-[collapsible=icon]:hidden">
              <Building2 className="h-3 w-3" /> Institution
            </span>
          </Link>

          <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-2.5 pr-3 backdrop-blur-sm group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
            <BrandMark
              name={institution.name}
              logoUrl={institution.logoUrl}
              color={institution.profile.brandColor}
              className="h-10 w-10 shrink-0 rounded-xl text-sm shadow-md shadow-black/15 ring-2 ring-white/40"
            />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate font-display text-[15px] font-bold leading-tight">{institution.name}</p>
              <p className="mt-0.5 truncate text-[11px] text-white/65">{admin.name}</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="no-scrollbar">
          <SidebarGroup className="px-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
            <SidebarGroupLabel className="px-3 font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
              Manage
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu aria-label="Institution" className="gap-1">
                {NAV.map(({ id, label, icon: Icon }) => {
                  const to = sectionPath(institution.code, id);
                  return (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuButton asChild isActive={pathname === to} tooltip={label} className={`group/row ${ROW}`}>
                        <NavLink to={to} end>
                          <span className={TILE}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="group-data-[collapsible=icon]:hidden">{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-2 p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-xs group-data-[collapsible=icon]:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Plan</p>
            <p className="mt-0.5 font-display text-sm font-bold">{plan ? `${plan.name} · ${institution.seatLimit} students` : 'No plan yet'}</p>
            {institution.validUntil && (
              <p className="mt-0.5 text-white/70">
                {institution.status === 'expired' ? 'Ended' : 'Until'} {formatExamDate(institution.validUntil)}
              </p>
            )}
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onSignOut} disabled={signingOut} tooltip="Sign out" className={`group/row ${ROW}`}>
                <span className={TILE}>{signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}</span>
                <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        {/* Round toggle halfway down the sidebar's edge, as in the learner app. */}
        {!isMobile && (
          <button
            type="button"
            onClick={toggleSidebar}
            title={open ? 'Hide menu' : 'Show menu'}
            aria-label={open ? 'Hide menu' : 'Show menu'}
            aria-expanded={open}
            className="group absolute -right-5 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-xl shadow-primary/30 transition-all hover:scale-105 hover:bg-primary/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-slate-900"
          >
            {open ? (
              <ChevronLeft className="h-6 w-6 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            ) : (
              <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-0.5" aria-hidden />
            )}
          </button>
        )}
      </div>
    </Sidebar>
  );
}

/** The top bar: the learner header on desktop, the learner phone bar (with a menu button) below md. */
function TopBar({ account, title, signingOut, onSignOut }: { account: InstitutionAccount; title: string; signingOut: boolean; onSignOut: () => void }) {
  const { institution, admin } = account;
  const { toggleSidebar } = useSidebar();
  const plan = institution.plan ? PLANS[institution.plan] : null;
  const expired = institution.status !== 'active';

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full min-w-0 items-center justify-between gap-2 border-b border-border/70 bg-card/85 px-2 backdrop-blur-xl transition-colors md:h-16 md:border-border md:bg-card/80 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-1 md:gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open menu"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground active:bg-muted md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate font-display text-lg font-bold text-foreground md:hidden">{title}</p>
        <div className="hidden min-w-0 items-center gap-2 text-xs md:flex">
          <span className="truncate font-medium text-muted-foreground">{institution.name}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-bold text-foreground" title={title}>
            {title}
          </span>
        </div>
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-3">
        {plan && (
          <div
            title="Your plan"
            className={`hidden h-9 items-center gap-1.5 rounded-full border pl-1 pr-3 shadow-sm md:flex ${
              expired ? 'border-rose-500/30 bg-rose-500/10' : 'border-border bg-card'
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full shadow-sm ${
                expired ? 'bg-rose-500' : 'bg-gradient-to-br from-sky-400 to-primary shadow-primary/30'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-white" />
            </span>
            <span className={`whitespace-nowrap text-xs font-bold ${expired ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
              {plan.name} plan
              {institution.validUntil && (
                <span className="font-medium text-muted-foreground">
                  {' '}
                  · {institution.status === 'expired' ? 'ended' : 'until'} {formatExamDate(institution.validUntil)}
                </span>
              )}
            </span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Account menu" className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none active:bg-muted md:mr-0 md:h-9 md:w-9">
            <Avatar className="h-8 w-8 ring-2 ring-primary/15 md:h-9 md:w-9">
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">{initialsOf(admin.name)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
            <DropdownMenuLabel className="p-0 pb-1 font-normal">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
                <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">{initialsOf(admin.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{admin.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{admin.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSignOut} disabled={signingOut} className="gap-3 rounded-xl px-2.5 py-2 text-[13px] font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <LogOut className="h-4 w-4" />
              </span>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
