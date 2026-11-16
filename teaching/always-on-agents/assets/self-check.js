/* ==========================================================
   可复用自检组件 self-check.js
   用法：

   <div class="self-check" data-check-id="cycle-draw">
     <div class="self-check-prompt">...</div>
     <button type="button" class="self-check-toggle" aria-expanded="false">对照答案</button>
     <div class="self-check-answer" hidden>...</div>
   </div>
   <script src="../assets/self-check.js" defer></script>

   先凭记忆作答，再点开对照。打印时直接显示答案。
   ========================================================== */
(function () {
  'use strict';

  function setup(root) {
    var btn = root.querySelector('.self-check-toggle');
    var answer = root.querySelector('.self-check-answer');
    if (!btn || !answer) return;

    function open() {
      root.classList.add('is-open');
      answer.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      btn.textContent = btn.getAttribute('data-hide-label') || '收起答案';
    }
    function close() {
      root.classList.remove('is-open');
      answer.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = btn.getAttribute('data-show-label') || '对照答案';
    }

    if (!btn.getAttribute('data-show-label')) {
      btn.setAttribute('data-show-label', btn.textContent.trim() || '对照答案');
    }
    close();
    btn.addEventListener('click', function () {
      if (root.classList.contains('is-open')) close();
      else open();
    });
  }

  document.querySelectorAll('.self-check').forEach(setup);
})();
