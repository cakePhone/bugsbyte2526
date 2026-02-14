import Image from "next/image";

const mentors = [
  {
    id: 1,
    image: "/assets/mentors/Frame 1562.png",
    alt: "Mentor 1",
  },
  {
    id: 2,
    image: "/assets/mentors/Frame 1563.png",
    alt: "Mentor 2",
  },
  {
    id: 3,
    image: "/assets/mentors/Frame 1564.png",
    alt: "Mentor 3",
  },
  {
    id: 4,
    image: "/assets/mentors/Frame 1565.png",
    alt: "Mentor 4",
  },
  {
    id: 5,
    image: "/assets/mentors/Frame 1566.png",
    alt: "Mentor 5",
  },
];

export default function Mentors() {
  return (
    <section className="py-24 bg-background-dark" id="mentors">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="font-display text-5xl font-bold text-text-dark">
            Meet Your <span className="text-primary">Mentors</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 max-w-7xl mx-auto">
          {mentors.map((mentor) => (
            <div
              key={mentor.id}
              className="mentor-card group transition-all duration-300 transform hover:scale-105"
            >
              <div className="relative w-full aspect-square rounded-xl overflow-hidden group-hover:shadow-2xl transition-all duration-300">
                <Image
                  src={mentor.image}
                  alt={mentor.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
