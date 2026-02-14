"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const events = [
  {
    time: "9:00 AM",
    title: "Check-in & Registration",
    day: "Day 1",
    special: false,
  },
  {
    time: "9:30 AM",
    title: "GDG Introduction & Dean's Address",
    day: "Day 1",
    special: false,
  },
  {
    time: "10:00 AM",
    title: "Vibinz-Icebreaker Session",
    day: "Day 1",
    special: false,
  },
  {
    time: "10:30 AM",
    title: "Technical Session / Workshop",
    day: "Day 1",
    special: false,
  },

  {
    time: "12:00 PM",
    title: "Lunch Break",
    day: "Day 1",
    special: false,
  },
  {
    time: "1:00 PM",
    title: "Hackathon Begins (Phase 1)",
    day: "Day 1",
    special: true,
  },
  {
    time: "3:00 PM",
    title: "Checkpoint 1",
    day: "Day 1",
    special: false,
  },
  {
    time: "4:00 PM",
    title: "Evening Break",
    day: "Day 1",
    special: false,
  },
  {
    time: "4:30 PM",
    title: "Hackathon Continues (Phase 2)",
    day: "Day 1",
    special: false,
  },
  {
    time: "7:00 PM",
    title: "Checkpoint 2",
    day: "Day 1",
    special: false,
  },
  {
    time: "8:00 PM",
    title: "Dinner Break",
    day: "Day 1",
    special: false,
  },
  {
    time: "9:00 PM",
    title: "Vibinz",
    day: "Day 1",
    special: false,
  },
  {
    time: "10:00 PM",
    title: "Hackathon Continues (Phase 3)",
    day: "Day 1",
    special: false,
  },
  {
    time: "12:00 AM",
    title: "F1 Stream & Midnight Coffee",
    day: "Night",
    special: false,
  },
  {
    time: "1:00 AM",
    title: "Hackathon Continues (Phase 4)",
    day: "Night",
    special: false,
  },
  {
    time: "7:00 AM",
    title: "Morning Break",
    day: "Day 2",
    special: false,
  },
  {
    time: "9:00 AM",
    title: "Checkpoint 3",
    day: "Day 2",
    special: false,
  },
  {
    time: "10:00 AM",
    title: "Final Submission & Testing",
    day: "Day 2",
    special: true,
  },
  {
    time: "12:00 PM",
    title: "Lunch / Refreshment Break",
    day: "Day 2",
    special: false,
  },
  {
    time: "1:00 PM",
    title: "Project Presentations",
    day: "Day 2",
    final: true,
  },
  {
    time: "2:00 PM",
    title: "GDG AI LABS Orientation",
    day: "Day 2",
    final: true,
  },
  {
    time: "2:30 PM",
    title: "Prize Distribution & Closing Ceremony",
    day: "Day 2",
    final: true,
  },
];

export default function Timeline() {
  const stickyContainerRef = useRef(null);
  const timelineWrapperRef = useRef(null);
  const carRef = useRef(null);
  const timelineContainerRef = useRef(null);

  useEffect(() => {
    function initHorizontalTimeline() {
      const stickyContainer = stickyContainerRef.current;
      const timelineWrapper = timelineWrapperRef.current;
      const car = carRef.current;
      const timelineContainer = timelineContainerRef.current;

      if (!stickyContainer || !timelineWrapper) return;

      let horizontalScrollLength = 0;
      let stickyTop = 0;

      function calculateDimensions() {
        horizontalScrollLength =
          timelineWrapper.scrollWidth - timelineWrapper.clientWidth;
        stickyContainer.style.height = `${
          horizontalScrollLength + timelineWrapper.offsetHeight
        }px`;
      }

      function updateTimelineOnScroll() {
        stickyTop =
          stickyContainer.getBoundingClientRect().top + window.pageYOffset;
        if (horizontalScrollLength <= 0) return;

        const scrollFromTop = window.pageYOffset;
        const scrollAmount = Math.max(0, scrollFromTop - stickyTop);

        if (scrollAmount <= horizontalScrollLength) {
          timelineWrapper.scrollLeft = scrollAmount;
        } else {
          timelineWrapper.scrollLeft = horizontalScrollLength;
        }

        const progress = timelineWrapper.scrollLeft / horizontalScrollLength;
        if (timelineContainer && car) {
          const travelDistance = timelineWrapper.clientWidth - car.offsetWidth;
          const carPosition = progress * travelDistance;
          car.style.left = `${carPosition}px`;
        }
      }

      calculateDimensions();
      window.addEventListener("scroll", updateTimelineOnScroll);
      window.addEventListener("resize", calculateDimensions);

      return () => {
        window.removeEventListener("scroll", updateTimelineOnScroll);
        window.removeEventListener("resize", calculateDimensions);
      };
    }

    const observerOptions = {
      threshold: 0.2,
      rootMargin: "0px 0px -30px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (
          entry.isIntersecting &&
          entry.target.classList.contains("timeline-event")
        ) {
          entry.target.classList.add("in-view");
        }
      });
    }, observerOptions);

    const timelineEvents = document.querySelectorAll(".timeline-event");
    timelineEvents.forEach((event) => {
      observer.observe(event);
    });

    const cleanup = initHorizontalTimeline();

    return () => {
      observer.disconnect();
      if (cleanup) cleanup();
    };
  }, []);

  return (
    <section id="timeline" className="timeline">
      <div className="section-header container">
        <h2 className="section-title">RACE SCHEDULE</h2>
        <p className="section-subtitle">30 hours of non-stop coding action</p>
      </div>
      <div className="timeline-sticky-container" ref={stickyContainerRef}>
        <div className="timeline-wrapper" ref={timelineWrapperRef}>
          <div className="timeline-track-container">
            <div className="timeline-track"></div>
            <div id="timeline-car-emoji" className="timeline-car" ref={carRef}>
              <Image
                src="/assets/Car2.png"
                alt="Racing Car"
                width={80}
                height={40}
                className="w-full h-auto scale-x-[-1]"
              />
            </div>
          </div>
          <div className="timeline-container" ref={timelineContainerRef}>
            {events.map((event, index) => (
              <div key={index} className="timeline-event">
                <div
                  className={`event-card ${event.special ? "special" : ""} ${
                    event.final ? "final" : ""
                  }`}
                >
                  <div className="event-time">{event.time}</div>
                  <div className="event-title">
                    {event.title.includes(" (Phase") ? (
                      <>
                        {event.title.split(" (Phase")[0]}
                        <br />
                        {`(Phase${event.title.split(" (Phase")[1]}`}
                      </>
                    ) : (
                      event.title
                    )}
                  </div>
                  <div className="event-day">{event.day}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
