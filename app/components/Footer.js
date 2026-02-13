import Image from "next/image";

export default function Footer() {
  return (
    <footer
      className="bg-card-dark text-text-dark border-t border-secondary-dark"
      id="contact"
    >
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 text-center md:grid-cols-2 md:text-left lg:grid-cols-5 gap-8 mb-12 items-start md:items-center">
          <div className="lg:col-span-2">
            <Image
              src="/assets/GDG logo.png"
              alt="GDG on Campus Chitkara Logo"
              width={200}
              height={40}
              className="h-12 w-auto mx-auto md:mx-0"
            />
            <p className="mt-4 text-text-dark/70 text-sm">
              GDG on Campus Chitkara is a university-based community group for
              students interested in Google's developer technologies. We aim to
              foster a learning environment where students can connect, learn,
              and grow their skills.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg text-primary">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-2">
              <li>
                <a
                  className="hover:text-primary transition-colors"
                  href="#about"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  className="hover:text-primary transition-colors"
                  href="#timeline"
                >
                  Timeline
                </a>
              </li>
              <li>
                <a
                  className="hover:text-primary transition-colors"
                  href="#mentors"
                >
                  Mentors
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-lg text-primary">
              Contact
            </h4>
            <p className="mt-4 text-text-dark/70">Have questions? Reach out!</p>
            <a
              className="mt-2 inline-block hover:text-primary transition-colors"
              href="mailto:cse.dsc@chitkara.edu.in"
            >
              cse.dsc@chitkara.edu.in
            </a>
          </div>
          <div>
            <h4 className="font-display font-bold text-lg text-primary">
              Venue
            </h4>
            <p className="mt-4 text-text-dark/70">
              Chitkara University, Punjab
            </p>
            <a
              tabindex="-1"
              href="https://www.google.com/maps/search/?api=1&amp;query=30.5160865%2C76.6597778&amp;query_place_id=ChIJ1-KmRCPDDzkRypkX6d5Gs4E"
              class="rounded-lg overflow-hidden block mt-2"
              aria-label="View on Google Maps"
              target="_blank"
              rel="nofollow noopener"
            >
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3437.175134314862!2d76.6597778!3d30.5160865!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390fc32344a6e2d7%3A0x81b346dee91799ca!2sChitkara%20University!5e0!3m2!1sen!2sin!4v1760255180684!5m2!1sen!2sin"
                loading="lazy"
                allowFullScreen=""
                style={{
                  width: "100%",
                  border: "none",
                  height: "120px",
                }}
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </a>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-secondary-dark text-center text-text-dark/50">
          <p className="text-sm">
            © 2025 F1 Hackathon. All Rights Reserved. Not an official F1™ event.
          </p>
        </div>
      </div>
    </footer>
  );
}
