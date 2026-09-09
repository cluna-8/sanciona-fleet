# Código heredado de Lovable

`multas-export/` es el export literal del proyecto Lovable
`2fb9758d-5b85-4abf-b2df-491abbd60d7b` ("Control de Multas"), descargado el
7 de septiembre de 2026. Se conserva como **prototipo de referencia** de la
lógica de negocio (SPEC.md §7): no se despliega ni se desarrolla sobre él.

- `INVENTARIO-AS-IS.md` — diagnóstico completo de ese código: qué hace, qué
  está roto, qué está hardcodeado y qué bloquea la migración. Es el insumo del
  que nace SPEC.md.

## Qué se ha omitido del export y por qué

| Omitido | Motivo |
|---|---|
| `.env` | Contenía las claves publicables de Supabase. No deben entrar en la historia de git aunque no sean secretas. |
| `20260903190210_6b6c8d26-fef4-4ce4-8435-32c9f1ff462b.sql` | Fija en texto plano la contraseña de una cuenta real y le confirma el email. Subirla propagaría la credencial a cada clon del repo. Ver INVENTARIO §8.1 #1. |

Ambos ficheros siguen en el disco local y dentro del ZIP original. La omisión es
solo para el repositorio.
