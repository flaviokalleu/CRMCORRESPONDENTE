import React, { useEffect, useState } from "react";
import axios from "axios";

const Filtro = ({ filters, handleFilterChange }) => {
  const [uniqueTypes, setUniqueTypes] = useState([]);
  const [uniqueLocations, setUniqueLocations] = useState([]);
  const [uniqueRooms, setUniqueRooms] = useState([]);
  const [uniqueTags, setUniqueTags] = useState([]);

  const getUniqueValues = (data, key) => {
    return [...new Set(data.map((item) => item[key]))];
  };

  const fetchImoveis = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/imoveis`
      );
      const imoveis = response.data;

      setUniqueTypes(getUniqueValues(imoveis, "tipo"));
      setUniqueLocations(getUniqueValues(imoveis, "localizacao"));
      setUniqueRooms(
        getUniqueValues(imoveis, "quartos")
          .map(Number)
          .sort((a, b) => a - b)
      );
      setUniqueTags(
        getUniqueValues(imoveis, "tags").reduce((acc, tags) => {
          tags.split(",").forEach((tag) => acc.add(tag.trim()));
          return acc;
        }, new Set())
      );
    } catch (error) {
      console.error("Erro ao buscar imóveis:", error);
    }
  };

  useEffect(() => {
    fetchImoveis();
  }, []);

  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-2">Filtros</h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <select
          name="tipo"
          value={filters.tipo}
          onChange={handleFilterChange}
          className="border border-gray-300 p-2 rounded bg-white"
        >
          <option value="">Todos os Tipos</option>
          {uniqueTypes.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>

        <select
          name="quartos"
          value={filters.quartos}
          onChange={handleFilterChange}
          className="border border-gray-300 p-2 rounded bg-white"
        >
          <option value="">Todos os Quartos</option>
          {uniqueRooms.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </select>

        <select
          name="localizacao"
          value={filters.localizacao}
          onChange={handleFilterChange}
          className="border border-gray-300 p-2 rounded bg-white"
        >
          <option value="">Todas as Localizações</option>
          {uniqueLocations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>

        <input
          type="number"
          name="valorMin"
          value={filters.valorMin}
          placeholder="Valor Mínimo"
          onChange={handleFilterChange}
          className="border border-gray-300 p-2 rounded bg-white"
        />

        <input
          type="number"
          name="valorMax"
          value={filters.valorMax}
          placeholder="Valor Máximo"
          onChange={handleFilterChange}
          className="border border-gray-300 p-2 rounded bg-white"
        />

        <select
          name="tags"
          value={filters.tags}
          onChange={handleFilterChange}
          className="border border-gray-300 p-2 rounded bg-white col-span-3"
        >
          <option value="">Todas as Tags</option>
          {[...uniqueTags].map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Filtro;
