import React, { useState } from 'react';
import type { TuyaDevice, Room } from '../types';

interface DeviceAssignmentProps {
  devices: TuyaDevice[];
  rooms: Room[];
  onAddDeviceToRoom: (roomId: string, deviceId: string) => Promise<void>;
  onRemoveDeviceFromRoom: (roomId: string, deviceId: string) => Promise<void>;
  getRoomDevices: (roomId: string, devices: TuyaDevice[]) => TuyaDevice[];
  getUnassignedDevices: (devices: TuyaDevice[]) => TuyaDevice[];
}

export const DeviceAssignment: React.FC<DeviceAssignmentProps> = ({
  devices,
  rooms,
  onAddDeviceToRoom,
  onRemoveDeviceFromRoom,
  getRoomDevices,
  getUnassignedDevices
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const unassignedDevices = getUnassignedDevices(devices);
  const selectedRoomDevices = selectedRoomId ? getRoomDevices(selectedRoomId, devices) : [];

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Správa zařízení v místnostech</h5>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAssignModal(true)}
          disabled={unassignedDevices.length === 0}
        >
          <i className="fas fa-plus me-2"></i>
          Přiřadit zařízení
        </button>
      </div>
      
      <div className="card-body">
        {/* Výběr místnosti */}
        <div className="mb-3">
          <label className="form-label">Vyberte místnost:</label>
          <select
            className="form-select"
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
          >
            {rooms.map(room => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </select>
        </div>

        {/* Zařízení v místnosti */}
        {selectedRoomId && (
          <div className="mb-3">
            <h6>Zařízení v místnosti ({selectedRoomDevices.length})</h6>
            {selectedRoomDevices.length === 0 ? (
              <p className="text-muted">Žádná zařízení v této místnosti</p>
            ) : (
              <div className="list-group">
                {selectedRoomDevices.map(device => (
                  <div key={device.id} className="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{device.name}</strong>
                      <small className="text-muted d-block">{device.id}</small>
                    </div>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => onRemoveDeviceFromRoom(selectedRoomId, device.id)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nepřiřazená zařízení */}
        <div>
          <h6>Nepřiřazená zařízení ({unassignedDevices.length})</h6>
          {unassignedDevices.length === 0 ? (
            <p className="text-success">Všechna zařízení jsou přiřazena do místností</p>
          ) : (
            <div className="list-group">
              {unassignedDevices.map(device => (
                <div key={device.id} className="list-group-item">
                  <strong>{device.name}</strong>
                  <small className="text-muted d-block">{device.id}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal pro přiřazení zařízení */}
      {showAssignModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Přiřadit zařízení do místnosti</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAssignModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {unassignedDevices.map(device => (
                  <div key={device.id} className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                    <div>
                      <strong>{device.name}</strong>
                      <small className="text-muted d-block">{device.id}</small>
                    </div>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 'auto' }}
                      onChange={async (e) => {
                        if (e.target.value) {
                          await onAddDeviceToRoom(e.target.value, device.id);
                          setShowAssignModal(false);
                        }
                      }}
                    >
                      <option value="">Vyberte místnost</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>{room.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAssignModal(false)}
                >
                  Zavřít
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};