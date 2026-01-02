import React from "react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gray-500 bg-blend-multiply">
      {/* Vídeo de fundo */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        poster="https://flowbite.s3.amazonaws.com/docs/jumbotron/conference.jpg"
      >
        <source src="https://cidadereservadovale.com.br/wp-content/uploads/2025/01/6035772_Mother_Kid_1920x1080.mp4" type="video/mp4" />
        Seu navegador não suporta vídeo em HTML5.
      </video>
      {/* Gradiente sobre o vídeo */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-900 to-black opacity-60 z-10"></div>
      {/* Conteúdo */}
      <div className="relative px-4 mx-auto max-w-screen-xl text-center py-28 lg:py-56 mt-10 z-20">
        <h1 className="mb-6 text-4xl font-extrabold tracking-tight leading-none text-white md:text-5xl lg:text-6xl drop-shadow-lg">
          B2M
        </h1>
        <p className="mb-10 text-lg font-normal text-blue-100 lg:text-xl sm:px-16 lg:px-48 drop-shadow">
          <span className="font-bold text-blue-300">B2M</span> de Valparaíso de Goiás oferece as melhores oportunidades para você encontrar seu imóvel ideal.
          <br />
          <span className="text-blue-200">
            Tecnologia, inovação e atendimento personalizado para garantir sua satisfação.
          </span>
        </p>
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-center sm:space-y-0">
          <a
            href="#contato"
            className="inline-flex justify-center items-center py-3 px-7 text-base font-semibold text-center text-white rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 focus:ring-4 focus:ring-blue-400 shadow-lg transition-all duration-200"
          >
            Comece agora
            <svg
              className="w-4 h-4 ml-2 rtl:rotate-180"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 10"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M1 5h12m0 0L9 1m4 4L9 9"
              />
            </svg>
          </a>
          <a
            href="#propriedades"
            className="inline-flex justify-center items-center py-3 px-7 sm:ml-4 text-base font-semibold text-center text-white rounded-lg border border-blue-300 hover:bg-blue-900/60 focus:ring-4 focus:ring-blue-400 shadow-lg transition-all duration-200"
          >
            Saiba mais
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
