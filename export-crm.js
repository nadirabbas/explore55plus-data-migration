const DEBUG = false;
const {
  getTable,
  getPostsByType,
  getPostMetaByPostId,
  extractIds,
  getPostById,
} = require("./helpers");
const _ = require("lodash");
const collect = require("collect.js");

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

const agents = getPostsByType("agent_finder", true).map((agent) => {
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

// const agentIdHashMap = _.keyBy(agents, "ID");
const agentAreaHashMap = {};
const unassignedAgentAreaLeadIds = [];

const ll = (m, i) =>
  DEBUG &&
  console.log(m, `https://export55plus.com/basecamp/pipeline/lead/?id=${i}`);

const leads = leadIds.map((id) => {
  const user = users[id];
  const meta = usermeta[id];

  // convert usermeta to hashmap
  const metaMap = _.keyBy(meta, "meta_key");
  const notes = _.filter(meta, ({ meta_key }) => meta_key === "notes");
  const mm = (k) => metaMap[k]?.meta_value;

  const budget = mm("budget");
  const status = statusMap[mm("status")];

  const agentIds = extractIds(mm("agent_id"));

  // agentId => [assigned area ids]
  agentIds.forEach(
    (id) =>
      agentAreaHashMap[id] ||
      (agentAreaHashMap[id] = extractIds(
        getPostMetaByPostId(id, "area")?.meta_value
      ))
  );

  const leadAreas = extractIds(mm("area"));

  let areaToAgentHash = null;

  if (agentIds.length > 1) {
    areaToAgentHash = collect(leadAreas).mapWithKeys((areaId) => [
      areaId,
      agentIds.find((agentId) => agentAreaHashMap[agentId].includes(areaId)),
    ]);
  }

  if (agentIds.length > 3) ll("> 3 agents", mm("hash_id"));
  if (leadAreas.length > 3) ll("> 3 areas", mm("hash_id"));

  return {
    transaction_type: mm("transaction"),

    purchase_journey: null,
    purchase_timeline: mm("timing"),
    purchase_property_type: mm("property"),
    purchase_min_budget: 0,
    purchase_max_budget: budget ? parseFloat(budget) : null,

    first_name: mm("first_name"),
    last_name: mm("last_name"),
    phone: mm("phone"),
    zip: mm("zipcode"),
    email: user.user_email,
    secondary_email: mm("secondary_email"),
    birthdate: null,
    additional_details: null,
    source: mm("source"),

    purchase_build_type: mm("build"),
    last_updated: mm("last_updated"),

    areas: leadAreas.map((areaId) => {
      // non of the multiple agents assigned to the lead are directly assigned to the area
      if (agentIds.length > 1 && !areaToAgentHash[areaId]) {
        unassignedAgentAreaLeadIds.push(id);
      }
      return {
        area_id: areaId,
        user_id:
          agentIds.length === 1
            ? agentIds[0]
            : areaToAgentHash[areaId] || collect(agentIds).random(),
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
        .split(`"`)[0];

      return {
        user_id: addedBy,
        description,
        created_at: timestamp,
      };
    }),
  };
});

const create = async () => {
  const { db, User, UserDetail } = require("./db");

  const t = await db.transaction();
  for (agent of agents) {
    const user = await User.create(agent, { transaction: t });
    await db.query(
      `INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (4, 'App\\\\Models\\\\User', ${user.id})`,
      { transaction: t }
    );
    await UserDetail.create(
      {
        ...agent.details,
        user_id: user.id,
      },
      { transaction: t }
    );
  }

  t.commit();
  db.close();
};

module.exports = {
  agents,
};
