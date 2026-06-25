import { Injectable } from '@angular/core';
import { Sesion } from '../models/sesion';
import { Usuario } from '../models/usuario';
import { ComisionMedica } from '../models/comision-medica';
import { Bolsin, Remito } from '../models/bolsin';
import { CambioEstadoBolsin } from '../models/cambio-estado-bolsin';
import { Estado } from '../models/estado';
import { GPSTracker, GpsLocation, XTR4500L, NavTrackQX7A, GeoPulseMTR900 } from '../models/gps-tracker';
import { ServidorMapaLeaflet } from '../models/servidor-google-map';

export interface ResultadoBusqueda {
  usuarioLogueado: Usuario;
  cmOrigen: ComisionMedica;
  bolsines: Bolsin[];
}

export interface InfoNotificacion {
  emailGcm: string;
  numeroBolsin: number;
  coordenadas: { lat: number; lng: number };
  fechaHora: Date;
}

export interface ResultadoUbicaciones {
  ubicaciones: Map<number, GpsLocation>;
  errores: string[];
}

@Injectable({ providedIn: 'root' })
export class GestorBuscarBolsin {
  usuarioLogueado: Usuario | null = null;
  cmOrigenBolsin: ComisionMedica | null = null;
  cmDestinoBolsin: ComisionMedica | null = null;
  confirmacionEnvioCorreo = false;
  bolsinSeleccionado: Bolsin | null = null;
  mapa: ServidorMapaLeaflet | null = null;
  mapaConBolsines = false;
  ubicacionBolsines: Map<number, GpsLocation> = new Map();

  private tracker: GPSTracker | null = null;
  private apiKey = 'mock-api-key-001';

  private comisiones: ComisionMedica[] = [];
  private bolsinesMock: Bolsin[] = [];

  constructor() {
    this.inicializarDatosMock();
  }

  private inicializarDatosMock(): void {
    const cmCordoba = new ComisionMedica(
      'CM-CBA', 'Comisión Médica Córdoba', 'Av. Colón 1234, Córdoba', 'cm.cordoba@example.com', '351-1234567',
    );
    const cmMendoza = new ComisionMedica(
      'CM-MZA', 'Comisión Médica Mendoza', 'Av. San Martín 567, Mendoza', 'cm.mendoza@example.com', '261-7654321',
    );
    const cmParana = new ComisionMedica(
      'CM-PAR', 'Comisión Médica Paraná', 'Urquiza 890, Paraná', 'cm.parana@example.com', '343-4567890',
    );
    const cmBsAs = new ComisionMedica(
      'CM-BUE', 'CMC Buenos Aires', 'Av. de Mayo 123, CABA', 'cm.buenosaires@example.com', '11-12345678',
    );
    const cmRosario = new ComisionMedica(
      'CM-ROS', 'Comisión Médica Rosario', 'Córdoba 456, Rosario', 'cm.rosario@example.com', '341-5678901',
    );
    const cmSantaFe = new ComisionMedica(
      'CM-SFE', 'Comisión Médica Santa Fe', 'San Martín 789, Santa Fe', 'cm.santafe@example.com', '342-1234567',
    );

    this.comisiones = [cmCordoba, cmMendoza, cmParana, cmBsAs, cmRosario, cmSantaFe];

    const estadoEnviado = new Estado('Enviado', 'Bolsín ha sido enviado', 'Tránsito');

    this.bolsinesMock = [
      this.crearBolsin(1001, 'PREC-2026-001', 2450, cmCordoba, cmMendoza, estadoEnviado, [
        { numero: 'R-4501', documentacion: [{ asunto: 'Expediente de invalidez', tipo: 'Expediente' }] },
        { numero: 'R-4502', documentacion: [{ asunto: 'Certificado médico', tipo: 'Certificado' }] },
      ]),
      this.crearBolsin(1002, 'PREC-2026-002', 1820, cmCordoba, cmParana, estadoEnviado, [
        { numero: 'R-4503', documentacion: [{ asunto: 'Historia clínica', tipo: 'Expediente' }] },
      ]),
      this.crearBolsin(1003, 'PREC-2026-003', 3100, cmCordoba, cmBsAs, estadoEnviado, [
        { numero: 'R-4504', documentacion: [{ asunto: 'Expediente de jubilación', tipo: 'Expediente' }] },
        { numero: 'R-4505', documentacion: [{ asunto: 'Pericia médica', tipo: 'Informe' }] },
        { numero: 'R-4506', documentacion: [{ asunto: 'Dictamen legal', tipo: 'Documento' }] },
      ]),
      this.crearBolsin(1004, 'PREC-2026-004', 1560, cmCordoba, cmRosario, estadoEnviado, [
        { numero: 'R-4507', documentacion: [{ asunto: 'Solicitud de beneficio', tipo: 'Expediente' }] },
      ]),
      this.crearBolsin(1005, 'PREC-2026-005', 2780, cmCordoba, cmMendoza, estadoEnviado, [
        { numero: 'R-4508', documentacion: [{ asunto: 'Expediente de invalidez', tipo: 'Expediente' }] },
        { numero: 'R-4509', documentacion: [{ asunto: 'Informe psicológico', tipo: 'Informe' }] },
      ]),
      this.crearBolsin(1006, 'PREC-2026-006', 2100, cmCordoba, cmSantaFe, estadoEnviado, [
        { numero: 'R-4510', documentacion: [{ asunto: 'Expediente médico', tipo: 'Expediente' }] },
      ]),
    ];
  }

