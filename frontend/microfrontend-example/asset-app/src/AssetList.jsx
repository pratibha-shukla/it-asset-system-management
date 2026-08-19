/**
 * AssetList.jsx — Asset Microfrontend (localhost:5073)
 *
 * When user clicks an asset, fires ASSET_SELECTED event.
 * Maintenance MFE (5074) listens and loads maintenance history for that asset.
 */
import { useState, useEffect } from 'react';
import eventBus, { EVENTS } from './eventBus';
import { assetApi } from './assetApi';

export default function AssetList() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    assetApi.getAll().then(setAssets);

    // Listen: when Maintenance MFE creates a maintenance record,
    // refresh our list (asset status may have changed to MAINTENANCE)
    const unsub = eventBus.on(EVENTS.MAINTENANCE_CREATED, () => {
      assetApi.getAll().then(setAssets);
    });

    return unsub; // cleanup on unmount
  }, []);

  const handleAssetClick = (asset) => {
    // Tell Maintenance MFE (5074) which asset was selected
    // Maintenance MFE doesn't know about Asset MFE — it just listens
    eventBus.emit(EVENTS.ASSET_SELECTED, {
      assetId: asset.id,
      assetName: asset.name,
      serialNumber: asset.serialNumber,
    });
  };

  return (
    <div>
      <h2>Assets (MFE running on :5073)</h2>
      {assets.map(asset => (
        <div key={asset.id} onClick={() => handleAssetClick(asset)}>
          {asset.name} — {asset.status}
        </div>
      ))}
    </div>
  );
}
