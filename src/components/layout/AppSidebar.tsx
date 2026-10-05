import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import ReportIssueDialog from '@/components/support/ReportIssueDialog';
import PrimaryIconRail from './sidebar/PrimaryIconRail';
import SecondaryPanel from './sidebar/SecondaryPanel';
import { useNavSections } from './sidebar/useNavSections';
import {
  getSectionFromPathname,
  isNavItemActive,
  PrimarySectionId,
  SecondaryNavItem,
} from './sidebar/navigation';

export type { PrimarySectionId };

interface AppSidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isSecondaryOpen: boolean;
  setIsSecondaryOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

/**
 * The two-level sidebar.
 *
 *   PrimaryIconRail   always visible, one icon per section
 *   SecondaryPanel    the wide panel, collapsible, shows that section's links
 *
 * What goes in the menu lives in `sidebar/navigation.ts`. This file only tracks
 * which section is selected and passes things down.
 */
export default function AppSidebar({
  isOpen,
  setIsOpen,
  isSecondaryOpen,
  setIsSecondaryOpen,
}: AppSidebarProps) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, activeExam, setActiveExam, setIsTutorOpen, logout } = useApp();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<PrimarySectionId>(() =>
    getSectionFromPathname(pathname, searchParams),
  );

  // Follow the URL, so arriving at a page by any route selects its section.
  useEffect(() => {
    setActiveSection(getSectionFromPathname(pathname, searchParams));
  }, [pathname, searchParams]);

  const sections = useNavSections();
  const currentSection = sections.find(section => section.id === activeSection) ?? sections[0];

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, setIsOpen]);

  const closeMobileSidebar = () => setIsOpen(false);

  const handleSectionClick = (sectionId: PrimarySectionId) => {
    if (activeSection === sectionId) {
      // Clicking the selected icon again collapses the panel.
      setIsSecondaryOpen(prev => !prev);
    } else {
      setActiveSection(sectionId);
      setIsSecondaryOpen(true);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsOpen(false);
      setIsSecondaryOpen(false);
      navigate('/login');
      setIsSigningOut(false);
    }
  };

  const isItemActive = (item: SecondaryNavItem) => isNavItemActive(item, pathname, searchParams);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => {
            setIsOpen(false);
            setIsSecondaryOpen(false);
          }}
        />
      )}

      <div
        className={`fixed top-0 h-dvh left-0 z-40 hidden lg:flex transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <PrimaryIconRail
          sections={sections}
          activeSection={activeSection}
          isSecondaryOpen={isSecondaryOpen}
          user={user}
          isSigningOut={isSigningOut}
          onSectionClick={handleSectionClick}
          onLogoClick={() => {
            setActiveSection('home');
            setIsSecondaryOpen(true);
            closeMobileSidebar();
          }}
          onReportIssue={() => {
            setIsReportOpen(true);
            setIsOpen(false);
          }}
          onCloseMobile={closeMobileSidebar}
          onSignOut={handleSignOut}
        />

        <SecondaryPanel
          section={currentSection}
          isOpen={isSecondaryOpen}
          activeExam={activeExam}
          user={user}
          isItemActive={isItemActive}
          onExamChange={setActiveExam}
          onOpenTutor={() => {
            setIsTutorOpen(true);
            setIsOpen(false);
          }}
          onNavigate={closeMobileSidebar}
        />
      </div>

      <ReportIssueDialog open={isReportOpen} onOpenChange={setIsReportOpen} />
    </>
  );
}

