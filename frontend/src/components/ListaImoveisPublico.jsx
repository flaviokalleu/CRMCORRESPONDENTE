import React, { useEffect, useState } from "react";
import generateStableKey from 'utils/generateStableKey';
import axios from "axios";
import { FaBed, FaBath } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const ListaImoveisPublico = ({ filters }) => {
  const [imoveis, setImoveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchImoveis = async () => {
      setLoading(true); // Inicia o carregamento
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/imoveis`
        );
        setImoveis(response.data);
      } catch (err) {
        setError("Erro ao carregar imóveis");
      } finally {
        setLoading(false);
      }
    };

    fetchImoveis();
  }, []);

  const filteredImoveis = imoveis.filter((imovel) => {
    // Verifica se filters está definido
    if (!filters) return true; // Se não estiver, não filtra

    const withinPriceRange =
      (!filters.valorMin || imovel.valor_venda >= filters.valorMin) &&
      (!filters.valorMax || imovel.valor_venda <= filters.valorMax);
    const matchesTipo = !filters.tipo || imovel.tipo === filters.tipo;
    const matchesQuartos =
      !filters.quartos || imovel.quartos === parseInt(filters.quartos, 10);
    const matchesLocalizacao =
      !filters.localizacao || imovel.localizacao === filters.localizacao;

    const selectedTags = Array.isArray(filters.tags)
      ? filters.tags
      : [filters.tags].filter(Boolean);
    const hasTags = imovel.tags ? imovel.tags.split(",") : [];
    const matchesTags =
      !filters.tags ||
      selectedTags.every((tag) => hasTags.includes(tag.trim()));

    return (
      withinPriceRange &&
      matchesTipo &&
      matchesQuartos &&
      matchesLocalizacao &&
      matchesTags
    );
  });

  const formatarPreco = (valor) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(16)
          .fill("")
          .map((_, index) => (
            <div
              key={generateStableKey(index)}
              className="bg-gray-200 border border-gray-300 rounded-lg shadow-md animate-pulse h-64"
            />
          ))}
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {filteredImoveis.length === 0 ? (
        <p className="col-span-full text-center">
          Nenhum imóvel disponível no momento.
        </p>
      ) : (
        filteredImoveis.map((imovel) => (
          <div
            key={imovel.id}
            className="max-w-sm bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden transition-shadow duration-300 transform hover:scale-105 cursor-pointer"
            onClick={() => navigate(`/imoveis/${imovel.id}`)}
          >
            <img
              className="p-4 rounded-t-lg w-full h-48 object-cover"
              src={`${process.env.REACT_APP_API_URL}/${imovel.imagem_capa}`}
              alt={`Imagem de ${imovel.nome_imovel}`}
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/placeholder.jpg"; // Fallback caso a imagem falhe
              }}
            />
            <div className="px-5 pb-5">
              <h5 className="text-xl font-semibold tracking-tight text-gray-900">
                {imovel.nome_imovel}
              </h5>
              <p className="mt-1 text-gray-600">
                <strong>Localização:</strong> {imovel.localizacao}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatarPreco(imovel.valor_venda)}
              </p>
              <div className="flex mt-2">
                <span className="flex items-center mr-4">
                  <FaBed className="text-gray-600" />
                  <span className="text-gray-600 ml-1">
                    {imovel.quartos} Quartos
                  </span>
                </span>
                <span className="flex items-center">
                  <FaBath className="text-gray-600" />
                  <span className="text-gray-600 ml-1">
                    {imovel.banheiros} Banheiros
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ListaImoveisPublico;
