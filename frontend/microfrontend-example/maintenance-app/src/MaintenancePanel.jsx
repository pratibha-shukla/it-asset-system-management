/**
 * MaintenancePanel.jsx — Maintenance Microfrontend (localhost:5074)
 *
 * Listens for ASSET_SELECTED from Asset MFE (5073).
 * When an asset is selected, loads its maintenance history.
 * When maintenance is created, fires MAINTENANCE_CREATED so Asset MFE refreshes.
 *
 * These two MFEs communicate WITHOUT importing each other.
 */
import { useState, useEffect } from 'react';
import eventBus, { EVENTS } from './eventBus';
import { maintenanceApi } from './maintenanceApi';

export default function MaintenancePanel() {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    // Listen for Asset MFE telling us an asset was clicked
    const unsub = eventBus.on(EVENTS.ASSET_SELECTED, (asset) => {
      setSelectedAsset(asset);
      maintenanceApi.getByAsset(asset.assetId).then(setRecords);
    });

    return unsub;
  }, []);

  const createMaintenance = async () => {
    await maintenanceApi.create({
      assetId: selectedAsset.assetId,
      description: 'Routine check',
    });

    // Tell Asset MFE to refresh (asset status changed to MAINTENANCE)
    eventBus.emit(EVENTS.MAINTENANCE_CREATED, {
      assetId: selectedAsset.assetId,
    });

    // Also tell Shell to show a toast notification
    eventBus.emit(EVENTS.NOTIFICATION, {
      message: `Maintenance created for ${selectedAsset.assetName}`,
      type: 'success',
    });

    maintenanceApi.getByAsset(selectedAsset.assetId).then(setRecords);
  };

  if (!selectedAsset) return <p>← Click an asset to see maintenance history</p>;

  return (
    <div>
      <h2>Maintenance for: {selectedAsset.assetName} (MFE on :5074)</h2>
      <button onClick={createMaintenance}>+ Create Maintenance</button>
      {records.map(r => (
        <div key={r.id}>{r.description} — {r.status}</div>
      ))}
    </div>
  );
}
