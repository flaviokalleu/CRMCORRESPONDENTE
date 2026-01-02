import React from "react";

const Top5Usuarios = ({ usuarios }) => {
  const API_URL = process.env.REACT_APP_API_URL;

  if (!Array.isArray(usuarios) || usuarios.length === 0) {
    return <p className="text-white">Nenhum usuário encontrado.</p>;
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <ul className="space-y-4">
        {usuarios.map((item, index) => {
          const firstName = item.user?.first_name || "";
          const lastName = item.user?.last_name || "";
          const nomeCompleto =
            firstName && lastName
              ? `${firstName} ${lastName}`
              : firstName || lastName || "Usuário não definido";
          return (
            <li
              key={item.user?.id || index}
              className="flex items-center space-x-4 bg-gray-700 p-4 rounded-lg"
            >
              <img
                src={
                  item.user?.photo
                    ? `${API_URL}/uploads/imagem_usuario/${item.user.photo}`
                    : "/default-user.png"
                }
                alt={nomeCompleto}
                className="h-16 w-16 rounded-full object-cover"
              />
              <div>
                <span className="text-xl font-semibold">{nomeCompleto}</span>
                <p className="text-gray-400">{item.clientes} clientes</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Top5Usuarios;
