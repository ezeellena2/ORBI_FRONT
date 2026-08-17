# TracAutoFrontV2

Frontend React/Vite de autenticacion y shell web para ORBI.

## Desarrollo

1. Copia `.env.example` a `.env.local` si queres sobreescribir los valores de desarrollo.
2. Instala dependencias con `npm install`.
3. Levanta el frontend con `npm run dev`.

Variables de entorno de desarrollo:

```env
VITE_API_BASE_URL=
VITE_DEFAULT_LOCALE=es-AR
VITE_GOOGLE_CLIENT_ID=644236758922-hbf6kbllem8ljmtamrhbjp1pp8r8m4ap.apps.googleusercontent.com
```

Notas:

- El front usa **single-origin**: `VITE_API_BASE_URL` vacio => rutas relativas `/api/...` contra el mismo
  origen. En dev, el proxy de Vite reenvia `/api` al **API Gateway** (`https://localhost:7101`), que rutea a
  cada microservicio. Ver `TracAutoV2/docsv2/adr/0081-api-gateway-yarp-single-origin.md`.
- Para desarrollo, levanta el **gateway** (`Gateway.Api`, HTTPS `7101`) y los microservicios que uses
  (Access `7201`, PlataformaCanonica `7203`, ...). El gateway acepta el dev-cert self-signed.
- Si `VITE_GOOGLE_CLIENT_ID` no esta definido, el frontend usa el client ID de desarrollo alineado con `Access.Api`.
