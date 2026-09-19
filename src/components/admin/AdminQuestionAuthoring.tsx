import React, { useState } from 'react';
import { ExamType, SkillType } from '@/lib/types';
import AdminQuestionBank from '@/components/admin/AdminQuestionBank';
import AdminQuestionForm from '@/components/admin/AdminQuestionForm';

export default function AdminQuestionAuthoring({
  skill,
  initialTypeKey,
  exam = 'PTE',
}: {
  skill: SkillType;
  initialTypeKey?: string;
  exam?: ExamType;
}) {
  const [editing, setEditing] = useState<{ id?: string; initialTypeId?: string } | null>(null);
  const [bankVersion, setBankVersion] = useState(0);

  return (
    <div className="w-full h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      {editing === null ? (
        <AdminQuestionBank
          skill={skill}
          initialTypeKey={initialTypeKey}
          exam={exam}
          reloadKey={bankVersion}
          onNew={(preselectedTypeId?: string) => setEditing({ initialTypeId: preselectedTypeId })}
          onEdit={id => setEditing({ id })}
        />
      ) : (
        <AdminQuestionForm
          key={editing.id ?? editing.initialTypeId ?? 'new'}
          skill={skill}
          questionId={editing.id}
          initialTypeId={editing.initialTypeId}
          initialTypeKey={initialTypeKey}
          initialExam={exam}
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
