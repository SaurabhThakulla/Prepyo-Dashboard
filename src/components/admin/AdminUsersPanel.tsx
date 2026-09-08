import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api, ApiError, errorMessage } from '@/lib/api';
import { formatExamDate } from '@/lib/dates';
import { ROLE_LABELS, UserRole } from '@/lib/types';

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
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => pickRole('')}
          className={`p-3.5 rounded-xl border text-left space-y-1 transition-colors ${
            roleFilter === '' ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">All users</span>
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="font-display text-2xl font-black text-foreground">{totalUsers.toLocaleString()}</div>
        </button>

        {counts.map(entry => (
          <button
            key={entry.role}
            type="button"
            onClick={() => pickRole(entry.role)}
            className={`p-3.5 rounded-xl border text-left space-y-1 transition-colors ${
              roleFilter === entry.role ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/50'
            }`}
          >
            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
              {ROLE_LABELS[entry.role] ?? entry.role}
            </span>
            <div className="font-display text-2xl font-black text-foreground">{entry.count.toLocaleString()}</div>
            <span className="text-[10px] text-muted-foreground">{entry.plan ?? 'access level'}</span>
          </button>
        ))}
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Users</CardTitle>
            <CardDescription className="text-xs">
              Changing a tier grants that plan for its full length, starting today. Admin is an access level and
              leaves the plan alone.
            </CardDescription>
          </div>

          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name or email"
                className="pl-8 w-52"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" className="font-bold text-xs">
              Search
            </Button>
          </form>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-[11px] font-medium text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[820px]">
            <thead>
              <tr className="text-left text-[10px] uppercase text-muted-foreground font-bold border-b border-border">
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Plan period</th>
                <th className="py-2 pr-3">Exam</th>
                <th className="py-2 pr-3 text-right">XP</th>
                <th className="py-2 pr-3">Joined</th>
                <th className="py-2 w-36">Change role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3">
                    <div className="font-bold text-foreground">{user.name}</div>
                    <div className="text-[11px] text-muted-foreground">{user.email}</div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${ROLE_STYLES[user.role] ?? ROLE_STYLES.suru}`}
                    >
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">
                    {user.planValidUntil
                      ? `${formatExamDate(user.planStartedAt)} – ${formatExamDate(user.planValidUntil)}`
                      : `Since ${formatExamDate(user.planStartedAt)}`}
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{user.targetExam}</td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-foreground">
                    {user.xp.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{formatExamDate(user.createdAt)}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={user.role}
                        disabled={savingId === user.id}
                        onChange={e => changeRole(user, e.target.value as UserRole)}
                        className="h-8 rounded-lg border border-input bg-card px-2 text-xs disabled:opacity-50"
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
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading users…</span>
          </div>
        )}

        {!loading && users.length === 0 && !error && (
          <p className="py-6 text-center text-xs text-muted-foreground">No users match that search.</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">
            {from}–{to} of {total.toLocaleString()}
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
