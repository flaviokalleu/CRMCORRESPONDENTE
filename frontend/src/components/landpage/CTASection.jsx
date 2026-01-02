const CTASection = () => {
  return (
    <section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-black px-4 py-16 antialiased md:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-900 to-black opacity-60"></div>
      <div className="relative z-10 max-w-screen-xl mx-auto">
        <h1 className="mb-6 text-3xl text-center font-extrabold leading-tight tracking-tight text-white md:text-5xl drop-shadow-lg">
          Transforme o seu sonho em realidade!
        </h1>
        <p className="mb-8 text-lg text-center text-blue-100 z-10 relative max-w-2xl mx-auto">
          Você sabia que pode ter sua casa própria pagando menos do que o aluguel?
          <br />
          <span className="font-semibold text-blue-300">
            A B2M Imobiliária está aqui para ajudar você nessa jornada!
          </span>
        </p>
        <div className="mx-auto grid max-w-screen-xl rounded-2xl bg-blue-950/80 border border-blue-900/40 p-6 md:p-10 lg:grid-cols-12 lg:gap-8 lg:p-16 shadow-2xl">
          <div className="lg:col-span-5 lg:mt-0 flex justify-center items-center">
            <img
              className="h-64 w-64 sm:h-80 sm:w-80 md:h-96 md:w-96 rounded-xl shadow-lg border-4 border-blue-900 object-contain bg-white"
              src="https://seeklogo.com/images/M/minha-casa-minha-vida-logo-8F022589E6-seeklogo.com.png"
              alt="Minha Casa Minha Vida"
            />
          </div>
          <div className="me-auto place-self-center lg:col-span-7">
            <h2 className="mb-4 text-2xl font-bold leading-tight tracking-tight text-white md:text-4xl">
              Economize enquanto conquista seu espaço!
            </h2>
            <p className="mb-6 text-blue-100 text-lg">
              Ao invés de pagar aluguel, invista no seu futuro e conquiste a casa dos seus sonhos.
              <br />
              Com a <span className="font-semibold text-blue-300">B2M Imobiliária</span>, você tem acesso a ofertas exclusivas e condições que cabem no seu bolso.
            </p>
            <a
              href="#contato"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-3 text-base font-semibold text-white shadow-lg hover:from-blue-600 hover:to-blue-400 focus:ring-4 focus:ring-blue-300 transition-all duration-200"
            >
              Vamos conversar sobre sua nova casa!
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
