// MENU MOBILE
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");

function fecharMenuMobile() {
  if (menuToggle) {
    menuToggle.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
  }
  if (nav) {
    nav.classList.remove("open");
  }
}

if (menuToggle && nav) {
  menuToggle.setAttribute("aria-expanded", "false");

  menuToggle.addEventListener("click", () => {
    const estaAberto = nav.classList.toggle("open");
    menuToggle.classList.toggle("active", estaAberto);
    menuToggle.setAttribute("aria-expanded", String(estaAberto));
  });

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      fecharMenuMobile();
    });
  });

  document.addEventListener("click", event => {
    if (!nav.contains(event.target) && !menuToggle.contains(event.target)) {
      fecharMenuMobile();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      fecharMenuMobile();
    }
  });
}

// HEADER AO ROLAR
const header = document.getElementById("header");

if (header) {
  const atualizarHeader = () => {
    header.classList.toggle("scrolled", window.scrollY > 40);
  };

  atualizarHeader();
  window.addEventListener("scroll", atualizarHeader, { passive: true });
}

// ANIMAÇÕES DAS SEÇÕES (Intersection Observer)
const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && revealElements.length > 0) {
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12
  });

  revealElements.forEach(element => observer.observe(element));
} else {
  revealElements.forEach(element => element.classList.add("visible"));
}

// FAQ - PERGUNTAS FREQUENTES (Acordeão Fluido)
const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item, index) => {
  const question = item.querySelector(".faq-question");
  const answer = item.querySelector(".faq-answer");

  if (!question || !answer) return;

  const answerId = answer.id || `faq-answer-${index + 1}`;
  answer.id = answerId;
  question.setAttribute("aria-controls", answerId);
  question.setAttribute("aria-expanded", item.classList.contains("active") ? "true" : "false");

  if (item.classList.contains("active")) {
    answer.style.maxHeight = answer.scrollHeight + "px";
  }

  question.addEventListener("click", () => {
    const isOpen = item.classList.contains("active");

    faqItems.forEach(otherItem => {
      otherItem.classList.remove("active");
      const otherQuestion = otherItem.querySelector(".faq-question");
      const otherAnswer = otherItem.querySelector(".faq-answer");
      if (otherQuestion) otherQuestion.setAttribute("aria-expanded", "false");
      if (otherAnswer) otherAnswer.style.maxHeight = null;
    });

    if (!isOpen) {
      item.classList.add("active");
      question.setAttribute("aria-expanded", "true");
      answer.style.maxHeight = answer.scrollHeight + "px";
    }
  });
});

window.addEventListener("resize", () => {
  document.querySelectorAll(".faq-item.active .faq-answer").forEach(answer => {
    answer.style.maxHeight = answer.scrollHeight + "px";
  });
}, { passive: true });