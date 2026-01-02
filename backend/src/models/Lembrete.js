// models/Lembrete.js
module.exports = (sequelize, DataTypes) => {
    const Lembrete = sequelize.define('Lembrete', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        titulo: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        descricao: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        data: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        notificado: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        concluido: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
    }, {
        tableName: 'Lembretes',
    });

    return Lembrete;
};
