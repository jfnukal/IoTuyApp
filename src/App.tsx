import { useState, useEffect, Suspense } from 'react';
import './styles/index.css';
import { useAuth } from './contexts/AuthContext';
import { useFirestore } from './hooks/useFirestore';
import Login from './components/Login';
import { firestoreService } from './services/firestoreService';
import CalendarProvider from './components/Widgets/Calendar/CalendarProvider';
import { NotificationProvider } from './components/Notifications/NotificationProvider';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppRoutes } from './routes';
import { AiWidget } from './AI/components/AiWidget';
import { RoomsProvider } from './contexts/RoomsContext';

// 🆕 Komponenta pro načítání (Spinner)
// Zobrazí se okamžitě, když uživatel klikne na stránku, která se teprve stahuje
// Opravený PageLoader v App.tsx
const PageLoader = () => (
  <div
    className="flex items-center justify-center w-full"
    style={{
      minHeight: '100vh',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex' /* Jistota pro centrování */,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <div className="text-center">
      {/* CSS Spinner bez emoji */}
      <div className="spinner-global"></div>
      <p
        style={{
          color: 'rgba(255,255,255,0.9)',
          marginTop: '20px',
          fontSize: '1.2rem',
          fontFamily: 'sans-serif',
        }}
      >
        Načítám aplikaci...
      </p>
    </div>
  </div>
);

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

  // 🔐 Remote Config initialization
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

  // Theme initialization
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
        // Dynamický import pro úsporu výkonu při startu
        const { familyMessagingService } = await import(
          './services/familyMessagingService'
        );
        const { settingsService } = await import('./services/settingsService');

        const settings = await settingsService.loadSettings();
        const daysToKeep = settings.widgets.messageHistory.deleteAfterDays;

        await familyMessagingService.runCleanup(daysToKeep);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    };

    runDailyCleanup();
    const intervalId = setInterval(runDailyCleanup, 24 * 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Načtení Family Member
  useEffect(() => {
    if (!currentUser) {
      setFamilyMemberId(null);
      return;
    }

    const loadFamilyMember = async () => {
      // Fallback ID (volitelně odstranit, pokud není potřeba)
      // setFamilyMemberId('dad');

      try {
        const member = await firestoreService.getFamilyMemberByAuthUid(
          currentUser.uid
        );
        if (member) {
          setFamilyMemberId(member.id);
        } else {
          console.warn(
            `⚠️ Nepodařilo se najít family member pro UID ${currentUser.uid}`
          );
        }
      } catch (error) {
        console.error('❌ Chyba při načítání family member:', error);
      }
    };

    loadFamilyMember();
  }, [currentUser, firebaseLoading]);

  // ✅ BACK BUTTON HANDLER
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handleBackButton = (e: PopStateEvent) => {
      const modalOpen = document.querySelector('.calendar-modal-overlay');
      if (modalOpen) return; // Modal si to vyřeší sám

      e.preventDefault();

      if (location.pathname === '/' || location.pathname === '') {
        window.history.pushState(null, '', window.location.href);
        return;
      }
      navigate(-1);
    };

    window.addEventListener('popstate', handleBackButton);
    return () => window.removeEventListener('popstate', handleBackButton);
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
    <RoomsProvider>
      <CalendarProvider events={calendarEvents}>
        <NotificationProvider
          authUid={currentUser?.uid || null}
          familyMemberId={familyMemberId || null}
        >
          {/* AI Widget bude plavat nad vším */}
          <AiWidget />
          <div className="app-layout">
            <Suspense fallback={<PageLoader />}>
              <AppRoutes familyMemberId={familyMemberId} />
            </Suspense>

            <div id="modal-root"></div>
          </div>
        </NotificationProvider>
      </CalendarProvider>
    </RoomsProvider>
  );
}

export default App;
