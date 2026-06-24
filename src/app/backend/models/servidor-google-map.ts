export interface ServidorGoogleMap {
  getMapa(): any;
}

declare const L: any;

export class ServidorMapaLeaflet implements ServidorGoogleMap {
  private mapa: any;
  private marcadores: any[] = [];
  private lineas: any[] = [];

  constructor(
    private elementoId: string,
    private centro: [number, number],
    private zoom: number = 6,
  ) {}

  getMapa(): any {
    if (!this.mapa) {
      this.mapa = L.map(this.elementoId).setView(this.centro, this.zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(this.mapa);
      setTimeout(() => this.mapa?.invalidateSize(), 200);
    }
    return this.mapa;
  }

  agregarMarcador(
    lat: number,
    lng: number,
    popupHtml: string,
    icono?: any,
  ): any {
    const marker = icono
      ? L.marker([lat, lng], { icon: icono }).addTo(this.mapa)
      : L.marker([lat, lng]).addTo(this.mapa);
    marker.bindPopup(popupHtml);
    this.marcadores.push(marker);
    return marker;
  }

  limpiarMarcadores(): void {
    this.marcadores.forEach((m) => this.mapa?.removeLayer(m));
    this.marcadores = [];
    this.lineas.forEach((l) => this.mapa?.removeLayer(l));
    this.lineas = [];
  }

  ajustarVista(): void {
    if (this.marcadores.length > 0) {
      const grupo = L.featureGroup(this.marcadores);
      this.mapa.fitBounds(grupo.getBounds().pad(0.2));
    }
  }

  crearIcono(color: string): any {
    return L.divIcon({
      className: 'marcador-bolsin',
      html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)"><i class="bi bi-box-seam"></i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    });
  }

  // Ícono tipo pin para Comisiones Médicas
  crearIconoCM(color: string): any {
    return L.divIcon({
      className: 'marcador-cm',
      html: `<div style="background:${color};width:32px;height:32px;border-radius:8px 8px 8px 2px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);transform:rotate(45deg);margin-bottom:8px"><i class="bi bi-building" style="transform:rotate(-45deg)"></i></div>`,
      iconSize: [32, 40],
      iconAnchor: [16, 36],
      popupAnchor: [0, -36],
    });
  }
}
