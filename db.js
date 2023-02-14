const { Sequelize, DataTypes: D } = require("sequelize");

// let details = {
//   user: "vapor",
//   db: "vapor",
//   password: "JIc3vmTFeQsqLVZifsbevPF8taDTOqj3TJe4MGnW",
//   host: "staging.ciaqw6leg4ng.us-east-1.rds.amazonaws.com",
// };
let details = {
  user: "root",
  db: "explore",
  password: null,
  host: "localhost",
};

const db = new Sequelize(details.db, details.user, details.password, {
  host: details.host,
  dialect: "mysql",
  logging: false,
});

const id = () => ({
  type: D.BIGINT,
  primaryKey: true,
});

const opts = (opts) => ({
  createdAt: false,
  updatedAt: false,
  ...opts,
});

const t = {
  created_at: D.DATE,
  updated_at: D.DATE,
};

const User = db.define(
  "user",
  {
    id: id(),
    name: D.STRING,
    email: {
      type: D.STRING,
      unique: true,
    },
    ...t,
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
    ...t,
  },
  opts()
);

const Lead = db.define(
  "lead",
  {
    id: id(),
    transaction_type: D.STRING,

    purchase_journey: D.STRING,
    purchase_timeline: D.STRING,
    purchase_property_type: D.STRING,
    purchase_min_budget: D.FLOAT,
    purchase_max_budget: D.FLOAT,

    sale_street_address: D.STRING,
    sale_timeline: D.STRING,
    sale_property_type: D.STRING,

    first_name: D.STRING,
    last_name: D.STRING,
    phone: D.STRING,
    zip: D.STRING,
    email: D.STRING,
    secondary_email: D.STRING,
    birthdate: D.STRING,
    additional_details: D.STRING,
    source: D.STRING,
    state_id: D.BIGINT,

    purchase_build_type: D.STRING,
    last_updated: D.DATE,
    ...t,
  },
  opts()
);

const LeadArea = db.define(
  "lead_area",
  {
    id: id(),
    status: D.STRING,
    user_id: D.BIGINT,
    lead_id: D.BIGINT,
    area_id: D.BIGINT,
    estimated_closing_date: D.DATEONLY,
    estimated_final_amount: D.FLOAT,
    commission_percentage: D.FLOAT,
    company_commission_percentage: D.FLOAT,
    address_line_1: D.STRING,
    address_line_2: D.STRING,
    address_city: D.STRING,
    address_zip: D.STRING,
    closing_date: D.DATEONLY,
    final_amount: D.FLOAT,
    closing_document: D.STRING,
    should_send_review_link: D.BOOLEAN,
    review_link_rejection_reason: D.STRING,
    is_review_link_sent: D.BOOLEAN,
    assigned_at: D.DATE,
    ...t,
  },
  opts()
);

const AreaUser = db.define(
  "area_user",
  {
    id: id(),
    user_id: D.BIGINT,
    area_id: D.BIGINT,
    ...t,
  },
  opts({
    tableName: "area_user",
  })
);

const Note = db.define(
  "note",
  {
    id: id(),
    lead_id: D.BIGINT,
    user_id: D.BIGINT,
    description: D.TEXT,
    ...t,
  },
  opts()
);

const LeadActivity = db.define(
  "lead_activity",
  {
    id: id(),
    lead_id: D.BIGINT,
    user_id: D.BIGINT,
    category: D.STRING,
    description: D.TEXT,
    data: D.TEXT,
    html: D.TEXT,
    ...t,
  },
  opts()
);

module.exports = {
  db,
  User,
  UserDetail,
  Lead,
  LeadArea,
  AreaUser,
  Note,
  LeadActivity,
};
