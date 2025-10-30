# 🚧 TODO - Rodinný Tablet

## 🔐 PRIORITA: Security & Permissions

### Tuya Device Permissions
- [ ] Implementovat role-based access control
- [ ] Přidat `role` do `familyMembers` (admin/user/viewer)
- [ ] Kategorie zařízení: public/restricted/critical
- [ ] Admin dashboard pro správu oprávnění
- [ ] Firebase Rules update s checkem rolí
- [ ] UI: zobrazit jen zařízení, na která má uživatel právo

**Návrh:**
```typescript
interface FamilyMember {
  role: 'admin' | 'user' | 'viewer';
  permissions: {
    canControlDevices: boolean;
    canModifySettings: boolean;
    canViewSecurity: boolean;
  };
}

interface TuyaDevice {
  accessLevel: 'public' | 'restricted' | 'critical';
  allowedRoles: ('admin' | 'user' | 'viewer')[];
}
```

---

## 📌 Další TODOs

### Tuya Features
- [ ] Real-time status update (websocket?)
- [ ] Device grouping (místnosti)
- [ ] Automation rules
- [ ] Energy monitoring dashboard
- [ ] Device history/logs

### Optimalizace
- [ ] Code splitting pro Tuya modul
- [ ] Lazy loading komponent
- [ ] Service Worker pro offline mode

### Testing
- [ ] Unit testy pro tuyaService
- [ ] Integration testy pro Firebase
- [ ] E2E testy pro kritické flow