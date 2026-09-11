import React, { useState } from 'react';
import { SkillType } from '@/lib/types';
import AdminQuestionBank from '@/components/admin/AdminQuestionBank';
import AdminQuestionForm from '@/components/admin/AdminQuestionForm';

export default function AdminQuestionAuthoring({ skill }: { skill: SkillType }) {
  const [view, setView] = useState<'bank' | 'new'>('bank');
  const [bankVersion, setBankVersion] = useState(0);

  return (
    <div className="w-full h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      {view === 'bank' ? (
        <AdminQuestionBank skill={skill} reloadKey={bankVersion} onNew={() => setView('new')} />
      ) : (
        <AdminQuestionForm
          skill={skill}
          onCancel={() => setView('bank')}
          onSaved={() => {
            setBankVersion(version => version + 1);
            setView('bank');
          }}
        />
      )}
    </div>
  );
}
