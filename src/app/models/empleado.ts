import { ComisionMedica } from './comision-medica';
import { Rol } from './rol';

export class Empleado {
  constructor(
    public nombre: string,
    public apellido: string,
    public email: string,
    private cm: ComisionMedica,
    private rol: Rol,
  ) {}

  getCM(): ComisionMedica {
    return this.cm;
  }

  esTuCM(cm: ComisionMedica): boolean {
    return this.cm.codigo === cm.codigo;
  }

  sosGerenteCM(): boolean {
    return this.rol.esGerente();
  }

  getEmail(): string {
    return this.email;
  }
}
