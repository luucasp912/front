export class Rol {
  constructor(
    public nombre: string,
    public descripcion: string,
  ) {}

  esGerente(): boolean {
    return this.nombre === 'Gerente de Comisión Médica';
  }
}
