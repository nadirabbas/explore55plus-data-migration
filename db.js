const { Sequelize, DataTypes: D } = require("sequelize");
const db = new Sequelize("explore", "root", null, {
  host: "localhost",
  dialect: "mysql",
});

const id = () => ({
  type: D.BIGINT,
  primaryKey: true,
});

const opts = (opts) => ({
  createdAt: "created_at",
  updatedAt: "updated_at",
  ...opts,
});

const User = db.define(
  "user",
  {
    id: id(),
    name: D.STRING,
    email: {
      type: D.STRING,
      unique: true,
    },
  },
  opts()
);

const UserDetail = db.define(
  "user_detail",
  {
    id: id(),
    user_id: D.BIGINT,
    avatar: D.STRING,
    bio: D.TEXT,
    phone_number: D.STRING,
    work_email: {
      type: D.STRING,
      unique: true,
    },
    video: D.STRING,
    commission_percentage: D.FLOAT,
    is_active: D.BOOLEAN,
    welcome_email_subject: D.STRING,
    welcome_email_body: D.TEXT,
  },
  opts()
);

module.exports = {
  db,
  User,
  UserDetail,
};
