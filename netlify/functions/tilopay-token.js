// netlify/functions/tilopay-token.js
//
// Obtiene el "token" que exige Tilopay.Init({ token: ... }) en el SDK del navegador.
// Las credenciales (Integration Key / API User / API Password) viven SOLO aquí,
// como variables de entorno de Netlify. Nunca deben ir en el HTML/JS del sitio.
//
// ⚠️ IMPORTANTE - VERIFICAR ANTES DE PUBLICAR:
// Tilopay entrega la documentación completa de este endpoint (login / GetTokenSdk)
// dentro de su colección de Postman privada, visible solo para comercios afiliados
// en admin.tilopay.com > Integración de Plataformas > API. La ruta y el nombre exacto
// de los campos de la respuesta pueden variar según la versión de API asignada a esta
// cuenta. Antes de ir a producción, entra a esa colección (o escribe a sac@tilopay.com)
// y confirma:
//   1) La URL exacta de login (aquí se usa la documentada públicamente: /api/v1/login)
//   2) El nombre del campo que trae el token para el SDK en la respuesta
// Si algo no calza, solo hay que ajustar esas dos líneas marcadas abajo.

const TILOPAY_API_BASE = "https://app.tilopay.com/api/v1";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { amount, orderNumber, billToEmail } = body;

    if (!amount || !orderNumber || !billToEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Faltan amount, orderNumber o billToEmail." }),
      };
    }

    const key = process.env.TILOPAY_INTEGRATION_KEY;
    const apiuser = process.env.TILOPAY_API_USER;
    const password = process.env.TILOPAY_API_PASSWORD;

    if (!key || !apiuser || !password) {
      throw new Error("Faltan TILOPAY_INTEGRATION_KEY / TILOPAY_API_USER / TILOPAY_API_PASSWORD en Netlify.");
    }

    // Paso 1: login para obtener credencial de acceso a la API de Tilopay.
    const loginRes = await fetch(`${TILOPAY_API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiuser, password, key }),
    });

    const loginData = await loginRes.json();

    if (!loginRes.ok) {
      return { statusCode: loginRes.status, body: JSON.stringify(loginData) };
    }

    // ⚠️ Ajustar aquí el nombre del campo si Tilopay lo llama distinto en la respuesta real
    // (ej. access_token, token, sdkToken...).
    const sdkToken = loginData.access_token || loginData.token;

    if (!sdkToken) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Tilopay respondió sin token reconocible. Revisa el formato real de la respuesta.",
          raw: loginData,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        token: sdkToken,
        orderNumber,
        amount,
        billToEmail,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
