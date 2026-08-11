/* ============ KENNY COACH - CARRITO MULTI-ÍTEM + ENTREGA PDF ============ */
(function () {
    var WHATSAPP_NUMBER = "50662036881";

    var cart = []; // Array de { plan, crc, usd, pdfSlugs }
    var lastPayMethod = '';

    var addButtons = document.querySelectorAll(".kc-add-cart-btn");
    var cartBar = document.getElementById("kc-cart-bar");
    var cartName = document.getElementById("kc-cart-name");
    var cartCrc = document.getElementById("kc-cart-crc");
    var cartUsd = document.getElementById("kc-cart-usd");
    var cartRemoveBtn = document.getElementById("kc-cart-remove");
    var checkoutBtn = document.getElementById("kc-checkout-btn");

    var modal = document.getElementById("kc-checkout-modal");
    var modalClose = document.getElementById("kc-modal-close");
    var modalBack = document.getElementById("kc-modal-back");
    var step1 = document.getElementById("kc-modal-step-1");
    var step2 = document.getElementById("kc-modal-step-2");
    var step3 = document.getElementById("kc-modal-step-3");

    var orderPlanName = document.getElementById("kc-order-plan-name");
    var orderCrc = document.getElementById("kc-order-crc");
    var orderUsd = document.getElementById("kc-order-usd");

    var payMethodBtns = document.querySelectorAll(".kc-pay-method-btn");
    var payDetails = document.querySelectorAll(".kc-pay-detail");

    var successMessage = document.getElementById("kc-success-message");
    var modalFinish = document.getElementById("kc-modal-finish");

    // Expose cart to PDF delivery system
    window.kcCartItems = cart;

    function formatMoney(n) {
        return Number(n).toLocaleString("es-CR");
    }

    function totalCrc() {
        return cart.reduce(function(sum, item) { return sum + Number(item.crc); }, 0);
    }

    function totalUsd() {
        return cart.reduce(function(sum, item) { return sum + Number(item.usd); }, 0);
    }

    function isInCart(planName) {
        return cart.some(function(item) { return item.plan === planName; });
    }

    function isCard(btn) {
        return btn.tagName !== "BUTTON";
    }

    function setButtonState(btn, inCart) {
        if (isCard(btn)) {
            var innerBtn = btn.querySelector(".kc-perf-card-btn");
            if (innerBtn) {
                if (inCart) {
                    innerBtn.innerHTML = '<i class="fas fa-check"></i> Agregado';
                    innerBtn.style.background = "var(--kc-gold)";
                    innerBtn.style.color = "#000";
                } else {
                    innerBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Agregar';
                    innerBtn.style.background = "";
                    innerBtn.style.color = "";
                }
            }
            if (inCart) {
                btn.classList.add("kc-in-cart");
            } else {
                btn.classList.remove("kc-in-cart");
            }
        } else {
            if (inCart) {
                btn.classList.add("kc-in-cart");
                btn.innerHTML = '<i class="fas fa-check"></i> Agregado';
            } else {
                btn.classList.remove("kc-in-cart");
                btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Agregar al carrito';
            }
        }
    }

    function resetAllButtons() {
        addButtons.forEach(function(btn) {
            setButtonState(btn, false);
        });
    }

    function updateCartBar() {
        if (cart.length === 0) {
            cartBar.style.display = "none";
            return;
        }
        if (cart.length === 1) {
            cartName.textContent = cart[0].plan;
        } else {
            cartName.textContent = cart.length + " planes seleccionados";
        }
        cartCrc.textContent = formatMoney(totalCrc());
        cartUsd.textContent = formatMoney(totalUsd());
        cartBar.style.display = "block";
    }

    function updateHeaderCartCount() {
        var headerCart = document.getElementById("kc-header-cart-btn");
        var countEl = document.getElementById("kc-header-cart-count");
        if (headerCart) {
            headerCart.style.display = cart.length > 0 ? "flex" : "none";
        }
        if (countEl) {
            countEl.textContent = cart.length > 0 ? cart.length : "";
        }
    }

    addButtons.forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            var planName = btn.getAttribute("data-plan");
            var alreadyIn = isInCart(planName);

            if (alreadyIn) {
                cart = cart.filter(function(item) { return item.plan !== planName; });
                setButtonState(btn, false);
            } else {
                var pdfSlugs = btn.getAttribute("data-pdf") || "";
                cart.push({
                    plan: planName,
                    crc: btn.getAttribute("data-price-crc"),
                    usd: btn.getAttribute("data-price-usd"),
                    pdfSlugs: pdfSlugs
                });
                setButtonState(btn, true);
            }

            window.kcCartItems = cart;
            updateCartBar();
            updateHeaderCartCount();

            if (cart.length > 0) {
                cartBar.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        });
    });

    cartRemoveBtn.addEventListener("click", function () {
        cart = [];
        window.kcCartItems = cart;
        resetAllButtons();
        updateCartBar();
        updateHeaderCartCount();
    });

    function buildOrderSummary() {
        if (cart.length === 1) {
            return cart[0].plan;
        }
        return cart.map(function(item, i) { return (i + 1) + ". " + item.plan; }).join(" | ");
    }

    function getAllPdfSlugs() {
        var allSlugs = [];
        cart.forEach(function(item) {
            if (item.pdfSlugs) {
                item.pdfSlugs.split(',').forEach(function(s) {
                    var slug = s.trim();
                    if (slug && allSlugs.indexOf(slug) === -1) {
                        allSlugs.push(slug);
                    }
                });
            }
        });
        return allSlugs.join(',');
    }

    function openModal() {
        if (cart.length === 0) return;

        var summary = buildOrderSummary();
        var crc = totalCrc();
        var usd = totalUsd();

        orderPlanName.textContent = summary;
        orderCrc.textContent = formatMoney(crc);
        orderUsd.textContent = formatMoney(usd);

        document.querySelectorAll(".kc-order-crc-mirror").forEach(function (el) {
            el.textContent = formatMoney(crc);
        });
        document.querySelectorAll(".kc-order-usd-mirror").forEach(function (el) {
            el.textContent = formatMoney(usd);
        });

        var msgSinpe = "Hola Kenny! Realicé el pago por SINPE Móvil de: " + summary +
            " (₡" + formatMoney(crc) + "). Te comparto el comprobante:";
        var msgTransfer = "Hola Kenny! Realicé el depósito/transferencia de: " + summary +
            " (₡" + formatMoney(crc) + "). Te comparto el comprobante:";

        var sinpeLink = document.getElementById("kc-sinpe-whatsapp");
        var transferLink = document.getElementById("kc-transfer-whatsapp");
        if (sinpeLink) sinpeLink.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msgSinpe);
        if (transferLink) transferLink.href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msgTransfer);

        goToStep(1);
        modal.classList.add("kc-modal-open");
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        modal.classList.remove("kc-modal-open");
        document.body.style.overflow = "";
    }

    function goToStep(n) {
        step1.style.display = n === 1 ? "block" : "none";
        step2.style.display = n === 2 ? "block" : "none";
        step3.style.display = n === 3 ? "block" : "none";
        if (n === 2) {
            payDetails.forEach(function (d) { d.style.display = "none"; });
        }
        // Cuando mostramos el paso 3, activar entrega de PDFs
        if (n === 3) {
            window.kcLastPayMethod = lastPayMethod;
            window.kcCartItems = cart;
            var allSlugs = getAllPdfSlugs();
            if (typeof window.kcDeliverPDFs === 'function') {
                window.kcDeliverPDFs(buildOrderSummary(), allSlugs, lastPayMethod);
            }
        }
    }

    checkoutBtn.addEventListener("click", openModal);
    modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal();
    });
    modalBack.addEventListener("click", function () { goToStep(1); });

    payMethodBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var method = btn.getAttribute("data-method");
            lastPayMethod = method;
            window.kcLastPayMethod = method;
            goToStep(2);
            payDetails.forEach(function (d) { d.style.display = "none"; });
            var target = document.getElementById("kc-pay-" + method);
            if (target) target.style.display = "block";
        });
    });

    // Botones de confirmación de pago (tarjeta, etc.)
    document.querySelectorAll(".kc-btn-confirm-pay:not(.kc-btn-whatsapp):not(#kc-tilopay-pay-btn)").forEach(function (btn) {
        if (btn.tagName === "A") return;
        if (btn.id === "kc-modal-finish") return;
        btn.addEventListener("click", function () {
            var method = lastPayMethod || 'tarjeta';
            var allSlugs = getAllPdfSlugs();
            var hasPDFs = allSlugs.length > 0;
            var isAutoMethod = (method === 'tarjeta' || method === 'paypal');

            if (isAutoMethod && hasPDFs) {
                successMessage.textContent = "¡Compra exitosa! Tu programa está listo para descargar.";
            } else {
                successMessage.textContent = "Tu pago fue registrado. El coach confirmará \"" + buildOrderSummary() + "\" a la brevedad.";
            }
            goToStep(3);
        });
    });

    // Botones de WhatsApp (SINPE, transferencia)
    document.querySelectorAll(".kc-btn-whatsapp").forEach(function (link) {
        link.addEventListener("click", function () {
            lastPayMethod = 'sinpe';
            successMessage.textContent = "Se abrió WhatsApp para enviar el comprobante. Una vez confirmado, recibirás tu programa.";
            setTimeout(function () { goToStep(3); }, 400);
        });
    });

    modalFinish.addEventListener("click", function () {
        closeModal();
        cart = [];
        window.kcCartItems = cart;
        resetAllButtons();
        updateCartBar();
        updateHeaderCartCount();
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && modal.classList.contains("kc-modal-open")) closeModal();
    });
})();