  private crearBolsin(
    numero: number, precinto: string, peso: number,
    origen: ComisionMedica, destino: ComisionMedica,
    estado: Estado, remitos: Remito[],
  ): Bolsin {
    const cambio = new CambioEstadoBolsin(new Date(), null, estado);
    const bolsin = new Bolsin(
      numero, precinto, peso, new Date(),
      origen, destino, [cambio], remitos,
    );
    return bolsin;
  }

  private getCoordenadasDestino(cmDestino: ComisionMedica): [number, number] {
    const mapa: Record<string, [number, number]> = {
      'CM-MZA': [-32.8895, -68.8458],
      'CM-PAR': [-31.7333, -60.5236],
      'CM-BUE': [-34.6037, -58.3816],
      'CM-ROS': [-32.9468, -60.6393],
      'CM-SFE': [-31.6333, -60.6967],
    };
    return mapa[cmDestino.codigo] ?? [-31.4201, -64.1888];
  }

  nuevaBusquedaBolsin(): Usuario {
    const sesion = Sesion.getInstance();
    this.usuarioLogueado = sesion.buscarUsuarioLog();
    return this.usuarioLogueado;
  }

  buscarCMUsuarioLogueado(): ComisionMedica {
    if (!this.usuarioLogueado) throw new Error('No hay usuario logueado');
    const empleado = this.usuarioLogueado.obtenerEmpleado();
    this.cmOrigenBolsin = empleado.getCM();
    return this.cmOrigenBolsin;
  }

  buscarBolsinesEnviados(): Bolsin[] {
    if (!this.cmOrigenBolsin) throw new Error('No hay CM origen');
    const encontrados = this.bolsinesMock.filter(
      (b) => b.sosEnviado() && b.esTuCMOrigen(this.cmOrigenBolsin!),
    );
    return encontrados;
  }

  async obtenerUbicaciones(bolsines: Bolsin[]): Promise<ResultadoUbicaciones> {
    if (!this.tracker) {
      const coordenadas = this.generarCoordenadasSimuladas(bolsines);
      this.tracker = new XTR4500L(coordenadas);
    }

    const ubicaciones = new Map<number, GpsLocation>();
    const errores: string[] = [];

    for (const b of bolsines) {
      await this.delay(400 + Math.random() * 300);

      if (b.numeroBolsin === 1006) {
        errores.push(
          `El tracker ${this.tracker.modelo} no pudo informar la ubicación del bolsín #${b.numeroBolsin} (${b.cmDestino.getNombre()}).`,
        );
        continue;
      }

      try {
        let loc: GpsLocation;

        switch (this.tracker.modelo) {
          case 'XTR-4500L': {
            const t = this.tracker as XTR4500L;
            loc = t.getBolsinLocation(this.apiKey, b.numeroBolsin, this.cmOrigenBolsin!.codigo);
            break;
          }
          case 'NavTrack QX-7A': {
            const t = this.tracker as NavTrackQX7A;
            loc = t.retrieveTrackingData(this.apiKey, b.numeroBolsin, b.cmDestino.codigo);
            break;
          }
          case 'GeoPulse MTR-900': {
            const t = this.tracker as GeoPulseMTR900;
            loc = t.fetchCargoPositions(this.apiKey, b.numeroBolsin);
            break;
          }
          default:
            throw new Error(`Tracker no soportado: ${this.tracker.modelo}`);
        }

        ubicaciones.set(b.numeroBolsin, loc);
        b.latitud = loc.latitud;
        b.longitud = loc.longitud;
        b.ultimaActualizacion = loc.fechaHoraUltimoReporte;
      } catch (e: any) {
        errores.push(e.message);
      }
    }

    this.ubicacionBolsines = ubicaciones;
    return { ubicaciones, errores };
  }

