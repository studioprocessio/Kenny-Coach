// netlify/functions/paypal-create-order.js
// Crea una orden de PayPal. El Client Secret vive SOLO aquí (variables de entorno de Netlify),
// nunca en el HTML/JS que se envía al navegador.

const PAYPAL_API_BASE = process.env.PAYPAL_ENV === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Faltan PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET en las variables de entorno de Netlify.");
  }

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
    const usdAmount = Number(body.usd);
    const description = String(body.description || "Kenny Coach Team - Plan").slice(0, 127);

    if (!usdAmount || usdAmount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Monto inválido." }) };
    }

    const accessToken = await getAccessToken();

    const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description,
            amount: {
              currency_code: "USD",
              value: usdAmount.toFixed(2),
            },
          },
        ],
        application_context: {
          brand_name: "Kenny Coach Team",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      }),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      return { statusCode: orderRes.status, body: JSON.stringify(orderData) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ id: orderData.id }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
