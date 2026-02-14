import Image from "next/image";

export default function Hero() {
  return (
    <main className="relative flex justify-center h-[calc(100vh-5rem)] pointer-events-none">
      <div className="container mx-auto px-6 flex flex-col items-center justify-center text-center relative z-10 pointer-events-auto">
        <h1 className="font-display text-6xl sm:text-7xl md:text-8xl font-black text-text-dark tracking-widest drop-shadow-lg">
          <span className="text-primary">START</span> YOUR ENGINES
        </h1>
        <p className="font-display mt-4 text-xl sm:text-2xl text-text-dark/90 max-w-3xl">
          The ultimate Formula 1 themed hackathon. Build, innovate, and race to
          the finish line with cutting-edge tech.
        </p>
        <p className="mt-4 font-bold text-2xl text-text-dark">
          <span className="material-icons text-primary align-middle">
            calendar_today
          </span>{" "}
          30-31st October 2025
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <a
            className="bg-primary text-white font-bold py-4 px-10 rounded-lg text-lg flex items-center space-x-3 hover:bg-red-700 transition-colors shadow-lg"
            href="#mentors"
          >
            <span className="material-icons">school</span>
            <span>Meet Our Mentors</span>
          </a>
          <a
            className="bg-card-dark text-text-dark border-2 border-primary font-bold py-4 px-10 rounded-lg text-lg flex items-center space-x-3 hover:bg-secondary-dark transition-colors shadow-lg"
            href="https://luma.com/0dnxds6m?tk=GXTwjf"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Apply with Luma</span>
          </a>
        </div>
      </div>
      <div className="hidden lg:block absolute -bottom-20 -left-20 z-0 opacity-80">
        <Image
          alt="Cartoon F1 car"
          className="h-72 w-auto transform -rotate-12 animate-car-left filter brightness-125"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAoaS5HXJU7-2SHmQkqAihNxhe2DuceeV1PklHoQXH-VsFAiNWvTiZejOXdraYuEcJheZ1c0kmhvIeKJSJ8JsNMH10J0xJtuC6BR1bc8eVCf8b_N6p78xZ2GRrsfKTwssYKTM8_zdTRlYCw_qXLZyax0C9ZR5jiicyammIcB0IPQnVkFxjgasGZQ9Cs0zTThi7xZNew65PxhicJinUNxdSsrNdNOPMsWSgXosewMe0jNvYOcU6oGWMIzOKUddkT9gnGbT0EHCDtbfD"
          width={288}
          height={288}
        />
      </div>
      <div className="hidden lg:block absolute -bottom-24 -right-20 z-0 opacity-80">
        <Image
          alt="Cartoon F1 helmet"
          className="h-80 w-auto transform rotate-12 animate-helmet-right filter brightness-125"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBy7Lnww912z4_32uoqEb5bJvSbK1xp_JYqxu1NBmPgxFR3da5uvoQHhEs2bwoZhaqecrcTBoyErVdRvPckx2JcN9_Zr16ERcIRfOCr1br7bsjqXtCVvAwLaXuBvu8zjc4OFzFG7d7ZsmTIIXKEGFQvcsqCss6SN95ilBE21N9GM6d1lqNd6TJkxVCfz8bvkMQ4R_yBgNqasQA4sLZ1MNWa9gJDCYPUZBtYx0SVBA2ebsCqIoQ7KNEYaMhg9Pw99aU-fDwWyPgrFqJn"
          width={320}
          height={320}
        />
      </div>
    </main>
  );
}
