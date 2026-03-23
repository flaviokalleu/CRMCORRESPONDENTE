import React from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, XCircle, ArrowUpRight } from "lucide-react";

const RESOURCE_LABELS = {
  clientes: "clientes",
  usuarios: "usuários",
  imoveis: "imóveis",
  alugueis: "aluguéis",
};

const UpgradeBanner = ({ resourceType, current, limit, planName }) => {
  // Hide when unlimited
  if (limit === "Ilimitado" || limit === Infinity) return null;

  const numericLimit = Number(limit);
  if (!numericLimit || numericLimit <= 0) return null;

  const percentage = (current / numericLimit) * 100;

  // Hide when below 80%
  if (percentage < 80) return null;

  const atLimit = current >= numericLimit;
  const label = RESOURCE_LABELS[resourceType] || resourceType;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3 }}
        className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 flex-wrap ${
          atLimit
            ? "bg-red-900/30 border-red-500/40 text-red-200"
            : "bg-yellow-900/30 border-yellow-500/40 text-yellow-200"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {atLimit ? (
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          )}

          <div className="min-w-0">
            <p className="text-sm font-medium">
              {atLimit ? (
                <>
                  Você atingiu o limite de{" "}
                  <span className="font-bold">{numericLimit} {label}</span> do
                  plano <span className="font-bold">{planName}</span>. Faça
                  upgrade para continuar.
                </>
              ) : (
                <>
                  Você está usando{" "}
                  <span className="font-bold">{current}</span> de{" "}
                  <span className="font-bold">{numericLimit} {label}</span>.
                  Faça upgrade para continuar.
                </>
              )}
            </p>

            {/* Progress bar */}
            <div className="mt-2 w-full max-w-xs h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percentage, 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  atLimit ? "bg-red-500" : "bg-yellow-500"
                }`}
              />
            </div>
          </div>
        </div>

        <Link
          to="/precos"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            atLimit
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-yellow-500 hover:bg-yellow-600 text-gray-900"
          }`}
        >
          Ver Planos
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpgradeBanner;
