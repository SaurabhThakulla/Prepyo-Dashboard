import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatExamDate } from '@/lib/dates';
import { ExamType, ROLE_LABELS, UserRole } from '@/lib/types';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  planId: string;
  planStartedAt: string;
  planValidUntil?: string;
  targetExam: string;
  xp: number;
  streakDays: number;
  createdAt: string;
}

interface RoleCount {
  role: UserRole;
  plan: string;
  count: number;
}

interface UsersResponse {
  users: AdminUser[];
  countsByRole: RoleCount[];
  meta: { limit: number; offset: number; total: number; hasMore: boolean };
}

const PAGE_SIZE = 20;
const ROLES: UserRole[] = ['admin', 'suru', 'abhyas', 'taiyari', 'udaan'];

const ROLE_STYLES: Record<UserRole, string> = {
  admin: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
  suru: 'bg-muted text-muted-foreground border-border',
  abhyas: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
  taiyari: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',
  udaan: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
};

export default function AdminUsersPanel() {
  const toast = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [counts, setCounts] = useState<RoleCount[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (query) params.set('q', query);
      if (roleFilter) params.set('role', roleFilter);

      const data = await api.get<UsersResponse>(`/admin/users?${params}`);
      setUsers(data.users ?? []);
      setCounts(data.countsByRole ?? []);
      setTotal(data.meta?.total ?? 0);
      setError(null);
      setUnavailable(false);
    } catch (err) {
      // A 404 here is not a broken page: it is this build talking to an API
      // deployed before /admin/users existed. Say so, rather than showing the
      // API's own "No such endpoint".
      if (err instanceof ApiError && err.status === 404) {
        setUnavailable(true);
        setError(null);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [offset, query, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (user: AdminUser, role: UserRole) => {
    if (role === user.role) return;

    setSavingId(user.id);
    try {
      const data = await api.patch<{ user: AdminUser }>(`/admin/users/${user.id}/role`, { role });
      setUsers(current => current.map(u => (u.id === user.id ? data.user : u)));
      toast.success('Role updated', `${data.user.name} is now ${ROLE_LABELS[data.user.role] ?? data.user.role}.`);
      load();
    } catch (err) {
      const message = errorMessage(err);
      toast.error('Could not change that role', message);
    } finally {
      setSavingId(null);
    }
  };

  const changeExam = async (user: AdminUser, targetExam: ExamType) => {
    if (targetExam === user.targetExam) return;

    setSavingId(user.id);
    try {
      const data = await api.patch<{ user: AdminUser }>(`/admin/users/${user.id}/exam`, { targetExam });
      setUsers(current => current.map(u => (u.id === user.id ? data.user : u)));
      toast.success('Exam updated', `${data.user.name} is now preparing for ${data.user.targetExam}. Their target scores were cleared because the exam scales differ.`);
    } catch (err) {
      toast.error('Could not change that exam', errorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setOffset(0);
    setQuery(search.trim());
  };

  const pickRole = (role: UserRole | '') => {
    setOffset(0);
    setRoleFilter(role);
  };

  if (unavailable) {
    return (
      <Card className="p-6 space-y-2">
        <CardTitle className="text-base">Users</CardTitle>
        <CardDescription className="text-xs">
          The API this page is talking to was deployed before the user directory existed, so there is nothing to
          list yet. Deploy the current backend and reload.
        </CardDescription>
      </Card>
    );
  }

  const totalUsers = counts.reduce((sum, entry) => sum + entry.count, 0);
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => pickRole('')}
          aria-pressed={roleFilter === ''}
          className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
            roleFilter === ''
              ? 'border-primary bg-primary text-primary-foreground shadow-md'
              : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">All users</span>
            <Users className="w-4 h-4 opacity-80" />
          </div>
          <div className="font-display text-3xl font-black">{totalUsers.toLocaleString()}</div>
          <span className={`text-xs ${roleFilter === '' ? 'text-primary-foreground/75' : 'text-foreground/60'}`}>
            every account
          </span>
        </button>

        {counts.map(entry => {
          const active = roleFilter === entry.role;
          return (
            <button
              key={entry.role}
              type="button"
              onClick={() => pickRole(entry.role)}
              aria-pressed={active}
              className={`p-4 rounded-xl border text-left space-y-1 transition-all ${
                ROLE_STYLES[entry.role] ?? ROLE_STYLES.suru
              } ${active ? 'ring-2 ring-offset-2 ring-offset-background ring-current shadow-md' : 'hover:shadow-sm'}`}
            >
              <span className="text-sm font-bold block">{ROLE_LABELS[entry.role] ?? entry.role}</span>
              <div className="font-display text-3xl font-black">{entry.count.toLocaleString()}</div>
              <span className="text-xs capitalize opacity-80">{entry.plan ?? 'access level'}</span>
            </button>
          );
        })}
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-lg font-bold text-foreground">
              {roleFilter ? `${ROLE_LABELS[roleFilter] ?? roleFilter} users` : 'All users'}
            </CardTitle>
            <CardDescription className="text-sm text-foreground/60">
              Changing a tier grants that plan for its full length, starting today. Admin is an access level and
              leaves the plan alone.
            </CardDescription>
          </div>

          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or email"
                className="pl-9 w-64"
              />
            </div>
            <Button type="submit" size="sm" className="font-bold">
              Search
            </Button>
          </form>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-sm font-medium text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-foreground/70 font-bold bg-muted/60 whitespace-nowrap">
                <th className="py-3 px-4">User</th>
                <th className="py-3 pr-3">Role</th>
                <th className="py-3 pr-3">Started</th>
                <th className="py-3 pr-3">Expires</th>
                <th className="py-3 pr-3 w-32">Exam</th>
                <th className="py-3 pr-3 text-right">XP</th>
                <th className="py-3 pr-3">Joined</th>
                <th className="py-3 pr-4 w-36">Change role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(user => (
                <tr key={user.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 px-4 max-w-[280px]">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                          ROLE_STYLES[user.role] ?? ROLE_STYLES.suru
                        }`}
                        aria-hidden
                      >
                        {initials(user.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">{user.name}</div>
                        <div className="text-xs text-foreground/60 truncate">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <Badge
                      variant="outline"
                      className={`text-xs font-bold whitespace-nowrap ${ROLE_STYLES[user.role] ?? ROLE_STYLES.suru}`}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3 text-foreground/75 whitespace-nowrap">
                    {formatExamDate(user.planStartedAt)}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <ExpiryCell validUntil={user.planValidUntil} />
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      aria-label={`Change ${user.name}'s exam`}
                      value={user.targetExam}
                      disabled={savingId === user.id}
                      onChange={e => changeExam(user, e.target.value as ExamType)}
                      className="h-9 rounded-lg border border-input bg-card px-2 text-sm font-semibold text-foreground disabled:opacity-50"
                    >
                      <option value="PTE">PTE</option>
                      <option value="IELTS">IELTS</option>
                      <option value="EPS_TOPIK">EPS-TOPIK</option>
                      <option value="JLPT">JLPT</option>
                    </select>
                  </td>
                  <td className="py-3 pr-3 text-right font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                    {user.xp.toLocaleString()}
                  </td>
                  <td className="py-3 pr-3 text-foreground/75 whitespace-nowrap">{formatExamDate(user.createdAt)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label={`Change ${user.name}'s role`}
                        value={user.role}
                        disabled={savingId === user.id}
                        onChange={e => changeRole(user, e.target.value as UserRole)}
                        className="h-9 rounded-lg border border-input bg-card px-2 text-sm font-semibold text-foreground disabled:opacity-50"
                      >
                        {ROLES.map(role => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      {savingId === user.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-foreground/60">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading users…</span>
          </div>
        )}

        {!loading && users.length === 0 && !error && (
          <p className="py-6 text-center text-sm text-foreground/60">No users match that search.</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-sm text-foreground/70">
            Showing <b className="text-foreground">{from}–{to}</b> of <b className="text-foreground">{total.toLocaleString()}</b>
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-bold text-xs"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-bold text-xs"
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** "Ram Bahadur Thapa" → "RT", "sita" → "S". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

/**
 * When a plan runs out.
 *
 * Suru is the free tier and never expires, so it reads "None" rather than an
 * empty cell — scanning the column, an admin should not have to wonder whether
 * the date is missing or absent by design.
 *
 * A date already past is called out. The row's tier will read Suru by then,
 * because the hourly reconcile has dropped it, and without this the leftover
 * date would look like a live one.
 */
function ExpiryCell({ validUntil }: { validUntil?: string }) {
  if (!validUntil) return <span className="text-muted-foreground">None</span>;

  // Compared at end of day: a plan valid until the 8th is still valid on the 8th.
  const expired = new Date(`${validUntil}T23:59:59`) < new Date();

  return (
    <span className={expired ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-foreground'}>
      {formatExamDate(validUntil)}
      {expired && <span className="ml-1 text-xs font-bold uppercase">expired</span>}
    </span>
  );
}
