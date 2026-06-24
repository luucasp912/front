import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { GestorBuscarBolsin } from '../../backend/gestor/gestor-buscar-bolsin';
import { Bolsin } from '../../backend/models/bolsin';
import { ComisionMedica } from '../../backend/models/comision-medica';
import {
  GPSTracker,
  XTR4500L,
  NavTrackQX7A,
  GeoPulseMTR900,
  GpsLocation,
} from '../../backend/models/gps-tracker';
import { ServidorMapaLeaflet } from '../../backend/models/servidor-google-map';

type Paso =
  | 'cargando'
  | 'cmInfo'
  | 'localizando'
  | 'mapa'
  | 'detalleBolsin'
  | 'a3Error'
  | 'emailDialog'
  | 'enviando'
  | 'exito'
  | 'error'
  | 'vacio';

@Component({
  selector: 'app-pantalla-buscar-bolsin',
  imports: [FormsModule, DatePipe],
  templateUrl: './pantalla-buscar-bolsin.html',
  styleUrl: './pantalla-buscar-bolsin.css',
})
export class PantallaBuscarBolsin implements OnInit {
  private router = inject(Router);
  private gestor = inject(GestorBuscarBolsin);

  // -- Atributos de la clase del diagrama --
  mapaBolsines: any = null;
  bolsinSeleccionado: Bolsin | null = null;
  confirmacionEnvioCorreo = false;
  usuarioLogueado: any = null;

  // -- Estado local --
  paso = signal<Paso>('cargando');
  cmOrigen: ComisionMedica | null = null;
  bolsines: Bolsin[] = [];
  ubicaciones: Map<number, GpsLocation> = new Map();
  erroresGPS: string[] = [];
  errorMessage = '';
  datosFormateados = '';

  // -- Controles --
  trackerSeleccionado = '';
  modelosTracker = ['XTR-4500L', 'NavTrack QX-7A', 'GeoPulse MTR-900'];
  filtroPrecinto = '';
  filtroCMDestino = '';
  emailGcmDestino = '';
  infoNotificacion: any = null;

  // -- Mapa --
  private servidorMapa: ServidorMapaLeaflet | null = null;

  private get mapaValido(): ServidorMapaLeaflet {
    if (!this.servidorMapa) throw new Error('Mapa no inicializado');
    return this.servidorMapa;
  }

  ngOnInit(): void {
    this.opcConsultarUbiBolsin();
  }

  // ========== Métodos del diagrama de clases ==========

  opcConsultarUbiBolsin(): void {
    this.paso.set('cargando');
    try {
      this.usuarioLogueado = this.gestor.nuevaBusquedaBolsin();
      setTimeout(() => this.habilitarVentana(), 400);
    } catch (e: any) {
      this.errorMessage = e.message;
      this.paso.set('error');
    }
  }

  habilitarVentana(): void {
    this.mostrarCMUsuarioLog();
  }

  mostrarCMUsuarioLog(): void {
    try {
      this.cmOrigen = this.gestor.buscarCMUsuarioLogueado();
      this.buscarBolsines();
    } catch (e: any) {
      this.errorMessage = e.message;
      this.paso.set('error');
    }
  }

  private buscarBolsines(): void {
    try {
      const encontrados = this.gestor.buscarBolsinesEnviados();
      if (encontrados.length === 0) {
        this.paso.set('vacio');
        return;
      }
      this.bolsines = encontrados;
      this.paso.set('cmInfo');
    } catch (e: any) {
      this.errorMessage = e.message;
      this.paso.set('error');
    }
  }

  // -- Selección de tracker y localización --

