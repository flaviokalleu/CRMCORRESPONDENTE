import React from "react";

const TestimonialTabs = () => {
  return (
    <section className="my-16 max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8 border border-blue-900/20">
      <h2 className="text-4xl font-extrabold text-center mb-8 text-green-700 drop-shadow-lg">
        Venha tomar um café conosco
      </h2>
      <div className="mb-8 rounded-xl overflow-hidden shadow-lg border border-blue-900/10">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d958.440074111288!2d-47.983056630472845!3d-16.077923910388613!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935985df7f7889f7%3A0x3c8b378471608011!2sParnass%C3%A1%20Imobili%C3%A1ria!5e0!3m2!1spt-BR!2sbr!4v1725482063750!5m2!1spt-BR!2sbr"
          width="100%"
          height="350"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          title="Mapa B2M"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
      <div className="text-center text-blue-900 mb-8 space-y-2">
        <div>
          <span className="font-semibold">Endereço:</span> Nº SN - Parque Esplanada III, Valparaíso de Goiás - GO
        </div>
        <div>
          <span className="font-semibold">Rua:</span> R. Vinte e Nove, 01, Valparaíso de Goiás - GO, 72876-354
        </div>
        <div>
          <span className="font-semibold">Telefone:</span>{" "}
          <a
            href="tel:+5561986374261"
            className="text-green-700 font-semibold hover:underline"
          >
            (61) 98637-4261
          </a>
        </div>
      </div>
      <div className="text-center">
        <a
          href="https://www.google.com/maps/dir//N%C2%BA+SN+-+Parque+Esplanada+III,+Valpara%C3%ADso+de+Goi%C3%A1s+-+GO+Rua,+R.+Vinte+e+Nove,+01,+Valpara%C3%ADso+de+Goi%C3%A1s+-+GO,+72876-354/@-16.0779094,-48.0648147,12z/data=!4m8!4m7!1m0!1m5!1m1!1s0x935985df7f7889f7:0x3c8b378471608011!2m2!1d-47.982531!2d-16.0779749?entry=ttu&g_ep=EgoyMDI0MDkwMi4wIKXMDSoASAFQAw%3D%3D"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-green-600 to-green-500 text-white font-bold py-3 px-8 rounded-lg shadow hover:from-green-700 hover:to-green-600 transition duration-300"
        >
          Obtenha direções
        </a>
      </div>
    </section>
  );
};

export default TestimonialTabs;
