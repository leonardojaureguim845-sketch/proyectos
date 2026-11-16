(() => {
  "use strict";
  const $id = (id) => document.getElementById(id);
  const auditLog = $id("auditLog");
  const toast = $id("toast");
  const cart = new Map();
  const favorites = new Set();
  let activeFilter = "todos";
  let favoritesOnly = false;
  let timerId = null;
  let secondsLeft = 30;
  let toastTimer = null;

  // Seguridad DOM: el texto dinámico se inserta mediante textContent, nunca HTML del usuario.
  function logEvent(type, message) {
    const row = document.createElement("p");
    row.className = "audit-entry";
    const time = new Date().toLocaleTimeString("es-BO");
    row.textContent = `[${time}] ${type}: ${message}`;
    auditLog.prepend(row);
    while (auditLog.children.length > 35) auditLog.lastElementChild.remove();
  }
  function notify(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }
  function openModal(id) {
    const modal = $id(id);
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    logEvent("MODAL_ABIERTO", id);
  }
  function closeModals() {
    document.querySelectorAll(".modal-backdrop.open").forEach(modal => {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    });
    document.body.classList.remove("modal-open");
    stopCountdown();
  }
  function getDishCard(name) {
    return [...document.querySelectorAll(".dish-card")].find(card => card.dataset.dish === name);
  }
  function refreshCart() {
    const count = [...cart.values()].reduce((sum, item) => sum + item.quantity, 0);
    $id("cartCount").textContent = `${count} ${count === 1 ? "plato" : "platos"}`;
    $id("floatingCart").classList.toggle("visible", count > 0);
    const list = $id("cartItems");
    list.replaceChildren();
    if (!cart.size) {
      const empty = document.createElement("p");
      empty.className = "empty-cart";
      empty.textContent = "Todavía no agregaste platos.";
      list.append(empty);
    } else {
      cart.forEach((item, name) => {
        const row = document.createElement("div");
        row.className = "cart-row";
        const label = document.createElement("span");
        label.textContent = `${name} × ${item.quantity}`;
        const price = document.createElement("strong");
        price.textContent = item.price ? `Bs ${item.price * item.quantity}` : "A cotizar";
        const remove = document.createElement("button");
        remove.type = "button"; remove.dataset.remove = name; remove.setAttribute("aria-label", `Quitar ${name}`);
        remove.textContent = "×";
        row.append(label, price, remove);
        list.append(row);
      });
    }
    calculateTotal();
  }
  function calculateTotal() {
    const guests = Math.max(1, Math.min(2000, Number($id("calcGuests").value) || 1));
    const perGuest = [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
    const hours = Math.max(1, Math.min(24, Number($id("serviceHours")?.value) || 1));
    const serviceCost = hours * 40;
    $id("calcTotal").textContent = `Bs ${(perGuest * guests + serviceCost).toLocaleString("es-BO")}`;
  }
  function applyFilters() {
    const query = $id("searchInput").value.trim().toLocaleLowerCase("es");
    let visible = 0;
    document.querySelectorAll(".dish-card").forEach(card => {
      const categoryMatch = activeFilter === "todos" || card.dataset.category === activeFilter;
      const textMatch = card.dataset.name.includes(query) || card.querySelector("h3").textContent.toLocaleLowerCase("es").includes(query);
      const favoriteMatch = !favoritesOnly || favorites.has(card.dataset.dish);
      const show = categoryMatch && textMatch && favoriteMatch;
      card.classList.toggle("hidden-card", !show);
      if (show) visible++;
    });
    $id("resultCount").textContent = `${visible} ${visible === 1 ? "opción" : "opciones"}`;
  }
  function startCountdown() {
    stopCountdown();
    secondsLeft = 30;
    $id("countdown").textContent = secondsLeft;
    timerId = setInterval(() => {
      secondsLeft--;
      $id("countdown").textContent = secondsLeft;
      if (secondsLeft <= 0) {
        stopCountdown();
        closeModals();
        notify("La ventana de confirmación expiró. Puedes volver a intentarlo.");
        logEvent("CONFIRMACION_EXPIRADA", "Se cerró el modal después de 30 segundos");
      }
    }, 1000);
  }
  function stopCountdown() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }
  function showConfirmation() {
    const count = [...cart.values()].reduce((sum, item) => sum + item.quantity, 0);
    const total = $id("calcTotal").textContent;
    $id("confirmSummary").textContent = `${count} unidades seleccionadas · Total referencial ${total}.`;
    closeModals();
    openModal("confirmModal");
    startCountdown();
  }

  // Delegación de eventos: un listener en el contenedor captura botones presentes y futuros.
  const grid = $id("dishGrid");
  grid.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add]");
    const favoriteButton = event.target.closest("[data-favorite]");
    if (addButton) {
      const name = addButton.dataset.add;
      if (name === "Plato personalizado") {
        $id("customRequest").value = "Solicito un plato o menú personalizado fuera del catálogo.";
        openModal("quoteModal");
        logEvent("PLATO_PERSONALIZADO", "El cliente solicita una preparación fuera del catálogo");
        return;
      }
      const card = addButton.closest(".dish-card");
      const price = Number(card.dataset.price) || 0;
      const current = cart.get(name) || { price, quantity: 0 };
      current.quantity++;
      cart.set(name, current);
      refreshCart();
      notify(`${name} agregado a tu selección`);
      logEvent("PLATO_AGREGADO", `${name} · Bs ${price} referenciales`);
    }
    if (favoriteButton) {
      const name = favoriteButton.dataset.favorite;
      if (favorites.has(name)) favorites.delete(name); else favorites.add(name);
      favoriteButton.classList.toggle("is-favorite", favorites.has(name));
      favoriteButton.textContent = favorites.has(name) ? "♥" : "♡";
      logEvent("FAVORITO", `${name}: ${favorites.has(name) ? "agregado" : "quitado"}`);
      applyFilters();
    }
  });
  // Doble clic de reacción, solicitado en la bitácora Día 1.
  grid.addEventListener("dblclick", (event) => {
    const card = event.target.closest(".dish-card");
    if (card) { logEvent("LIKE_DOBLE_CLIC", `Reacción a ${card.dataset.dish}`); notify("♥ ¡Gracias por tu reacción!"); }
  });


  // Día 1: delegación de eventos en el contenedor global del menú destacado.
  // Los botones podrían añadirse dinámicamente sin volver a registrar listeners.
  const liveContainer = $id("liveContainer");
  if (liveContainer) {
    liveContainer.addEventListener("click", (event) => {
      const offer = event.target.closest("[data-prod]");
      const like = event.target.closest("[data-action='like']");
      if (offer) {
        logEvent("OFERTA_CLICK", `Plato destacado seleccionado: ${offer.dataset.prod}`);
        notify(`Seleccionaste ${offer.dataset.prod}`);
      } else if (like) {
        logEvent("LIKE_STREAM", "El usuario envió un corazón al menú en vivo");
        notify("♥ ¡Gracias por tu reacción!");
      }
    });
    liveContainer.addEventListener("dblclick", (event) => {
      const offer = event.target.closest("[data-prod]");
      if (offer) {
        logEvent("LIKE_DBLCLICK", `Doble clic / corazón para ${offer.dataset.prod}`);
        notify("♥ Reacción registrada");
      }
    });
    const chatInput = $id("chatInput");
    if (chatInput) {
      chatInput.addEventListener("keyup", (event) => {
        if (event.target.value.trim()) {
          logEvent("CHAT_KEYUP", `Comentario en escritura: ${event.target.value}`);
        }
      });
    }
  }

  // Filtros DOM y búsqueda instantánea.
  $id("categoryFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-chip").forEach(chip => chip.classList.toggle("selected", chip === button));
    applyFilters();
    logEvent("FILTRO", `Categoría seleccionada: ${activeFilter}`);
  });
  $id("searchInput").addEventListener("input", () => applyFilters());
  $id("searchInput").addEventListener("keyup", event => {
    if (event.key.length === 1 || event.key === "Backspace") logEvent("BUSQUEDA_KEYUP", `Texto de búsqueda: ${event.target.value}`);
  });
  $id("showFavorites").addEventListener("click", () => {
    favoritesOnly = !favoritesOnly;
    $id("showFavorites").classList.toggle("active", favoritesOnly);
    $id("showFavorites").setAttribute("aria-pressed", String(favoritesOnly));
    applyFilters();
    logEvent("FILTRO_FAVORITOS", favoritesOnly ? "Mostrando favoritos" : "Mostrando catálogo");
  });

  // Selectores y cambios de estado.
  $id("eventType").addEventListener("change", event => logEvent("CHANGE_EVENTO", `Tipo de evento: ${event.target.value || "sin seleccionar"}`));
  $id("menuVariant").addEventListener("change", event => {
    logEvent("CAMBIO_VARIANTE", `El cliente seleccionó: ${event.target.value}`);
  });
  $id("calcGuests").addEventListener("change", event => {
    calculateTotal();
    logEvent("CHANGE_INVITADOS", `Cantidad: ${event.target.value}`);
  });

  // Menú responsive, modo claro/oscuro y controles generales.
  $id("menuToggle").addEventListener("click", () => {
    const expanded = $id("menuToggle").getAttribute("aria-expanded") === "true";
    $id("menuToggle").setAttribute("aria-expanded", String(!expanded));
    $id("mainNav").classList.toggle("show", !expanded);
    logEvent("MENU", expanded ? "Menú cerrado" : "Menú abierto");
  });
  $id("mainNav").addEventListener("click", event => {
    if (event.target.closest("a")) $id("mainNav").classList.remove("show");
  });
  $id("themeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const dark = document.body.classList.contains("dark-mode");
    $id("themeToggle").textContent = dark ? "☀" : "◐";
    logEvent("TEMA", dark ? "Modo oscuro activado" : "Modo claro activado");
  });
  document.querySelectorAll("[data-open-quote]").forEach(button => button.addEventListener("click", () => openModal("quoteModal")));
  $id("openCart").addEventListener("click", () => openModal("cartModal"));
  document.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", closeModals));
  document.querySelectorAll(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => {
    if (event.target === backdrop) closeModals();
  }));
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeModals(); });
  $id("calcGuests").addEventListener("input", calculateTotal);
  $id("serviceHours").addEventListener("input", calculateTotal);
  $id("serviceHours").addEventListener("change", event => logEvent("CHANGE_HORAS_SERVICIO", `Horas: ${event.target.value} · Tarifa: Bs 40/hr`));

  // Eliminar un plato usa delegación y actualiza el cálculo en tiempo real.
  $id("cartItems").addEventListener("click", event => {
    const remove = event.target.closest("[data-remove]");
    if (!remove) return;
    cart.delete(remove.dataset.remove);
    refreshCart();
    logEvent("PLATO_QUITADO", remove.dataset.remove);
  });

  // Formulario: preventDefault, validación y escritura segura de mensajes.
  $id("quoteForm").addEventListener("submit", event => {
    event.preventDefault();
    const name = $id("clientName").value.trim();
    const phone = $id("clientPhone").value.trim();
    const date = $id("eventDate").value;
    const guests = Number($id("guestCount").value);
    const feedback = $id("formFeedback");
    feedback.className = "feedback";
    if (!name || !phone || !$id("eventType").value || !date || guests < 1) {
      feedback.textContent = "Completa los campos obligatorios para continuar.";
      feedback.classList.add("error");
      logEvent("FORM_ERROR", "Validación de solicitud incompleta");
      return;
    }
    const selectedDate = new Date(`${date}T12:00:00`);
    if (selectedDate < new Date(new Date().toDateString())) {
      feedback.textContent = "La fecha del evento debe ser hoy o una fecha futura.";
      feedback.classList.add("error");
      logEvent("FORM_ERROR", "Fecha anterior a la actual");
      return;
    }
    feedback.textContent = "Solicitud validada en esta demostración. Revisa la confirmación.";
    feedback.classList.add("success");
    logEvent("SOLICITUD_VALIDADA", `${name} · ${$id("eventType").value} · ${$id("menuVariant").value} · ${guests} invitados`);
    $id("confirmSummary").textContent = `Solicitud de ${name} para ${guests} invitados. Total de platos seleccionado: ${$id("calcTotal").textContent}.`;
    showConfirmation();
  });
  $id("confirmSelection").addEventListener("click", () => {
    if (!cart.size) { notify("Agrega al menos un plato antes de continuar."); return; }
    closeModals();
    openModal("quoteModal");
    logEvent("CONTINUAR_COTIZACION", "Selección de platos trasladada al formulario");
  });
  $id("finishConfirm").addEventListener("click", () => {
    stopCountdown();
    logEvent("SOLICITUD_CONFIRMADA", "Confirmación local de demostración; no se envió a un servidor");
    closeModals();
    notify("¡Solicitud de demostración confirmada!");
    $id("quoteForm").reset();
  });
  $id("toggleAudit").addEventListener("click", () => {
    const panel = $id("auditPanel");
    panel.classList.toggle("collapsed");
    $id("toggleAudit").textContent = panel.classList.contains("collapsed") ? "+" : "−";
  });
  $id("clearAudit").addEventListener("click", () => {
    auditLog.replaceChildren();
    logEvent("BITACORA", "Registros limpiados por el usuario");
  });

  // Acordeón y cambio dinámico de tema jQuery (.slideToggle, addClass/removeClass).
  // El panel se prepara como interacción adicional de detalles del servicio.
  if (window.jQuery) {
    const $ = window.jQuery;
    $(".service-intro").attr("tabindex", "0").attr("role", "button").attr("aria-label", "Ver u ocultar detalles del servicio");
    $(".service-intro").off("click.jauregui").on("click.jauregui", function () {
      $(".service-points").stop(true, true).slideToggle("fast");
      logEvent("JQUERY_ACORDEON", "Detalles de servicios desplegados/ocultos");
    });
    $(".service-points span").off("click.jauregui").on("click.jauregui", function () {
      $(".service-points span").removeClass("service-selected");
      $(this).addClass("service-selected");
      $(".lower-strip").removeClass("theme-birthday theme-wedding theme-business");
      const text = $(this).text().toLowerCase();
      if (text.includes("matrimonio")) $(".lower-strip").addClass("theme-wedding");
      else if (text.includes("empresariales")) $(".lower-strip").addClass("theme-business");
      else $(".lower-strip").addClass("theme-birthday");
      logEvent("JQUERY_TEMA", `Tema visual aplicado: ${$(this).text()}`);
    });
  } else {
    logEvent("AVISO", "jQuery no está disponible; funciones nativas continúan activas");
  }

  refreshCart();
  logEvent("SISTEMA", "Catálogo iniciado. Listo para registrar interacciones.");
})();