/** Error de validación de formulario con el detalle por campo, para que la
 * ruta pueda pintarlo sin que la capa api/ conozca el estado de React. */
export class ValidationError extends Error {
  fieldErrors: Record<string, string>;
  constructor(fieldErrors: Record<string, string>, message = "Revisa los campos marcados") {
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}
