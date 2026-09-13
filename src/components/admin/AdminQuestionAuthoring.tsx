import React, { useState } from 'react';
import { SkillType } from '@/lib/types';
import AdminQuestionBank from '@/components/admin/AdminQuestionBank';
import AdminQuestionForm from '@/components/admin/AdminQuestionForm';

export default function AdminQuestionAuthoring({ skill }: { skill: SkillType }) {
  const [editing, setEditing] = useState<{ id?: string } | null>(null);
  const [bankVersion, setBankVersion] = useState(0);

  return (
    <div className="w-full h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      {editing === null ? (
        <AdminQuestionBank
          skill={skill}
          reloadKey={bankVersion}
          onNew={() => setEditing({})}
          onEdit={id => setEditing({ id })}
        />
      ) : (
        <AdminQuestionForm
          key={editing.id ?? 'new'}
          skill={skill}
          questionId={editing.id}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setBankVersion(version => version + 1);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
