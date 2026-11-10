(function () {
  function grade(button) {
    var q = button.closest("[data-quiz-q]");
    if (!q || q.getAttribute("data-answered") === "1") return;

    var correct = q.getAttribute("data-answer");
    var chosen = button.getAttribute("data-choice");
    var feedback = q.querySelector("[data-feedback]");
    var okText = q.getAttribute("data-ok") || "正确。";
    var badText = q.getAttribute("data-bad") || "再想一想。";

    q.setAttribute("data-answered", "1");
    Array.prototype.forEach.call(q.querySelectorAll("[data-choice]"), function (btn) {
      btn.disabled = true;
      var c = btn.getAttribute("data-choice");
      if (c === correct) btn.classList.add("correct");
      if (c === chosen && c !== correct) btn.classList.add("incorrect");
    });

    if (!feedback) return;
    var isOk = chosen === correct;
    feedback.className = "feedback show " + (isOk ? "ok" : "bad");
    feedback.textContent = isOk ? okText : badText;
  }

  document.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-choice]");
    if (!btn) return;
    grade(btn);
  });
})();
