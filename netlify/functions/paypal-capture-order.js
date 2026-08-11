// netlify/functions/paypal-capture-order.js
// Captura (cobra) una orden de PayPal que el cliente ya aprobó en el checkout.

const PAYPAL_API_BASE = process.env.PAYPAL_ENV === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`No se pudo autenticar con PayPal: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const orderID = body.orderID;

    if (!orderID) {
      return { statusCode: 400, body: JSON.stringify({ error: "Falta orderID." }) };
    }

    const accessToken = await getAccessToken();

    const captureRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const captureData = await captureRes.json();

    if (!captureRes.ok) {
      return { statusCode: captureRes.status, body: JSON.stringify(captureData) };
    }

    // TODO (opcional): aquí es donde deberías guardar la orden en tu base de datos,
    // enviar un correo de confirmación, o notificar al coach.

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: captureData.status,
        id: captureData.id,
        payer: captureData.payer && captureData.payer.email_address,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
