/* ============ KENNY COACH - PAGOS REALES (PayPal + TiloPay) ============ */
(function () {
    function money(txt) {
        return Number(String(txt).replace(/[^0-9.]/g, "")) || 0;
    }

    function currentUsd() {
        var el = document.getElementById("kc-order-usd");
        return el ? money(el.textContent) : 0;
    }

    function currentCrc() {
        var el = document.getElementById("kc-order-crc");
        return el ? money(el.textContent) : 0;
    }

    function currentPlanName() {
        var el = document.getElementById("kc-order-plan-name");
        return el ? el.textContent : "Plan Kenny Coach Team";
    }

    function showStep(n) {
        ["kc-modal-step-1", "kc-modal-step-2", "kc-modal-step-3"].forEach(function (id, i) {
            var el = document.getElementById(id);
            if (el) el.style.display = (i + 1 === n) ? "block" : "none";
        });
    }

    function goToThanksPage() {
        var total = "\u20A1" + currentCrc().toLocaleString("es-CR") + " / $" + currentUsd().toLocaleString("es-CR") + " USD";
        var url = "gracias.html?plan=" + encodeURIComponent(currentPlanName()) + "&total=" + encodeURIComponent(total);
        window.location.href = url;
    }

    function showSuccess(msg) {
        var el = document.getElementById("kc-success-message");
        if (el) el.textContent = msg;
        showStep(3);
        setTimeout(goToThanksPage, 1800);
    }

    function showError(container, msg) {
        var el = document.getElementById(container);
        if (el) {
            el.textContent = msg;
            el.style.color = "#d33";
            el.style.marginTop = "10px";
        } else {
            alert(msg);
        }
    }

    /* ---------------- PayPal ---------------- */
    function initPayPal() {
        if (typeof paypal === "undefined" || !document.getElementById("kc-paypal-buttons")) return;

        paypal.Buttons({
            style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },

            createOrder: function () {
                return fetch("/.netlify/functions/paypal-create-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        usd: currentUsd(),
                        description: currentPlanName(),
                    }),
                })
                    .then(function (res) { return res.json(); })
                    .then(function (data) {
                        if (!data.id) throw new Error(data.error || "No se pudo crear la orden de PayPal.");
                        return data.id;
                    });
            },

            onApprove: function (data) {
                return fetch("/.netlify/functions/paypal-capture-order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderID: data.orderID }),
                })
                    .then(function (res) { return res.json(); })
                    .then(function (result) {
                        if (result.status === "COMPLETED") {
                            showSuccess("¡Pago con PayPal recibido! Tu plan \"" + currentPlanName() + "\" quedará activo. Serás redirigido a tu página de agradecimiento...");
                        } else {
                            showError("kc-paypal-buttons", "El pago no se completó (" + (result.status || "estado desconocido") + "). Intenta de nuevo o contáctanos por WhatsApp.");
                        }
                    });
            },

            onError: function (err) {
                console.error("PayPal error:", err);
                showError("kc-paypal-buttons", "Ocurrió un error con PayPal. Intenta de nuevo o contáctanos por WhatsApp.");
            },
        }).render("#kc-paypal-buttons");
    }

    /* ---------------- TiloPay ---------------- */
    var tilopayInitialized = false;

    function initTilopayAndPay() {
        var email = (document.getElementById("kc-tilopay-email") || {}).value;
        var name = (document.getElementById("kc-tilopay-name") || {}).value || "";

        if (!email) {
            showError("kc-tilopay-note", "Ingresa tu correo electrónico para continuar.");
            return;
        }

        var amount = currentUsd();
        var orderNumber = "KCT-" + Date.now();
        var payBtn = document.getElementById("kc-tilopay-pay-btn");
        if (payBtn) payBtn.disabled = true;

        fetch("/.netlify/functions/tilopay-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: amount, orderNumber: orderNumber, billToEmail: email }),
        })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (!data.token) throw new Error(data.error || "No se pudo iniciar el pago con TiloPay.");

                var nameParts = name.trim().split(" ");
                var firstName = nameParts.shift() || "Cliente";
                var lastName = nameParts.join(" ") || "Kenny Coach";

                Tilopay.Init({
                    token: data.token,
                    currency: "USD",
                    language: "es",
                    amount: amount,
                    billToEmail: email,
                    billToFirstName: firstName,
                    billToLastName: lastName,
                    billToCountry: "CR",
                    orderNumber: orderNumber,
                    capture: 1,
                    redirect: window.location.origin + "/gracias.html",
                    subscription: 0,
                });

                var payment = Tilopay.startPayment();

                if (payment && payment.message && payment.message !== "Success") {
                    throw new Error(payment.message);
                }

                showSuccess("Tu pago con tarjeta fue procesado por TiloPay. Tu plan \"" + currentPlanName() + "\" quedará activo. Serás redirigido a tu página de agradecimiento...");
            })
            .catch(function (err) {
                console.error("TiloPay error:", err);
                showError("kc-tilopay-note", err.message || "Ocurrió un error al procesar el pago con tarjeta. Intenta de nuevo o usa otro método.");
            })
            .finally(function () {
                if (payBtn) payBtn.disabled = false;
            });
    }

    document.addEventListener("DOMContentLoaded", function () {
        initPayPal();

        var tilopayBtn = document.getElementById("kc-tilopay-pay-btn");
        if (tilopayBtn) {
            tilopayBtn.addEventListener("click", function (e) {
                e.preventDefault();
                initTilopayAndPay();
            });
        }
    });
})();
