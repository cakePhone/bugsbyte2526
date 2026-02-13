"use client";

import { useEffect, useRef } from "react";
import { Users, FileText, UsersRound, Trophy } from "lucide-react";

export default function About() {
  const statsRef = useRef([]);

  useEffect(() => {
    function animateCounter(element, target, duration = 2000) {
      const start = 0;
      const increment = target / (duration / 16);
      let current = start;

      const timer = setInterval(() => {
        current += increment;

        if (current >= target) {
          element.textContent = target.toLocaleString();
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(current).toLocaleString();
        }
      }, 16);
    }

    const observerOptions = {
      threshold: 0.2,
      rootMargin: "0px 0px -30px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          if (entry.target.classList.contains("stat-card")) {
            const numberElement = entry.target.querySelector(".stat-number");
            const target = parseInt(numberElement.getAttribute("data-target"));
            const cards = Array.from(document.querySelectorAll(".stat-card"));
            const index = cards.indexOf(entry.target);
            setTimeout(() => {
              animateCounter(numberElement, target);
            }, index * 150);
          }
        }
      });
    }, observerOptions);

    const elementsToObserve = document.querySelectorAll(".stat-card");
    elementsToObserve.forEach((el) => {
      el.style.opacity = "0";
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" className="about">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">ABOUT THE RACE</h2>
          <p className="section-subtitle">
            The premier motorsport-inspired hackathon in India
          </p>
        </div>
        <div className="about-content">
          <div className="about-description">
            <div className="description-card">
              <h3>Our Vision</h3>
              <p>
                To establish Formula Hacks as the premier motorsport-inspired
                hackathon in India, merging cutting-edge technologies with the
                excitement of F1, while fostering innovation, skill development,
                and industry collaboration.
              </p>
            </div>
            <div className="description-card">
              <h3>The Experience</h3>
              <p>
                Formula Hacks 2025 is a hackathon inspired by Formula 1,
                bringing together the brightest minds to innovate at the
                intersection of AI, Data Science, and Web3. Participants will
                tackle real-world racing and technology challenges, reimagining
                the future of motorsport and fan engagement.
              </p>
            </div>
            <div className="description-card">
              <h3>Venue</h3>
              <p>Pulitzer Hall, Picasso Block, Chitkara University</p>
            </div>
            <div className="characteristics">
              <span className="char-badge">Fast-Paced</span>
              <span className="char-badge">Gamified</span>
              <span className="char-badge">Beginner-Friendly</span>
            </div>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <Users size={48} strokeWidth={1.5} />
              </div>
              <div className="stat-number" data-target="30000">
                0
              </div>
              <div className="stat-label">STUDENTS</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <FileText size={48} strokeWidth={1.5} />
              </div>
              <div className="stat-number" data-target="700">
                0
              </div>
              <div className="stat-label">REGISTRATIONS</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <UsersRound size={48} strokeWidth={1.5} />
              </div>
              <div className="stat-number" data-target="40">
                0
              </div>
              <div className="stat-label">FINAL TEAMS</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Trophy size={48} strokeWidth={1.5} />
              </div>
              <div className="stat-number" data-target="3">
                0
              </div>
              <div className="stat-label">WINNING TEAMS</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
