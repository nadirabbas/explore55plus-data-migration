const DEBUG = true;
const {
  getTable,
  getPostsByType,
  getPostMetaByPostId,
  extractIds,
  getPostById,
} = require("./helpers");
const _ = require("lodash");
const collect = require("collect.js");
const { db } = require("./db");

// convert users table to hashmap using lodash
const users = _.keyBy(getTable("wp_mw19wgmlld_users"), "ID");
const usersByEmail = _.keyBy(getTable("wp_mw19wgmlld_users"), (u) =>
  u.user_email.toLowerCase()
);

// convert usermeta table to group by user_id
const usermeta = _.groupBy(getTable("wp_mw19wgmlld_usermeta"), "user_id");

const leadIds = getTable("wp_mw19wgmlld_usermeta")
  .filter(({ meta_key }) => meta_key === "wp_mw19wgmlld_capabilities")
  .filter(({ meta_value }) => {
    return /a:1:{s:[0-9]+:"lead";b:1;}/.test(meta_value);
  })
  .map((meta) => meta.user_id);

const statusMap = {
  0: "active",
  1: "closed",
  2: "lost",
  3: "pending",
};

const agentUserIdToPostHash = {};
const agentPostIdToUserHash = {};

let agents = getPostsByType("agent_finder", true).map((agent) => {
  const pm = (key) => getPostMetaByPostId(agent.ID, key)?.meta_value;
  const email = pm("agent_email").toLowerCase();
  const agentUser = usersByEmail[email];

  const meta = usermeta[agentUser?.ID];
  const metaMap = _.keyBy(meta || [], "meta_key");
  const mm = (key) => metaMap[key]?.meta_value;

  agentUserIdToPostHash[agentUser?.ID] = agent.ID;
  agentPostIdToUserHash[agent.ID] = agentUser?.ID;

  return {
    id: agent.ID,
    user_id: agentUser?.ID,
    name: agentUser
      ? mm("first_name") + " " + mm("last_name")
      : agent.post_title,
    email: email,
    details: {
      avatar: getPostById(pm("agent_avatar"))?.guid,
      bio: pm("agent_bio"),
      phone_number: pm("agent_phone"),
      work_email: email,
      video: pm("video_url"),
      commission_percentage: null,
      is_active: agent.post_status === "publish",
      welcome_email_subject: pm("email_subject"),
      welcome_email_body: pm("email_body"),
    },
  };
});

const agentsUserIds = Object.keys(agentUserIdToPostHash);

const adminIds = getTable("wp_mw19wgmlld_usermeta")
  .filter(({ meta_key }) => meta_key === "notes")
  .map(({ meta_value }) => meta_value.split("i:")[1].split(";")[0])
  .filter((id) => !agentsUserIds.includes(id))
  .reduce((acc, id) => (acc.includes(id) ? acc : [...acc, id]), []);

const noteCreators = getTable("wp_mw19wgmlld_users")
  .filter((user) => adminIds.includes(user.ID))
  .map((user) => {
    return {
      id: (parseInt(user.ID) + 500).toString(),
      name: user.display_name,
      email: user.user_email,
    };
  });

// agents = agents.concat(noteCreators);

const agentAreaHashMap = {};
const unassignedAgentAreaLeadIds = [];

const ll = (m, i) =>
  DEBUG &&
  console.log(
    m,
    `https://explore55plus.flywheelstaging.com/basecamp/pipeline/lead/?id=${i}`
  );

