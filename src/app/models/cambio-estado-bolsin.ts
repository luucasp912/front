import { Estado } from './estado';

export class CambioEstadoBolsin {
  constructor(
    public fechaHoraInicio: Date,
    public fechaHoraFin: Date | null,
    public estado: Estado,
  ) {}

  getEstado(): Estado {
    return this.estado;
  }

  sosActual(): boolean {
    return this.fechaHoraFin === null;
  }

  sosEnviado(): boolean {
    return this.estado.esEnviado() && this.sosActual();
  }
}
