$(function () {
  "use strict";
  const $doc = $(document);
  let songs = [];
  let queue = [];
  let timer = null;
  let seconds = 30;
  let demoTimer = null;
  let demoListener = null;
  let hydrated = false;
  let pending = JSON.parse(localStorage.getItem("jauregui-week2-reservas") || "[]");

  function toast(message) {
    $("#toast").stop(true, true).text(message).slideDown(180).delay(3000).fadeOut(250);
  }
  function networkStatus() {
    $("#network").text(navigator.onLine ? "● En línea" : "● Offline · guardado local")
      .css("color", navigator.onLine ? "#9de4b5" : "#ffbe8a");
  }
  $(window).off("online.week2 offline.week2").on("online.week2 offline.week2", networkStatus);
  networkStatus();

  // Calculador dinámico (40 BOB/hora) y modal con temporizador de 30 segundos.
  function updateTotal() {
    const hours = Math.max(1, Math.min(24, Number($("#hours").val()) || 1));
    $("#hours").val(hours);
    $("#total").text("Bs " + (hours * 40).toLocaleString("es-BO"));
  }
  $("#hours").off("input.week2 change.week2").on("input.week2 change.week2", updateTotal);
  updateTotal();

  function stopCountdown() {
    if (timer) clearInterval(timer);
    timer = null;
  }
  function closeModal() {
    stopCountdown();
    $("#modal").stop(true, true).fadeOut(180).removeClass("open").attr("aria-hidden", "true");
  }
  function openModal(name) {
    seconds = 30;
    $("#modalSummary").text(`${name} · ${$("#hours").val()} hora(s) · ${$("#total").text()}`);
    $("#countdown").text("00:30");
    $("#modal").stop(true, true).fadeIn(180).addClass("open").attr("aria-hidden", "false");
    stopCountdown();
    timer = setInterval(() => {
      seconds -= 1;
      $("#countdown").text("00:" + String(seconds).padStart(2, "0"));
      if (seconds <= 0) {
        closeModal();
        toast("Tarifa Flash Expirada");
      }
    }, 1000);
  }
  $("#bookingForm").off("submit.week2").on("submit.week2", function (event) {
    event.preventDefault();
    const name = $("#clientName").val().trim();
    if (!name) { $("#clientName").trigger("focus"); toast("Escribe el nombre del cliente."); return; }
    openModal(name);
  });
  $("#closeModal, #cancel").off("click.week2").on("click.week2", closeModal);
  $("#confirm").off("click.week2").on("click.week2", function () {
    const name = $("#clientName").val().trim();
    if (!name) return;
    pending.push({
      id: Date.now(), nombre: name, servicio: $("#service").val(),
      fecha: $("#date").val(), horas: Number($("#hours").val()),
      total: $("#hours").val() * 40,
      estado: navigator.onLine ? "guardado-local" : "pendiente-offline"
    });
    localStorage.setItem("jauregui-week2-reservas", JSON.stringify(pending));
    renderReservations();
    closeModal();
    $("#bookingForm")[0].reset();
    updateTotal();
    toast(navigator.onLine ? "Solicitud guardada en este dispositivo." : "Guardado localmente · Pendiente de envío.");
  });
  function renderReservations() {
    const list = $("#reservationList").empty();
    if (!pending.length) { list.append($("<li>").text("Aún no hay solicitudes.")); return; }
    pending.slice().reverse().forEach(item => {
      const li = $("<li>");
      $("<strong>").text(item.nombre + " — ").appendTo(li);
      $("<span>").text(item.servicio + " · " + item.estado).appendTo(li);
      list.append(li);
    });
  }
  renderReservations();

  // Carga real desde data/canciones.json; valida response.ok y maneja errores.
  function renderSongs() {
    const term = $("#songSearch").val().trim().toLocaleLowerCase("es");
    const catalog = $("#songCatalog").empty();
    songs.filter(s => `${s.titulo} ${s.artista} ${s.genero}`.toLocaleLowerCase("es").includes(term))
      .forEach(song => {
        const row = $("<div>").addClass("song-row").attr("data-id", song.id);
        $("<img>").attr({src: song.portada, alt: "Portada ilustrativa", loading: "lazy", width: 48, height: 48}).appendTo(row);
        const info = $("<div>").addClass("song-info");
        $("<b>").text(song.titulo).appendTo(info);
        $("<small>").text(song.artista + " · " + song.genero).appendTo(info);
        const add = $("<button>").attr("type", "button").addClass("add-song").text("+").attr("aria-label", "Agregar canción");
        row.append(info, add); catalog.append(row);
      });
    if (!catalog.children().length) catalog.append($("<p>").text("No hay coincidencias."));
    $("#trackCount").text(`${songs.length} pistas cargadas`);
  }
  function renderQueue() {
    const box = $("#songQueue").empty();
    if (!queue.length) { box.append($("<p>").text("Aún no agregaste canciones.")); return; }
    queue.forEach((song, index) => {
      const row = $("<div>").addClass("song-row");
      const info = $("<div>").addClass("song-info");
      $("<b>").text(song.titulo).appendTo(info);
      $("<small>").text(song.artista).appendTo(info);
      row.append(info, $("<button>").attr({type:"button","data-index":index}).addClass("remove-song").text("×"));
      box.append(row);
    });
  }
  async function loadSongs() {
    $("#songCatalog").empty().append($("<p>").text("Cargando canciones…"));
    try {
      const response = await fetch("./data/canciones.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data) || data.length < 15) throw new Error("Se requieren al menos 15 canciones.");
      songs = data;
      renderSongs();
      toast("Catálogo de 15 canciones cargado.");
    } catch (error) {
      $("#songCatalog").empty().append($("<p>").text("No se pudo cargar el JSON. Comprueba la conexión inicial o la caché PWA."));
      console.error("Fetch canciones:", error);
    }
  }
  $("#songSearch").off("keyup.week2 input.week2").on("keyup.week2 input.week2", renderSongs);
  // Delegación de eventos requerida: botones dinámicos dentro de contenedores estables.
  $("#songCatalog").off("click.week2", ".add-song").on("click.week2", ".add-song", function () {
    const id = Number($(this).closest(".song-row").attr("data-id"));
    const song = songs.find(s => s.id === id);
    if (song) { queue.push(song); renderQueue(); toast("Canción agregada a la lista."); }
  });
  $("#songQueue").off("click.week2", ".remove-song").on("click.week2", ".remove-song", function () {
    queue.splice(Number($(this).attr("data-index")), 1);
    renderQueue();
  });
  $("#addCustom").off("click.week2").on("click.week2", function () {
    const title = $("#customSong").val().trim();
    if (!title) return;
    queue.push({titulo:title,artista:"Solicitud del cliente",genero:"Personalizada"});
    $("#customSong").val(""); renderQueue(); toast("Solicitud musical añadida.");
  });
  loadSongs();

  // Hidratación didáctica: conecta comportamiento al DOM estático sin reconstruirlo.
  $("#hydrate").off("click.week2").on("click.week2", function () {
    if (hydrated) return;
    hydrated = true;
    $("#hydrationState").text("✓ DOM existente conectado a eventos interactivos.");
    $(this).text("Interfaz hidratada ✓").prop("disabled", true);
  });

  // Demo de prevención de Memory Leak: un listener y un intervalo, limpiados explícitamente.
  $("#memory").off("click.week2").on("click.week2", function () {
    if (demoTimer) {
      clearInterval(demoTimer); demoTimer = null;
      document.removeEventListener("week2-pulse", demoListener); demoListener = null;
      $("#memoryState").text("Listeners: 0 · Temporizador detenido · Recursos liberados.");
      $(this).text("Iniciar demo");
    } else {
      demoListener = () => $("#memoryState").text("Listeners: 1 · Temporizador activo · Demo en ejecución.");
      document.addEventListener("week2-pulse", demoListener);
      demoTimer = setInterval(() => document.dispatchEvent(new Event("week2-pulse")), 1000);
      $("#memoryState").text("Listeners: 1 · Temporizador activo.");
      $(this).text("Limpiar recursos");
    }
  });

  // XSS: nunca se inserta la entrada no confiable como HTML.
  $("#xssTest").off("click.week2").on("click.week2", function () {
    $("#xssOutput").text($("#xssInput").val() || "No ingresaste texto.");
  });

  $("#checkPwa").off("click.week2").on("click.week2", async function () {
    if (!("serviceWorker" in navigator)) { $("#pwaState").text("Service Worker no disponible en este navegador."); return; }
    const reg = await navigator.serviceWorker.getRegistration();
    $("#pwaState").text(reg ? "✓ Service Worker registrado. Cache Storage disponible." : "Abre desde HTTPS o localhost para registrar la PWA.");
  });

  // Evita que el contador siga vivo si se abandona la página.
  $(window).off("pagehide.week2").on("pagehide.week2", function () {
    stopCountdown();
    if (demoTimer) clearInterval(demoTimer);
    if (demoListener) document.removeEventListener("week2-pulse", demoListener);
  });
});