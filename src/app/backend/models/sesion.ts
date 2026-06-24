import { Usuario } from './usuario';
import { Empleado } from './empleado';
import { ComisionMedica } from './comision-medica';
import { Rol } from './rol';

export class Sesion {
  private static instancia: Sesion;

  constructor(
    public fechaHoraInicio: Date,
    public fechaHoraFin: Date | null,
    private usuario: Usuario,
  ) {}

  static getInstance(): Sesion {
    if (!Sesion.instancia) {
      Sesion.instancia = Sesion.crearSesionMock();
    }
    return Sesion.instancia;
  }

  private static crearSesionMock(): Sesion {
    const cm = new ComisionMedica(
      'CM-CBA',
      'Comisión Médica Córdoba',
      'Av. Colón 1234, Córdoba',
      'cm.cordoba@example.com',
      '351-1234567',
    );
    const rol = new Rol('Encargado de Bolsines', 'Responsable de gestionar bolsines');
    const empleado = new Empleado('Carlos', 'Gómez', 'carlos.gomez@example.com', cm, rol);
    const usuario = new Usuario('cgomez', empleado);

    return new Sesion(new Date(), null, usuario);
  }

  buscarUsuarioLog(): Usuario {
    return this.usuario;
  }
}
