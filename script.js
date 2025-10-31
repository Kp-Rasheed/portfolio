const toggle = document.getElementById('theme-toggle');
toggle.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  toggle.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(anchor.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
  });
});


document.querySelectorAll(".read-more").forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const card = this.closest(".project-card");
      card.classList.toggle("expanded");
      this.textContent = card.classList.contains("expanded") ? "Read Less" : "Read More";
    });
  });