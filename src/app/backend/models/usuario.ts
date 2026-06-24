import { Empleado } from './empleado';

export class Usuario {
  constructor(public nombre: string, private empleado: Empleado) {}

  obtenerEmpleado(): Empleado {
    return this.empleado;
  }
}
