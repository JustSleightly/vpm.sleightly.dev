(() => {
  "use strict";
  const config = document.currentScript.dataset;
  if (location.hostname !== config.host || !["/", "/index.html"].includes(location.pathname) || navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return;
  const id = config.measurement;
  const page = { page_location: `https://${config.host}/`, page_title: config.title, page_referrer: "" };
  try { page.page_referrer = document.referrer ? new URL(document.referrer).origin : ""; } catch {}
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id, { ...page, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
  window.gtag("event", "page_view", { ...page, send_to: id });
  const tag = document.createElement("script");
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.append(tag);
  const category = host => {
    if (host === "store.sleightly.dev" || host.endsWith(".gumroad.com")) return "store";
    if (host === "notes.sleightly.dev") return "knowledgebase";
    if (host === "just.sleightly.dev") return "portfolio";
    if (host === "vpm.sleightly.dev") return "packages";
    if (host === "github.com") return "repository";
    if (host === "discord.sleightly.dev" || host === "discord.gg" || host === "discord.com") return "community";
    return "external";
  };
  document.addEventListener("click", event => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const intent = event.target.closest("[data-analytics-intent]");
    if (intent && ["repo_add", "repo_copy"].includes(intent.dataset.analyticsIntent)) {
      window.gtag("event", "repo_add_intent", { ...page, method: intent.dataset.analyticsIntent === "repo_add" ? "vcc" : "copy_url", send_to: id });
      return;
    }
    const link = event.target.closest("a[href]");
    if (!link) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (["mailto:", "tel:"].includes(url.protocol)) {
      window.gtag("event", "contact_intent", { ...page, method: url.protocol === "mailto:" ? "email" : "phone", send_to: id });
    } else if (["https:", "http:"].includes(url.protocol) && url.hostname !== config.host) {
      window.gtag("event", "outbound_click", { ...page, destination: category(url.hostname), send_to: id });
    }
  });
})();
