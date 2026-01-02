import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { FaEdit, FaTrashAlt, FaEye, FaEnvelope, FaPhone, FaCalendarAlt, FaIdCard } from "react-icons/fa";
import { HiOutlineDocumentText, HiOutlineUserCircle } from "react-icons/hi";
import { MdDragIndicator } from "react-icons/md";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// ✅ MAPEAMENTO DE STATUS COM CORES DO SISTEMA
const defaultStatusMap = {
  aguardando_aprovacao: {
    name: "Aguardando Aprovação",
    color: "bg-caixa-gray-400",
    icon: "⏳",
    borderColor: "border-caixa-gray-400",
    lightColor: "bg-caixa-gray-100",
    textColor: "text-caixa-gray-800"
  },
  proposta_apresentada: {
    name: "Proposta Apresentada",
    color: "bg-caixa-blue",
    icon: "📄",
    borderColor: "border-caixa-blue",
    lightColor: "bg-caixa-blue/10",
    textColor: "text-caixa-blue-dark"
  },
  documentacao_pendente: {
    name: "Documentação Pendente",
    color: "bg-caixa-orange",
    icon: "📑",
    borderColor: "border-caixa-orange",
    lightColor: "bg-caixa-orange-light/20",
    textColor: "text-caixa-orange-dark"
  },
  visita_efetuada: {
    name: "Visita Efetuada",
    color: "bg-caixa-purple",
    icon: "👀",
    borderColor: "border-caixa-purple",
    lightColor: "bg-caixa-purple/10",
    textColor: "text-caixa-purple-dark"
  },
  aguardando_cancelamento_qv: {
    name: "Aguardando Cancelamento/QV",
    color: "bg-caixa-secondary",
    icon: "⏳",
    borderColor: "border-caixa-secondary",
    lightColor: "bg-caixa-secondary/10",
    textColor: "text-caixa-secondary-dark"
  },
  condicionado: {
    name: "Condicionado",
    color: "bg-caixa-teal",
    icon: "⚠️",
    borderColor: "border-caixa-teal",
    lightColor: "bg-caixa-teal/10",
    textColor: "text-caixa-teal-dark"
  },
  cliente_aprovado: {
    name: "Aprovado",
    color: "bg-caixa-green",
    icon: "✅",
    borderColor: "border-caixa-green",
    lightColor: "bg-caixa-green/10",
    textColor: "text-caixa-green-dark"
  },
  reprovado: {
    name: "Reprovado",
    color: "bg-caixa-red",
    icon: "❌",
    borderColor: "border-caixa-red",
    lightColor: "bg-caixa-red/10",
    textColor: "text-caixa-red-dark"
  },
  reserva: {
    name: "Reserva",
    color: "bg-caixa-indigo",
    icon: "📋",
    borderColor: "border-caixa-indigo",
    lightColor: "bg-caixa-indigo/10",
    textColor: "text-caixa-indigo-dark"
  },
  conferencia_documento: {
    name: "Conferência de Documento",
    color: "bg-caixa-purple",
    icon: "📁",
    borderColor: "border-caixa-purple",
    lightColor: "bg-caixa-purple/10",
    textColor: "text-caixa-purple-dark"
  },
  nao_descondiciona: {
    name: "Não Descondiciona",
    color: "bg-caixa-pink",
    icon: "⛔",
    borderColor: "border-caixa-pink",
    lightColor: "bg-caixa-pink/10",
    textColor: "text-caixa-pink-dark"
  },
  conformidade: {
    name: "Conformidade",
    color: "bg-caixa-cyan",
    icon: "✔️",
    borderColor: "border-caixa-cyan",
    lightColor: "bg-caixa-cyan/10",
    textColor: "text-caixa-cyan-dark"
  },
  concluido: {
    name: "Venda Concluída",
    color: "bg-caixa-emerald",
    icon: "🎉",
    borderColor: "border-caixa-emerald",
    lightColor: "bg-caixa-emerald/10",
    textColor: "text-caixa-emerald-dark"
  },
  nao_deu_continuidade: {
    name: "Não Deu Continuidade",
    color: "bg-caixa-pink",
    icon: "⏸️",
    borderColor: "border-caixa-pink",
    lightColor: "bg-caixa-pink/10",
    textColor: "text-caixa-pink-dark"
  },
};

// ✅ NOVA ORDEM DAS COLUNAS NO KANBAN (com todos os status solicitados)
const kanbanColumns = [
  'aguardando_aprovacao',
  'proposta_apresentada',
  'documentacao_pendente',
  'visita_efetuada',
  'aguardando_cancelamento_qv',
  'condicionado',
  'cliente_aprovado',
  'reprovado',
  'reserva',
  'conferencia_documento',
  'nao_descondiciona',
  'conformidade',
  'concluido',
  'nao_deu_continuidade',
];

