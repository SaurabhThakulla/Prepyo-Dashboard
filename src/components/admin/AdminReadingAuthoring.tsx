import React, { useState } from 'react';
import { ExamType } from '@/lib/types';
import AdminReadingBank from '@/components/admin/AdminReadingBank';
import AdminPassageUpload from '@/components/admin/AdminPassageUpload';
import AdminPassageDetail from '@/components/admin/AdminPassageDetail';
import AdminReorderUpload from '@/components/admin/AdminReorderUpload';

/**
 * Reading authoring: the bank, one passage, a new one, or re-order paragraphs.
 */
type View =
  | { name: 'bank' }
  | { name: 'new' }
  | { name: 'passage'; id: string }
  | { name: 'reorder' };

export default function AdminReadingAuthoring({
  initialTypeKey,
  exam = 'PTE',
}: {
  initialTypeKey?: string;
  exam?: ExamType;
}) {
  const [view, setView] = useState<View>({ name: 'bank' });
  const [bankVersion, setBankVersion] = useState(0);

  const backToBank = () => {
    setBankVersion(version => version + 1);
    setView({ name: 'bank' });
  };

  return (
    <div className="w-full h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      {view.name === 'bank' && (
        <AdminReadingBank
          initialTypeKey={initialTypeKey}
          initialExam={exam}
          reloadKey={bankVersion}
          onNew={() => setView({ name: 'new' })}
          onNewReorder={() => setView({ name: 'reorder' })}
          onOpen={id => setView({ name: 'passage', id })}
        />
      )}

      {view.name === 'new' && (
        <AdminPassageUpload
          initialExam={exam}
          initialTypeKey={initialTypeKey}
          onCancel={backToBank}
          onSaved={id => {
            setBankVersion(version => version + 1);
            setView({ name: 'passage', id });
          }}
        />
      )}

      {view.name === 'reorder' && (
        <AdminReorderUpload
          initialExam={exam}
          onCancel={backToBank}
          onSaved={backToBank}
        />
      )}

      {view.name === 'passage' && (
        <AdminPassageDetail
          passageId={view.id}
          onBack={backToBank}
          onChanged={() => setBankVersion(version => version + 1)}
        />
      )}
    </div>
  );
}
