import Image from "next/image";

const sponsors = {
  cultural: [
    {
      name: "Vibinz",
      src: "/assets/Vibinz.png",
      width: 150,
      height: 80,
      tier: "cultural",
    },
  ],
  gold: [
    {
      name: "Project Samvardhanam",
      src: "/assets/project Samvardhanam.png",
      width: 180,
      height: 70,
      tier: "gold",
    },
    {
      name: "SYB GEN",
      src: "/assets/SYBGEN.png",
      width: 180,
      height: 70,
      tier: "gold",
    },
    {
      name: "Cake",
      src: "/assets/CakeLogo.png",
      width: 180,
      height: 70,
      tier: "gold",
    },
    {
      name: "Punjab Brew Co.",
      src: "/assets/PunjabBrewCo.png",
      width: 180,
      height: 70,
      tier: "gold",
    },
  ],
  platinum: [
    {
      name: "Notion",
      src: "/assets/notion.png",
      width: 150,
      height: 60,
      tier: "platinum",
    },
    {
      name: "GMC",
      src: "/assets/GMC.png",
      width: 150,
      height: 60,
      tier: "platinum",
    },
    {
      name: "The Royal Terrace",
      src: "/assets/TheRoyalTerrace.png",
      width: 140,
      height: 55,
      tier: "platinum",
    },
  ],
  silver: [
    {
      name: "XYZ",
      src: "/assets/Xyz.png",
      width: 140,
      height: 55,
      tier: "silver",
    },
  ],
  poweredBy: [
    {
      name: "Hack Culture",
      src: "/assets/HackCulture.png",
      width: 200,
      height: 40,
      tier: "poweredBy",
    },
    {
      name: "Secure Dapp",
      src: "/assets/securedapp.svg",
      width: 200,
      height: 40,
      tier: "poweredBy",
    },
  ],
};

const SponsorTier = ({
  title,
  sponsors,
  gridClass,
  imageClass,
  titleClass,
}) => (
  <div className="w-full">
    <h3
      className={`font-display text-3xl font-bold text-center mb-10 ${titleClass}`}
    >
      {title}
    </h3>
    <div
      className={`flex flex-wrap items-center justify-center gap-x-12 gap-y-8 md:gap-x-16 ${gridClass}`}
    >
      {sponsors.map((sponsor) => (
        <div
          key={sponsor.name}
          className="flex flex-col items-center text-center gap-y-4"
        >
          <div className="group transition-all duration-300">
            <Image
              alt={sponsor.name}
              className={`object-contain transition-all duration-300 group-hover:drop-shadow-lg ${imageClass}`}
              src={sponsor.src}
              width={sponsor.width}
              height={sponsor.height}
            />
          </div>
          <p className="text-sm font-medium text-text-dark/80 tracking-wide">
            {sponsor.name}
          </p>
        </div>
      ))}
    </div>
  </div>
);

export default function Sponsors() {
  return (
    <section
      className="py-24 bg-card-dark text-text-dark border-t border-secondary-dark"
      id="sponsors"
    >
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-5xl font-bold text-text-dark">
            Official <span className="text-primary">Partners</span>
          </h2>
          <p className="mt-4 text-lg text-text-dark/80 max-w-2xl mx-auto">
            Powering innovation at the F1 Hackathon. We're proud to be supported
            by industry leaders.
          </p>
        </div>
        <div className="space-y-20">
          <SponsorTier
            title="Cultural Partner"
            sponsors={sponsors.cultural}
            titleClass="text-primary"
            imageClass="max-h-28"
          />
          <div className="space-y-20">
            <p className="mt-8 text-lg text-text-dark/80 max-w-3xl mx-auto text-center">
              VibinZ is the heartbeat of campus life — the club that brings
              energy, excitement, and crazy ideas to life. From electrifying
              fests and high-voltage concerts to creative cultural nights and
              grand-scale events, we’re the team behind the vibe that everyone
              talks about. As the Cultural Partners for this hackathon, VibinZ
              adds a spark of creativity, fun, and celebration to the tech
              spirit — blending innovation with entertainment to make the
              experience truly unforgettable.
            </p>
          </div>
          {
            <>
              <div className="relative p-8 rounded-2xl border border-slate-800 bg-slate-900/20 shadow-lg shadow-slate-700/10 overflow-hidden">
                <div
                  className="absolute -inset-px rounded-2xl bg-gradient-to-r from-slate-700 via-slate-200 to-slate-900 opacity-30 blur-lg"
                  style={{
                    backgroundSize: "200% 100%",
                    animation: "shimmer 8s linear infinite",
                  }}
                ></div>
                <SponsorTier
                  title="Platinum Sponsors"
                  sponsors={sponsors.platinum}
                  titleClass="text-gray-200"
                  imageClass="max-h-24"
                />
              </div>
              <SponsorTier
                title="Powered By"
                sponsors={sponsors.poweredBy}
                titleClass="text-blue-400"
                imageClass="max-h-24"
              />
              <SponsorTier
                title="Gold Sponsors"
                sponsors={sponsors.gold}
                titleClass="text-yellow-400"
                imageClass="max-h-24"
              />
              <SponsorTier
                title="Silver Sponsors"
                sponsors={sponsors.silver}
                titleClass="text-slate-400"
                imageClass="max-h-20"
              />
            </>
          }
        </div>
      </div>
    </section>
  );
}
