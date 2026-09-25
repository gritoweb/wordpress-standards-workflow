/**
 * Load more for a collection block (a card grid backed by a post type query).
 *
 * Without JavaScript the button is a link to the next page, which the server
 * renders with every item up to that page. This fetches that same URL and
 * appends only the items the list does not have yet, so the list grows in
 * place. Any failure falls back to following the link.
 *
 * More than one collection block can load this file under its own handle, so
 * it can run twice on a page; the flag keeps a single listener. Plain
 * vanilla: served from source.
 */
(function () {
  if (window.__PREFIX__CollectionPaging) {
    return;
  }

  window.__PREFIX__CollectionPaging = true;

  var ROW_CAP = 8; // matches the grid's own reveal stagger cap
  var REVEAL_MS = 1000;
  var TIMEOUT_MS = 15000; // a request that has not finished by then is dropped
  var DEFAULT_TIMEOUT_MESSAGE = "This is taking too long. Try again.";

  // The link only knows the query it was rendered with. Merge its own page
  // argument into the URL the visitor is on now, so other collections keep
  // the pages they already loaded.
  function mergePage(href, key, from) {
    var page = new URL(from, window.location.href).searchParams.get(key);
    var url = new URL(href, window.location.href);

    if (page && page !== "1") {
      url.searchParams.set(key, page);
    } else {
      url.searchParams.delete(key);
    }

    return url;
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest
      ? event.target.closest("[data-paging-more]")
      : null;

    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    var control = link.closest("[data-paging]");
    var key = control ? control.getAttribute("data-paging") : "";
    var list = key ? document.getElementById(key) : null;

    if (!list) {
      return;
    }

    event.preventDefault();

    if (link.getAttribute("aria-busy") === "true") {
      return;
    }

    link.setAttribute("aria-busy", "true");

    var controller = new AbortController();
    var timedOut = false;
    var deadline = window.setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);

    var target = mergePage(window.location.href, key, link.href);
    target.hash = new URL(link.href, window.location.href).hash;

    // Other requests may commit while this one is pending, so the URL to
    // store is rebuilt from the live location when the response lands.
    function live() {
      var url = mergePage(window.location.href, key, target.href);
      url.hash = target.hash;

      return url;
    }

    fetch(target.href, {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error(String(response.status));
        }

        return response.text();
      })
      .then(function (html) {
        var page = new DOMParser().parseFromString(html, "text/html");
        var nextList = page.getElementById(key);

        if (!nextList) {
          throw new Error("list missing");
        }

        var before = list.children.length;
        var added = Array.prototype.slice
          .call(nextList.children, before)
          .map(function (item, i) {
            var node = document.importNode(item, true);
            // The section has already entered, so an entrance part here would
            // only stack a second hidden state on the element the reveal
            // below animates.
            node.removeAttribute("data-entrance-part");
            node.style.removeProperty("--e-i");
            node.setAttribute("data-revealing", "");
            node.style.setProperty("--reveal-i", Math.min(i, ROW_CAP));
            list.appendChild(node);

            return node;
          });

        var nextControl = page.querySelector(
          '[data-paging="' + window.CSS.escape(key) + '"]',
        );

        if (nextControl) {
          control.replaceWith(document.importNode(nextControl, true));
        } else {
          control.remove();
        }

        // A reload keeps what is already showing, for every collection.
        window.clearTimeout(deadline);
        var stored = live();
        history.replaceState(history.state, "", stored.href.split("#")[0]);

        // Every control, the replacement included, takes the live page of
        // each collection so a link opened in a new tab keeps them all.
        Array.prototype.forEach.call(
          document.querySelectorAll("[data-paging] a[href]"),
          function (other) {
            var owner = other.closest("[data-paging]");

            if (owner) {
              var own = owner.getAttribute("data-paging");
              var next = mergePage(stored.href, own, other.href);
              next.hash = new URL(other.href, window.location.href).hash;
              other.href = next.href;
            }
          },
        );

        // Focus lands on the first new item's own link, so a keyboard user
        // carries on from where the list grew.
        // An item without a link takes tabindex -1 so focus is not dropped
        // onto the body when the button goes.
        var focusTarget = added[0] ? added[0].querySelector("a") : null;

        if (!focusTarget && added[0]) {
          focusTarget = added[0];
          focusTarget.setAttribute("tabindex", "-1");
        }

        // The visitor may have moved on while the request ran. Focus follows
        // only if it is still on the button or has fallen back to the page.
        var active = document.activeElement;
        var stayed = !active || active === link || active === document.body;

        if (focusTarget && stayed) {
          focusTarget.focus({ preventScroll: true });
        }

        window.setTimeout(function () {
          added.forEach(function (node) {
            node.removeAttribute("data-revealing");
            node.style.removeProperty("--reveal-i");
          });
        }, REVEAL_MS);
      })
      .catch(function () {
        window.clearTimeout(deadline);

        if (!timedOut) {
          window.location.href = live().href;

          return;
        }

        link.removeAttribute("aria-busy");
        var note = document.createElement("p");
        note.setAttribute("role", "status");
        // The Blade partial prints this translated via a data attribute
        // (see _docs/editor-contract.md); the literal here is only the
        // fallback for a partial that doesn't set it.
        note.textContent =
          control.getAttribute("data-paging-timeout-message") ||
          DEFAULT_TIMEOUT_MESSAGE;
        control.appendChild(note);
      });
  });
})();