  formatearUbicacion(bolsin: Bolsin): string {
    if (!this.tracker) return '';
    const loc = this.ubicacionBolsines.get(bolsin.numeroBolsin);
    if (!loc) return '';

    switch (this.tracker.modelo) {
      case 'XTR-4500L': {
        const t = this.tracker as XTR4500L;
        return t.formatearDatos(loc);
      }
      case 'NavTrack QX-7A': {
        const t = this.tracker as NavTrackQX7A;
        return t.formatearDatos(loc);
      }
      case 'GeoPulse MTR-900': {
        const t = this.tracker as GeoPulseMTR900;
        return t.formatearDatos(loc);
      }
      default:
        return '';
    }
  }

  tomarSeleccionBolsin(bolsin: Bolsin): void {
    this.bolsinSeleccionado = bolsin;
    this.cmDestinoBolsin = bolsin.cmDestino;
  }

  tomarConfEnvioCorreo(confirmado: boolean): void {
    this.confirmacionEnvioCorreo = confirmado;
  }

  buscarEmailGCM(): string {
    if (!this.cmDestinoBolsin) throw new Error('No hay CM destino');
    const destinosConGcm: Record<string, { nombre: string; email: string }> = {
      'CM-MZA': { nombre: 'Gerardo Martínez', email: 'gcm.mendoza@example.com' },
      'CM-PAR': { nombre: 'Laura Sánchez', email: 'gcm.parana@example.com' },
      'CM-BUE': { nombre: 'Roberto Fernández', email: 'gcm.buenosaires@example.com' },
      'CM-ROS': { nombre: 'María López', email: 'gcm.rosario@example.com' },
      'CM-SFE': { nombre: 'Jorge Díaz', email: 'gcm.santafe@example.com' },
    };
    return destinosConGcm[this.cmDestinoBolsin.codigo]?.email ?? 'gcm@example.com';
  }

  llamarCUNotificarUbicacionDeBolsin(): InfoNotificacion {
    if (!this.bolsinSeleccionado || !this.cmDestinoBolsin) {
      throw new Error('No hay bolsín seleccionado o CM destino');
    }
    const emailGcm = this.buscarEmailGCM();
    return {
      emailGcm,
      numeroBolsin: this.bolsinSeleccionado.numeroBolsin,
      coordenadas: {
        lat: this.bolsinSeleccionado.latitud ?? 0,
        lng: this.bolsinSeleccionado.longitud ?? 0,
      },
      fechaHora: this.bolsinSeleccionado.ultimaActualizacion ?? new Date(),
    };
  }

  finCU(): void {
    this.bolsinSeleccionado = null;
    this.confirmacionEnvioCorreo = false;
    this.mapaConBolsines = false;
    this.ubicacionBolsines.clear();
  }

  private generarCoordenadasSimuladas(bolsines: Bolsin[]): Map<number, [number, number]> {
    const origen: [number, number] = [-31.4201, -64.1888];
    const coords = new Map<number, [number, number]>();

    bolsines.forEach((b) => {
      if (b.numeroBolsin === 1006) return;
      const destino = this.getCoordenadasDestino(b.cmDestino);
      const factor = Math.random() * 0.3 + 0.35;
      const lat = origen[0] + (destino[0] - origen[0]) * factor + (Math.random() - 0.5) * 0.8;
      const lng = origen[1] + (destino[1] - origen[1]) * factor + (Math.random() - 0.5) * 0.8;
      coords.set(b.numeroBolsin, [lat, lng]);
    });

    return coords;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
