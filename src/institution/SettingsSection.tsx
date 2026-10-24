import React from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { InstitutionAccount } from './api';
import { branchesLabel, examName, studentRangeLabel } from './profile';

/** The institution's details (edited in the setup screens) and the admin's own account. */
export default function SettingsSection({ account, onEdit }: { account: InstitutionAccount; onEdit: () => void }) {
  const { admin, institution } = account;
  const { profile } = institution;

  const details: [string, string][] = [
    ['Name', institution.name],
    ['Address', `${window.location.origin}/${institution.code}`],
    ['Exams', profile.exams.map(examName).join(', ')],
    ['City', profile.city],
    ['Branches', branchesLabel(profile.branches)],
    ['Students a month', studentRangeLabel(profile.monthlyStudents)],
  ];

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Institution details</CardTitle>
            <CardDescription>Shown on your students' sign-in page.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} className="rounded-full text-xs font-bold">
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit details
          </Button>
        </div>
        <List rows={details} />
      </Card>

      <Card className="space-y-3 p-5">
        <div>
          <CardTitle className="text-base">Your account</CardTitle>
          <CardDescription>To change the email or password, contact Prepyo.</CardDescription>
        </div>
        <List
          rows={[
            ['Admin', admin.name],
            ['Email', admin.email],
          ]}
        />
      </Card>
    </div>
  );
}

function List({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="break-all font-semibold text-foreground">{value || '—'}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
