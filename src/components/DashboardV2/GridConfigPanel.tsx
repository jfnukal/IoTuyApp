// src/components/DashboardV2/GridConfigPanel.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationContext } from '../Notifications/NotificationProvider';
import { loadMobileOrder, type MobileWidgetKey } from './mobileOrderConfig';
import { MobileOrderPanel } from './MobileOrderPanel';
import ColWidthModal from './ColWidthModal';
import './GridConfigPanel.css';

const GridConfigPanel: React.FC = () => {
  const [open, setOpen]                 = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [mobileOrder, setMobileOrder]   = useState<MobileWidgetKey[]>(() => loadMobileOrder());

  const navigate = useNavigate();
  const { logout } = useAuth();
  const { requestPermission, unreadCount } = useNotificationContext();

  return (
    <>
      <button className="gcp-fab" onClick={() => setOpen(o => !o)} title="Nastavení">
        {open ? '✕' : '⚙️'}
      </button>

      {showSizeModal && <ColWidthModal onClose={() => setShowSizeModal(false)} />}

      {open && createPortal(
        <div className="gcp-panel">

          {/* ── NAVIGACE & AKCE ── */}
          <div className="gcp-header">
            <span>Nastavení</span>
          </div>

          <div className="gcp-actions">
            <button className="gcp-action-btn" onClick={() => { navigate('/devices'); setOpen(false); }}>
              <span>📱</span> Zařízení
            </button>
            <button className="gcp-action-btn" onClick={() => { navigate('/more'); setOpen(false); }}>
              <span>🗂️</span> Widgety
            </button>
            <button className="gcp-action-btn" onClick={() => { setShowSizeModal(true); setOpen(false); }}>
              <span>⤢</span> Změna velikosti
            </button>
            <button className="gcp-action-btn" onClick={() => navigate('/v1')}>
              <span>🏠</span> Starý dashboard
            </button>
            <button className="gcp-action-btn" onClick={() => navigate('/settings')}>
              <span>🛠️</span> Nastavení
            </button>
            <button className="gcp-action-btn" onClick={requestPermission}>
              <span>🔔</span> Notifikace {unreadCount > 0 && <span className="gcp-badge">{unreadCount}</span>}
            </button>
            <button className="gcp-action-btn gcp-action-btn--logout" onClick={logout}>
              <span>🚪</span> Odhlásit
            </button>
          </div>

          <hr className="gcp-divider" />

          {/* ── POŘADÍ WIDGETŮ NA MOBILU ── */}
          <div className="gcp-section-title">Pořadí widgetů na mobilu</div>
          <MobileOrderPanel order={mobileOrder} onChange={setMobileOrder} />

        </div>,
        document.getElementById('modal-root') ?? document.body,
      )}
    </>
  );
};

export default GridConfigPanel;
