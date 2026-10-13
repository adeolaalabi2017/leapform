/**
 * Leapform embed loader.
 *
 * Usage:
 *   <div data-leapform="FORM_ID" data-height="650" data-title="My survey"></div>
 *   <script async src="https://<your-leapform-host>/embed.js"></script>
 *
 * Turns every [data-leapform] element into an auto-resizing iframe of the live
 * form. The iframe reports its height via postMessage; the loader keeps the
 * frame sized to the content (min-height = data-height until content loads).
 */
(function () {
  "use strict";

  var origin = "";
  var current = document.currentScript;
  if (current && current.src) {
    try {
      origin = new URL(current.src).origin;
    } catch (e) {
      origin = "";
    }
  }
  if (!origin) origin = window.location.origin;

  function boot() {
    var nodes = document.querySelectorAll("[data-leapform]");
    for (var i = 0; i < nodes.length; i++) {
      (function (el) {
        if (el.getAttribute("data-leapform-ready")) return;
        el.setAttribute("data-leapform-ready", "1");

        var formId = el.getAttribute("data-leapform");
        var height = el.getAttribute("data-height") || "650";
        var minHeight = /^\d+$/.test(height) ? height + "px" : height;

        var iframe = document.createElement("iframe");
        iframe.src = origin + "/f/" + encodeURIComponent(formId);
        iframe.setAttribute("title", el.getAttribute("data-title") || "Leapform");
        iframe.setAttribute("loading", "lazy");
        iframe.setAttribute("allow", "fullscreen");
        iframe.style.width = "100%";
        iframe.style.border = "0";
        iframe.style.minHeight = minHeight;
        iframe.style.display = "block";
        el.appendChild(iframe);

        window.addEventListener("message", function (event) {
          var data = event.data || {};
          if (event.origin !== origin) return;
          if (data.type !== "leapform:resize") return;
          var h = parseInt(data.height, 10);
          if (isFinite(h) && h > 0 && !el.hasAttribute("data-fixed-height")) {
            iframe.style.height = h + "px";
          }
        });
      })(nodes[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
