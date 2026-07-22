import React from "react";
import { motion } from "framer-motion";

const InfoCard = ({ icon: Icon, label, value, iconColor = "text-caixa-orange" }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 hover:bg-white/15 hover:border-caixa-orange/50 transition-all duration-300"
  >
    <div className="flex items-center gap-3 mb-2">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <span className="text-caixa-extra-light text-sm font-medium">{label}</span>
    </div>
    <p className="text-white font-semibold break-words">
      {value || "Não informado"}
    </p>
  </motion.div>
);

export default InfoCard;
