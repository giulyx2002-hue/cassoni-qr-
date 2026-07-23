"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { TipoOperazione, UltimaPosizione } from "@/lib/types";
import { TIPI_OPERAZIONE } from "@/lib/types";

function labelOperazione(tipo: TipoOperazione) {
  return TIPI_OPERAZIONE.find((t) => t.value === tipo)?.label ?? tipo;
}

const icona = L.divIcon({
  className: "",
  html: `<div style="background:#111827;width:16px;height:16px;border-radius:9999px;border:2px solid white;box-shadow:0 0 0 1px #111827"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function Mappa({
  posizioni,
  onSeleziona,
}: {
  posizioni: UltimaPosizione[];
  onSeleziona: (cassoneId: string) => void;
}) {
  const centro: [number, number] =
    posizioni.length > 0 ? [posizioni[0].lat, posizioni[0].lng] : [41.9028, 12.4964];

  return (
    <MapContainer center={centro} zoom={posizioni.length > 0 ? 11 : 5} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {posizioni.map((p) => (
        <Marker
          key={p.cassone_id}
          position={[p.lat, p.lng]}
          icon={icona}
          eventHandlers={{ click: () => onSeleziona(p.cassone_id) }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold">{p.codice}</p>
              {p.cliente && <p>Cliente: {p.cliente}</p>}
              <p>{labelOperazione(p.tipo_operazione)} · targa {p.targa}</p>
              <p className="text-gray-500">
                {new Date(p.ultimo_movimento).toLocaleString("it-IT")}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
