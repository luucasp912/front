import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { GestorBuscarBolsin, InfoNotificacion } from '../../backend/gestor/gestor-buscar-bolsin';
import { Bolsin } from '../../backend/models/bolsin';
import { ComisionMedica } from '../../backend/models/comision-medica';
import { Usuario } from '../../backend/models/usuario';
import { GpsLocation } from '../../backend/models/gps-tracker';
import { ServidorMapaLeaflet } from '../../backend/models/servidor-google-map';

// Estados de la UI interna (no pertenecen al diagrama de análisis)
type Paso =
  | 'cargando'
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

// PantallaBuscarBolsin: boundary class del caso de uso
export class PantallaBuscarBolsin implements OnInit {
  private router = inject(Router);
  private gestor = inject(GestorBuscarBolsin);

  // -- Atributos de la clase del diagrama --
  mapaBolsines: ServidorMapaLeaflet | null = null;
  bolsinSeleccionado: Bolsin | null = null;
  confirmacionEnvioCorreo = false;
  usuarioLogueado: Usuario | null = null;

  // -- Estado local --
  paso = signal<Paso>('cargando');
  cmOrigen: ComisionMedica | null = null;
  bolsines: Bolsin[] = [];
  ubicaciones: Map<number, GpsLocation> = new Map();
  errorMessage = '';

  // -- Controles --
  filtroPrecinto = '';
  filtroCMDestino = '';
  infoNotificacion: InfoNotificacion | null = null;

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

  // CU 36 paso 1: el EB selecciona la opción para consultar ubicación de bolsines
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

  // CU 36 paso 2: el sistema habilita la ventana
  habilitarVentana(): void {
    this.mostrarCMUsuarioLog();
  }

  // CU 36 paso 3: el sistema busca y muestra la CM del usuario logueado
  mostrarCMUsuarioLog(): void {
    try {
      this.cmOrigen = this.gestor.buscarCMUsuarioLogueado();
      this.buscarBolsines();
    } catch (e: any) {
      this.errorMessage = e.message;
      this.paso.set('error');
    }
  }

  // Busca los bolsines en estado Enviado para la CM origen
  // A1: No se encuentran bolsines en estado Enviado -> muestra pantalla vacía
  private buscarBolsines(): void {
    try {
      const encontrados = this.gestor.buscarBolsinesEnviados();
      if (encontrados.length === 0) {
        this.paso.set('vacio');
        return;
      }
      this.bolsines = encontrados;
      this.iniciarLocalizacion();
    } catch (e: any) {
      this.errorMessage = e.message;
      this.paso.set('error');
    }
  }

  // -- Localización automática de bolsines --

  protected iniciarLocalizacion(): void {
    this.paso.set('localizando');
    this.ubicaciones = new Map();

    this.gestor.obtenerUbicaciones(this.bolsines).then(
      (resultado) => {
        this.ubicaciones = resultado.ubicaciones;

        if (resultado.ubicaciones.size === 0) {
          this.errorMessage =
            resultado.errores[0] ?? 'No se pudo obtener ninguna ubicación';
          this.paso.set('error');
          return;
        }

        this.mostrarBolsinLocation();
      },
      (error) => {
        this.errorMessage = `Error al obtener ubicaciones: ${error.message}`;
        this.paso.set('error');
      },
    );
  }

  // CU 36 paso 6: muestra sobre un mapa la posición de los bolsines
  mostrarBolsinLocation(): void {
    this.paso.set('mapa');

    setTimeout(() => {
      if (this.servidorMapa) {
        this.servidorMapa.limpiarMarcadores();
      }

      const el = document.getElementById('mapa-bolsines');
      if (!el) return;

      // Inicializa el mapa Leaflet (implementación de ServidorGoogleMap)
      this.servidorMapa = new ServidorMapaLeaflet('mapa-bolsines', [-31.4201, -64.1888], 6);
      this.servidorMapa.getMapa();
      this.mapaBolsines = this.servidorMapa;
      const sm = this.mapaValido;

      // Agrega un marcador por cada bolsín localizado
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
            <span style="color:#64748b">Destino:</span> ${b.cmDestino.getNombre()}<br>
            <span style="color:#64748b">Estado:</span> Enviado<br>
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
      // CU 36 paso 7: habilita la selección de un bolsín en el mapa
      this.pedirSeleccionBolsin();
    }, 300);
  }

