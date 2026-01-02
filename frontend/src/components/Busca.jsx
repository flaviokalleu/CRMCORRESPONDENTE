import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import Navbar from "../components/landpage/Navbar"; // Ajuste o caminho conforme necessário
import Footer from "../components/landpage/Footer"; // Ajuste o caminho conforme necessário

const Busca = () => {
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const busca = params.get("busca");

    if (busca) {
      setSearchTerm(busca);
      fetchProperties(busca);
    }
  }, [location]);

  const fetchProperties = async (busca) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/imoveis/busca`,
        {
          params: { busca },
        }
      );
      setProperties(response.data);
    } catch (error) {
      console.error("Erro ao buscar imóveis:", error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 mt-32">
        {" "}
        {/* Adicionado mt-6 aqui */}
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Resultados da Busca
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {properties.length > 0 ? (
            properties.map((property) => (
              <div
                key={property.id}
                className="shadow-md rounded-lg overflow-hidden bg-white"
              >
                <img
                  src={
                    property.imagem_capa
                      ? `${process.env.REACT_APP_API_URL}/${property.imagem_capa}`
                      : "https://via.placeholder.com/500"
                  }
                  alt={property.nome_imovel}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h5 className="text-xl font-bold text-gray-800 mb-2">
                    {property.nome_imovel}
                  </h5>
                  <p className="text-gray-700 mb-4">
                    {property.descricao_imovel.substring(0, 100)}...
                  </p>
                  <a
                    href={`/imoveis/${property.id}`}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Saiba Mais
                  </a>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">
              Nenhum resultado encontrado para "{searchTerm}".
            </p>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Busca;
