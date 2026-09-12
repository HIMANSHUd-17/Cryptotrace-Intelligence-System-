import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function IPGlobeMap({ alerts, onSelectAlert }) {

    const mapData = useMemo(() => {
        const ipNodes = [];

        alerts.forEach(alert => {
            if (alert.ips && Array.isArray(alert.ips)) {
                alert.ips.forEach(ip => {
                    let hash = 0;
                    const str = ip;
                    for (let i = 0; i < str.length; i++) {
                        hash = ((hash << 5) - hash) + str.charCodeAt(i);
                        hash |= 0;
                    }

                    // Hash IP String into valid map coordinates (rough constraint to continents)
                    const lat = -40 + (Math.abs(hash) % 100);
                    const lon = -120 + (Math.abs(hash * 3) % 240);

                    ipNodes.push({
                        id: `${alert.entity_id}_${ip}`,
                        entity: ip,
                        lat,
                        lon,
                        severity: alert.severity,
                        parentTx: alert.entity,
                        originalAlert: alert
                    });
                });
            }
        });

        return ipNodes;
    }, [alerts]);

    return (
        <div className="w-full h-full min-h-[250px] relative rounded-lg overflow-hidden border border-slate-200 shadow-inner z-0">
            <MapContainer
                center={[20, 0]}
                zoom={1.5}
                style={{ background: '#f1f5f9', height: '100%', width: '100%' }}
                zoomControl={true}
                scrollWheelZoom={true}
                dragging={true}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                />
                {mapData.map(node => (
                    <CircleMarker
                        key={node.id}
                        center={[node.lat, node.lon]}
                        radius={node.severity === 'High' ? 6 : 4}
                        fillColor={node.severity === 'High' ? '#e11d48' : node.severity === 'Medium' ? '#d97706' : '#059669'}
                        color="#ffffff"
                        weight={1.5}
                        fillOpacity={0.8}
                        eventHandlers={{
                            click: () => {
                                if (onSelectAlert) onSelectAlert(node.originalAlert);
                            }
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                            <div className="flex flex-col gap-1 z-[1000]">
                                <div className="text-[11px] font-mono font-bold text-slate-800 border-b border-slate-200 pb-1">
                                    IP: {node.entity}
                                </div>
                                <div className="text-[10px] font-mono text-slate-600">
                                    Parent TX: {node.parentTx}
                                </div>
                                <div className={`text-[10px] uppercase font-bold tracking-widest ${node.severity === 'High' ? 'text-riskHigh' : node.severity === 'Medium' ? 'text-riskMedium' : 'text-riskLow'}`}>
                                    {node.severity} Threat
                                </div>
                            </div>
                        </Tooltip>
                    </CircleMarker>
                ))}
            </MapContainer>
            <div className="absolute top-2 left-2 bg-white/95 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200 shadow-sm z-[400] flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-riskHigh animate-ping text-[0px]">.</span> Live IP Geotrack
            </div>
        </div>
    );
}
