/* Personal circle-free variant of the original 30nama artwork. */
(function () {
  N.ui.logo = function () {
    var img = document.createElement('img');
    img.className = 'mark';
    img.src = 'icon-mark-512.png';
    img.alt = '30nama';
    return img;
  };
})();
