import { CambioEstadoBolsin } from './cambio-estado-bolsin';
import { ComisionMedica } from './comision-medica';

export interface Remito {
  numero: string;
  documentacion: { asunto: string; tipo: string }[];
}

export class Bolsin {
  private cambiosEstado: CambioEstadoBolsin[];

  constructor(
    public numeroBolsin: number,
    public numeroPrecinto: string,
    public peso: number,
    public fecha: Date,
    public cmOrigen: ComisionMedica,
    public cmDestino: ComisionMedica,
    cambiosEstado?: CambioEstadoBolsin[],
    public remitos: Remito[] = [],
    public latitud?: number,
    public longitud?: number,
    public ultimaActualizacion?: Date,
  ) {
    this.cambiosEstado = cambiosEstado ?? [];
  }

  sosEnviado(): boolean {
    return this.cambiosEstado.some((c) => c.sosEnviado());
  }

  esTuCMOrigen(cm: ComisionMedica): boolean {
    return this.cmOrigen.codigo === cm.codigo;
  }

  getNumeroBolsin(): number {
    return this.numeroBolsin;
  }

  getCambiosEstado(): CambioEstadoBolsin[] {
    return this.cambiosEstado;
  }

  // Métodos de interfaz
  modificarBolsin(): void {}
  darDeBaja(): void {}
  cerrar(): void {}
  abrirBolsin(): void {}
  retirarBolsin(): void {}
  recibirBolsin(): void {}
}
