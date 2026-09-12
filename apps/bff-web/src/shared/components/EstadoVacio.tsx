/** Mensaje de "sin datos", antes repetido como <p> suelto en cada listado. */
export function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <p className="card-surface px-5 py-10 text-center text-sm text-muted-foreground">{mensaje}</p>
  );
}