const KanbanClientes = ({
  clientes = [],
  statusMap: statusMapProp,
  onViewDetails,
  onViewNotas,
  onEdit,
  onDelete,
  onStatusChange,
  user
}) => {
  // ✅ CONTEXTO DE AUTENTICAÇÃO PARA CONTROLE DE PERMISSÕES
  const { hasRole } = useAuth();
  
  // ✅ VERIFICAR SE USUÁRIO PODE EDITAR STATUS
  const canEditStatus = hasRole('administrador') || hasRole('correspondente');
  
  // ✅ USAR STATUS MAP PASSADO COMO PROP OU DEFAULT
  const statusMapFinal = statusMapProp || defaultStatusMap;

  // ✅ STATE LOCAL PARA GERENCIAR DRAG & DROP
  const [localClientes, setLocalClientes] = useState(clientes);

  // ✅ ATUALIZAR CLIENTES LOCAIS QUANDO PROPS MUDAM
  React.useEffect(() => {
    setLocalClientes(clientes);
  }, [clientes]);

  // ✅ AGRUPAR CLIENTES POR STATUS - USANDO ESTADO LOCAL
  const clientesPorStatus = React.useMemo(() => {
    // Sempre inicializar todas as colunas para garantir que o Droppable exista
    const grupos = {};
    kanbanColumns.forEach(statusKey => {
      grupos[statusKey] = [];
    });
    // Agrupar clientes pelos status conhecidos, se não existir, joga na primeira coluna
    localClientes.forEach(cliente => {
      if (cliente.status && grupos.hasOwnProperty(cliente.status)) {
        grupos[cliente.status].push(cliente);
      } else {
        // Se status não reconhecido, colocar na primeira coluna (evita erro de droppable)
        grupos[kanbanColumns[0]].push(cliente);
      }
    });
    return grupos;
  }, [localClientes]);

  // ✅ DRAG & DROP CORRIGIDO E FUNCIONAL (ordenação e mudança de status)
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    // ✅ VERIFICAR PERMISSÃO ANTES DE PERMITIR MUDANÇA DE STATUS
    if (!canEditStatus) {
      console.warn("Usuário não tem permissão para alterar status de clientes");
      return;
    }

    // Se não mudou nada, não faz nada
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const clienteId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;

    // Copia o array atual
    let updatedClientes = Array.from(localClientes);
    // Encontra o cliente
    const movingClienteIndex = updatedClientes.findIndex(c => c.id === clienteId);
    if (movingClienteIndex === -1) return;
    const movingCliente = { ...updatedClientes[movingClienteIndex] };

    // Remove do array
    updatedClientes.splice(movingClienteIndex, 1);
    // Atualiza status
    movingCliente.status = newStatus;

    // Para manter a ordem correta na nova coluna, precisamos saber o índice de destino relativo aos clientes daquele status
    // Filtra todos os clientes que já estão no novo status (sem o que está sendo movido)
    const clientesNoNovoStatus = updatedClientes.filter(c => c.status === newStatus);
    // Calcula o índice real no array global
    let insertAt = 0;
    let count = 0;
    for (let i = 0; i < updatedClientes.length; i++) {
      if (updatedClientes[i].status === newStatus) {
        if (count === destination.index) {
          insertAt = i;
          break;
        }
        count++;
      }
      // Se chegou ao fim e não encontrou, insere no final
      if (i === updatedClientes.length - 1) {
        insertAt = updatedClientes.length;
      }
    }
    // Se não encontrou nenhum, insere no final
    if (clientesNoNovoStatus.length === 0) {
      insertAt = updatedClientes.length;
    }
    // Insere no local correto
    updatedClientes.splice(insertAt, 0, movingCliente);
    setLocalClientes(updatedClientes);

    // Atualiza no backend
    if (onStatusChange) {
      try {
        await onStatusChange(clienteId, newStatus);
        // Sucesso
      } catch (error) {
        // Reverte se der erro
        setLocalClientes(localClientes);
        alert('Erro ao mover cliente. Tente novamente.');
      }
    }
  };

  // ✅ CARD DO CLIENTE
  const KanbanCard = ({ cliente, index }) => {
    const statusInfo = statusMapFinal[cliente.status] || statusMapFinal.aguardando_aprovacao;
    return (
      <Draggable 
        draggableId={cliente.id.toString()} 
        index={index}
        key={cliente.id}
        isDragDisabled={!canEditStatus}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`bg-white border-2 ${statusInfo.borderColor} rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer relative overflow-hidden mb-4 ${
              snapshot.isDragging ? 'scale-105 z-50 ring-2 ring-offset-2 ring-orange-400' : ''
            }`}
          >
            {/* Handle de arrastar */}
            <div 
              {...provided.dragHandleProps}
              className={`absolute top-2 right-2 p-1 transition-opacity ${
                canEditStatus 
                  ? 'opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing'
                  : 'opacity-30 cursor-not-allowed'
              }`}
              title={canEditStatus ? "Arrastar para alterar status" : "Sem permissão para alterar status"}
            >
              <MdDragIndicator className={`w-5 h-5 ${canEditStatus ? 'text-gray-400' : 'text-gray-300'}`} />
            </div>

            {/* Linha superior colorida */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${statusInfo.color}`}></div>

            {/* Header do card */}
            <div className="flex items-center justify-between mb-3 pr-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${statusInfo.color} rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg`}>
                  {cliente.nome?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-gray-900 font-semibold text-base group-hover:text-orange-600 transition-colors truncate">
                    {cliente.nome || "Nome não informado"}
                  </h4>
                </div>
              </div>

              {/* Badge de notas */}
              {cliente.notas && cliente.notas.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewNotas && onViewNotas(cliente.notas);
                  }}
                  className="relative bg-orange-100 hover:bg-orange-200 border border-orange-300 rounded-full p-2 transition-colors"
                >
                  <HiOutlineDocumentText className="w-4 h-4 text-orange-500" />
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {cliente.notas.length}
                  </span>
                </motion.button>
              )}
            </div>

            {/* Informações do cliente */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <FaEnvelope className="w-4 h-4" />
                <span className="truncate">{cliente.email || "Email não informado"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                {user?.is_corretor && !user?.is_administrador && !user?.is_correspondente ? (
                  <>
                    <FaPhone className="w-4 h-4 text-green-400" />
                    <span className="truncate">{cliente.telefone || "Telefone não informado"}</span>
                  </>
                ) : (
                  <>
                    <FaIdCard className="w-4 h-4 text-blue-400" />
                    <span className="font-mono">{cliente.cpf || "CPF não informado"}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <FaCalendarAlt className="w-4 h-4 text-purple-400" />
                <span>{new Date(cliente.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              {cliente.user && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <HiOutlineUserCircle className="w-4 h-4 text-blue-400" />
                  <span className="truncate">
                    {`${cliente.user.first_name || ''} ${cliente.user.last_name || ''}`.trim() || cliente.user.username || "Responsável"}
                  </span>
                </div>
              )}
            </div>

            {/* Ações do card */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails && onViewDetails(cliente);
                }}
                className="bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 text-cyan-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
              >
                <FaEye className="w-3 h-3" />
                Detalhes
              </motion.button>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit && onEdit(cliente);
                  }}
                  className="p-2 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded-lg transition-colors"
                >
                  <FaEdit className="w-3 h-3 text-yellow-600" />
                </motion.button>
                {user?.role === "Administrador" && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete && onDelete(cliente.id);
                    }}
                    className="p-2 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg transition-colors"
                  >
                    <FaTrashAlt className="w-3 h-3 text-red-600" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  // ✅ COLUNA DO KANBAN
  const KanbanColumn = ({ statusKey, clientes }) => {
    const statusInfo = statusMapFinal[statusKey];
    if (!statusInfo) {
      console.warn(`Status não encontrado: ${statusKey}`);
      return null;
    }
    return (
      <div className="flex-shrink-0 w-80">
        <div className={`bg-white border-2 ${statusInfo.borderColor} rounded-2xl p-4 h-full shadow-xl`}>
          {/* Header da coluna */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${statusInfo.color} shadow-lg`}></div>
              <h3 className={`font-semibold flex items-center gap-2 ${statusInfo.textColor}`}>
                <span className="text-lg">{statusInfo.icon}</span>
                <span className="text-base">{statusInfo.name}</span>
              </h3>
            </div>
            <div className={`${statusInfo.lightColor} ${statusInfo.textColor} px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.borderColor}`}>
              {clientes.length}
            </div>
          </div>

          {/* Lista de clientes - DROPPABLE CORRIGIDO */}
          <Droppable droppableId={statusKey} key={statusKey}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar transition-colors ${
                  snapshot.isDraggingOver ? 'bg-orange-100 rounded-xl p-2' : ''
                }`}
                style={{ minHeight: '200px' }}
              >
                {clientes.map((cliente, index) => (
                  <KanbanCard key={cliente.id} cliente={cliente} index={index} />
                ))}
                {provided.placeholder}
                {/* Estado vazio */}
                {clientes.length === 0 && !snapshot.isDraggingOver && (
                  <div className="text-center py-12 text-gray-400">
                    <div className="w-16 h-16 mx-auto mb-4 opacity-30 text-4xl">
                      {statusInfo.icon}
                    </div>
                    <p className="text-sm font-medium">Nenhum cliente</p>
                    <p className="text-xs">nesta etapa</p>
                  </div>
                )}
                {/* Estado de drop */}
                {clientes.length === 0 && snapshot.isDraggingOver && (
                  <div className="text-center py-12 text-orange-500 border-2 border-dashed border-orange-300 rounded-xl">
                    <div className="w-16 h-16 mx-auto mb-4 text-4xl">
                      {statusInfo.icon}
                    </div>
                    <p className="text-sm font-medium">Solte aqui</p>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    );
  };

  // ✅ COMPONENTE PRINCIPAL
  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
          {kanbanColumns.map((statusKey) => (
            <KanbanColumn
              key={statusKey}
              statusKey={statusKey}
              clientes={Array.isArray(clientesPorStatus[statusKey]) ? clientesPorStatus[statusKey] : []}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Estilos personalizados */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 140, 0, 0.6);
          border-radius: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 140, 0, 0.8);
        }
      `}</style>
    </>
  );
};

export default KanbanClientes;