  // Helper para template (no pertenece al diagrama de análisis)
  protected iniciarLocalizacion(): void {
    if (!this.trackerSeleccionado) return;

    let tracker: GPSTracker;
    const coordsSimuladas = new Map<number, [number, number]>();
    const origen: [number, number] = [-31.4201, -64.1888];
    const destinos: Record<string, [number, number]> = {
      'CM-MZA': [-32.8895, -68.8458],
      'CM-PAR': [-31.7333, -60.5236],
      'CM-BUE': [-34.6037, -58.3816],
      'CM-ROS': [-32.9468, -60.6393],
      'CM-SFE': [-31.6333, -60.6967],
    };

    this.bolsines
      .filter((b) => b.numeroBolsin !== 1006)
      .forEach((b) => {
        const destino = destinos[b.cmDestino.codigo] ?? origen;
        const factor = Math.random() * 0.3 + 0.35;
        const lat = origen[0] + (destino[0] - origen[0]) * factor + (Math.random() - 0.5) * 0.8;
        const lng = origen[1] + (destino[1] - origen[1]) * factor + (Math.random() - 0.5) * 0.8;
        coordsSimuladas.set(b.numeroBolsin, [lat, lng]);
      });

    switch (this.trackerSeleccionado) {
      case 'XTR-4500L':
        tracker = new XTR4500L(coordsSimuladas);
        break;
      case 'NavTrack QX-7A':
        tracker = new NavTrackQX7A(coordsSimuladas);
        break;
      case 'GeoPulse MTR-900':
        tracker = new GeoPulseMTR900(coordsSimuladas);
        break;
      default:
        return;
    }

    this.gestor.setTracker(tracker);
    this.paso.set('localizando');
    this.ubicaciones = new Map();
    this.erroresGPS = [];

    this.gestor.obtenerUbicaciones(this.bolsines).then(
      (resultado) => {
        this.ubicaciones = resultado.ubicaciones;
        this.erroresGPS = resultado.errores;

        if (resultado.ubicaciones.size === 0) {
          this.errorMessage =
            resultado.errores[0] ?? 'No se pudo obtener ninguna ubicación';
          this.paso.set('error');
          return;
        }

        this.mostrarBolsinLocation();
      },
      (error) => {
        this.errorMessage = `Error del GPS (${this.trackerSeleccionado}): ${error.message}`;
        this.paso.set('error');
      },
    );
  }

  mostrarBolsinLocation(): void {
    this.paso.set('mapa');

    setTimeout(() => {
      if (this.servidorMapa) {
        this.servidorMapa.limpiarMarcadores();
      }

      const el = document.getElementById('mapa-bolsines');
      if (!el) return;

      this.servidorMapa = new ServidorMapaLeaflet('mapa-bolsines', [-31.4201, -64.1888], 6);
      this.servidorMapa.getMapa();
      this.mapaBolsines = this.servidorMapa;
      const sm = this.mapaValido;

      const colores = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      let i = 0;

      this.bolsines.forEach((b) => {
        const loc = this.ubicaciones.get(b.numeroBolsin);
        if (!loc) return;

        const color = colores[i % colores.length];
        i++;

        const popupHtml = `
          <div style="font-family:Inter,sans-serif;font-size:13px;min-width:200px">
            <strong style="color:${color}">Bolsín #${b.numeroBolsin}</strong><br>
            <span style="color:#64748b">Precinto:</span> ${b.numeroPrecinto}<br>
            <span style="color:#64748b">Destino:</span> ${b.cmDestino.getNombre()}<br>
            <span style="color:#64748b">Peso:</span> ${b.peso}g<br>
            <span style="color:#64748b">Última actualización:</span><br>
            ${loc.fechaHoraUltimoReporte.toLocaleString('es-AR')}<br>
            <button onclick="window.seleccionarBolsin(${b.numeroBolsin})"
              style="margin-top:8px;background:${color};color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer">
              Seleccionar bolsín
            </button>
          </div>`;

        const icono = sm.crearIcono(color);
        const marker = sm.agregarMarcador(loc.latitud, loc.longitud, popupHtml, icono);
        marker.numeroBolsin = b.numeroBolsin;
      });

      sm.ajustarVista();
      this.mapaBolsines = sm;
      this.pedirSeleccionBolsin();
    }, 300);
  }

  // ========== Selección de bolsín ==========

