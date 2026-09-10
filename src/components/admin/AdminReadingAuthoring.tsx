import React, { useState } from 'react';
import AdminReadingBank from '@/components/admin/AdminReadingBank';
import AdminPassageUpload from '@/components/admin/AdminPassageUpload';
import AdminPassageDetail from '@/components/admin/AdminPassageDetail';

/**
 * Reading authoring: the bank, one passage, or a new one.
 *
 * Three screens rather than three routes. The reading section already sits
 * behind /practice?skill=reading, and an admin moves between them in one flow —
 * open a passage, add a set, come back — which a URL per screen would not make
 * any clearer.
 */
type View = { name: 'bank' } | { name: 'new' } | { name: 'passage'; id: string };

export default function AdminReadingAuthoring() {
  const [view, setView] = useState<View>({ name: 'bank' });
  // Bumped whenever a screen changes the bank, so the list reloads when it
  // comes back into view rather than showing counts from before the edit.
  const [bankVersion, setBankVersion] = useState(0);

  const backToBank = () => {
    setBankVersion(version => version + 1);
    setView({ name: 'bank' });
  };

  return (
    <div className="w-full h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      {view.name === 'bank' && (
        <AdminReadingBank
          reloadKey={bankVersion}
          onNew={() => setView({ name: 'new' })}
          onOpen={id => setView({ name: 'passage', id })}
        />
      )}

      {view.name === 'new' && (
        <AdminPassageUpload
          onCancel={backToBank}
          onSaved={id => {
            setBankVersion(version => version + 1);
            setView({ name: 'passage', id });
          }}
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
