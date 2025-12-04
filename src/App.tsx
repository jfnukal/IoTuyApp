import { useState, useEffect } from 'react';
import './styles/index.css';
import { useAuth } from './contexts/AuthContext';
import { useFirestore } from './hooks/useFirestore';
import Login from './components/Login';
import { firestoreService } from './services/firestoreService';
import CalendarProvider from './components/Widgets/Calendar/CalendarProvider';
import { NotificationProvider } from './components/Notifications/NotificationProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppRoutes } from './routes';

declare global {
  interface Window {
    lastPositionUpdate?: string | null;
  }
}

function App() {
  // VŠECHNY HOOKY MUSÍ BÝT NA ZAČÁTKU - PŘED JAKÝMKOLIV RETURN!

  // Auth hooks
  const { currentUser } = useAuth();

  // Firestore hooks
  const {
    events: calendarEvents,
    loading: firebaseLoading,
    error: firebaseError,
  } = useFirestore();

  const navigate = useNavigate();
  const location = useLocation();

  const [familyMemberId, setFamilyMemberId] = useState<string | null>(null);

  // 🔐 Remote Config initialization - MUSÍ BÝT PRVNÍ!
  useEffect(() => {
    const initRemoteConfig = async () => {
      try {
        const { remoteConfigService } = await import(
          './services/remoteConfigService.ts'
        );
        await remoteConfigService.initialize();
      } catch (error) {
        console.error('❌ Chyba při inicializaci Remote Config:', error);
      }
    };

    initRemoteConfig();
  }, []);

  // Theme initialization - useEffect
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    }
  }, []);

  // Automatické mazání starých zpráv - 1x denně
  useEffect(() => {
    if (!currentUser) return;

    const runDailyCleanup = async () => {
      try {
        const { familyMessagingService } = await import(
          './services/familyMessagingService'
        );

      // Načíst ze settings
      const { settingsService } = await import('./services/settingsService');
      const settings = await settingsService.loadSettings();
      const daysToKeep = settings.widgets.messageHistory.deleteAfterDays;

        await familyMessagingService.runCleanup(daysToKeep);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };

    // Spustit cleanup při startu
    runDailyCleanup();

    // Spustit každých 24 hodin
    const intervalId = setInterval(runDailyCleanup, 24 * 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setFamilyMemberId(null);
      return;
    }

    const loadFamilyMember = async () => {
      setFamilyMemberId('dad');

      try {
        // Najdi family member podle authUid
        const member = await firestoreService.getFamilyMemberByAuthUid(
          currentUser.uid
        );

        if (member) {
          setFamilyMemberId(member.id);
        } else {
          console.warn(
            `⚠️ Nepodařilo se najít family member pro UID ${currentUser.uid}`
          );
          console.warn(
            '⚠️ Zkontroluj, že máš v Firestore přidané pole authUid'
          );
        }
      } catch (error) {
        console.error('❌ Chyba při načítání family member:', error);
      }
    };

    loadFamilyMember();
  }, [currentUser, firebaseLoading]);

  // ✅ BACK BUTTON HANDLER - useEffect zůstává kde je (kolem řádku 172)
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handleBackButton = (e: PopStateEvent) => {
      // ✅ KONTROLA: Pokud je otevřený modal, nech ho zpracovat back button
      const modalOpen = document.querySelector('.calendar-modal-overlay');
      if (modalOpen) {
        // Modal si to vyřeší sám
        return;
      }

      e.preventDefault();

      if (location.pathname === '/' || location.pathname === '') {
        window.history.pushState(null, '', window.location.href);
        return;
      }

      navigate(-1);
    };

    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [navigate, location]);

  if (!currentUser) {
    return <Login />;
  }

  

  
  if (firebaseError) {
    return (
      <div className="app-layout">
        <div className="modern-error-state">
          <div className="error-animation">
            <div className="error-icon">⚠️</div>
            <div className="error-pulse"></div>
          </div>
          <h2 className="error-title">Něco se pokazilo</h2>
          <p className="error-description">
            Nepodařilo se načíst data: {firebaseError}
          </p>
          <div className="error-actions">
            <button
              onClick={() => window.location.reload()}
              className="btn btn-modern btn-primary error-retry-btn"
            >
              <span className="btn-icon">↻</span>
              Obnovit stránku
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CalendarProvider events={calendarEvents}>
      <NotificationProvider
        authUid={currentUser?.uid || null}
        familyMemberId={familyMemberId || null}
      >
        <div className="app-layout">
          <AppRoutes familyMemberId={familyMemberId} />

          <div id="modal-root"></div>
        </div>
      </NotificationProvider>
    </CalendarProvider>
  );
}

export default App;
