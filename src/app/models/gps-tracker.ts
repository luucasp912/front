export interface GpsLocation {
  numeroBolsin: number;
  latitud: number;
  longitud: number;
  fechaHoraUltimoReporte: Date;
}

export interface GPSTracker {
  modelo: string;
}

export class XTR4500L implements GPSTracker {
  modelo = 'XTR-4500L';

  private coordenadasPorBolsin: Map<number, [number, number]>;

  constructor(coordenadas: Map<number, [number, number]>) {
    this.coordenadasPorBolsin = coordenadas;
  }

  getBolsinLocation(
    apiKey: string,
    numeroBolsin: number,
    codComisionOrigen: string,
  ): GpsLocation {
    const coords = this.coordenadasPorBolsin.get(numeroBolsin);
    if (!coords) throw new Error(`GPS XTR-4500L: No se encontró ubicación para bolsín ${numeroBolsin}`);

    const respuestaJson = JSON.stringify({
      numeroBolsin,
      latitud: coords[0],
      longitud: coords[1],
      fechaHoraUltimoReporte: new Date().toISOString(),
    });

    const parsed = JSON.parse(respuestaJson);
    return {
      numeroBolsin: parsed.numeroBolsin,
      latitud: parsed.latitud,
      longitud: parsed.longitud,
      fechaHoraUltimoReporte: new Date(parsed.fechaHoraUltimoReporte),
    };
  }

  formatearDatos(loc: GpsLocation): string {
    return JSON.stringify(
      {
        numeroBolsin: loc.numeroBolsin,
        latitud: loc.latitud,
        longitud: loc.longitud,
        fechaHoraUltimoReporte: loc.fechaHoraUltimoReporte.toISOString(),
      },
      null,
      2,
    );
  }
}

export class NavTrackQX7A implements GPSTracker {
  modelo = 'NavTrack QX-7A';

  private coordenadasPorBolsin: Map<number, [number, number]>;

  constructor(coordenadas: Map<number, [number, number]>) {
    this.coordenadasPorBolsin = coordenadas;
  }

  retrieveTrackingData(
    apiKey: string,
    numeroBolsin: number,
    codComisionDestino: string,
  ): GpsLocation {
    const coords = this.coordenadasPorBolsin.get(numeroBolsin);
    if (!coords) throw new Error(`GPS NavTrack QX-7A: No se encontró ubicación para bolsín ${numeroBolsin}`);

    const respuestaCsv = `${numeroBolsin},${coords[0]},${coords[1]},${new Date().toISOString()}`;

    const partes = respuestaCsv.split(',');
    return {
      numeroBolsin: Number(partes[0]),
      latitud: Number(partes[1]),
      longitud: Number(partes[2]),
      fechaHoraUltimoReporte: new Date(partes[3]),
    };
  }

  formatearDatos(loc: GpsLocation): string {
    return `${loc.numeroBolsin},${loc.latitud},${loc.longitud},${loc.fechaHoraUltimoReporte.toISOString()}`;
  }
}

export class GeoPulseMTR900 implements GPSTracker {
  modelo = 'GeoPulse MTR-900';

  private coordenadasPorBolsin: Map<number, [number, number]>;

  constructor(coordenadas: Map<number, [number, number]>) {
    this.coordenadasPorBolsin = coordenadas;
  }

  fetchCargoPositions(
    apiKey: string,
    numeroBolsin: number,
  ): GpsLocation {
    const coords = this.coordenadasPorBolsin.get(numeroBolsin);
    if (!coords) throw new Error(`GPS GeoPulse MTR-900: No se encontró ubicación para bolsín ${numeroBolsin}`);

    const respuestaArray = [numeroBolsin, coords[0], coords[1], new Date().toISOString()];

    return {
      numeroBolsin: respuestaArray[0] as number,
      latitud: respuestaArray[1] as number,
      longitud: respuestaArray[2] as number,
      fechaHoraUltimoReporte: new Date(respuestaArray[3] as string),
    };
  }

  formatearDatos(loc: GpsLocation): string {
    return `[${loc.numeroBolsin}, ${loc.latitud}, ${loc.longitud}, "${loc.fechaHoraUltimoReporte.toISOString()}"]`;
  }
}
