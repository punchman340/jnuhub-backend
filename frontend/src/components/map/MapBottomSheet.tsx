import { X } from "lucide-react";
import type { MapBuildingDetail } from "./mapBuildingRegistry";

type Props = {
  open: boolean;
  detail: MapBuildingDetail | null;
  onClose: () => void;
};

export function MapBottomSheet({ open, detail, onClose }: Props) {
  if (!open || !detail) return null;

  return (
    <>
      <button type="button" className="map-sheet-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="map-bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="map-sheet-title">
        <div className="map-sheet-handle-wrap">
          <span className="map-sheet-handle" />
        </div>
        <div className="map-sheet-head">
          <h2 id="map-sheet-title">{detail.displayName}</h2>
          <button type="button" className="map-sheet-close" onClick={onClose} aria-label="상세 닫기">
            <X size={22} />
          </button>
        </div>
        <div className="map-sheet-photo">
          {detail.photoSrc ? (
            <img src={detail.photoSrc} alt="" />
          ) : (
            <div className="map-sheet-photo-placeholder">사진 경로를 mapBuildingRegistry 에 연결하세요</div>
          )}
        </div>
        <dl className="map-sheet-rows">
          {detail.rows.map((row) => (
            <div key={row.label} className="map-sheet-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="map-sheet-hint">id: {detail.id}</p>
      </div>
    </>
  );
}
