document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.conformance-pass').forEach(function (block) {
    block.setAttribute('data-ready', '');
  });
});
