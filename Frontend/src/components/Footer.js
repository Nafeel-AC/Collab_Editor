import react from 'react';

const Footer = () => (
  <footer className="w-full bg-gradient-to-r from-[#0f2027] via-[#2c5364] to-[#232526] text-white py-10 px-4 flex flex-col md:flex-row items-center justify-between shadow-2xl border-t border-[#1a2a36]">
    <div className="flex items-center gap-4 mb-6 md:mb-0">
      <svg width="48" height="48" viewBox="0 0 24 24" className="fill-cyan-400 drop-shadow-lg">
        <circle cx="12" cy="12" r="10" fill="#0ff" opacity="0.1"/>
        <path d="M12 2L15 8H9L12 2ZM12 22L9 16H15L12 22ZM2 12L8 15V9L2 12ZM22 12L16 9V15L22 12Z" fill="#0ff"/>
      </svg>
      <div>
        <span className="text-2xl font-extrabold tracking-wide futuristic-font">Collab Editor</span>
        <div className="text-xs text-cyan-200 opacity-80">Empowering Future Collaboration &copy; 2025</div>
      </div>
    </div>
    <div className="flex gap-6">
      <a
        href="https://twitter.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:scale-110 transition-transform"
        aria-label="Twitter"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" className="fill-cyan-300 hover:fill-cyan-400">
          <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
        </svg>
      </a>
      <a
        href="https://youtube.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:scale-110 transition-transform"
        aria-label="YouTube"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" className="fill-cyan-300 hover:fill-cyan-400">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
        </svg>
      </a>
      <a
        href="https://facebook.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:scale-110 transition-transform"
        aria-label="Facebook"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" className="fill-cyan-300 hover:fill-cyan-400">
          <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
        </svg>
      </a>
      <a
        href="https://www.linkedin.com/in/sajjad-ur-rehman-5b81b2297?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:scale-110 transition-transform"
        aria-label="LinkedIn"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" className="fill-cyan-300 hover:fill-cyan-400">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm15.5 11.268h-3v-5.604c0-1.337-.026-3.063-1.867-3.063-1.868 0-2.154 1.459-2.154 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.381-1.563 2.845-1.563 3.045 0 3.607 2.005 3.607 4.614v5.582z"/>
        </svg>
      </a>
    </div>
  </footer>
);

export default Footer;