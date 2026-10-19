/* ==========================================================
   可复用测验组件 quiz.js
   用法（在课程 HTML 里）：

   <div class="quiz" data-quiz-id="0001">
     <script type="application/json">
       { "questions": [
           { "q": "题目",
             "options": ["选项一", "选项二", "选项三", "选项四"],
             "answer": 0,              // 正确选项在 options 里的下标
             "explain": "解释（可含 <a> 链接）" }
       ] }
     <\/script>
   </div>
   <script src="../assets/quiz.js" defer><\/script>

   规则：
   - 每题的选项必须字数相同（不让排版泄露答案）。字数不一致时，
     组件会在浏览器控制台给出警告，方便作者修正。
   - 选项顺序每次随机打乱，防止靠位置记答案。
   - 点击即判分，立刻显示对错和解释；每题只能答一次。
   - 本机浏览器会记住上次得分和日期（localStorage），方便隔几天回来复习。
   ========================================================== */
(function () {
  'use strict';

  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function charLen(s) {
    // 按“字”计数（汉字、字母、空格都算一个），忽略首尾空白
    return Array.from(String(s).trim()).length;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function storageKey(id) { return 'teach-quiz:' + (id || location.pathname); }

  function loadRecord(id) {
    try { return JSON.parse(localStorage.getItem(storageKey(id)) || 'null'); } catch (e) { return null; }
  }
  function saveRecord(id, rec) {
    try { localStorage.setItem(storageKey(id), JSON.stringify(rec)); } catch (e) { /* 隐私模式下忽略 */ }
  }

  function build(root) {
    var dataNode = root.querySelector('script[type="application/json"]');
    if (!dataNode) return;
    var data;
    try { data = JSON.parse(dataNode.textContent); } catch (e) {
      root.appendChild(el('p', 'quiz-feedback no', '测验数据格式有误，无法加载。'));
      console.error('[quiz] JSON 解析失败', e);
      return;
    }
    var qs = data.questions || [];
    var id = root.getAttribute('data-quiz-id');

    // 作者自检：选项字数是否一致
    qs.forEach(function (q, i) {
      var lens = q.options.map(charLen);
      var same = lens.every(function (l) { return l === lens[0]; });
      if (!same) console.warn('[quiz] 第 ' + (i + 1) + ' 题选项字数不一致：', lens, q.options);
    });

    var answered = 0, correct = 0;

    var scoreBox = el('div', 'quiz-score');
    var prev = loadRecord(id);
    scoreBox.innerHTML = prev
      ? '上次得分：<strong>' + prev.correct + ' / ' + prev.total + '</strong>（' + prev.date + '）。先别看课文，凭记忆作答。'
      : '共 ' + qs.length + ' 题。先别往回翻，凭记忆作答——想不起来的那一下，正是记忆在变牢。';
    root.appendChild(scoreBox);

    qs.forEach(function (q, qi) {
      var card = el('div', 'quiz-q');
      card.appendChild(el('div', 'quiz-q-head', '第 ' + (qi + 1) + ' 题 / 共 ' + qs.length + ' 题'));
      card.appendChild(el('div', 'quiz-q-text', q.q));

      var optsWrap = el('div', 'quiz-opts');
      var order = shuffle(q.options.map(function (_, i) { return i; }));
      var buttons = [];
      var fb = el('div', 'quiz-feedback');
      var ex = el('div', 'quiz-explain', q.explain || '');

      order.forEach(function (origIdx, pos) {
        var b = el('button', 'quiz-opt');
        b.type = 'button';
        b.setAttribute('data-correct', origIdx === q.answer ? '1' : '0');
        b.innerHTML = '<span class="quiz-letter">' + LETTERS[pos] + '</span>' + q.options[origIdx];
        b.addEventListener('click', function () {
          if (card.getAttribute('data-done')) return;
          card.setAttribute('data-done', '1');
          answered++;
          var ok = origIdx === q.answer;
          if (ok) correct++;
          buttons.forEach(function (btn) {
            btn.disabled = true;
            if (btn.getAttribute('data-correct') === '1') btn.classList.add('is-correct');
            else if (btn !== b) btn.classList.add('is-dim');
          });
          if (!ok) b.classList.add('is-wrong');
          fb.className = 'quiz-feedback ' + (ok ? 'ok' : 'no');
          fb.textContent = ok ? '✓ 答对了' : '✗ 不对，正确答案已用绿色标出';
          ex.classList.add('show');
          if (answered === qs.length) finish();
        });
        buttons.push(b);
        optsWrap.appendChild(b);
      });

      card.appendChild(optsWrap);
      card.appendChild(fb);
      card.appendChild(ex);
      root.appendChild(card);
    });

    var actions = el('div', 'quiz-actions');
    var retry = el('button', null, '重新做一遍（选项会重新打乱）');
    retry.type = 'button';
    retry.addEventListener('click', function () {
      Array.prototype.slice.call(root.querySelectorAll('.quiz-q, .quiz-score, .quiz-actions')).forEach(function (n) { n.remove(); });
      build(root);
    });
    actions.appendChild(retry);
    root.appendChild(actions);

    function finish() {
      var d = new Date();
      var date = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      saveRecord(id, { correct: correct, total: qs.length, date: date });
      var msg = correct === qs.length
        ? '全对。过两三天再回来做一次，看看还记不记得。'
        : '把答错的题对应的那一步再读一遍，然后隔天重做。';
      scoreBox.innerHTML = '本次得分：<strong>' + correct + ' / ' + qs.length + '</strong>。' + msg;
      scoreBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function init() {
    Array.prototype.slice.call(document.querySelectorAll('.quiz')).forEach(build);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