const leads = leadIds.map((id) => {
  const user = users[id];
  const meta = usermeta[id];

  // convert usermeta to hashmap
  const metaMap = _.keyBy(meta, "meta_key");
  const notes = _.filter(meta, ({ meta_key }) => meta_key === "notes");
  const mm = (k) => metaMap[k]?.meta_value;

  const budget = mm("budget");
  const status = statusMap[mm("status")];

  const agentIds = extractIds(mm("agent_id")).filter((id) =>
    agentPostIdToUserHash.hasOwnProperty(id)
  );

  // agentId => [assigned area ids]
  agentIds.forEach(
    (id) =>
      agentAreaHashMap[id] ||
      (agentAreaHashMap[id] = extractIds(
        getPostMetaByPostId(id, "area")?.meta_value
      ))
  );

  const leadAreas = extractIds(mm("area"));

  let areaToAgentHash = {};

  if (agentIds.length > 1) {
    areaToAgentHash = collect(leadAreas).mapWithKeys((areaId) => [
      areaId,
      agentIds.find((agentId) => agentAreaHashMap[agentId].includes(areaId)),
    ]);
  }

  if (agentIds.length > 3) ll("> 3 agents", mm("hash_id"));
  if (leadAreas.length > 3) ll("> 3 areas", mm("hash_id"));
  if (agentIds.length === 0)
    ll("agents found, but cpt dont exist", mm("hash_id"));

  const phone = mm("phone")?.replace(/ |\(|\)|-|\+|\./g, "");
  const transactionType = {
    buying: "purchase",
    selling: "sale",
  }[mm("transaction")];
  const purchaseTimeline = {
    "1-year": "year",
    "6-months": "half_year",
    "not-sure": null,
    "right-now": "now",
  }[mm("timing")];
  const propertyType = {
    condo: "condo",
    "single family": "single_family",
    townhouse: "townhouse",
    "villa duplex": "duplex",
    villaduplex: "duplex",
  }[mm("property")];
  const buildType = {
    either: "either",
    "new construction": "new",
    resale: "resale",
  }[mm("build")];

  const source = {
    form: "primary_flow",
    manual: "manual_other",
    manual_entry: "manual_other",
  }[mm("source")];

  return {
    id: id,
    transaction_type: transactionType,

    purchase_journey: null,
    purchase_timeline: purchaseTimeline,
    purchase_property_type: propertyType,
    purchase_min_budget: 0,
    purchase_max_budget: budget ? parseFloat(budget) : null,

    first_name: mm("first_name").replaceAll("&amp;", "&"),
    last_name: mm("last_name"),
    phone: phone?.length <= 11 ? phone : null,
    zip: mm("zipcode"),
    email: user.user_email,
    secondary_email: mm("secondary_email"),
    birthdate: null,
    additional_details: null,
    source: source,

    purchase_build_type: buildType,
    last_updated: mm("last_updated"),
    created_at: user.user_registered,
    agentIds,

    areas: leadAreas.map((areaId) => {
      // non of the multiple agents assigned to the lead are directly assigned to the area
      if (agentIds.length > 1 && !areaToAgentHash[areaId]) {
        unassignedAgentAreaLeadIds.push(id);
      }

      const agentId =
        agentIds.length === 1
          ? agentIds[0]
          : areaToAgentHash[areaId] || collect(agentIds).random();

      if (agentId == "1516") console.log(agentIds);

      return {
        area_id: areaId,
        user_id: agentId,
        status,
      };
    }),
    notes: notes.map((note) => {
      const addedBy = note.meta_value.split("i:")[1].split(";")[0];
      const timestamp = note.meta_value
        .split(/timestamp";s:[0-9]+:"/g)[1]
        .split(`"`)[0];
      const description = note.meta_value
        .split(/note";s:[0-9]+:"/g)[1]
        .split(`";}`)[0];

      return {
        user_id: agentUserIdToPostHash.hasOwnProperty(addedBy) ? addedBy : null,
        description,
        created_at: timestamp,
      };
    }),
  };
});

let cidToAid = {};

const createAgents = async (t) => {
  const { db, User, UserDetail, AreaUser } = require("./db");

  cidToAid = _.keyBy(
    await db.query(`SELECT * FROM areas`, {
      type: db.QueryTypes.SELECT,
    }),
    "content_foreign_id"
  );

  for (agent of agents) {
    const user = await User.create(agent, { transaction: t });
    await db.query(
      `INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (4, 'App\\\\Models\\\\User', ${user.id})`,
      { transaction: t }
    );

    if (agent.details)
      await UserDetail.create(
        {
          ...agent.details,
          user_id: user.id,
          avatar: "avatars/" + agent.details.avatar.split("/").pop(),
        },
        { transaction: t }
      );

    if (agentAreaHashMap[agent.id]) {
      for (area of agentAreaHashMap[agent.id]) {
        await AreaUser.create(
          {
            area_id: cidToAid[`ar${area}`].id,
            user_id: user.id,
          },
          { transaction: t }
        );
      }
    }
  }
};

const createLeads = async (t) => {
  const { db, Lead, LeadArea, Note, LeadActivity } = require("./db");

  db.query("DELETE FROM leads", { transaction: t });
  const admin = await db.query(
    "SELECT * FROM users WHERE email = 'paul@explore55plus.com'",
    {
      type: db.QueryTypes.SELECT,
    }
  );

  for (lead of leads) {
    const l = await Lead.create(lead, { transaction: t });
    for (area of lead.areas) {
      await LeadArea.create(
        {
          ...area,
          area_id: cidToAid[`ar${area.area_id}`].id,
          user_id: area.user_id,
          lead_id: l.id,
        },
        { transaction: t }
      );
    }

    for (note of lead.notes) {
      const userId = note.user_id
        ? agentUserIdToPostHash[note.user_id]
        : admin[0].id;
      // const userId = parseInt(note.user_id)
      //   ? adminIds.includes(note.user_id)
      //     ? (parseInt(note.user_id) + 500).toString()
      //     : agentUserIdToPostHash[note.user_id]
      //   : collect(lead.agentIds).random().toString();

      await Note.create(
        {
          ...note,
          user_id: userId,
          lead_id: l.id,
        },
        { transaction: t }
      );
      await LeadActivity.create(
        {
          lead_id: l.id,
          user_id: agentUserIdToPostHash[note.user_id] || null,
          category: "notes",
          description: "add a new note",
          html: note.description,
          created_at: note.created_at,
        },
        { transaction: t }
      );
    }
  }
};

(async () => {
  const t = await db.transaction();
  try {
    await createAgents(t);
    await createLeads(t);
  } catch (error) {
    console.error(error);
  }
  await t.commit();
  // await t.rollback();
  await t.can;
  await db.close();
})();

module.exports = {
  agents,
};
