"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [carPosition, setCarPosition] = useState(0);
  const [hoveredLink, setHoveredLink] = useState(null);

  useEffect(() => {
    const carElement = document.getElementById("nav-car");
    const navbarElement = document.getElementById("navbar");

    if (!carElement || !navbarElement) return;

    const updateCarPosition = () => {
      const scrollTop = window.pageYOffset;
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      const carWidth = carElement.offsetWidth;
      const navbarWidth = navbarElement.offsetWidth;
      const padding = 20; // Add 40px padding on both sides
      const travelDistance = navbarWidth - carWidth - padding * 2;
      const newCarPosition = padding + scrollProgress * travelDistance;
      setCarPosition(newCarPosition);
    };

    window.addEventListener("scroll", updateCarPosition);
    window.addEventListener("resize", updateCarPosition);
    updateCarPosition();

    return () => {
      window.removeEventListener("scroll", updateCarPosition);
      window.removeEventListener("resize", updateCarPosition);
    };
  }, []);

  const handleLinkClick = (e, targetId) => {
    e.preventDefault();
    setIsMenuOpen(false);

    const targetSection = document.querySelector(targetId);
    if (targetSection) {
      const offset = 120; // Adjust this value as needed
      window.scrollTo({
        top: targetSection.offsetTop - offset,
        behavior: "smooth",
      });
    }
  };

  const navLinks = [
    { name: "About", href: "#about" },
    { name: "Timeline", href: "#timeline" },
    { name: "Mentors", href: "#mentors" },
  ];

  return (
    <header className="relative h-20" aria-label="Primary Navigation">
      <div
        id="navbar"
        className="navbar-container"
        onMouseLeave={() => setHoveredLink(null)}
      >
        <div className="navbar-content">
          <Link href="/" className="flex items-center gap-4 z-10">
            <Image
              src="/assets/GDG logo.png"
              alt="GDG Logo"
              width={120}
              height={24}
              className="h-6 w-auto"
            />
          </Link>
          <Image
            id="nav-car"
            src="/assets/CAR.png"
            alt="Racing Car"
            width={100}
            height={50}
            className="nav-race-car"
            style={{ transform: `translateX(${carPosition}px)` }}
            priority
          />

          <div className="hidden md:flex items-center gap-x-2">
            {hoveredLink && (
              <div
                className="absolute h-8 bg-white/10 rounded-full transition-all duration-300 ease-out pointer-events-none"
                style={{ left: hoveredLink.left, width: hoveredLink.width }}
              />
            )}
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                onMouseEnter={(e) => {
                  const linkElement = e.currentTarget;
                  setHoveredLink({
                    left: linkElement.offsetLeft,
                    width: linkElement.offsetWidth,
                  });
                }}
                className="relative z-10 text-white/80 hover:text-white transition-colors px-4 py-1"
              >
                {link.name}
              </Link>
            ))}
          </div>

          <a
            href="https://luma.com/0dnxds6m?tk=GXTwjf"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:block bg-primary text-white font-bold py-2 px-6 rounded-full text-sm hover:bg-red-700 transition-colors"
          >
            Register
          </a>
          <button
            aria-label="Toggle menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`hamburger md:hidden ${isMenuOpen ? "active" : ""}`}
          >
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </button>
        </div>
      </div>

      <div
        className={`mobile-menu-overlay md:hidden ${
          isMenuOpen ? "active" : ""
        }`}
      >
        {navLinks.map((link, index) => (
          <Link
            key={link.name}
            href={link.href}
            onClick={(e) => handleLinkClick(e, link.href)}
            className="mobile-menu-link"
            style={{ animationDelay: `${300 + index * 100}ms` }}
          >
            {link.name}
          </Link>
        ))}

        <a
          href="https://luma.com/0dnxds6m?tk=GXTwjf"
          target="_blank"
          rel="noopener noreferrer"
          className="mobile-menu-register"
          style={{ animationDelay: `${300 + navLinks.length * 100}ms` }}
        >
          Register Now
        </a>
      </div>
    </header>
  );
}