  pedirSeleccionBolsin(): void {
    (window as any).seleccionarBolsin = (numeroBolsin: number) => {
      const bolsin = this.bolsines.find((b) => b.numeroBolsin === numeroBolsin);
      if (bolsin) this.tomarSeleccionBolsin(bolsin);
    };
  }

  // Método público del diagrama: procesa la selección de un bolsín
  tomarSeleccionBolsin(bolsin: Bolsin): void {
    this.procesarSeleccion(bolsin);
  }

  // Implementación interna reutilizable
  private procesarSeleccion(bolsin: Bolsin): void {
    this.bolsinSeleccionado = bolsin;
    this.gestor.tomarSeleccionBolsin(bolsin);

    if (bolsin.numeroBolsin === 1006) {
      this.paso.set('a3Error');
      return;
    }

    this.datosFormateados = this.gestor.formatearUbicacion(bolsin);
    this.paso.set('detalleBolsin');
  }

  // Helper para template (no pertenece al diagrama de análisis)
  protected seleccionarDesdeLista(numeroBolsin: number): void {
    const bolsin = this.bolsines.find((b) => b.numeroBolsin === numeroBolsin);
    if (bolsin) this.procesarSeleccion(bolsin);
  }

  // Helper para template (no pertenece al diagrama de análisis)
  protected volverAlMapaDesdeDetalle(): void {
    this.bolsinSeleccionado = null;
    this.datosFormateados = '';
    this.paso.set('mapa');
    setTimeout(() => {
      try { this.mapaBolsines?.getMapa()?.invalidateSize(); } catch {}
    }, 100);
  }

  // ========== Confirmación de envío de correo ==========

  // Método del diagrama: abre el diálogo de confirmación
  pedirConfirmacionEnvioCorreo(): void {
    if (!this.bolsinSeleccionado) return;
    this.paso.set('emailDialog');
  }

  tomarConfirmacionEnvioCorreo(confirmado: boolean): void {
    this.confirmacionEnvioCorreo = confirmado;
    this.gestor.tomarConfEnvioCorreo(confirmado);

    if (confirmado) {
      this.paso.set('enviando');
      try {
        this.emailGcmDestino = this.gestor.buscarEmailGCM();
        this.infoNotificacion = this.gestor.llamarCUNotificarUbicacionDeBolsin();
        this.mostrarMensajeExito();
      } catch (e: any) {
        this.errorMessage = e.message;
        this.paso.set('error');
      }
    } else {
      this.bolsinSeleccionado = null;
      this.datosFormateados = '';
      this.paso.set('mapa');
      setTimeout(() => {
        try { this.mapaBolsines?.getMapa()?.invalidateSize(); } catch {}
      }, 100);
    }
  }

  mostrarMensajeExito(): void {
    this.paso.set('exito');
  }

  // ========== Alternativas ==========

  // Helper para template (no pertenece al diagrama de análisis)
  protected cancelar(): void {
    this.gestor.finCU();
    this.router.navigate(['/']);
  }

  // ========== Filtros (no pertenecen al diagrama de análisis) ==========

  protected get bolsinesFiltrados(): Bolsin[] {
    return this.bolsines.filter((b) => {
      const matchPrecinto =
        !this.filtroPrecinto ||
        b.numeroPrecinto.toLowerCase().includes(this.filtroPrecinto.toLowerCase());
      const matchDestino =
        !this.filtroCMDestino ||
        b.cmDestino.getNombre().toLowerCase().includes(this.filtroCMDestino.toLowerCase());
      return matchPrecinto && matchDestino;
    });
  }

  protected get hayResultadosFiltro(): boolean {
    return this.bolsinesFiltrados.length > 0;
  }

  protected hayErrorFiltro = false;

  protected aplicarFiltro(): void {
    this.hayErrorFiltro = !this.hayResultadosFiltro;
  }

  protected limpiarFiltro(): void {
    this.filtroPrecinto = '';
    this.filtroCMDestino = '';
    this.hayErrorFiltro = false;
  }

  protected getDestinos(): string[] {
    return [...new Set(this.bolsines.map((b) => b.cmDestino.getNombre()))];
  }
}