  // ========== Selección de bolsín ==========

  // CU 36 paso 7: el EB puede seleccionar un bolsín del mapa
  pedirSeleccionBolsin(): void {
    (window as any).seleccionarBolsin = (numeroBolsin: number) => {
      const bolsin = this.bolsines.find((b) => b.numeroBolsin === numeroBolsin);
      if (bolsin) this.tomarSeleccionBolsin(bolsin);
    };
  }

  // CU 36 paso 7 (cont): el sistema procesa el bolsín seleccionado
  tomarSeleccionBolsin(bolsin: Bolsin): void {
    this.procesarSeleccion(bolsin);
  }

  // A3: el GPS no pudo informar la ubicación de este bolsín (simulado con ID 1006)
  private procesarSeleccion(bolsin: Bolsin): void {
    this.bolsinSeleccionado = bolsin;
    this.gestor.tomarSeleccionBolsin(bolsin);

    if (bolsin.numeroBolsin === 1006) {
      this.paso.set('a3Error');
      return;
    }

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
    this.paso.set('mapa');
    setTimeout(() => {
      try { this.mapaBolsines?.getMapa()?.invalidateSize(); } catch {}
    }, 100);
  }

  // ========== Confirmación de envío de correo ==========

  // CU 36 paso 8: el sistema consulta si se desea enviar un correo al GCM destino
  pedirConfirmacionEnvioCorreo(): void {
    if (!this.bolsinSeleccionado) return;
    this.paso.set('emailDialog');
  }

  // CU 36 paso 9: el EB confirma (o no) el envío del correo
  // A5: el EB no confirma -> vuelve al mapa
  tomarConfirmacionEnvioCorreo(confirmado: boolean): void {
    this.confirmacionEnvioCorreo = confirmado;
    this.gestor.tomarConfEnvioCorreo(confirmado);

    if (confirmado) {
      this.paso.set('enviando');
      try {
        // CU 36 paso 11: incluye al CU 30 "Notificar ubicación de bolsín"
        this.infoNotificacion = this.gestor.llamarCUNotificarUbicacionDeBolsin();
        this.mostrarMensajeExito();
      } catch (e: any) {
        this.errorMessage = e.message;
        this.paso.set('error');
      }
    } else {
      // A5: el EB cancela -> vuelve al mapa
      this.bolsinSeleccionado = null;
      this.paso.set('mapa');
      setTimeout(() => {
        try { this.mapaBolsines?.getMapa()?.invalidateSize(); } catch {}
      }, 100);
    }
  }

  // CU 36 paso 11: muestra mensaje de ejecución exitosa
  mostrarMensajeExito(): void {
    this.paso.set('exito');
  }

  // ========== Alternativas ==========

  // A4: el EB cancela el CU en cualquier momento
  // Helper para template (no pertenece al diagrama de análisis)
  protected cancelar(): void {
    this.gestor.finCU();
    this.router.navigate(['/']);
  }

  // ========== Filtros por precinto o CM destino (implementación, no del diagrama) ==========
  // CU 36 paso 6 (cont): el sistema habilita filtrar por número de precinto o CM destino

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

  protected aplicarFiltro(): void {
  }

  protected limpiarFiltro(): void {
    this.filtroPrecinto = '';
    this.filtroCMDestino = '';
  }

  protected getDestinos(): string[] {
    return [...new Set(this.bolsines.map((b) => b.cmDestino.getNombre()))];
  }
}
