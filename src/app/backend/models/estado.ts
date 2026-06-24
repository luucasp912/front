export class Estado {
  constructor(
    public nombre: string,
    public descripcion: string,
    public ambito: string,
  ) {}

  esEnviado(): boolean {
    return this.nombre === 'Enviado';
  }
}
