/* Give remote and pointer activation the same feedback across screens. */
document.addEventListener('click', function (event) {
  var target = event.target.closest('.card,.btn,.pill,.orow.f,.srow,.key,.opt');
  if (!target || document.body.classList.contains('calm')) return;
  clearTimeout(target._feedbackTimer);
  target.classList.remove('select-feedback');
  void target.offsetWidth;
  target.classList.add('select-feedback');
  // Cleanup must also run when navigation or reduced motion cancels the animation.
  target._feedbackTimer = setTimeout(function () { target.classList.remove('select-feedback'); }, 180);
}, true);
document.addEventListener('animationend', function (event) {
  if (event.animationName === 'selectFeedback') {
    clearTimeout(event.target._feedbackTimer);
    event.target.classList.remove('select-feedback');
  }
});
