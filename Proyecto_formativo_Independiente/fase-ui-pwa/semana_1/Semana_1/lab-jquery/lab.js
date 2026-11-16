(() => {
  "use strict";
  const $ = window.jQuery;
  const hoursInput = document.getElementById("hours");
  const total = document.getElementById("total");
  const modal = document.getElementById("confirmModal");
  const timer = document.getElementById("timer");
  const toast = document.getElementById("labToast");
  let countdown = null;
  let remaining = 30;
  function getHours(){ return Math.max(1, Math.min(24, Number(hoursInput.value) || 1)); }
  function calculate(){ const value = getHours(); hoursInput.value = value; total.textContent = `Bs ${value * 40}`; }
  function showToast(message){ toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2200); }
  function closeModal(expired=false){
    if (countdown) clearInterval(countdown);
    countdown = null;
    if ($) $("#confirmModal").stop(true,true).fadeOut("fast", () => modal.classList.remove("open"));
    else modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    if (expired) showToast("El tiempo expiró. La confirmación se cerró automáticamente.");
  }
  function openModal(){
    remaining = 30;
    timer.textContent = remaining;
    document.getElementById("modalDetail").textContent = `${getHours()} hora(s) · Bs ${getHours()*40}`;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden","false");
    if ($) $("#confirmModal").stop(true,true).fadeIn("fast");
    else modal.style.display = "flex";
    if ($) $("#confirmModal").css("display","flex");
    countdown = setInterval(() => {
      remaining--;
      timer.textContent = remaining;
      if (remaining <= 0) closeModal(true);
    },1000);
  }
  document.getElementById("minusHour").addEventListener("click",()=>{hoursInput.value=getHours()-1;calculate();});
  document.getElementById("plusHour").addEventListener("click",()=>{hoursInput.value=getHours()+1;calculate();});
  hoursInput.addEventListener("input",calculate);
  document.getElementById("openConfirm").addEventListener("click",openModal);
  document.getElementById("closeModal").addEventListener("click",()=>closeModal());
  document.getElementById("finish").addEventListener("click",()=>{closeModal();showToast("Servicio confirmado en la demostración.");});
  modal.addEventListener("click",event=>{if(event.target===modal)closeModal();});
  if ($) {
    $(".accordion-btn").off("click.lab").on("click.lab",function(){
      $(this).next(".accordion-panel").stop(true,true).slideToggle("fast");
      const expanded=$(this).attr("aria-expanded")==="true";
      $(this).attr("aria-expanded",String(!expanded)).text(expanded?"＋ Ver detalles del servicio":"− Ocultar detalles del servicio");
    });
    $(".theme-buttons").off("click.lab").on("click.lab","[data-theme]",function(){
      const theme=$(this).data("theme");
      $("#themeArea").removeClass("theme-cumple theme-matri theme-empresa").addClass(`theme-${theme}`);
      const labels={cumple:["🎂","Celebración de cumpleaños"],matri:["💍","Celebración de matrimonio"],empresa:["✦","Evento empresarial"]};
      $("#themeIcon").text(labels[theme][0]);
      $("#themeName").text(labels[theme][1]);
    });
  } else {
    document.querySelector(".accordion-btn").addEventListener("click",()=>document.querySelector(".accordion-panel").classList.toggle("visible"));
  }
  calculate();
})();