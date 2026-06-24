export class ComisionMedica {
  constructor(
    public codigo: string,
    public nombre: string,
    public direccion: string,
    public email: string,
    public telefono: string,
  ) {}

  getNombre(): string {
    return this.nombre;
  }
}
