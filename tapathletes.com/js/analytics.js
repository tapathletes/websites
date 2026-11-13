// Visitor and click analytics (PostHog) for tapathletes.com.
// Decision: ADR-0045 in tapathletes/tapos, amended 2026-11-12 — tapathletes.com
// tracks every visitor, signed in or not, and every button click.
//
// Loaded on every page by <script src="/js/analytics.js" defer> in <head>.
//
// What is sent
//   - Page views and page leaves, from PostHog itself.
//   - One named event per button: give the element data-event="<name>" and
//     data-location="<where on the page>" (optional data-detail="<which one>").
//     Every event carries location, label (the button's own text) and, for
//     links, link (the href without its query string; #anchors kept).
//   - Any other link or button still sends link_clicked / button_clicked with
//     its label and location, so every click is recorded.
//   - A form with data-event sends that event when it is submitted, with its
//     location only. What a visitor typed into a form is never sent.
//
// Same capture rules as TAPOS (apps/web/app/lib/analytics.ts in tapathletes/tapos):
// no session replay, autocapture never records on-screen text or attributes,
// no person profiles for anonymous visitors, and no captured URL keeps its
// query string or fragment. Every event carries site = "tapathletes.com",
// which keeps it apart from TAPOS events in the shared PostHog project.
//
// Sends only on the live host. On localhost or a *.workers.dev preview,
// PostHog is not loaded and each event is printed to the console instead,
// so a change can be checked without sending anything. Automated browsers
// (navigator.webdriver) are never tracked.
//
// The project token is public by design: PostHog's browser SDK sends it with
// every event, so it is not a secret.

(function () {
  'use strict';

  var POSTHOG_TOKEN = 'phc_yrhXSuYkwT3oz9wjGvkcYDAqXAL8ub8A4c7rTiHTpaZy';
  var POSTHOG_HOST = 'https://us.i.posthog.com';
  var LIVE_HOSTS = ['tapathletes.com'];

  var live = LIVE_HOSTS.indexOf(window.location.hostname) !== -1 && !navigator.webdriver;

  function stripQuery(value) {
    if (typeof value !== 'string') return value;
    var cut = value.search(/[?#]/);
    return cut === -1 ? value : value.slice(0, cut);
  }

  function stripQueryFromUrls(bag) {
    if (!bag) return;
    for (var key in bag) {
      if (Object.prototype.hasOwnProperty.call(bag, key) && /(url|referrer|href)$/i.test(key)) {
        bag[key] = stripQuery(bag[key]);
      }
    }
  }

  // Mirrors sanitizeEvent() in TAPOS: no captured URL keeps its query string
  // or fragment. UTM tags still arrive, as their own utm_* properties.
  function sanitizeEvent(event) {
    if (!event) return event;
    stripQueryFromUrls(event.properties);
    stripQueryFromUrls(event.$set);
    stripQueryFromUrls(event.$set_once);
    return event;
  }

  if (live) {
    // PostHog's HTML snippet, verbatim from
    // https://posthog.com/docs/web-analytics/installation/html-snippet (fetched 2026-11-12).
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}p||((p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",p.onerror=function(){p=null},(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r));var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    window.posthog.init(POSTHOG_TOKEN, {
      api_host: POSTHOG_HOST,
      defaults: '2026-08-30',
      person_profiles: 'identified_only',
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      before_send: sanitizeEvent,
    });
    window.posthog.register({ site: 'tapathletes.com' });
  }

  function send(event, properties) {
    if (live) {
      window.posthog.capture(event, properties);
    } else {
      console.info('[analytics]', event, properties);
    }
  }

  // Where on the page: the element's own data-location, else the nearest
  // container with one (the mobile menu), else the section id or popup id it
  // sits in, else the landmark (header, footer, nav).
  function locationOf(el) {
    var own = el.getAttribute('data-location');
    if (own) return own;
    var box = el.parentElement && el.parentElement.closest('[data-location], section[id], dialog[id], header, footer, nav');
    if (!box) return 'page';
    var named = box.getAttribute('data-location');
    if (named) return named;
    var tag = box.tagName.toLowerCase();
    return tag === 'section' || tag === 'dialog' ? box.id : tag;
  }

  // A link's href without its query string. In-page anchors (#programs) are
  // kept: on this site they only ever name a section.
  function linkOf(href) {
    var q = href.indexOf('?');
    if (q === -1) return href;
    var hash = href.indexOf('#', q);
    return href.slice(0, q) + (hash === -1 ? '' : href.slice(hash));
  }

  // The button's own text; an image-only link (the store badges) uses its alt.
  function labelOf(el) {
    var text = el.getAttribute('aria-label') || el.textContent || '';
    if (!text.trim()) {
      var img = el.querySelector('img[alt]');
      if (img) text = img.getAttribute('alt');
    }
    return text.replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (!el) return;
    // A form's submit button is counted when the form is submitted.
    if (el.tagName === 'BUTTON' && el.type === 'submit' && el.form && el.form.hasAttribute('data-event')) return;

    var name = el.getAttribute('data-event') || (el.tagName === 'A' ? 'link_clicked' : 'button_clicked');
    var properties = { location: locationOf(el), label: labelOf(el) };
    var href = el.getAttribute('href');
    if (href) properties.link = linkOf(href);
    var detail = el.getAttribute('data-detail');
    if (detail) properties.detail = detail;
    send(name, properties);
  }, true);

  document.addEventListener('submit', function (e) {
    var form = e.target;
    var name = form && form.getAttribute ? form.getAttribute('data-event') : null;
    if (!name) return;
    send(name, { location: locationOf(form) });
  }, true);
})();
