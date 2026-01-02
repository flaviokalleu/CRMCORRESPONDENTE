import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Paper,
} from "@mui/material";

const ListaProprietarios = () => {
  const [proprietarios, setProprietarios] = useState([]);

  useEffect(() => {
    // Fetch proprietários from the API
    const fetchProprietarios = async () => {
      try {
        const response = await axios.get("/api/proprietarios"); // Substitua pela URL real da API
        setProprietarios(response.data);
      } catch (error) {
        console.error("Erro ao buscar proprietários:", error);
      }
    };

    fetchProprietarios();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/proprietarios/${id}`); // Substitua pela URL real da API
      setProprietarios(proprietarios.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Erro ao excluir proprietário:", error);
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen">
      <div className="p-8 text-white">
        <h1 className="text-3xl font-bold mb-8">Lista de Proprietários</h1>
        <TableContainer component={Paper} className="bg-gray-800">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {proprietarios.map((proprietario) => (
                <TableRow key={proprietario.id}>
                  <TableCell>{proprietario.nome}</TableCell>
                  <TableCell>{proprietario.telefone}</TableCell>
                  <TableCell>
                    <Button
                      component={Link}
                      to={`/proprietarios/editar/${proprietario.id}`}
                      variant="contained"
                      color="primary"
                      className="mr-2"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(proprietario.id)}
                      variant="contained"
                      color="secondary"
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
};

export default ListaProprietarios;
